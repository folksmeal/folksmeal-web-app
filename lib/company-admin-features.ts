import { prisma } from "@/lib/prisma"
import { CompanyAdminFeatureConfig } from "@prisma/client"

export type CompanyAdminFeatureKey = "employeeManagement" | "menu" | "reviews"

export async function getCompanyAdminFeatureConfig(companyId: string): Promise<CompanyAdminFeatureConfig> {
    return prisma.companyAdminFeatureConfig.upsert({
        where: { companyId },
        update: {},
        create: { companyId },
    })
}

export async function isCompanyAdminFeatureEnabled(
    user: { role?: string | null; companyId?: string | null },
    feature: CompanyAdminFeatureKey
) {
    if (user.role !== "ADMIN" || !user.companyId) return true

    const config = await getCompanyAdminFeatureConfig(user.companyId)

    switch (feature) {
        case "employeeManagement":
            return config.employeeManagementEnabled
        case "menu":
            return config.menuEnabled
        case "reviews":
            return config.reviewsEnabled
        default:
            return true
    }
}
