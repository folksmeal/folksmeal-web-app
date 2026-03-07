import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"

export default async function EmployeeLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const session = await auth()
    if (!session?.user) {
        redirect("/")
    }

    // Superadmins must not access employee routes — they have no addressId
    if (session.user.role === "SUPERADMIN") {
        redirect("/ops/dashboard")
    }

    return <>{children}</>
}
