"use client"

import { useEffect, useState } from "react"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import { ref, onValue, off, set } from "firebase/database"
import { realtimeDb } from "@/lib/firebase"

export default function WorkerHeartRateChart({ uid }: { uid: string }) {
  const [data, setData] = useState<any[]>([])

  useEffect(() => {
    const heartRef = ref(realtimeDb, `heart_records/${uid}/heart_rate`)

    const unsubscribe = onValue(heartRef, async (snapshot) => {
      const history = snapshot.val() as Record<string, number>


      // ***만약 데이터 없으면 테스트용 더미 삽입 함수****//
      if (
        !history ||
        Object.values(history).every((_, i) => {
          const ts = Number(Object.keys(history)[i]) * 1000
          return ts < Date.now() - 1 * 60 * 60 * 1000
        })
      ) {
        console.warn("⚠ No recent heart rate data (within 1 hours). Inserting dummy data...")
        await insertDummyHeartRate(uid)
        return
      }

      const now = Date.now()
      const oneHoursAgo = now - 1 * 60 * 60 * 1000

      const raw = Object.entries(history)
        .map(([ts, value]) => {
          const ms = Number(ts) * 1000
          return {
            heartRate: value,
            timestamp: ms,
          }
        })
        .filter((entry) => entry.timestamp >= oneHoursAgo)
        .sort((a, b) => a.timestamp - b.timestamp)

      // ✅ 15분 단위 그룹핑 및 평균 계산
      const intervalMs = 30 * 1000
      const grouped: Record<string, number[]> = {}

      for (const entry of raw) {
        const bucket = Math.floor(entry.timestamp / intervalMs) * intervalMs
        if (!grouped[bucket]) grouped[bucket] = []
        grouped[bucket].push(entry.heartRate)
      }

      const averaged = Object.entries(grouped).map(([bucketMs, values]) => {
        const avg = values.reduce((sum, v) => sum + v, 0) / values.length
        return {
          time: new Date(Number(bucketMs)).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          heartRate: Math.round(avg),
        }
      })

      setData(averaged)
    })

    return () => off(heartRef, "value", unsubscribe)
  }, [uid])

  // ****** 테스트용 더미 삽입 함수 *******//
  async function insertDummyHeartRate(uid: string) {
    const now = Date.now()
    const dummyData: Record<string, number> = {}

    for (let i = 96; i >= 0; i--) {
      const timestamp = Math.floor((now - i * 5 * 60 * 1000) / 1000) // 초 단위
      const heartRate = Math.floor(Math.random() * 20) + 70 // 70~89 bpm
      dummyData[timestamp.toString()] = heartRate
    }

    const heartRateRef = ref(realtimeDb, `heart_records/${uid}/heart_rate`)
    await set(heartRateRef, dummyData)
  }

  return (
    <div className="w-full h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <XAxis dataKey="time" />
          <YAxis domain={[60, 120]} />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="heartRate"
            stroke="#ef4444"
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
