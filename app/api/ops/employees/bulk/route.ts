import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth-helpers"
import bcrypt from "bcryptjs"
import { apiResponse, apiError, handleApiRequest } from "@/lib/api-utils"
import crypto from "crypto"
import { encryptText } from "@/lib/encryption"
import ExcelJS from "exceljs"
import { isCompanyAdminFeatureEnabled } from "@/lib/company-admin-features"

type MealPreference = "VEG" | "NONVEG"

interface BulkEmployeeData {
    employeeCode: string
    name: string
    email: string | null
    defaultPreference: MealPreference
}

export async function POST(request: NextRequest) {
    return handleApiRequest(async () => {
        const adminUser = await requireAdmin()
        if (!adminUser) return apiError("Forbidden", 403)
        if (!(await isCompanyAdminFeatureEnabled(adminUser, "employeeManagement"))) {
            return apiError("Employee management is disabled for this company admin", 403, "FEATURE_DISABLED")
        }

        const formData = await request.formData()
        const file = formData.get("file") as File
        const companyId = formData.get("companyId") as string
        const addressId = formData.get("addressId") as string

        if (!file || !companyId || !addressId) {
            return apiError("Missing required fields: file, companyId, or addressId", 400)
        }

        if (adminUser.role === "ADMIN" && companyId !== adminUser.companyId) {
            return apiError("Forbidden: Cannot bulk upload employees for another company", 403, "FORBIDDEN")
        }

        const buffer = await file.arrayBuffer()
        const workbook = new ExcelJS.Workbook()
        await workbook.xlsx.load(buffer)
        const worksheet = workbook.getWorksheet(1)

        if (!worksheet) {
            return apiError("Invalid Excel file: No worksheet found", 400)
        }

        const employeesToProcess: BulkEmployeeData[] = []
        const rowErrors: string[] = []

        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return

            const employeeCode = row.getCell(1).value?.toString().trim()
            const name = row.getCell(2).value?.toString().trim()
            const email = row.getCell(3).value?.toString().trim()
            const preferenceStr = row.getCell(4).value?.toString().trim().toUpperCase()

            if (!employeeCode || !name) {
                rowErrors.push(`Row ${rowNumber}: Employee Code and Name are required`)
                return
            }

            const defaultPreference: MealPreference = (preferenceStr === "NONVEG" || preferenceStr === "NON-VEG")
                ? "NONVEG"
                : "VEG"

            employeesToProcess.push({
                employeeCode,
                name,
                email: email || null,
                defaultPreference,
            })
        })

        if (employeesToProcess.length === 0 && rowErrors.length === 0) {
            return apiError("No valid employee data found in file", 400)
        }

        const results = {
            created: 0,
            skipped: 0,
            errors: [...rowErrors],
            details: [] as { code: string; status: "created" | "skipped"; reason?: string }[]
        }

        for (const emp of employeesToProcess) {
            try {
                const existing = await prisma.employee.findFirst({
                    where: {
                        OR: [
                            { employeeCode: emp.employeeCode },
                            ...(emp.email ? [{ email: emp.email }] : [])
                        ]
                    }
                })

                if (existing) {
                    const reason = existing.employeeCode === emp.employeeCode ? "Code already exists" : "Email already exists"
                    results.skipped++
                    results.details.push({ code: emp.employeeCode, status: "skipped", reason })
                    continue
                }

                const rawPassword = crypto.randomBytes(4).toString("hex")
                const hashedPassword = await bcrypt.hash(rawPassword, 12)
                const encryptedPlain = encryptText(rawPassword)

                await prisma.employee.create({
                    data: {
                        ...emp,
                        password: hashedPassword,
                        plainPassword: encryptedPlain,
                        companyId,
                        addressId,
                    }
                })

                results.created++
                results.details.push({ code: emp.employeeCode, status: "created" })
            } catch (err: unknown) {
                const message = `Error creating ${emp.employeeCode}: ${err instanceof Error ? err.message : String(err)}`
                results.errors.push(message)
            }
        }

        return apiResponse({
            success: true,
            summary: {
                total: employeesToProcess.length,
                created: results.created,
                skipped: results.skipped,
                failed: results.errors.length - rowErrors.length
            },
            errors: results.errors,
            details: results.details
        })
    })
}
