import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { EmployeeHeader } from "@/components/employee/employee-header"

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

    const { companyName, companyIcon, addressCity } = session.user as {
        companyName: string
        companyIcon?: string | null
        addressCity: string
    }

    const fullLocationName = `${companyName} - ${addressCity}`

    return (
        <div className="flex min-h-screen flex-col bg-background">
            <EmployeeHeader
                companyName={fullLocationName}
                companyIcon={companyIcon}
            />
            {children}
        </div>
    )
}
