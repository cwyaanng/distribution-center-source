"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createUserWithEmailAndPassword } from "firebase/auth"
import { runTransaction, doc, setDoc, serverTimestamp, collection, getDocs, writeBatch } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function SignupPage() {
  const router = useRouter()
  const [tab, setTab] = useState("worker") // admin | worker
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [selectedCenter, setSelectedCenter] = useState("")
  const [newCenter, setNewCenter] = useState("")
  const [centerOptions, setCenterOptions] = useState<string[]>([])
  const [createNewCenter, setCreateNewCenter] = useState(false) // 새 센터 생성 체크박스
  const [isLoading, setIsLoading] = useState(false)

  // 센터 목록 가져오기 - centers 컬렉션에서 읽어오기
  useEffect(() => {
    const fetchCenters = async () => {
      try {
        const snap = await getDocs(collection(db, "centers"))
        const centers = snap.docs.map((doc) => doc.id)
        setCenterOptions(centers)
      } catch (error) {
        console.error("센터 목록 가져오기 실패:", error)
      }
    }
    fetchCenters()
  }, [])

  // 새 물류센터 구조 생성 함수
  const createCenterStructure = async (centerName: string, adminUid: string) => {
    const batch = writeBatch(db)
    
    // 1. centers 컬렉션에 센터 정보 생성
    const centerRef = doc(db, "centers", centerName)
    batch.set(centerRef, {
      name: centerName,
      createdAt: serverTimestamp(),
      createdBy: adminUid,
      adminUid: adminUid
    })

    // 2. 센터 하위에 admins 컬렉션 생성
    const centerAdminRef = doc(db, "centers", centerName, "admins", adminUid)
    batch.set(centerAdminRef, {
      email: email.trim(),
      name: name.trim(),
      role: "admin",
      isOwner: true, // 센터를 만든 관리자 표시
      createdAt: serverTimestamp(),
    })

    // 3. 센터 하위에 workers 컬렉션 생성 (빈 컬렉션이지만 구조 생성)
    const centerWorkersRef = doc(db, "centers", centerName, "workers", "_placeholder")
    batch.set(centerWorkersRef, {
      placeholder: true,
      createdAt: serverTimestamp(),
    })

    // 4. 센터 하위에 predictions 컬렉션 생성
    const currentYear = new Date().getFullYear().toString()
    const centerPredictionsRef = doc(db, "centers", centerName, "predictions", currentYear)
    
    // 365일 예측 데이터 초기화
    const yearlyPredictions: { [key: string]: number } = {}
    for (let i = 1; i <= 365; i++) {
      yearlyPredictions[i.toString()] = 0
    }
    
    batch.set(centerPredictionsRef, yearlyPredictions)

    // 5. 센터 하위에 workforce 컬렉션 생성
    const centerWorkforceRef = doc(db, "centers", centerName, "workforce", currentYear)
    batch.set(centerWorkforceRef, {
      createdAt: serverTimestamp(),
      year: currentYear
    })

    // 6. workforce 하위에 regular, temp 컬렉션 플레이스홀더 생성
    const regularRef = doc(db, "centers", centerName, "workforce", currentYear, "regular", "_placeholder")
    batch.set(regularRef, {
      placeholder: true,
      createdAt: serverTimestamp(),
    })

    const tempRef = doc(db, "centers", centerName, "workforce", currentYear, "temp", "_placeholder")
    batch.set(tempRef, {
      placeholder: true,
      createdAt: serverTimestamp(),
    })

    await batch.commit()
  }

  const handleSignup = async () => {
    const isAdmin = tab === "admin"
    const role = isAdmin ? "admin" : "worker"
    
    // 입력값 검증
    if (!email.trim()) {
      alert("이메일을 입력해주세요.")
      return
    }
    if (!password.trim()) {
      alert("비밀번호를 입력해주세요.")
      return
    }
    if (!name.trim()) {
      alert("이름을 입력해주세요.")
      return
    }

    // 센터 검증
    let center = ""
    if (isAdmin) {
      if (createNewCenter) {
        if (!newCenter.trim()) {
          alert("새 물류센터 이름을 입력해주세요.")
          return
        }
        center = newCenter.trim()
        
        // 중복 센터명 체크
        if (centerOptions.includes(center)) {
          alert("이미 존재하는 물류센터 이름입니다.")
          return
        }
      } else {
        if (!selectedCenter) {
          alert("기존 물류센터를 선택해주세요.")
          return
        }
        center = selectedCenter
      }
    } else {
      if (!selectedCenter) {
        alert("소속 물류센터를 선택해주세요.")
        return
      }
      center = selectedCenter
    }

    setIsLoading(true)

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      const user = userCredential.user

      // 회원 수 카운터 증가
      const counterId = role + "Count"
      const memberId = await runTransaction(db, async (transaction) => {
        const counterRef = doc(db, "counters", counterId)
        const snap = await transaction.get(counterRef)
        const current = snap.exists() ? snap.data().count || 0 : 0
        transaction.set(counterRef, { count: current + 1 })
        return current + 1
      })

      // 기존 사용자 프로필 저장 (글로벌)
      const profileRef = doc(db, `${role}s`, user.uid, "info", "profile")
      await setDoc(profileRef, {
        email: email.trim(),
        name: name.trim(),
        center,
        role,
        memberId,
        createdAt: serverTimestamp(),
      })

      // 새 센터 생성 및 구조 설정
      if (isAdmin && createNewCenter && newCenter.trim()) {
        await createCenterStructure(center, user.uid)
      } else if (isAdmin && !createNewCenter) {
        // 기존 센터에 관리자 추가
        const centerAdminRef = doc(db, "centers", center, "admins", user.uid)
        await setDoc(centerAdminRef, {
          email: email.trim(),
          name: name.trim(),
          role: "admin",
          isOwner: false, // 기존 센터에 추가되는 관리자
          createdAt: serverTimestamp(),
        })
      } else if (!isAdmin) {
        // 작업자인 경우 센터의 workers 컬렉션에 추가
        const centerWorkerRef = doc(db, "workers", user.uid)
        await setDoc(centerWorkerRef, {
          email: email.trim(),
          name: name.trim(),
          role: "worker",
          memberId,
          createdAt: serverTimestamp(),
        })
      }

      alert("회원가입이 완료되었습니다!")
      router.push("/")
    } catch (error: any) {
      console.error("회원가입 에러:", error)
      
      let errorMessage = ""
      switch (error.code) {
        case "auth/email-already-in-use":
          errorMessage = "이미 사용 중인 이메일입니다."
          break
        case "auth/invalid-email":
          errorMessage = "유효하지 않은 이메일 형식입니다."
          break
        case "auth/weak-password":
          errorMessage = "비밀번호는 최소 6자 이상이어야 합니다."
          break
        case "auth/missing-password":
          errorMessage = "비밀번호를 입력해주세요."
          break
        case "auth/operation-not-allowed":
          errorMessage = "이메일/비밀번호 가입이 비활성화되어 있습니다. 관리자에게 문의하세요."
          break
        default:
          errorMessage = `알 수 없는 오류가 발생했습니다: ${error.message}`
      }
      
      alert(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Card className="w-[400px]">
        <CardHeader>
          <CardTitle>회원가입</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs defaultValue="worker" onValueChange={setTab}>
            <TabsList className="grid grid-cols-2 bg-gray-100 p-1 rounded-md">
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

            <TabsContent value="worker" className="pt-4 space-y-4">
              <div>
                <Label>이메일</Label>
                <Input 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@email.com"
                />
              </div>
              <div>
                <Label>비밀번호</Label>
                <Input 
                  type="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="최소 6자 이상 입력하세요"
                />
              </div>
              <div>
                <Label>이름</Label>
                <Input 
                  value={name} 
                  onChange={(e) => setName(e.target.value)}
                  placeholder="홍길동"
                />
              </div>
              <div>
                <Label>소속 물류센터</Label>
                {centerOptions.length > 0 ? (
                  <Select onValueChange={setSelectedCenter}>
                    <SelectTrigger>
                      <SelectValue placeholder="물류센터를 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      {centerOptions.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="text-sm text-gray-500">등록된 물류센터가 없습니다</div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="admin" className="pt-4 space-y-4">
              <div>
                <Label>이메일</Label>
                <Input 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@email.com"
                />
              </div>
              <div>
                <Label>비밀번호</Label>
                <Input 
                  type="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="최소 6자 이상 입력하세요"
                />
              </div>
              <div>
                <Label>이름</Label>
                <Input 
                  value={name} 
                  onChange={(e) => setName(e.target.value)}
                  placeholder="홍길동"
                />
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <input 
                    type="checkbox"
                    id="create-new-center"
                    checked={createNewCenter}
                    onChange={(e) => setCreateNewCenter(e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                  />
                  <Label htmlFor="create-new-center" className="text-sm cursor-pointer">
                    새 물류센터 만들기
                  </Label>
                </div>
                
                {createNewCenter ? (
                  <div>
                    <Label>새 물류센터 이름</Label>
                    <Input 
                      value={newCenter} 
                      onChange={(e) => setNewCenter(e.target.value)} 
                      placeholder="예: 대전 - 둔산 센터" 
                    />
                  </div>
                ) : (
                  <div>
                    <Label>기존 물류센터 선택</Label>
                    {centerOptions.length > 0 ? (
                      <Select onValueChange={setSelectedCenter}>
                        <SelectTrigger>
                          <SelectValue placeholder="기존 물류센터를 선택하세요" />
                        </SelectTrigger>
                        <SelectContent>
                          {centerOptions.map((c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="text-sm text-gray-500 mt-1">
                        등록된 물류센터가 없습니다. 새 센터를 만들어주세요.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          <Button 
            className="w-full" 
            onClick={handleSignup}
            disabled={isLoading}
          >
            {isLoading ? "회원가입 중..." : "회원가입"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}