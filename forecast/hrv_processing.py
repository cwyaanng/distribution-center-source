from firebase_admin import db
from datetime import datetime
from numba import jit
import math

# ---------------------------
# Numba 기반 RMSSD 계산기
# ---------------------------
@jit(nopython=True)
def fast_rmssd(rr_intervals):
    if len(rr_intervals) < 2:
        return -1
    diffs = [(rr_intervals[i+1] - rr_intervals[i])**2 for i in range(len(rr_intervals)-1)]
    mean_sq_diff = sum(diffs) / len(diffs)
    return math.sqrt(mean_sq_diff)

# ---------------------------
# BPM → RR 변환
# ---------------------------
def bpm_to_rr(bpm_data_sorted):
    rr_list = []
    for _, bpm in bpm_data_sorted:
        if bpm > 0:
            rr = 60000 / bpm
            rr_list.append(rr)
    return rr_list

# ---------------------------
# 전체 HRV 전수 계산 및 저장 (3분 단위 슬라이딩)
# ---------------------------
def update_hrv_for_worker(uid, window_minutes=3):
    # 1. Firebase에서 bpm 데이터 불러오기
    ref = db.reference(f'heart_records/{uid}/heart_rate')
    bpm_data = ref.get()

    if not bpm_data:
        print(f"[{uid}] 심박수 데이터 없음")
        return 0

    # 2. 정렬 및 정수 timestamp 필터링
    try:
        sorted_items = sorted((int(ts), val) for ts, val in bpm_data.items() if ts.isdigit())
    except Exception as e:
        print(f"[{uid}] timestamp 파싱 오류: {e}")
        return 0

    if len(sorted_items) < 3:
        print(f"[{uid}] 유효한 심박수 데이터 부족")
        return 0

    window_size = window_minutes * 10  # 초 단위
    start_ts = sorted_items[0][0]
    end_ts = sorted_items[-1][0]

    hrv_results = {}
    current_start = start_ts

    while current_start + window_size <= end_ts:
        current_end = current_start + window_size
        window_data = [(ts, bpm) for ts, bpm in sorted_items if current_start <= ts < current_end]

        if len(window_data) >= 3:
            rr_intervals = bpm_to_rr(window_data)
            rmssd = fast_rmssd(rr_intervals)
            if rmssd != -1:
                hrv_results[str(current_end)] = rmssd

        current_start += window_size  # 다음 윈도우로 이동

    if not hrv_results:
        print(f"[{uid}] 계산된 HRV 없음")
        return 0

    # 3. HRV 저장
    hrv_ref = db.reference(f'heart_records/{uid}/hrv_record')
    hrv_ref.update(hrv_results)

    print(f"[{uid}] HRV {len(hrv_results)}개 저장 완료")
    return len(hrv_results)
