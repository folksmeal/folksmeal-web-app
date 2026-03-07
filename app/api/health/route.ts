import { prisma } from "@/lib/prisma"
import { apiResponse, apiError, handleApiRequest } from "@/lib/api-utils"

export async function GET() {
    return handleApiRequest(async () => {
        try {
            // Check database connectivity
            await prisma.$queryRaw`SELECT 1`

            return apiResponse({
                status: "healthy",
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                env: process.env.NODE_ENV,
                database: "connected"
            })
        } catch (error) {
            console.error("[HEALTH_CHECK_FAILED]", error)
            return apiError("Database connection failed", 503, "DB_DOWN")
        }
    })
}
