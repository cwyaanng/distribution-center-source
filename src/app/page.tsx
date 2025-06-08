"use client"

import Link from "next/link"
import Image from "next/image"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { signInWithEmailAndPassword } from "firebase/auth"
import { auth, db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { doc, getDoc } from "firebase/firestore"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isAdmin, setIsAdmin] = useState(false)

  const handleLogin = async () => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      const user = userCredential.user

      const roleCollection = isAdmin ? "admins" : "workers"
      const profileRef = doc(db, roleCollection, user.uid, "info", "profile")
      const profileSnap = await getDoc(profileRef)

      if (!profileSnap.exists()) {
        throw new Error("역할 정보가 존재하지 않습니다.")
      }

      router.push(isAdmin ? "/admin-dashboard" : "/worker-dashboard")
    } catch (error) {
      console.error("Login error:", error)
      alert("로그인 실패. 관리자/작업자 역할을 확인하거나 비밀번호를 다시 입력하세요.")
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* 왼쪽: 로고 및 설명 */}
      <div className="hidden lg:flex flex-col items-center justify-center bg-gradient-to-br from-white to-blue-50 p-10 text-center">
        <div className="max-w-md w-full space-y-6">
          <Image
            src="/logo.png"
            alt="Nudge Logo"
            width={280}
            height={280}
            className="mx-auto object-cover object-top rounded shadow-lg"
          />
          <p className="text-center text-gray-700 text-xl leading-relaxed tracking-tight font-medium">
          작업자의 <span className="text-blue-600 font-semibold">건강</span>을 모니터링하고<br />
          근무 스케줄을 <span className="text-blue-600 font-semibold">최적화</span>하는<br />
          스마트 물류센터 시스템입니다.
        </p>
        </div>
      </div>

      {/* 오른쪽: 로그인 폼 */}
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">로그인</h1>
            <p className="text-sm text-gray-500">계정 정보를 입력해주세요</p>
          </div>

          <Tabs defaultValue="worker" onValueChange={(val) => setIsAdmin(val === "admin")}>
            <TabsList className="grid grid-cols-2 gap-2 bg-gray-100 p-1 rounded-md">
              <TabsTrigger
                value="worker"
                className="data-[state=active]:bg-blue-500 data-[state=active]:text-white text-blue-600 rounded py-2 transition-all"
              >
                작업자
              </TabsTrigger>
              <TabsTrigger
                value="admin"
                className="data-[state=active]:bg-sky-500 data-[state=active]:text-white text-sky-600 rounded py-2 transition-all"
              >
                관리자
              </TabsTrigger>
            </TabsList>

            <TabsContent value="worker">
              <Card className="shadow-md rounded-xl">
                <CardHeader>
                  <CardTitle>작업자 로그인</CardTitle>
                  <CardDescription>건강 정보와 근무 스케줄을 조회하세요</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="worker-email">Email</Label>
                    <Input
                      id="worker-email"
                      type="email"
                      placeholder="worker@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="worker-password">비밀번호</Label>
                    <Input
                      id="worker-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  <Button variant="outline" className="w-full" onClick={handleLogin}>
                    작업자 로그인
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="admin">
              <Card className="shadow-md rounded-xl">
                <CardHeader>
                  <CardTitle>관리자 로그인</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="admin-email">Email</Label>
                    <Input
                      id="admin-email"
                      type="email"
                      placeholder="admin@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="admin-password">비밀번호</Label>
                    <Input
                      id="admin-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  <Button variant="outline" className="w-full" onClick={handleLogin}>
                    관리자 로그인
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <p className="text-center text-sm text-gray-500">
            아직 계정이 없으신가요?{" "}
            <Link href="/signup" className="text-blue-600 underline hover:text-blue-800">
              회원가입
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
