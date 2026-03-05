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
            companyId: string
            companyName: string
            addressId: string
            addressCity: string
            locationTimezone: string
        } & DefaultSession["user"]
        newLocation?: {
            companyId: string
            companyName: string
            addressId: string
            addressCity: string
            locationTimezone: string
        }
    }

    interface User {
        employeeCode: string
        role: string
        companyId: string
        companyName: string
        addressId: string
        addressCity: string
        locationTimezone: string
    }
}
