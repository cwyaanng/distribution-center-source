# Nudge: 작업자 피로도 기반 스마트 물류 인력 관리 시스템

![Nudge Logo](/distribution-center/스크린샷%202025-06-08%20144108.png)

Nudge는 작업자의 생체 데이터를 기반으로 **피로도 상태를 분석**하고, 이를 통해 **근무 스케줄을 최적화**하는 스마트 물류센터 시스템입니다.  
웨어러블 디바이스를 통해 실시간으로 수집되는 건강 정보를 바탕으로, **작업자 건강 보호와 물류센터의 효율적 인력 운영**을 동시에 실현합니다.

---

## 🚀 주요 기능

- 📈 생체 데이터 기반 피로도 분석 (HRV, 걸음 수, 체온 등)
- 🧠 AI 기반 물류 수요 예측 및 인력 스케줄링
- 📊 관리자용 대시보드로 근로자 상태 실시간 모니터링
- 🔔 피로도에 따른 휴식 권고 자동 알림
- 👥 작업자/관리자 로그인 및 권한 분리
- 🌐 실시간 데이터 연동 (Firebase Realtime DB, Firestore)

---

## 🧩 시스템 아키텍처

![Architecture](/distribution-center/스크린샷%202025-06-08%20144215.png)

### 구성 요소

| 구성 요소 | 설명 |
|-----------|------|
| **Frontend** | Next.js 기반 UI, Vercel에 배포 |
| **Backend**  | Django 서버, Amazon EC2 호스팅 |
| **Database** | Firebase (Realtime DB, Firestore) |
| **AI 분석**  | HRV 기반 피로도 분석 및 XGBoost + Prophet 기반 물류량 예측 |
| **CI/CD**   | GitHub → Vercel 자동 배포 |
| **하드웨어** | Arduino + 센서 (심박수, 체온, 걸음 수 등) |

---

## 🛠️ 기술 스택

- Frontend: **Next.js**, TailwindCSS
- Backend: **Django**, Python
- Database: **Firebase (Realtime Database + Firestore)**
- ML/AI: **XGBoost, Prophet**, Linear Programming
- Hosting & CI/CD: **Vercel + GitHub**
- Hardware: **Arduino Pro Mini, PulseSensor, MPU6050, Temperature Sensor**

---

## 🧪 실험 및 데이터 분석

- 실시간 HRV(RMSSD) 모니터링으로 피로도 3단계 분류 (상/중/하)
- 물류 수요 예측 → 최적 인원 산출 → 주간 스케줄 자동 생성
- 사용자별 누적 피로도/작업량을 반영한 공정한 인력 배분

---

## ✅ 프로젝트 결과

- 💡 기존 시스템 대비 **건강 정보 반영된 스케줄링** 가능
- 📉 과로 및 산재 가능성 감소
- 📦 물류 수요 변화에 따른 유연한 인력 운영 가능
- 💰 상용 웨어러블 대비 저렴한 제작 단가 (약 18,500원)

---

## 🌍 링크

- 👉 [서비스 체험하기 (작업자/관리자 로그인)](https://v0-admin-and-worker-accounts.vercel.app/)
- 📽️ 데모 ID  
  - 관리자: `ajou@ajou.ac.kr` / `ajouacot`  
  - 작업자: `ajou01@ajou.ac.kr` / `ajouacot`

---

## 👥 팀 소개

> **4조** (2025 산업공학 종합설계 프로젝트)

- 양종원, 김현민, 성예담, 양채원, 장요원

---

## 📚 참고자료

- [서울 생활물류 데이터](https://data.seoul.go.kr/)
- [산재 분석 보고서](https://journal.kosdi.or.kr/)
- [HRV 분석 논문](https://www.frontiersin.org/)

---

