import { NextRequest } from "next/server"
import { CompanyAdminFeatureConfig } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth-helpers"
import { apiError, apiResponse, handleApiRequest } from "@/lib/api-utils"
import { z } from "zod"

const updateConfigSchema = z.object({
    companyId: z.string().min(1),
    employeeManagementEnabled: z.boolean(),
    menuEnabled: z.boolean(),
    reviewsEnabled: z.boolean(),
    addonsEnabled: z.boolean(),
})

export async function GET() {
    return handleApiRequest(async () => {
        const user = await requireAdmin()
        if (!user || user.role !== "SUPERADMIN") return apiError("Forbidden", 403)

        const [companies, configs] = await Promise.all([
            prisma.company.findMany({
                include: {
                    _count: { select: { employees: true, users: true, addresses: true } },
                },
                orderBy: { name: "asc" },
            }),
            prisma.companyAdminFeatureConfig.findMany(),
        ])

        const configByCompanyId = new Map<string, { employeeManagementEnabled: boolean; menuEnabled: boolean; reviewsEnabled: boolean; addonsEnabled: boolean }>(
            configs.map((config: CompanyAdminFeatureConfig) => [
                config.companyId,
                {
                    employeeManagementEnabled: config.employeeManagementEnabled,
                    menuEnabled: config.menuEnabled,
                    reviewsEnabled: config.reviewsEnabled,
                    addonsEnabled: config.addonsEnabled,
                },
            ])
        )

        return apiResponse({
            companies: companies.map((company) => ({
                id: company.id,
                name: company.name,
                domain: company.domain,
                icon: company.icon,
                counts: {
                    employees: company._count.employees,
                    admins: company._count.users,
                    locations: company._count.addresses,
                },
                features: {
                    employeeManagementEnabled: configByCompanyId.get(company.id)?.employeeManagementEnabled ?? true,
                    menuEnabled: configByCompanyId.get(company.id)?.menuEnabled ?? true,
                    reviewsEnabled: configByCompanyId.get(company.id)?.reviewsEnabled ?? true,
                    addonsEnabled: configByCompanyId.get(company.id)?.addonsEnabled ?? false,
                },
            })),
        })
    })
}

export async function PUT(request: NextRequest) {
    return handleApiRequest(async () => {
        const user = await requireAdmin()
        if (!user || user.role !== "SUPERADMIN") return apiError("Forbidden", 403)

        const body = updateConfigSchema.parse(await request.json())

        const config = await prisma.companyAdminFeatureConfig.upsert({
            where: { companyId: body.companyId },
            update: {
                employeeManagementEnabled: body.employeeManagementEnabled,
                menuEnabled: body.menuEnabled,
                reviewsEnabled: body.reviewsEnabled,
                addonsEnabled: body.addonsEnabled,
            },
            create: {
                companyId: body.companyId,
                employeeManagementEnabled: body.employeeManagementEnabled,
                menuEnabled: body.menuEnabled,
                reviewsEnabled: body.reviewsEnabled,
                addonsEnabled: body.addonsEnabled,
            },
        })

        return apiResponse({
            success: true,
            config: {
                companyId: config.companyId,
                employeeManagementEnabled: config.employeeManagementEnabled,
                menuEnabled: config.menuEnabled,
                reviewsEnabled: config.reviewsEnabled,
                addonsEnabled: config.addonsEnabled,
            },
        })
    })
}
