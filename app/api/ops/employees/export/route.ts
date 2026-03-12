import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin, getEffectiveAddressId } from "@/lib/auth-helpers"
import { apiError, handleApiRequest } from "@/lib/api-utils"
import { decryptText } from "@/lib/encryption"
import ExcelJS from "exceljs"
import { MealPreference } from "@prisma/client"
import { isCompanyAdminFeatureEnabled } from "@/lib/company-admin-features"

export async function GET(request: NextRequest) {
    return handleApiRequest(async () => {
        const adminUser = await requireAdmin()
        if (!adminUser) return apiError("Forbidden", 403)
        if (!(await isCompanyAdminFeatureEnabled(adminUser, "employeeManagement"))) {
            return apiError("Employee management is disabled for this company admin", 403, "FEATURE_DISABLED")
        }

        const { searchParams } = new URL(request.url)
        const queryAddressId = searchParams.get("addressId")
        const effectiveAddressId = queryAddressId || await getEffectiveAddressId(adminUser)
        const companyId = searchParams.get("companyId")

        if (adminUser.role === "ADMIN" && companyId && companyId !== adminUser.companyId) {
            return apiError("Forbidden: Cannot export employees for another company", 403, "FORBIDDEN")
        }

        const where = {
            ...(effectiveAddressId ? { addressId: effectiveAddressId } : {}),
            ...(companyId ? { companyId } : {}),
        }

        const employees = await prisma.employee.findMany({
            where,
            include: { company: true, address: true },
            orderBy: { name: "asc" },
        })

        if (employees.length === 0) {
            return apiError("No employees found to export", 404)
        }

        const workbook = new ExcelJS.Workbook()
        const worksheet = workbook.addWorksheet("Employees")

        worksheet.columns = [
            { header: "Name", key: "name", width: 30 },
            { header: "Employee Code", key: "code", width: 20 },
            { header: "Email", key: "email", width: 30 },
            { header: "Meal Preference", key: "preference", width: 15 },
            { header: "Password", key: "password", width: 15 },
            { header: "Company", key: "company", width: 25 },
            { header: "Location", key: "location", width: 20 },
        ]

        employees.forEach((emp) => {
            worksheet.addRow({
                name: emp.name,
                code: emp.employeeCode,
                email: emp.email || "-",
                preference: emp.defaultPreference === MealPreference.VEG ? "Veg" : "Non-Veg",
                password: emp.plainPassword ? (decryptText(emp.plainPassword) || "Error") : "N/A",
                company: emp.company.name,
                location: emp.address.city,
            })
        })

        worksheet.getRow(1).font = { bold: true }
        worksheet.getRow(1).fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFE0E0E0" }
        }

        const buffer = await workbook.xlsx.writeBuffer()

        return new NextResponse(buffer, {
            headers: {
                "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Content-Disposition": `attachment; filename="employees_export_${new Date().toISOString().split("T")[0]}.xlsx"`,
            },
        })
    })
}
