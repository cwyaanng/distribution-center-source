"use client"

import Link from "next/link"
import Image from "next/image"
import { Bell, Menu, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

export default function AdminNavbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white shadow-sm">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo & Nav (Desktop) */}
        <div className="flex items-center space-x-6">
          <Link href="/admin-dashboard" className="flex items-center space-x-3">
            <Image
              src="/logo.png"
              alt="Admin Logo"
              width={48}
              height={48}
              className="object-cover object-top rounded-md"
            />
          </Link>
          <nav className="hidden md:flex items-center space-x-6 text-sm font-medium text-slate-700">
            <Link href="/admin-dashboard" className="hover:text-blue-600 transition">
              Dashboard
            </Link>
            <Link href="/admin-dashboard?tab=centers" className="hover:text-blue-600 transition text-slate-500">
              Centers
            </Link>
            <Link href="/admin-dashboard?tab=workers" className="hover:text-blue-600 transition text-slate-500">
              Workers
            </Link>
          </nav>
        </div>

        {/* Mobile Navigation */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle Menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="pr-0 pt-6">
            <Link href="/admin-dashboard" className="flex items-center space-x-3 mb-6">
              <Image
                src="/logo.png"
                alt="Admin Logo"
                width={36}
                height={36}
                className="object-cover object-top rounded-md"
              />
            </Link>
            <nav className="flex flex-col gap-4 text-sm">
              <Link href="/admin-dashboard" className="text-slate-700 hover:text-blue-600">
                Dashboard
              </Link>
              <Link href="/admin-dashboard?tab=centers" className="text-slate-500 hover:text-blue-600">
                Centers
              </Link>
              <Link href="/admin-dashboard?tab=workers" className="text-slate-500 hover:text-blue-600">
                Workers
              </Link>
            </nav>
          </SheetContent>
        </Sheet>

        {/* Right Icons */}
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5 text-slate-600" />
            <span className="sr-only">Notifications</span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <User className="h-5 w-5 text-slate-600" />
                <span className="sr-only">User menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Settings</DropdownMenuItem>
              <DropdownMenuItem>Support</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Link href="/" className="w-full">Logout</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
