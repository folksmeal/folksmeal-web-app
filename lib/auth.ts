import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"

export const { handlers, auth, signIn, signOut } = NextAuth({
    providers: [
        Credentials({
            name: "Employee Login",
            credentials: {
                employeeCode: { label: "Employee ID", type: "text" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.employeeCode || !credentials?.password) {
                    return null
                }

                const employee = await prisma.employee.findUnique({
                    where: { employeeCode: credentials.employeeCode as string },
                    include: { office: true, company: true },
                })

                if (!employee) return null

                const isValid = await bcrypt.compare(
                    credentials.password as string,
                    employee.password
                )

                if (!isValid) return null

                return {
                    id: employee.id,
                    name: employee.name,
                    email: employee.employeeCode,
                    employeeCode: employee.employeeCode,
                    role: employee.role as string,
                    officeId: employee.officeId,
                    officeName: employee.office.name,
                    officeTimezone: employee.office.timezone,
                    companyId: employee.companyId,
                    companyName: employee.company.name,
                }
            },
        }),
    ],
    session: {
        strategy: "jwt",
        maxAge: 24 * 60 * 60, // 24 hours
    },
    pages: {
        signIn: "/",
    },
    callbacks: {
        async jwt({ token, user, trigger, session }) {
            // Initial sign in
            if (user) {
                const u = user
                token.employeeId = u.id
                token.employeeCode = u.employeeCode
                token.role = u.role
                token.officeId = u.officeId
                token.officeName = u.officeName
                token.officeTimezone = u.officeTimezone
                token.companyId = u.companyId
                token.companyName = u.companyName
            }
            // Company Switcher Override
            if (trigger === "update" && session && session.newOffice) {
                token.officeId = session.newOffice.officeId
                token.officeName = session.newOffice.officeName
                token.companyId = session.newOffice.companyId
                token.companyName = session.newOffice.companyName
                token.officeTimezone = session.newOffice.officeTimezone
            }
            return token
        },
        async session({ session, token }) {
            if (session.user) {
                const u = session.user
                u.id = token.employeeId as string
                u.employeeCode = token.employeeCode as string
                u.role = token.role as string
                u.officeId = token.officeId as string
                u.officeName = token.officeName as string
                u.officeTimezone = token.officeTimezone as string
                u.companyId = token.companyId as string
                u.companyName = token.companyName as string
            }
            return session
        },
    },
    trustHost: true,
})
