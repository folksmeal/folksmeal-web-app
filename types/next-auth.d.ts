import { EmployeeRole, MealPreference } from "@prisma/client"

// Extend NextAuth types to include our custom fields
declare module "next-auth" {
    interface Session {
        user: {
            id: string
            name: string
            email: string
            employeeCode: string
            role: EmployeeRole
            officeId: string
            officeName: string
        }
    }

    interface User {
        role: EmployeeRole
        officeId: string
        officeName: string
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        employeeId: string
        employeeCode: string
        role: EmployeeRole
        officeId: string
        officeName: string
    }
}
