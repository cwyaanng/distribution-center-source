from django.core.management.base import BaseCommand
from firebase_admin import db, firestore
from forecast.fatigue_analyzer import FatigueAnalyzer
from datetime import datetime, timedelta
import pandas as pd

class Command(BaseCommand):
    help = '최근 기록 기준 8시간치 HRV 데이터로 사용자별 피로 경계값 갱신'

    def handle(self, *args, **kwargs):
        analyzer = FatigueAnalyzer()
        users_ref = db.reference('heart_records')
        all_users = users_ref.get()

        if not all_users:
            print("사용자 없음")
            return

        data = []

        for uid, records in all_users.items():
            hrv_data = records.get("hrv_record", {})
            if not hrv_data:
                print(f"[{uid}] hrv_record 없음 → 건너뜀")
                continue

            # 숫자형 timestamp만 추출
            timestamps = []
            for ts in hrv_data.keys():
                if ts.isdigit():
                    timestamps.append(datetime.fromtimestamp(int(ts) / 1000))
            if not timestamps:
                print(f"[{uid}] HRV 타임스탬프 없음 → 건너뜀")
                continue

            latest_ts = max(timestamps)
            window_start = latest_ts - timedelta(hours=8)

            for ts, value in hrv_data.items():
                if not ts.isdigit():
                    continue

                ts_dt = datetime.fromtimestamp(int(ts) / 1000)
                if window_start <= ts_dt <= latest_ts:
                    if value is not None:
                        data.append({
                            'timestamp': ts_dt,
                            'hrv': value,
                            'worker_id': uid
                        })

        df = pd.DataFrame(data)
        if df.empty:
            print("HRV 데이터 없음")
            return

        try:
            result = analyzer.detect_fatigue_levels(df, pen=10)
        except ValueError as e:
            print(f"분석 중 오류 발생: {e}")
            return

        fs = firestore.client()
        for uid, val in result.items():
            t01, t12 = val['thresholds']
            fs.collection('workers').document(uid).collection('dashboard').document('dashboard-info').set({
                't01': t01,
                't12': t12
            }, merge=True)

        print("[완료] 사용자별 최근 8시간 기준 경계값 갱신 완료")
