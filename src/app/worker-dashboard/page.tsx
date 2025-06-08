"use client"

import { Activity, Clock, Heart } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import WorkerNavbar from "@/components/worker-navbar"
import HeartRateChart from "@/components/heart-rate-chart"
import WorkSchedule from "@/components/work-schedule"
import { useEffect, useState } from "react"
import { auth, db } from "@/lib/firebase"
import { onAuthStateChanged } from "firebase/auth"
import { getDoc, doc, setDoc } from "firebase/firestore"
import { ref, onValue } from "firebase/database"
import { realtimeDb } from "@/lib/firebase"


function formatMinutesToHours(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h}h ${m}m`
}


export default function WorkerDashboard() {
  const [dashboardData, setDashboardData] = useState<any>(null)

  useEffect(() => {
    async function insertDummyData(uid: string) {
      const docRef = doc(db, "workers", uid, "dashboard", "dashboard-info")
      await setDoc(docRef, {
        latestAverageHeartRate: 72,
        workHours: "7h 45m",
        fatigueLevel: "Low",
        temperature: 36.8,
        stepCount: 8520,
      })
      console.log("Dummy data inserted")
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) return

      const docRef = doc(db, "workers", user.uid, "dashboard", "dashboard-info")
      const snapshot = await getDoc(docRef)

      let firestoreData = {}

      if (!snapshot.exists()) {
        await insertDummyData(user.uid)
        setDashboardData(snapshot.data())
      } else {
        firestoreData = snapshot.data()
      }

      const updatedSnapshot = await getDoc(docRef)
      if (updatedSnapshot.exists()) {
        setDashboardData(updatedSnapshot.data())
      }

      const heartRateRef = ref(realtimeDb, `heart_records/${user.uid}/heart_rate`)
      onValue(heartRateRef, async (heartSnap) => {
        const heartData = heartSnap.val()
        if (!heartData) return

        const latestTimestamp = Math.max(...Object.keys(heartData).map(Number))
        const latestHeartRate = heartData[latestTimestamp]

        setDashboardData({
          ...firestoreData,
          latestAverageHeartRate: latestHeartRate,
        })

        await setDoc(
          docRef,
          { latestAverageHeartRate: latestHeartRate },
          { merge: true }
        )
      })
    })

    return () => unsubscribe()
  }, [])

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-800">
      <WorkerNavbar />
      <div className="flex-1 space-y-6 p-8 pt-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <h2 className="text-4xl font-bold tracking-tight text-blue-700">작업자 대시보드</h2>
          <div className="flex items-center space-x-2 text-sm text-slate-500 font-medium">
            <Clock className="h-4 w-4 text-blue-500" />
            <span>
              {new Date().toLocaleDateString("ko-KR", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          </div>
        </div>

        <Tabs defaultValue="health" className="space-y-4">
          <TabsList className="bg-white shadow rounded-md">
            <TabsTrigger
              value="health"
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-blue-600"
            >
              건강 지표
            </TabsTrigger>
            <TabsTrigger
              value="schedule"
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-blue-600"
            >
              근무 스케줄
            </TabsTrigger>
          </TabsList>

          {/* 건강 지표 */}
          <TabsContent value="health" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              {/* 1 */}
              <Card className="bg-white shadow-sm rounded-xl">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">최근 심박수</CardTitle>
                  <Heart className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-slate-800">
                    {dashboardData?.latestAverageHeartRate != null
                      ? `${dashboardData.latestAverageHeartRate} bpm`
                      : "Loading..."}
                  </div>
                  <p className="text-xs text-slate-500">정상 범위</p>
                </CardContent>
              </Card>

              {/* 2 */}
              <Card className="bg-white shadow-sm rounded-xl">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">피로도</CardTitle>
                  <Activity className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-slate-800">
                    {dashboardData?.fatigueLevel ?? "Loading..."}
                  </div>
                  <p className="text-xs text-slate-500">피로 수준</p>
                </CardContent>
              </Card>

              {/* 3 */}
              <Card className="bg-white shadow-sm rounded-xl">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">오늘 일한 시간</CardTitle>
                  <Clock className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-slate-800">
                    {dashboardData?.workHours != null
                      ? typeof dashboardData.workHours === "number"
                        ? formatMinutesToHours(dashboardData.workHours)
                        : dashboardData.workHours // 혹시 기존 방식의 문자열이면 그대로 사용
                      : "Loading..."}
                  </div>
                  <p className="text-xs text-slate-500">근무 시간 기준</p>
                </CardContent>
              </Card>

              {/* 4 - 체온 */}
              <Card className="bg-white shadow-sm rounded-xl">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">체온</CardTitle>
                  <span className="text-blue-500 text-xl">🌡️</span>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-slate-800">
                    {dashboardData?.temperature ? `${dashboardData.temperature} °C` : "Loading..."}
                  </div>
                  <p className="text-xs text-slate-500">평균 체온</p>
                </CardContent>
              </Card>

              {/* 5 - 걸음 수 */}
              <Card className="bg-white shadow-sm rounded-xl">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">걸음 수</CardTitle>
                  <span className="text-blue-500 text-xl">👟</span>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-slate-800">
                    {dashboardData?.totalWalk != null ? `${dashboardData.totalWalk} 걸음` : "Loading..."}
                  </div>
                  <p className="text-xs text-slate-500">오늘 총 이동</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4">
              <Card className="col-span-1 bg-white shadow-sm rounded-xl">
                <CardHeader>
                  <CardTitle className="text-lg text-slate-700">심박수 기록</CardTitle>
                  <CardDescription className="text-sm text-slate-500">
                    최근 심박수 추이를 나타내는 그래프입니다.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pl-2">
                  <HeartRateChart />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 근무 스케줄 */}
          <TabsContent value="schedule" className="space-y-4">
            <Card className="bg-white shadow-sm rounded-xl">
              <CardHeader>
                <CardTitle className="text-lg text-slate-700">근무 스케줄</CardTitle>
                <CardDescription className="text-sm text-slate-500">
                  이번 주의 근무 스케줄입니다.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <WorkSchedule />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
