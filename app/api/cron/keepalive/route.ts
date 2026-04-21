import { prisma } from "@/lib/prisma"
import { apiError, apiResponse, handleApiRequest } from "@/lib/api-utils"

function isAuthorized(request: Request) {
    const secret = process.env.CRON_SECRET
    if (!secret) return false
    const auth = request.headers.get("authorization")
    return auth === `Bearer ${secret}`
}

export async function GET(request: Request) {
    return handleApiRequest(async () => {
        if (!isAuthorized(request)) {
            return apiError("Unauthorized", 401, "UNAUTHORIZED")
        }

        await prisma.$queryRaw`SELECT 1`
        return apiResponse({ ok: true, at: new Date().toISOString() })
    })
}

