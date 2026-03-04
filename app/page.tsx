import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { LoginScreen } from "@/components/login-screen"

export default async function LoginPage() {
  const session = await auth()

  // Already authenticated → go to dashboard
  if (session?.user) {
    redirect("/dashboard")
  }

  return <LoginScreen />
}
