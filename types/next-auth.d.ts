import { DefaultSession } from "next-auth"

declare module "next-auth" {
    /**
     * Returned by `useSession`, `auth`, `getSession` and received as a prop on the `SessionProvider` React Context
     */
    interface Session {
        user: {
            id: string
            employeeCode: string
            role: string
            officeId: string
            officeName: string
            officeTimezone: string
            companyId: string
            companyName: string
        } & DefaultSession["user"]
        newOffice?: {
            officeId: string
            officeName: string
            companyId: string
            companyName: string
            officeTimezone: string
        }
    }

    interface User {
        employeeCode: string
        role: string
        officeId: string
        officeName: string
        officeTimezone: string
        companyId: string
        companyName: string
    }
}
