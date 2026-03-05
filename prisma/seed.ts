import { PrismaClient, MealPreference, EmployeeRole } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
    console.log("🌱 Seeding database...")

    const hashedPassword = await bcrypt.hash("password123", 12)

    // ─── Company A: LearnApp ─────────────────────────────────────
    const companyA = await prisma.company.upsert({
        where: { id: "company-learnapp" },
        update: {},
        create: {
            id: "company-learnapp",
            name: "LearnApp",
            domain: "learnapp.com",
        },
    })
    console.log(`✅ Company: ${companyA.name}`)

    const officeA = await prisma.office.upsert({
        where: { id: "office-learnapp-noida" },
        update: {},
        create: {
            id: "office-learnapp-noida",
            companyId: companyA.id,
            name: "LearnApp, Noida",
            cutoffTime: "18:00",
            timezone: "Asia/Kolkata",
        },
    })
    console.log(`✅ Office: ${officeA.name}`)

    // ─── Company B: Acme Corp ────────────────────────────────────
    const companyB = await prisma.company.upsert({
        where: { id: "company-acme" },
        update: {},
        create: {
            id: "company-acme",
            name: "Acme Corp",
            domain: "acmecorp.com",
        },
    })
    console.log(`✅ Company: ${companyB.name}`)

    const officeB = await prisma.office.upsert({
        where: { id: "office-acme-mumbai" },
        update: {},
        create: {
            id: "office-acme-mumbai",
            companyId: companyB.id,
            name: "Acme Corp, Mumbai",
            cutoffTime: "17:30",
            timezone: "Asia/Kolkata",
        },
    })
    console.log(`✅ Office: ${officeB.name}`)

    // ─── Employees ───────────────────────────────────────────────
    const employees = [
        // LearnApp employees
        {
            id: "emp-001",
            companyId: companyA.id,
            name: "Rahul Sharma",
            employeeCode: "EMP-1001",
            password: hashedPassword,
            officeId: officeA.id,
            defaultPreference: MealPreference.VEG,
            role: EmployeeRole.EMPLOYEE,
        },
        {
            id: "emp-002",
            companyId: companyA.id,
            name: "Priya Patel",
            employeeCode: "EMP-1002",
            password: hashedPassword,
            officeId: officeA.id,
            defaultPreference: MealPreference.NONVEG,
            role: EmployeeRole.EMPLOYEE,
        },
        {
            id: "emp-003",
            companyId: companyA.id,
            name: "Amit Kumar",
            employeeCode: "EMP-1003",
            password: hashedPassword,
            officeId: officeA.id,
            defaultPreference: MealPreference.VEG,
            role: EmployeeRole.EMPLOYEE,
        },
        {
            id: "ops-001",
            companyId: companyA.id,
            name: "Ops Admin",
            employeeCode: "OPS-001",
            password: hashedPassword,
            officeId: officeA.id,
            defaultPreference: MealPreference.VEG,
            role: EmployeeRole.OPS,
        },
        {
            id: "orgadmin-001",
            companyId: companyA.id,
            name: "LearnApp Org Admin",
            employeeCode: "ORGADMIN-001",
            password: hashedPassword,
            officeId: officeA.id,
            defaultPreference: MealPreference.VEG,
            role: EmployeeRole.ORG_ADMIN,
        },
        // Acme Corp employees
        {
            id: "emp-101",
            companyId: companyB.id,
            name: "Neha Gupta",
            employeeCode: "EMP-2001",
            password: hashedPassword,
            officeId: officeB.id,
            defaultPreference: MealPreference.VEG,
            role: EmployeeRole.EMPLOYEE,
        },
        {
            id: "emp-102",
            companyId: companyB.id,
            name: "Vikram Singh",
            employeeCode: "EMP-2002",
            password: hashedPassword,
            officeId: officeB.id,
            defaultPreference: MealPreference.NONVEG,
            role: EmployeeRole.EMPLOYEE,
        },
        {
            id: "ops-101",
            companyId: companyB.id,
            name: "Acme Ops",
            employeeCode: "OPS-101",
            password: hashedPassword,
            officeId: officeB.id,
            defaultPreference: MealPreference.VEG,
            role: EmployeeRole.OPS,
        },
        {
            id: "orgadmin-101",
            companyId: companyB.id,
            name: "Acme Org Admin",
            employeeCode: "ORGADMIN-101",
            password: hashedPassword,
            officeId: officeB.id,
            defaultPreference: MealPreference.VEG,
            role: EmployeeRole.ORG_ADMIN,
        },
        // Global Super Admin (belongs to LearnApp HQ but can manage everything)
        {
            id: "super-001",
            companyId: companyA.id,
            name: "Super Admin",
            employeeCode: "SUPER-001",
            password: hashedPassword,
            officeId: officeA.id,
            defaultPreference: MealPreference.VEG,
            role: EmployeeRole.SUPERADMIN,
        },
    ]

    for (const emp of employees) {
        await prisma.employee.upsert({
            where: { employeeCode: emp.employeeCode },
            update: {},
            create: emp,
        })
        console.log(`✅ Employee: ${emp.name} (${emp.employeeCode}) [${emp.role}]`)
    }

    // ─── Sample Menus (next 7 days for both offices) ─────────────
    const vegItems = [
        "Paneer Butter Masala, Roti, Rice, Salad",
        "Dal Tadka, Seasonal Sabzi, Roti, Jeera Rice, Dessert",
        "Chole Bhature, Raita, Salad",
        "Rajma Chawal, Papad, Salad, Dessert",
        "Mix Veg, Roti, Pulao, Raita",
        "Aloo Gobi, Dal Fry, Roti, Rice",
        "Kadhi Pakora, Roti, Rice, Salad",
    ]
    const nonvegItems = [
        "Chicken Curry, Roti, Rice, Salad",
        "Butter Chicken, Naan, Rice, Dessert",
        null,
        "Egg Curry, Roti, Rice, Salad",
        "Fish Fry, Roti, Rice, Raita",
        "Mutton Curry, Roti, Rice, Dessert",
        null,
    ]

    const offices = [officeA, officeB]
    const today = new Date()

    for (const office of offices) {
        for (let i = 0; i < 7; i++) {
            const date = new Date(today)
            date.setDate(today.getDate() + i)
            date.setHours(0, 0, 0, 0)

            const dayOfWeek = date.getDay()

            await prisma.menu.upsert({
                where: {
                    officeId_date: {
                        officeId: office.id,
                        date: date,
                    },
                },
                update: {},
                create: {
                    officeId: office.id,
                    date: date,
                    vegItem: vegItems[dayOfWeek] || vegItems[0],
                    nonvegItem: nonvegItems[dayOfWeek],
                },
            })
            console.log(`✅ Menu [${office.name}]: ${date.toISOString().split("T")[0]} (nonveg: ${nonvegItems[dayOfWeek] ? "yes" : "no"})`)
        }
    }

    console.log("\n🎉 Seed complete!")
    console.log("\n📋 Test credentials (password: password123 for all):")
    console.log("  ┌─────────────────────────────────────────────────────────┐")
    console.log("  │ Role         │ Code        │ Company     │ Notes       │")
    console.log("  ├─────────────────────────────────────────────────────────┤")
    console.log("  │ EMPLOYEE     │ EMP-1001    │ LearnApp    │             │")
    console.log("  │ EMPLOYEE     │ EMP-1002    │ LearnApp    │             │")
    console.log("  │ EMPLOYEE     │ EMP-2001    │ Acme Corp   │             │")
    console.log("  │ OPS          │ OPS-001     │ LearnApp    │             │")
    console.log("  │ OPS          │ OPS-101     │ Acme Corp   │             │")
    console.log("  │ ORG_ADMIN    │ ORGADMIN-001│ LearnApp    │ Co. switcher│")
    console.log("  │ ORG_ADMIN    │ ORGADMIN-101│ Acme Corp   │ Co. switcher│")
    console.log("  │ SUPERADMIN   │ SUPER-001   │ LearnApp    │ Global admin│")
    console.log("  └─────────────────────────────────────────────────────────┘")
}

main()
    .catch((e) => {
        console.error("❌ Seed failed:", e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
