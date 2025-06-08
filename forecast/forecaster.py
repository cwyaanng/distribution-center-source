# forecast/forecaster.py

import joblib
import pandas as pd
import numpy as np
from pytimekr import pytimekr

class LogisticsForecaster:
    def __init__(self, model_path):
        self.model = joblib.load(model_path)

    def _create_features(self, df):
        df['year'] = df['date'].dt.year
        df['month'] = df['date'].dt.month
        df['weekday'] = df['date'].dt.weekday
        df['is_weekend'] = df['weekday'].isin([5, 6]).astype(int)

        holidays = []
        for year in df['year'].unique():
            holidays += pytimekr.holidays(year)
        holidays = pd.to_datetime(sorted(set(holidays)))
        df['is_holiday'] = df['date'].isin(holidays).astype(int)

        return df
    
    ## 이걸 slot을 num_workers * days_per_worker이 아니라, 인당 할당량으로 나누기를 한 것으로 바꾸는게 좋지 않을까 하는...
    ################################## 실험 후에 수정 필요 #############################################
    def _distribute_workers_unbounded(self, predicted_volumes, num_workers, days_per_worker=5):
        total_volume = sum(predicted_volumes)
        total_slots = num_workers * days_per_worker
        ratios = [v / total_volume for v in predicted_volumes]
        raw = [r * total_slots for r in ratios]
        rounded = [int(np.floor(x)) for x in raw]

        diff = total_slots - sum(rounded)
        if diff > 0:
            # +1씩 채우기
            frac_parts = sorted(((i, raw[i] - rounded[i]) for i in range(len(raw))), key=lambda x: -x[1])
            for i in range(diff):
                rounded[frac_parts[i][0]] += 1
        elif diff < 0:
            # -1씩 제거
            frac_parts = sorted(((i, raw[i] - rounded[i]) for i in range(len(raw))), key=lambda x: x[1])
            for i in range(-diff):
                rounded[frac_parts[i][0]] -= 1

        return rounded

    def _distribute_workers_bounded(self, predicted_volumes, num_workers, days_per_worker=5):
        total_volume = sum(predicted_volumes)
        total_slots = num_workers * days_per_worker
        ratios = [v / total_volume for v in predicted_volumes]
        raw = [r * total_slots for r in ratios]
        rounded = [int(np.floor(x)) for x in raw]

        # 1차 보정: 총합이 total_slots가 되도록
        diff = total_slots - sum(rounded)
        if diff > 0:
            frac_parts = sorted(((i, raw[i] - rounded[i]) for i in range(len(raw))), key=lambda x: -x[1])
            for i in range(diff):
                rounded[frac_parts[i][0]] += 1
        elif diff < 0:
            frac_parts = sorted(((i, raw[i] - rounded[i]) for i in range(len(raw))), key=lambda x: x[1])
            for i in range(-diff):
                rounded[frac_parts[i][0]] -= 1

        # 2차 보정: 하루 최대 인원 제한
        for i in range(len(rounded)):
            if rounded[i] > num_workers:
                excess = rounded[i] - num_workers
                rounded[i] = num_workers

                # 초과 인원을 다른 요일에 분산
                for j in range(len(rounded)):
                    if i != j and rounded[j] < num_workers:
                        space = num_workers - rounded[j]
                        shift = min(space, excess)
                        rounded[j] += shift
                        excess -= shift
                        if excess == 0:
                            break
                # 초과 인원이 아직 남았다면, 포기 (강제 자르기)
                if excess > 0:
                    print(f" Warning: {excess} slots discarded due to daily limit.")

        return rounded

    # 필요 일용직 수 계산
    def _calculate_daily_temp_workers(self, predicted_volumes, num_workers, days_per_worker=5):
        unbounded = self._distribute_workers_unbounded(predicted_volumes, num_workers, days_per_worker)
        bounded = self._distribute_workers_bounded(predicted_volumes, num_workers, days_per_worker)
        
        temp_workers = [max(0, u - b) for u, b in zip(unbounded, bounded)]
        return temp_workers
    
    def allocate_workers(self, 
                        y_pred,      # forecaster.predict()의 return
                        num_workers  # 총 작업자 수 (정규직)
    ):
        y_pred = pd.Series(y_pred)
        pred_values = y_pred.values[1:] # 1월 2일 (월요일)부터 일주일 단위 예측 물류량
        weekly_values = [pred_values[i:i+7].tolist() for i in range(0, len(pred_values), 7)]

        # 요일별 필요 작업자 수 -> 스케줄링에 들어가는 값
        weekly_workers_bounded = []
        for week in weekly_values:
            workers = self._distribute_workers_bounded(week, num_workers)
            weekly_workers_bounded.append(workers)

        # 필요 일용직 수
        weekly_temp_workers = []
        for week in weekly_values:
            workers = self._calculate_daily_temp_workers(week, num_workers)
            weekly_temp_workers.append(workers)

        return weekly_workers_bounded, weekly_temp_workers

    def predict_year(self, year , num_workers):
        dates = pd.date_range(start=f'{year}-01-01', end=f'{year}-12-31', freq='D')
        df = pd.DataFrame({'date': dates})
        df = self._create_features(df)
        X = df.drop(columns=['date', 'year'])
        predictions = self.model.predict(X).astype(int) 
        weekly_workers_bounded, weekly_temp_workers = self.allocate_workers(predictions, num_workers)

        return predictions.tolist(), weekly_workers_bounded, weekly_temp_workers
    

