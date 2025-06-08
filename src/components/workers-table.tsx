"use client"

import { useEffect, useState } from "react"
import { db } from "@/lib/firebase"
import { collection, doc, getDoc, getDocs } from "firebase/firestore"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ChevronDown, ChevronUp, ChevronsUpDown, ExternalLink } from "lucide-react"

interface Worker {
  id: string
  name: string
  center: string
  heartRate: number
  fatigueLevel: "Low" | "Medium" | "High"
  workHours: string
}

function formatMinutesToHours(minutes: any): string {
  if (typeof minutes !== "number" || !isFinite(minutes)) {
    return "0h 0m"
  }
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h}h ${m}m`
}


export default function WorkersTable() {
  const [workers, setWorkers] = useState<Worker[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [sortField, setSortField] = useState<keyof Worker>("name")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")

  useEffect(() => {
    const fetchWorkers = async () => {
      console.log("Firebase: Fetching workers collection...")
      const snapshot = await getDocs(collection(db, "workers"))
      const results: Worker[] = []

      for (const docSnap of snapshot.docs) {
        const uid = docSnap.id
        console.log(`Found worker UID: ${uid}`)

        const profileRef = doc(db, "workers", uid, "info", "profile")
        const dashboardRef = doc(db, "workers", uid, "dashboard", "dashboard-info")

        const [profileSnap, dashboardSnap] = await Promise.all([
          getDoc(profileRef),
          getDoc(dashboardRef),
        ])

        const profile = profileSnap.exists() ? profileSnap.data() ?? {} : {}
        const dashboard = dashboardSnap.exists() ? dashboardSnap.data() ?? {} : {}

        results.push({
          id: uid,
          name: profile.name ?? "이름없음",
          center: profile.center ?? "센터없음",
          heartRate: dashboard.latestAverageHeartRate ?? 0,
          fatigueLevel: dashboard.fatigueLevel ?? "Low",
          workHours: formatMinutesToHours(dashboard.workHours ?? 0),
        })
      }

      setWorkers(results)
      console.log("Final workers array:", results)
    }

    fetchWorkers()
  }, [])

  const handleSort = (field: keyof Worker) => {
    setSortDirection(sortField === field && sortDirection === "asc" ? "desc" : "asc")
    setSortField(field)
  }

  const getSortIcon = (field: keyof Worker) => {
    if (sortField !== field) return <ChevronsUpDown className="ml-2 h-4 w-4" />
    return sortDirection === "asc" ? <ChevronUp className="ml-2 h-4 w-4" /> : <ChevronDown className="ml-2 h-4 w-4" />
  }

  const filteredWorkers = workers.filter(
    (worker) =>
      worker.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      worker.center.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const sortedWorkers = [...filteredWorkers].sort((a, b) => {
    const valA = a[sortField]
    const valB = b[sortField]
    if (valA < valB) return sortDirection === "asc" ? -1 : 1
    if (valA > valB) return sortDirection === "asc" ? 1 : -1
    return 0
  })

  return (
    <div className="w-full">
      <div className="flex items-center py-4">
        <Input
          placeholder="Search workers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>
      <div className="rounded-md border">
        <div className="w-full overflow-auto">
          <table className="w-full caption-bottom text-sm">
            <thead>
              <tr className="border-b">
                <th className="h-12 px-4 text-left font-medium">
                  <Button variant="ghost" onClick={() => handleSort("name")} className="flex items-center">
                    이름 {getSortIcon("name")}
                  </Button>
                </th>
                <th className="h-12 px-4 text-left font-medium">
                  <Button variant="ghost" onClick={() => handleSort("center")} className="flex items-center">
                    소속 센터 {getSortIcon("center")}
                  </Button>
                </th>
                <th className="h-12 px-4 text-left font-medium">
                  <Button variant="ghost" onClick={() => handleSort("heartRate")} className="flex items-center">
                    심박수 {getSortIcon("heartRate")}
                  </Button>
                </th>
                <th className="h-12 px-4 text-left font-medium">
                  <Button variant="ghost" onClick={() => handleSort("fatigueLevel")} className="flex items-center">
                    피로도 {getSortIcon("fatigueLevel")}
                  </Button>
                </th>
                <th className="h-12 px-4 text-left font-medium">
                  <Button variant="ghost" onClick={() => handleSort("workHours")} className="flex items-center">
                    근무 시간 {getSortIcon("workHours")}
                  </Button>
                </th>
                <th className="h-12 px-4 text-left font-medium">프로필</th>
              </tr>
            </thead>
            <tbody>
              {sortedWorkers.map((worker) => (
                <tr key={worker.id} className="border-b">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={`/placeholder.svg?height=32&width=32`} alt={worker.name} />
                        <AvatarFallback>{worker.name[0]}</AvatarFallback>
                      </Avatar>
                      {worker.name}
                    </div>
                  </td>
                  <td className="p-4">{worker.center}</td>
                  <td className="p-4">
                    <span className={
                      worker.heartRate > 100 ? "text-red-600"
                      : worker.heartRate > 90 ? "text-yellow-600"
                      : "text-green-600"
                    }>
                      {worker.heartRate} bpm
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      worker.fatigueLevel === "Low"
                        ? "bg-green-100 text-green-800"
                        : worker.fatigueLevel === "Medium"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-red-100 text-red-800"
                    }`}>
                      {worker.fatigueLevel}
                    </span>
                  </td>
                  <td className="p-4">{worker.workHours}</td>
                  <td className="p-4">
                    <Link href={`/worker-profile/${worker.id}`}>
                      <Button variant="ghost" size="icon">
                        <ExternalLink className="h-4 w-4" />
                        <span className="sr-only">프로필 보기</span>
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
