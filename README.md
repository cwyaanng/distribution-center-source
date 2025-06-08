## 📦 Backend API 및 데이터 처리 로직

### ✅ 1. 작업자 스케줄 조회 및 Firebase 저장

- **Endpoint**  
  `GET /api/schedule/{year}/{month}/`

- **설명**  
  연도(`year`)와 월(`month`)에 해당하는 작업자별 근무 스케줄을 계산하여 반환하고, Firebase에 저장합니다.

- **요청 예시**
```

GET [http://43.200.254.136:8000/api/schedule/2025/05/](http://43.200.254.136:8000/api/schedule/2025/05/)

````

- **응답 예시**
```json
{
  "week": "12",
  "worker_count": 6,
  "sample": {
    "4D081hDO5nTOk13": "1010111",
    "CQvMuhj1": "1101110"
  }
}
````

---

### 🔮 2. 연간 물류량 예측 및 Firebase 반영

* **Endpoint**
  `GET /api/predict/{year}/`

* **설명**
  지정 연도에 대한 365일치 물류량을 예측하고 Firebase DB에 저장합니다.

* **요청 예시**

  ```
  GET http://43.200.254.136:8000/api/predict/2025
  ```

* **응답 예시**

  ```json
  {
    "year": 2025,
    "predictions_sample": [7400, 75956, 72315],
    "weeks_uploaded": 52
  }
  ```

---

### 🧠 3. Fatigue Threshold (피로도 경계값) 갱신

* **실행 주기**
  하루 3회 (예: 0시, 8시, 16시)

* **입력 데이터 위치 (Firebase Realtime DB)**
  `/heart_records/{uid}/hrv_record`

* **입력 데이터 예시**

  ```json
  {
    "1717227900000": 38.5,
    "1717228080000": 42.1
  }
  ```

* **처리 로직 요약**

  1. 최근 8시간의 HRV 기록 필터링
  2. Change Point Detection (PELT 알고리즘)
  3. KMeans 클러스터링 (3개 구간)
  4. 평균 기반으로 t01, t12 경계값 산출
  5. Firestore에 병합 저장 (`merge=True`)

* **출력 위치 (Firestore)**
  `/workers/{uid}/dashboard/dashboard-info`

* **저장 예시**

  ```json
  {
    "t01": 30.2,
    "t12": 44.7
  }
  ```

---

### ❤️ 4. 실시간 피로도 레벨 업데이트

* **입력 위치**
  `/heart_records/{uid}/heart_rate`

* **입력 예시**

  ```json
  {
    "1717227600000": 72,
    "1717227660000": 75
  }
  ```

* **처리 과정**

  * 3분 단위 슬라이딩 윈도우로 HRV(RMSSD) 계산
  * 개인별 기준값(t01, t12)과 비교
  * 피로도 수준 판단 (Low / Medium / High)

* **출력 위치**
  `/workers/{uid}/dashboard/dashboard-info`

* **저장 예시**

  ```json
  {
    "fatigueLevel": "Medium"
  }
  ```

---

### 🤖 5. GPT 기반 작업자 안전 리포트 생성

* **Endpoint**
  `POST /api/ai-analysis/`

* **설명**
  Firebase의 전체 작업자 데이터를 수집하여 GPT API에 요청 → 팀 리포트를 생성합니다.

* **요청 예시**

  ```bash
  curl -X POST http://43.200.254.136:8000/api/ai-analysis/ \
    -H "Content-Type: application/json" \
    -d '{"analysis_type": "team"}'
  ```

* **읽는 Firebase 경로**

| 경로                                        | 설명                   |
| ----------------------------------------- | -------------------- |
| `/workers/{uid}/info/profile`             | 이름, 직무, 근무지          |
| `/workers/{uid}/dashboard/dashboard-info` | 피로도, 심박수, 체온, 근무시간 등 |

* **GPT 입력 예시**

  ```json
  {
    "uid": "abc123",
    "profile": {
      "name": "김철수",
      "center": "서울센터",
      "role": "분류 작업자"
    },
    "dashboard": {
      "fatigueLevel": "High",
      "workHours": 8.0,
      "temperature": 27.4,
      "latestAverageHeartRate": 92
    }
  }
  ```

* **응답 예시**

  ```json
  {
    "summary": "대부분 양호, 고위험 작업자 2명 존재",
    "insights": ["피로도 High 작업자 2명", "심박수 90 이상 인원 다수"],
    "recommendations": ["휴식 시간 재조정 권고", "고심박 인원 건강 검진 필요"],
    "risk_workers": ["김철수(ID: abc123): 피로도 High"],
    "charts_data": {
      "fatigue_chart": {"Low": 5, "Medium": 3, "High": 2},
      "heart_rate_chart": {"평균": 78, "최고": 105, "최저": 60}
    }
  }
  ```

---

## 📌 Firebase 구조 요약

| 경로                                        | 설명              |
| ----------------------------------------- | --------------- |
| `/heart_records/{uid}/heart_rate`         | 실시간 심박수 데이터     |
| `/heart_records/{uid}/hrv_record`         | 계산된 RMSSD (HRV) |
| `/workers/{uid}/dashboard/dashboard-info` | 피로도, 평균 심박수 등   |
| `/workers/{uid}/info/profile`             | 기본 프로필 정보       |

---

## 🛠️ 기술 요약

* 데이터 수집: Firebase Realtime Database
* 피로도 분석: RMSSD + Change Point Detection + KMeans
* 예측 모델: XGBoost + Prophet
* 리포트 생성: GPT-4 API
* 사용 언어 및 도구: Python, Django, Firebase Admin SDK, pandas, ruptures, scikit-learn

```

```
