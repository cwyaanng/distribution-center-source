import { Clock } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import AdminNavbar from "@/components/admin-navbar"
import WorkersTable from "@/components/workers-table"
import AiAnalysisPanel from "@/components/ai-analysis-panel"


export default function AdminDashboard() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-800">
      <AdminNavbar />
      <main className="flex-1 space-y-6 p-8 pt-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <h2 className="text-4xl font-bold tracking-tight text-blue-700 font-sans">관리자 대시보드</h2>
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

        <AiAnalysisPanel />

        {/* 작업자 테이블 */}
        <Card className="bg-white shadow-sm rounded-xl">
          <CardHeader>
            <CardTitle className="text-lg text-slate-700">작업자</CardTitle>
            <CardDescription className="text-sm text-slate-500">
              모든 작업자의 건강 정보 및 현재 상태를 확인하세요.
            </CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <WorkersTable />
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
