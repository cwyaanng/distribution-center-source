"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface LogisticsCenter {
  id: string
  name: string
  location: string
  workers: number
  capacity: number
  status: "Active" | "Maintenance" | "Closed"
}

const centers: LogisticsCenter[] = [
  { id: "1", name: "Seoul Center", location: "Seoul, South Korea", workers: 85, capacity: 100, status: "Active" },
  { id: "2", name: "Busan Center", location: "Busan, South Korea", workers: 42, capacity: 50, status: "Active" },
  { id: "3", name: "Incheon Center", location: "Incheon, South Korea", workers: 28, capacity: 40, status: "Active" },
  { id: "4", name: "Daejeon Center", location: "Daejeon, South Korea", workers: 15, capacity: 30, status: "Active" },
  { id: "5", name: "Gwangju Center", location: "Gwangju, South Korea", workers: 19, capacity: 30, status: "Active" },
  { id: "6", name: "Daegu Center", location: "Daegu, South Korea", workers: 0, capacity: 40, status: "Maintenance" },
  { id: "7", name: "Ulsan Center", location: "Ulsan, South Korea", workers: 0, capacity: 25, status: "Closed" },
  { id: "8", name: "Sejong Center", location: "Sejong, South Korea", workers: 0, capacity: 20, status: "Closed" },
]

export default function LogisticsCentersTable() {
  const [sortField, setSortField] = useState<keyof LogisticsCenter>("name")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [searchTerm, setSearchTerm] = useState("")

  const handleSort = (field: keyof LogisticsCenter) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const getSortIcon = (field: keyof LogisticsCenter) => {
    if (sortField !== field) return <ChevronsUpDown className="ml-2 h-4 w-4" />
    return sortDirection === "asc" ? <ChevronUp className="ml-2 h-4 w-4" /> : <ChevronDown className="ml-2 h-4 w-4" />
  }

  const filteredCenters = centers.filter(
    (center) =>
      center.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      center.location.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const sortedCenters = [...filteredCenters].sort((a, b) => {
    if (a[sortField] < b[sortField]) return sortDirection === "asc" ? -1 : 1
    if (a[sortField] > b[sortField]) return sortDirection === "asc" ? 1 : -1
    return 0
  })

  return (
    <div className="w-full">
      <div className="flex items-center py-4">
        <Input
          placeholder="Search centers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>
      <div className="rounded-md border">
        <div className="w-full overflow-auto">
          <table className="w-full caption-bottom text-sm">
            <thead>
              <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                <th className="h-12 px-4 text-left align-middle font-medium">
                  <Button variant="ghost" onClick={() => handleSort("name")} className="flex items-center font-medium">
                    Center Name
                    {getSortIcon("name")}
                  </Button>
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium">
                  <Button
                    variant="ghost"
                    onClick={() => handleSort("location")}
                    className="flex items-center font-medium"
                  >
                    Location
                    {getSortIcon("location")}
                  </Button>
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium">
                  <Button
                    variant="ghost"
                    onClick={() => handleSort("workers")}
                    className="flex items-center font-medium"
                  >
                    Workers
                    {getSortIcon("workers")}
                  </Button>
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium">
                  <Button
                    variant="ghost"
                    onClick={() => handleSort("capacity")}
                    className="flex items-center font-medium"
                  >
                    Capacity
                    {getSortIcon("capacity")}
                  </Button>
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium">
                  <Button
                    variant="ghost"
                    onClick={() => handleSort("status")}
                    className="flex items-center font-medium"
                  >
                    Status
                    {getSortIcon("status")}
                  </Button>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedCenters.map((center) => (
                <tr
                  key={center.id}
                  className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                >
                  <td className="p-4 align-middle">{center.name}</td>
                  <td className="p-4 align-middle">{center.location}</td>
                  <td className="p-4 align-middle">{center.workers}</td>
                  <td className="p-4 align-middle">{center.capacity}</td>
                  <td className="p-4 align-middle">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        center.status === "Active"
                          ? "bg-green-100 text-green-800"
                          : center.status === "Maintenance"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                      }`}
                    >
                      {center.status}
                    </span>
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
