from django.core.management.base import BaseCommand
from firebase_admin import db, firestore
from forecast.hrv_processing import update_hrv_for_worker
from forecast.fatigue_analyzer import FatigueAnalyzer

class Command(BaseCommand):
    help = '10분마다 HRV로 피로도 판단 (개인화 경계값 사용)'

    def handle(self, *args, **kwargs):
        users_ref = db.reference('heart_records')
        all_users = users_ref.get()

        if not all_users:
            print("사용자 없음")
            return

        analyzer = FatigueAnalyzer()
        fs = firestore.client()

        for uid in all_users.keys():
            print(f"\n[{uid}] HRV 분석 시작")
            rmssd = update_hrv_for_worker(uid, window_minutes=3)
            if rmssd is None:
                print(f"[{uid}] 최근 10분간 데이터 없음 → 건너뜀")
                continue

            # 사용자별 경계값 가져오기
            doc = fs.collection('workers').document(uid).collection('dashboard').document('fatigue-thresholds').get()
            if not doc.exists:
                print(f"[{uid}] 경계값 없음 → 건너뜀")
                continue

            thresholds = doc.to_dict()
            analyzer.thresholds[uid] = (thresholds['t01'], thresholds['t12'])

            fatigue_level = analyzer.classify_hrv(uid, rmssd)
            level_str = ["Low", "Medium", "High"][fatigue_level]

            # Firestore에 피로도 저장 (merge=True → 기존 정보 유지하며 추가)
            fs.collection('workers').document(uid).collection('dashboard').document('dashboard-info').set({
                'fatigueLevel': level_str
            }, merge=True)

            print(f"[{uid}] 피로도 판단 완료 → {level_str}")
