import { prisma } from "@/lib/prisma"
import { apiResponse, apiError, handleApiRequest } from "@/lib/api-utils"
import { getISTDate } from "@/lib/utils/time"

export async function GET() {
    return handleApiRequest(async () => {
        try {
            // Check database connectivity
            await prisma.$queryRaw`SELECT 1`

            const { year, month, day, hour, minute, second } = getISTDate()
            const istStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')} IST`

            return apiResponse({
                status: "healthy",
                timestamp: new Date().toISOString(),
                ist_time: istStr,
                database: "connected"
            })
        } catch (error) {
            console.error("[HEALTH_CHECK_FAILED]", error)
            return apiError("Database connection failed", 503, "DB_DOWN")
        }
    })
}
