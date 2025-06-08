import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans
import ruptures as rpt
from pulp import LpProblem, LpVariable, lpSum, LpMinimize, LpBinary, LpStatus


class FatigueAnalyzer:
    def __init__(self, default_thresholds=(20.0, 50.0)):
        self.thresholds = {}
        self.default_thresholds = default_thresholds

    def detect_fatigue_levels(self, hrv_data, pen):
        self.thresholds = {}
        results = {}

        for worker_id, df_worker in hrv_data.groupby('worker_id'):
            df_worker = df_worker.sort_values('timestamp').reset_index(drop=True)
            hrvs = df_worker['hrv'].values

            try:
                model = "l2"
                algo = rpt.Pelt(model="l2").fit(hrvs.reshape(-1, 1))
                dynamic_pen = max(pen, len(hrvs) * 0.2)
                try :
                    change_points = algo.predict(pen=dynamic_pen)
                except Exception as error:
                    print(f"error : {error}")

                segments = []
                start = 0
                for end in change_points:
                    segment = hrvs[start:end]
                    segments.append({
                        'mean_hrv': np.mean(segment),
                        'std_hrv': np.std(segment)
                    })
                    start = end

                if len(segments) < 3:
                    raise ValueError("세그먼트 부족")

                df_segments = pd.DataFrame(segments)
                X_scaled = StandardScaler().fit_transform(df_segments)
                kmeans = KMeans(n_clusters=3, random_state=42)
                df_segments['fatigue_level'] = kmeans.fit_predict(X_scaled)

                cluster_order = df_segments.groupby('fatigue_level')['mean_hrv'].mean().sort_values().index.tolist()
                cluster_map = {old: new for new, old in enumerate(cluster_order)}
                df_segments['fatigue_level'] = df_segments['fatigue_level'].map(cluster_map)

                centers = df_segments.groupby('fatigue_level')['mean_hrv'].mean().sort_index()
                t01 = (centers[0] + centers[1]) / 2
                t12 = (centers[1] + centers[2]) / 2

                self.thresholds[worker_id] = (t01, t12)
                results[worker_id] = {'thresholds': (t01, t12)}

            except Exception as e:
                print(f"[{worker_id}] 분석 실패 → 기본값 사용 ({e})")
                self.thresholds[worker_id] = self.default_thresholds
                results[worker_id] = {'thresholds': self.default_thresholds}

        return results

    def classify_hrv(self, worker_id, hrv_value):
        t01, t12 = self.thresholds.get(worker_id, self.default_thresholds)
        if hrv_value > t12:
            return "Low"
        elif hrv_value > t01:
            return "Medium"
        else:
            return "High"
