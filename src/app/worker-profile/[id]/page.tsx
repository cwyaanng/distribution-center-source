"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import WorkerProfileClient from "./WorkerProfileClient"

export default function Page() {
  const params = useParams()
  const id = params?.id as string

  if (!id) return <p className="p-4">잘못된 접근입니다.</p>

  return <WorkerProfileClient id={id} />
}
