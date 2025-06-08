from pulp import LpProblem, LpVariable, lpSum, LpMinimize, LpBinary, LpStatus


class WeeklyScheduler:
    def __init__(self, days=7, workdays_per_worker=5):
        self.days = days
        self.workdays_per_worker = workdays_per_worker

    def schedule(
        self,
        fatigue_ratios: dict,        # {worker_id: fatigue_ratio (0~1)}
        weekly_steps: dict,          # {worker_id: total_steps_this_week}
        cumulative_workloads: dict,  # {worker_id: total_workload}
        cumulative_hours: dict,      # {worker_id: total_hours}
        required_workers: list,      # [Mon_required, ..., Sun_required]
        alpha: float,                # HRV 피로도 가중치
        delta: float,                # 걸음 수 피로도 가중치
        beta: float,                 # 작업량 형평성 가중치
        gamma: float                 # 근로시간 형평성 가중치
    ):
        """
        Returns: {worker_id: [0/1 x7]} -> 일주일 스케줄
        """
        worker_ids = list(fatigue_ratios.keys())
        
        # 1. 기본 최적화: 피로도 최소화 + 형평성 고려
        prob = LpProblem("WeeklyScheduling", LpMinimize)
        x = {(i, d): LpVariable(f"x_{i}_{d}", cat=LpBinary) for i in worker_ids for d in range(self.days)}

        # 목적 함수
        fatigue_term_1 = lpSum(fatigue_ratios[i] * x[i, d] for i in worker_ids for d in range(self.days))
        fatigue_term_2 = lpSum(weekly_steps * x[i, d] for i in worker_ids for d in range(self.days))
        workload_term = lpSum(cumulative_workloads[i] * lpSum(x[i, d] for d in range(self.days)) for i in worker_ids)
        hours_term = lpSum(cumulative_hours[i] * lpSum(x[i, d] for d in range(self.days)) for i in worker_ids)
        prob += alpha * fatigue_term_1 + delta * fatigue_term_2 + beta * workload_term + gamma * hours_term

        # 제약 조건 1: 각 작업자는 주 4-5일 근무
        for i in worker_ids:
            prob += lpSum(x[i, d] for d in range(self.days)) >= 4
            prob += lpSum(x[i, d] for d in range(self.days)) <= 5

        # 제약 조건 2: 각 요일에 필요한 인원 수 충족 (<- 물류량 예측)
        for d in range(self.days):
            prob += lpSum(x[i, d] for i in worker_ids) == required_workers[d]

        # 최적화
        prob.solve()

        # 2. 최적화 실패 시 (HRV) 피로도 최소화만 고려
        if prob.status != 1:
            print("최적화 실패: 피로도만 고려하는 근접 스케줄링 시도")

            # 새로운 문제 정의
            relaxed_prob = LpProblem("FatigueOnlyScheduling", LpMinimize)
            x_relaxed = {(i, d): LpVariable(f"x_relaxed_{i}_{d}", cat=LpBinary) for i in worker_ids for d in range(self.days)}

            # 목적 함수
            fatigue_term_relaxed = lpSum(fatigue_ratios[i] * x_relaxed[i, d] for i in worker_ids for d in range(self.days))
            relaxed_prob += fatigue_term_relaxed

            # 제약 조건 1
            for i in worker_ids:
                prob += lpSum(x[i, d] for d in range(self.days)) >= 4
                prob += lpSum(x[i, d] for d in range(self.days)) <= 5
            # 제약 조건 2
            for d in range(self.days):
                relaxed_prob += lpSum(x_relaxed[i, d] for i in worker_ids) == required_workers[d]

            # 다시 최적화
            relaxed_prob.solve()

            if relaxed_prob.status != 1:
                raise ValueError(f"스케줄링 최적화 실패 (Relaxed mode). 상태: {LpStatus[relaxed_prob.status]}")

            # 성공한 경우 결과 반환
            schedule_result = {
                i: [int(x_relaxed[i, d].varValue) for d in range(self.days)] for i in worker_ids
            }
            return schedule_result

        # 기본 최적화 성공한 경우
        else:
            schedule_result = {
                i: [int(x[i, d].varValue) for d in range(self.days)] for i in worker_ids
            }
            return schedule_result