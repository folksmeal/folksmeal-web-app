import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { LoginScreen } from "@/components/employee/login-screen"

export default async function LoginPage() {
  const session = await auth()
  if (session?.user) {
    const role = session.user.role
    if (role === "SUPERADMIN") {
      redirect("/ops/dashboard")
    }
    redirect("/dashboard")
  }
  return <LoginScreen />
}