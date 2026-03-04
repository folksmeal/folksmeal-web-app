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
                    email: employee.employeeCode, // NextAuth expects email; we repurpose it for employeeCode
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
                token.role = (user as any).role
                token.officeId = (user as any).officeId
                token.officeName = (user as any).officeName
            }
            return token
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.employeeId as string
                    ; (session.user as any).employeeCode = token.employeeCode as string
                    ; (session.user as any).role = token.role as string
                    ; (session.user as any).officeId = token.officeId as string
                    ; (session.user as any).officeName = token.officeName as string
            }
            return session
        },
    },
    trustHost: true,
})
