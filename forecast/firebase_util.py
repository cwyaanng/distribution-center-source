# forecast/firebase_util.py
import firebase_admin
from firebase_admin import credentials, firestore
import os

# 한 번만 초기화되도록 처리
if not firebase_admin._apps:
    cred = credentials.Certificate(os.path.join(os.path.dirname(__file__), 'firebase_key.json'))
    firebase_admin.initialize_app(cred, {
    'databaseURL': ''
})


db = firestore.client()

def upload_predictions(year, predictions):
    """
    예측 결과를 Firestore에 저장
    예: /predictions/2025/ 아래에 1~365일 예측값 저장
    """
    doc_ref = db.collection('predictions').document(str(year))
    daily_data = {f'day_{i+1}': int(val) for i, val in enumerate(predictions)}
    doc_ref.set(daily_data)

def upload_weekly_worker_plan(year, weekly_regular, weekly_temp):
    """
    주차별 정규직/일용직 인원 계획을 Firestore에 저장
    경로 예시:
    - /workforce/2025/regular/week_1
    - /workforce/2025/temp/week_1
    """
    regular_ref = db.collection('workforce').document(str(year)).collection('regular')
    temp_ref = db.collection('workforce').document(str(year)).collection('temp')

    for i, (reg, temp) in enumerate(zip(weekly_regular, weekly_temp), start=1):
        regular_ref.document(f'{i}').set({'days': reg})
        temp_ref.document(f'{i}').set({'days': temp})

def encode_schedule(schedule_list):
    return ''.join(str(int(d)) for d in schedule_list)


