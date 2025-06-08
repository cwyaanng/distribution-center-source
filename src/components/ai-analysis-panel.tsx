"use client"

import { useEffect, useState } from "react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { BarChart2, AlertTriangle, Lightbulb, Users } from "lucide-react"

interface AiAnalysisResult {
  summary: string
  insights: string[]
  recommendations: string[]
  risk_workers: string[]
  charts_data: {
    fatigue_chart: Record<string, number>
    temperature_chart: Record<string, number>
  }
}

export default function AiAnalysisPanel() {
  const [loading, setLoading] = useState(true)
  const [result, setResult] = useState<AiAnalysisResult | null>(null)

  useEffect(() => {
    const fetchAiAnalysis = async () => {
      try {
        const res = await fetch("https://distributioncentermanage.store/api/ai-analysis/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ analysis_type: "team" }),
        })

        if (!res.ok) throw new Error("Failed to fetch AI analysis")

        const data = await res.json()
        setResult(data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchAiAnalysis()
  }, [])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>AI 분석 요약</CardTitle>
          <CardDescription>작업자 데이터를 분석 중입니다...</CardDescription>
        </CardHeader>
        <CardContent className="text-slate-500">Loading...</CardContent>
      </Card>
    )
  }

  if (!result) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>AI 분석 실패</CardTitle>
        </CardHeader>
        <CardContent className="text-red-500">데이터를 불러오지 못했습니다.</CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-white shadow-sm rounded-xl">
      <CardHeader>
        <CardTitle className="text-lg text-slate-700">AI 분석 요약</CardTitle>
        <CardDescription className="text-sm text-slate-500">
          전체 작업자의 상태를 AI가 분석한 결과입니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="space-y-1">
          <p className="font-semibold flex items-center gap-2 text-blue-700">
            <BarChart2 className="h-4 w-4" />
            요약
          </p>
          <p className="text-slate-700">{result.summary}</p>
        </div>

        <div className="space-y-1">
          <p className="font-semibold flex items-center gap-2 text-amber-600">
            <AlertTriangle className="h-4 w-4" />
            주요 인사이트
          </p>
          <ul className="list-disc ml-6 text-slate-700">
            {result.insights.map((insight, i) => (
              <li key={i}>{insight}</li>
            ))}
          </ul>
        </div>

        <div className="space-y-1">
          <p className="font-semibold flex items-center gap-2 text-green-700">
            <Lightbulb className="h-4 w-4" />
            권장 조치
          </p>
          <ul className="list-disc ml-6 text-slate-700">
            {result.recommendations.map((rec, i) => (
              <li key={i}>{rec}</li>
            ))}
          </ul>
        </div>

        <div className="space-y-1">
          <p className="font-semibold flex items-center gap-2 text-red-700">
            <Users className="h-4 w-4" />
            위험 작업자
          </p>
          <ul className="list-disc ml-6 text-slate-700">
            {result.risk_workers.length > 0 ? (
              result.risk_workers.map((worker, i) => <li key={i}>{worker}</li>)
            ) : (
              <li>고위험 작업자 없음</li>
            )}
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
