import { UserManagement } from "@/components/ops/user-management"
import { auth } from "@/lib/auth"
import { getEffectiveAddressId } from "@/lib/auth-helpers"

export default async function UsersPage() {
    const session = await auth()
    if (!session?.user) return null

    const effectiveAddressId = await getEffectiveAddressId(session.user)

    return <UserManagement effectiveAddressId={effectiveAddressId || undefined} />
}
