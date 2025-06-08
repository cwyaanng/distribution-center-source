"use client"

import { useEffect, useState } from "react"
import { doc, getDoc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import Link from "next/link"
import { Activity, ArrowLeft, Clock, Heart, Thermometer, Timer, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import AdminNavbar from "@/components/admin-navbar"
import WorkerHeartRateChart from "./WorkerHeartRateChart"
import AdminWorkerSchedule from "@/components/admin-worker-schedule"

interface WorkerData {
  name: string
  email: string
  center: string
  startDate: string
  heartRate: number
  fatigueLevel: string
  workHours: number
  temperature: number
  totalWalk: number
}

function formatMinutesToHours(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h}h ${m}m`
}



export default function WorkerProfileClient({ id }: { id: string }) {
  const [worker, setWorker] = useState<WorkerData | null>(null)

  useEffect(() => {
    const fetchWorker = async () => {
      try {
        const profileRef = doc(db, "workers", id, "info", "profile")
        const dashboardRef = doc(db, "workers", id, "dashboard", "dashboard-info")

        const [profileSnap, dashboardSnap] = await Promise.all([
          getDoc(profileRef),
          getDoc(dashboardRef),
        ])

        if (profileSnap.exists() && dashboardSnap.exists()) {
          const profile = profileSnap.data()
          const dashboard = dashboardSnap.data()

          setWorker({
            name: profile.name ?? "N/A",
            email: profile.email ?? "N/A",
            center: profile.center ?? "N/A",
            startDate:
              profile.createdAt?.toDate().toISOString().split("T")[0] ?? "N/A",
            heartRate: dashboard.latestAverageHeartRate ?? 0,
            fatigueLevel: dashboard.fatigueLevel ?? "Low",
            workHours: dashboard.workHours ?? 3.6,
            temperature: dashboard.temperature ?? 36.5,
            totalWalk: dashboard.totalWorkHours ?? 978,
          })
        }
      } catch (error) {
        console.error("Failed to fetch worker data:", error)
      }
    }

    fetchWorker()
  }, [id])

  const handleCallWorker = async () => {
    try {
      const dashboardRef = doc(db, "workers", id, "dashboard", "dashboard-info")
      await updateDoc(dashboardRef, { call: true })
      alert("작업자 호출 요청이 전송되었습니다.")
    } catch (error) {
      console.error("작업자 호출 실패:", error)
      alert("작업자 호출에 실패했습니다.")
    }
  }

  if (!worker) return <p className="p-6">Loading worker profile...</p>

  return (
    <div className="flex min-h-screen flex-col">
      <AdminNavbar />
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center space-x-2">
          <Link href="/admin-dashboard">
            <Button variant="ghost" size="sm" className="gap-1">
              <ArrowLeft className="h-4 w-4" />
              대시보드로 돌아가기
            </Button>
          </Link>
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          <Card className="md:w-1/3 flex flex-col">
            <CardHeader>
              <div className="flex flex-col items-center space-y-4">
                <Avatar className="h-24 w-24">
                  <AvatarImage
                    src={`/placeholder.svg?height=96&width=96`}
                    alt={worker.name}
                  />
                  <AvatarFallback>{worker.name[0]}</AvatarFallback>
                </Avatar>
                <div className="space-y-1 text-center">
                  <h2 className="text-2xl font-bold">{worker.name}</h2>
                  <p className="text-muted-foreground">작업자</p>
                  <div className="flex items-center justify-center text-sm text-muted-foreground">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="mr-1 h-3 w-3"
                    >
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    {worker.center}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center">
                    <User className="mr-2 h-4 w-4 opacity-70" />
                    <span className="text-sm font-medium">개인 정보</span>
                  </div>
                  <div className="grid gap-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Email</span>
                      <span>{worker.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">가입일</span>
                      <span>{worker.startDate}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-center mt-6">
                <Button
                  onClick={handleCallWorker}
                  className="bg-black text-white px-7 py-2.5"
                >
                  작업자 호출
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="md:w-2/3 space-y-6">
            <Tabs defaultValue="health" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="health">건강 정보</TabsTrigger>
                <TabsTrigger value="schedule">근무 스케줄</TabsTrigger>
              </TabsList>
              <TabsContent value="health" className="space-y-4 pt-4">
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">심박수</CardTitle>
                      <Heart className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{worker.heartRate} bpm</div>
                      <p className="text-xs text-muted-foreground">정상 범위</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">피로도</CardTitle>
                      <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{worker.fatigueLevel}</div>
                      <p className="text-xs text-muted-foreground">작업자의 피로 수준</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">오늘 근무시간</CardTitle>
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-slate-800">
                        {typeof worker.workHours === "number"
                          ? formatMinutesToHours(worker.workHours)
                          : worker.workHours}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">체온</CardTitle>
                      <Thermometer className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{worker.temperature}°C</div>
                      <p className="text-xs text-muted-foreground">최근 측정값</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">누적 걸음수</CardTitle>
                      <Timer className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{worker.totalWalk}</div>
                    </CardContent>
                  </Card>
                </div>
                <Card>
                  <CardHeader>
                    <CardTitle>심박수 추이</CardTitle>
                    <CardDescription>1시간 동안의 심박수 변화</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <WorkerHeartRateChart uid={id} />
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="schedule" className="space-y-4 pt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>근무 스케줄</CardTitle>
                    <CardDescription>이번 주의 근무 스케줄</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <AdminWorkerSchedule uid={id} />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  )
}
