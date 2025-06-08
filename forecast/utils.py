
import os
import json
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import credentials, firestore
from openai import OpenAI

load_dotenv()

# Firebase 초기화
if not firebase_admin._apps:
    cred_path = os.path.join(os.path.dirname(__file__), 'firebase_key.json')
    cred = credentials.Certificate(cred_path)
    firebase_admin.initialize_app(cred, {
        'databaseURL': ''
    })

db = firestore.client()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def collect_worker_data(worker_ids=None):
    workers_data = []
    try:
        if worker_ids:
            for uid in worker_ids:
                profile_doc = db.collection("workers").document(uid).collection("info").document("profile").get()
                dashboard_doc = db.collection("workers").document(uid).collection("dashboard").document("dashboard-info").get()
                if profile_doc.exists and dashboard_doc.exists:
                    workers_data.append({
                        "uid": uid,
                        "profile": profile_doc.to_dict(),
                        "dashboard": dashboard_doc.to_dict()
                    })
        else:
            docs = db.collection("workers").stream()
            for doc in docs:
                uid = doc.id
                profile = doc.reference.collection("info").document("profile").get()
                dashboard = doc.reference.collection("dashboard").document("dashboard-info").get()
                if profile.exists and dashboard.exists:
                    profile_data = profile.to_dict()
                    workers_data.append({
                        "uid": uid,
                        "profile": profile_data,
                        "dashboard": dashboard.to_dict()
                    })
    except Exception as e:
        print(f"Firebase error: {e}")
    return workers_data
  
  
def perform_ai_analysis(data, analysis_type, custom_prompt):
    analysis_data = [
        {
            "worker_id": w["uid"],
            "name": w["profile"].get("name"),
            "fatigue_level": w["dashboard"].get("fatigueLevel"),
            "work_hours": w["dashboard"].get("workHours"),
            "temperature": w["dashboard"].get("temperature"),
            "heart_rate": w["dashboard"].get("latestAverageHeartRate"),
        }
        for w in data
    ]

    user_prompt = f"""
    다음 작업자 데이터를 분석해주세요:
    {json.dumps(analysis_data, ensure_ascii=False, indent=2)}
    분석 유형: {analysis_type}
    {"추가 요청사항: " + custom_prompt if custom_prompt else ""}
    """

    system_prompt = """
    당신은 산업 안전 분석 전문가이며, 인적자원관리 및 작업 리스크 분석에 특화된 GPT 모델입니다.
    작업자들의 생체 센서 데이터, 근무 정보, 환경 요인을 기반으로 조직 전체의 건강 상태를 평가하고, 고위험 작업자를 식별하며, 개선 방안을 도출하는 것이 목표입니다.

    ###  출력 포맷(JSON, 반드시 전체 필드 포함):
    {
    "summary": string,                   // 전체 작업자 상태에 대한 서술적 개요 (최소 1~2 문단)
    "insights": [string],               // 주요 문제점 또는 특이사항 (최소 3개, 수치 기반이면 더 좋음)
    "recommendations": [string],        // 실질적이고 실행 가능한 조치 제안 (최소 3개, 센서 개선/근무시간/휴식 등)
    "risk_workers": [string],           // 위험 작업자 이름(ID) + 이유 ("홍길동(uid123): 피로도 High, 심박수 110" 형태)
    "charts_data": {
        "fatigue_chart": object,          // 피로도별 인원 수 예: {"Low": 10, "Medium": 3, "High": 2}
        "temperature_chart" : object       // 체온 별 인원 수 (37도 이하는 normal, 37도 초과면 high) 예 : {"normal" : 2 , "high" : 5 }
    }
    }

    ###  작성 규칙:
    - 모든 응답은 **한국어로**, 정중하면서도 전문적인 표현을 사용합니다.
    - `"summary"`는 단순 요약이 아닌, 패턴 분석·경향성·현황을 서술해 주세요.
    - `"insights"` 항목은 센서 데이터를 바탕으로 도출한 **데이터 기반 인사이트**여야 합니다.
    - `"recommendations"` 항목은 구체적으로 **"무엇을, 왜, 어떻게"** 조치해야 할지를 제안합니다.
    - `"risk_workers"` 항목은 위험 요소가 복합적인 작업자를 **이름(ID)과 이유를 상세히 포함하여 기술**합니다.
    - `"charts_data"`는 시각화 가능한 형태로, 분류된 수치 요약을 제공합니다.

    ### 판단 기준:
    - 피로도가 **High**면 고위험군입니다.
    - 심박수 High면면 과부하 상태일 가능성이 높습니다.
    - 근무시간 10시간 이상 + Medium 이상 피로도는 리스크 요인입니다.
    """




    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.7,
            response_format={"type": "json_object"}
        )

        return json.loads(response.choices[0].message.content)

    except Exception as e:
        print(f"[OpenAI API Error] {e}")

        # fallback 분석 응답 예시
        return {
            "summary": f"{len(data)}명의 작업자 데이터를 수집했으며, AI 분석은 현재 사용 불가 상태입니다.",
            "insights": [],
            "recommendations": ["OpenAI API 키를 확인하거나 사용량 제한을 해제하세요."],
            "risk_workers": [],
            "charts_data": {},
            "raw_analysis": "OpenAI 응답 실패 - 기본 정보만 반환됨"
        }
