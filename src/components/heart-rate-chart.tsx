"use client"

import { useEffect, useState } from "react"
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { onAuthStateChanged } from "firebase/auth"
import { auth, realtimeDb } from "@/lib/firebase"
import { ref, onValue, off, set } from "firebase/database"

export default function HeartRateChart() {
  const [data, setData] = useState<any[]>([])

  useEffect(() => {
    let unsubscribe: (() => void) | undefined

    const fetchData = () => {
      onAuthStateChanged(auth, (user) => {
        if (!user) return

        const heartHistoryRef = ref(
          realtimeDb,
          `heart_records/${user.uid}/heart_rate`
        )

        const callback = onValue(heartHistoryRef, async (snapshot) => {
          const history = snapshot.val()

          const now = Date.now()
          const thirtyMinutesAgo = now - 30 * 60 * 1000 // 최근 30분 기준

          const formattedData = history
            ? Object.entries(history)
                .map(([timestamp, value]) => {
                  const ts = Number(timestamp) * 1000
                  const date = new Date(ts)
                  return {
                    time: date.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    }),
                    heartRate: value,
                    timestamp: ts,
                  }
                })
                .sort((a, b) => a.timestamp - b.timestamp)
            : []

          const recentData = formattedData.filter(
            (entry) => entry.timestamp >= thirtyMinutesAgo
          )

          if (recentData.length === 0) {
            console.log("No recent data in the last 30 minutes. Inserting dummy data...")
            await insertDummyHeartRate(user.uid)
            return
          }

          // 30초 간격으로 하나씩만 시각화
          const sampledData: typeof recentData = []
          let lastTimestamp = 0
          for (const point of recentData) {
            if (point.timestamp - lastTimestamp >= 30 * 1000) {
              sampledData.push(point)
              lastTimestamp = point.timestamp
            }
          }

          setData(sampledData)
        })

        unsubscribe = () => off(heartHistoryRef, "value", callback)
      })
    }

    // 1시간치 데이터를 0~1초 간격으로 생성하여 저장
    async function insertDummyHeartRate(uid: string) {
      const now = Date.now()
      const dummyData: Record<string, number> = {}

      let current = now - 60 * 60 * 1000 // 1시간 전부터 시작
      while (current <= now) {
        const timestamp = Math.floor(current / 1000)
        const heartRate = Math.floor(Math.random() * 30) + 70
        dummyData[timestamp.toString()] = heartRate

        const randomInterval = Math.floor(Math.random() * 1000) // 0~999ms
        current += randomInterval
      }

      const heartRateRef = ref(realtimeDb, `heart_records/${uid}/heart_rate`)
      await set(heartRateRef, dummyData)
      console.log("Dummy heart rate data inserted")
    }

    fetchData()
    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [])

  return (
    <div className="w-full h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 5, right: 10, left: 10, bottom: 0 }}
        >
          <XAxis
            dataKey="time"
            tickLine={false}
            axisLine={false}
            padding={{ left: 10, right: 10 }}
            minTickGap={20} // 너무 많은 라벨 방지
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${value}`}
            domain={[60, 120]}
            padding={{ top: 10, bottom: 10 }}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="rounded-lg border bg-background p-2 shadow-sm">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex flex-col">
                        <span className="text-[0.70rem] uppercase text-muted-foreground">
                          시간
                        </span>
                        <span className="font-bold text-sm">
                          {payload[0].payload.time}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[0.70rem] uppercase text-muted-foreground">
                          심박수
                        </span>
                        <span className="font-bold text-sm">
                          {payload[0].value} bpm
                        </span>
                      </div>
                    </div>
                  </div>
                )
              }
              return null
            }}
          />
          <Line
            type="monotone"
            dataKey="heartRate"
            stroke="#ef4444"
            strokeWidth={2}
            activeDot={{ r: 6, style: { fill: "#ef4444" } }}
            dot={{ r: 4, style: { fill: "#ef4444" } }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
