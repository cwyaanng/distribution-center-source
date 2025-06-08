"use client"

import { useEffect, useState } from "react"
import { auth, db } from "@/lib/firebase"
import { onAuthStateChanged } from "firebase/auth"
import { doc, getDoc , setDoc } from "firebase/firestore"
import { Calendar, Clock, MapPin } from "lucide-react"

const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

interface Shift {
  day: string
  startTime: string
  endTime: string
  center: string
  working: boolean
}

export default function WorkSchedule() {
  const [shifts, setShifts] = useState<Shift[]>([])

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) return

      const scheduleRef = doc(db, "workers", user.uid, "dashboard", "workSchedule")
      const profileRef = doc(db, "workers", user.uid, "info", "profile")

      const [scheduleSnap, profileSnap] = await Promise.all([getDoc(scheduleRef), getDoc(profileRef)])

      //데이터 없으면 더미 데이터 넣어주는 코드 
      if(!scheduleSnap.exists())
      {
        await setDoc(scheduleRef, {
          weekPattern: "1101100",
        })
      }
    
      if (scheduleSnap.exists() && profileSnap.exists()) {
        const weekPattern = scheduleSnap.data().weekPattern as string
        const center = profileSnap.data().center as string

        const generatedShifts: Shift[] = weekPattern.split("").map((value, index) => ({
          day: daysOfWeek[index],
          startTime: "09:00 AM",
          endTime: "06:00 PM",
          center,
          working: value === "1",
        }))

        setShifts(generatedShifts)
      }
    })

    return () => unsubscribe()
  }, [])

  return (
    <div className="space-y-6">
      {shifts
        .filter((shift) => shift.working) // 근무일만 표시
        .map((shift) => (
          <div key={shift.day} className="flex flex-col space-y-2 rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">{shift.day}</span>
              </div>
              <div className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                Scheduled
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <span>
                {shift.startTime} - {shift.endTime}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <MapPin className="h-5 w-5 text-muted-foreground" />
              <span>{shift.center}</span>
            </div>
          </div>
        ))}
    </div>
  )
}
