# forecast/views.py

from django.http import JsonResponse
from .forecaster import LogisticsForecaster
from .firebase_util import upload_predictions , upload_weekly_worker_plan
from forecast.hrv_processing import update_hrv_for_worker
from forecast.fatigue_analyzer import FatigueAnalyzer
from firebase_admin import db
import os
from firebase_admin import firestore
from forecast.scheduler import WeeklyScheduler
from firebase_admin import firestore
from forecast.firebase_util import encode_schedule
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from .utils import collect_worker_data, perform_ai_analysis

db_firestore = firestore.client()

workers = db_firestore.collection('workers').stream()
num_workers = sum(1 for _ in workers)

# 모델 경로 지정 (project/settings.py 기준 상대경로)
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'model', 'logistics_model.pkl')

# 예측 API
def predict_view(request, year):
    try:
        year = int(year)
        forecaster = LogisticsForecaster(MODEL_PATH)
        predictions , weekly_workers_bounded, weekly_temp_workers = forecaster.predict_year(year, num_workers)
        upload_predictions(year, predictions)
        upload_weekly_worker_plan(year,weekly_workers_bounded, weekly_temp_workers)
        
        return JsonResponse({
            'year': year,
            'predictions_sample': predictions[:7],  # 미리보기
            'weeks_uploaded': len(weekly_workers_bounded)
        })
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

def process_realtime(uid, analyzer):
    rmssd = update_hrv_for_worker(uid)
    if rmssd is None:
        print(f"[{uid}] RMSSD 계산 실패 또는 데이터 부족")
        return
    print(f"[{uid}] 실시간 RMSSD: {rmssd:.2f}")

    # 피로도 판단
    fatigue_level = analyzer.classify_hrv(uid, rmssd)
    db.reference(f'heart_records/{uid}/fatigue_level').set(fatigue_level)
    print(f"[{uid}] 피로도 레벨: {fatigue_level}")
    

import traceback

def schedule_week_view(request, year, week):
    try:
        year = str(year)
        db = firestore.client()
        week = str(week)

        # 1. 필요한 인원 수 불러오기
        doc = db.collection('workforce').document(year).collection('regular').document(week).get()
        if not doc.exists:
            return JsonResponse({'error': f'No schedule data for {week}'}, status=404)

        required_workers = doc.to_dict().get('days', [])
        print(f"📌 요구되는 인원수 (요일별): {required_workers}")
        total_required = sum(required_workers)
        print(f"📌 총 요청 인력일수: {total_required}")

        # 2. 사용자 정보 수집
        users = db.collection('workers').stream()
        fatigue_map = {"Low": 0.1, "Medium": 0.5, "High": 1.0}

        fatigue_ratios = {}
        cumulative_workloads = {}
        cumulative_hours = {}
        worker_count = 0

        for user_doc in users:
            uid = user_doc.id
            dashboard_doc = db.collection('workers').document(uid).collection('dashboard').document('dashboard-info').get()
            
            dash_doc = dashboard_doc.to_dict()
            if dash_doc is None:
                print(f"[⚠️ 경고] {uid} 사용자의 dashboard-info 문서가 없습니다. 기본값을 사용합니다.")
                dash_doc = {}

            fatigue = dash_doc.get('fatigueLevel', 'Medium')
            fatigue_ratios[uid] = fatigue_map.get(fatigue, 0.5)
            cumulative_workloads[uid] = dash_doc.get('cumulativeWorkload', 10)
            cumulative_hours[uid] = dash_doc.get('cumulativeHours', 40)
            worker_count += 1

        print(f"👷 정규직 수: {worker_count}")
        print(f"🧮 근무 가능 총일수: {worker_count} × {WeeklyScheduler().workdays_per_worker} = {worker_count * WeeklyScheduler().workdays_per_worker}")
        print("📊 최적화 모델 제약 조건:")


        # 3. 요청 vs 가능 여부 검사
        if total_required > worker_count * WeeklyScheduler().workdays_per_worker:
            print(f"❌ 요청 인력일({total_required}) > 가능한 인력일({worker_count * WeeklyScheduler().workdays_per_worker}) → infeasible 가능성 높음")

        weekly_steps = 30000
        
        # 4. 스케줄링
        scheduler = WeeklyScheduler()
        schedule_result = scheduler.schedule(
            fatigue_ratios=fatigue_ratios,
            weekly_steps=weekly_steps,
            cumulative_workloads=cumulative_workloads,
            cumulative_hours=cumulative_hours,
            required_workers=required_workers,
            alpha=1.0,
            delta=0.5,
            beta=0.1,
            gamma=0.1
        )

        # 5. 결과 저장
        for uid, schedule in schedule_result.items():
            schedule_str = encode_schedule(schedule)
            doc_ref = db.collection('workers').document(uid).collection('dashboard').document('workSchedule')
            doc_ref.set({'weekPattern': schedule_str}, merge=True)

        return JsonResponse({
            'week': week,
            'worker_count': len(schedule_result),
            'sample': {k: encode_schedule(v) for k, v in list(schedule_result.items())[:3]}
        })

    except Exception as e:
        # 전체 traceback 출력
        print("❌ 예외 발생 (schedule_week_view):")
        traceback.print_exc()

        return JsonResponse({
            'error': str(e),
            'trace': traceback.format_exc()
        }, status=500)

        
@api_view(['POST', 'OPTIONS']) 
def ai_analysis_view(request):
    try:
        data = request.data
        analysis_type = data.get("analysis_type")
        worker_ids = data.get("worker_ids")
        custom_prompt = data.get("custom_prompt")

        workers_data = collect_worker_data(worker_ids=worker_ids)

        if not workers_data:
            return Response({"error": "No data found"}, status=status.HTTP_404_NOT_FOUND)

        result = perform_ai_analysis(workers_data, analysis_type, custom_prompt)

        return Response(result, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
