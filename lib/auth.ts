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
                    include: { office: true },
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
                    role: employee.role,
                    officeId: employee.officeId,
                    officeName: employee.office.name,
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
        async jwt({ token, user }) {
            if (user) {
                token.employeeId = user.id
                token.employeeCode = user.email
                token.role = (user as { role: string }).role
                token.officeId = (user as { officeId: string }).officeId
                token.officeName = (user as { officeName: string }).officeName
            }
            return token
        },
        async session({ session, token }) {
            if (session.user) {
                const u = session.user as typeof session.user & {
                    employeeCode: string
                    role: string
                    officeId: string
                    officeName: string
                }
                u.id = token.employeeId as string
                u.employeeCode = token.employeeCode as string
                u.role = token.role as string
                u.officeId = token.officeId as string
                u.officeName = token.officeName as string
            }
            return session
        },
    },
    trustHost: true,
})
