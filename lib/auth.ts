import NextAuth, { type DefaultSession } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"

type LoginPortal = "employee" | "admin" | "ops"

interface LoginCredentials {
    identifier: string
    password: string
    portal: LoginPortal
}

declare module "next-auth" {
    interface User {
        role?: string
        employeeCode?: string | null
        companyId?: string | null
        companyName?: string | null
        companyIcon?: string | null
        addressId?: string | null
        addressCity?: string | null
        locationTimezone?: string | null
    }
    interface Session extends DefaultSession {
        user: User & DefaultSession["user"]
        newLocation?: {
            companyId: string
            companyName: string
            companyIcon?: string | null
            addressId: string
            addressCity: string
            locationTimezone: string
        }
    }
}

interface SessionUpdate {
    newLocation?: {
        companyId: string
        companyName: string
        companyIcon?: string | null
        addressId: string
        addressCity: string
        locationTimezone: string
    }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
    providers: [
        Credentials({
            name: "Login",
            credentials: {
                identifier: { label: "Email or Employee ID", type: "text" },
                password: { label: "Password", type: "password" },
                portal: { label: "Portal", type: "text" },
            },
            async authorize(credentials) {
                try {
                    const parsedCredentials = credentials as Partial<LoginCredentials> | undefined

                    if (
                        !parsedCredentials?.identifier ||
                        !parsedCredentials?.password ||
                        !parsedCredentials?.portal
                    ) {
                        return null
                    }

                    const { identifier, password, portal } = parsedCredentials
                    const isEmail = identifier.includes("@")

                    // Flow 1: Platform Super Admin / Admin Portal Login (via Email)
                    if (isEmail) {
                        // Admin/Ops portals MUST use flow 1
                        if (portal !== "admin" && portal !== "ops") return null

                        const user = await prisma.user.findUnique({
                            where: { email: identifier },
                            include: { company: true }
                        })

                        if (!user) return null

                        const isValid = await bcrypt.compare(
                            password,
                            user.password
                        )
                        if (!isValid) return null

                        // Portal restrictions - STRICT SEPARATION
                        if (portal === "ops" && user.role !== "SUPERADMIN") return null
                        if (portal === "admin" && user.role !== "ADMIN") return null

                        return {
                            id: user.id,
                            name: user.name,
                            email: user.email,
                            role: user.role, // SUPERADMIN or ADMIN
                            companyId: user.companyId,
                            companyName: user.company?.name,
                            companyIcon: user.company?.icon,
                        }
                    }

                    // Flow 2: Standard Employee Login (via Employee Code)
                    if (portal !== "employee") return null

                    const employee = await prisma.employee.findUnique({
                        where: { employeeCode: identifier },
                        include: {
                            company: true,
                            address: true,
                        },
                    })

                    if (!employee) return null

                    const isValid = await bcrypt.compare(
                        password,
                        employee.password
                    )
                    if (!isValid) return null

                    return {
                        id: employee.id,
                        name: employee.name,
                        employeeCode: employee.employeeCode,
                        role: "EMPLOYEE",
                        companyId: employee.companyId,
                        companyName: employee.company.name,
                        companyIcon: employee.company.icon,
                        addressId: employee.addressId,
                        addressCity: employee.address.city,
                        locationTimezone: employee.address.timezone,
                    }
                } catch (error) {
                    console.error("[AUTH] Login error:", error)
                    return null
                }
            },
        }),
    ],
    session: {
        strategy: "jwt",
        maxAge: 24 * 60 * 60,
    },
    pages: {
        signIn: "/",
    },
    callbacks: {
        async jwt({ token, user, trigger, session }) {
            if (user) {
                token.employeeId = user.id
                token.employeeCode = user.employeeCode
                token.role = user.role
                token.companyId = user.companyId
                token.companyName = user.companyName
                token.companyIcon = user.companyIcon
                token.addressId = user.addressId
                token.addressCity = user.addressCity
                token.locationTimezone = user.locationTimezone
            }

            if (trigger === "update" && (session as SessionUpdate)?.newLocation) {
                const newLoc = (session as SessionUpdate).newLocation!
                token.companyId = newLoc.companyId
                token.companyName = newLoc.companyName
                token.companyIcon = newLoc.companyIcon
                token.addressId = newLoc.addressId
                token.addressCity = newLoc.addressCity
                token.locationTimezone = newLoc.locationTimezone
            }

            return token
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = (token.employeeId as string) || ""
                session.user.employeeCode = (token.employeeCode as string) || null
                session.user.role = (token.role as string) || ""
                session.user.companyId = (token.companyId as string) || null
                session.user.companyName = (token.companyName as string) || null
                session.user.companyIcon = (token.companyIcon as string) || null
                session.user.addressId = (token.addressId as string) || null
                session.user.addressCity = (token.addressCity as string) || null
                session.user.locationTimezone = (token.locationTimezone as string) || null
            }
            return session
        },
    },
    trustHost: true,
})
