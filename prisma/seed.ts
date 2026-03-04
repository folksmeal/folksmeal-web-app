import { PrismaClient, MealPreference, EmployeeRole } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
    console.log("🌱 Seeding database...")

    // ─── Create Office ──────────────────────────────────────────────
    const office = await prisma.office.upsert({
        where: { id: "office-learnapp-noida" },
        update: {},
        create: {
            id: "office-learnapp-noida",
            name: "LearnApp, Noida",
            cutoffTime: "18:00",
        },
    })
    console.log(`✅ Office: ${office.name}`)

    // ─── Create Employees ──────────────────────────────────────────
    const hashedPassword = await bcrypt.hash("password123", 12)

    const employees = [
        {
            id: "emp-001",
            name: "Rahul Sharma",
            employeeCode: "EMP-1001",
            password: hashedPassword,
            officeId: office.id,
            defaultPreference: MealPreference.VEG,
            role: EmployeeRole.EMPLOYEE,
        },
        {
            id: "emp-002",
            name: "Priya Patel",
            employeeCode: "EMP-1002",
            password: hashedPassword,
            officeId: office.id,
            defaultPreference: MealPreference.NONVEG,
            role: EmployeeRole.EMPLOYEE,
        },
        {
            id: "emp-003",
            name: "Amit Kumar",
            employeeCode: "EMP-1003",
            password: hashedPassword,
            officeId: office.id,
            defaultPreference: MealPreference.VEG,
            role: EmployeeRole.EMPLOYEE,
        },
        {
            id: "ops-001",
            name: "Ops Admin",
            employeeCode: "OPS-001",
            password: hashedPassword,
            officeId: office.id,
            defaultPreference: MealPreference.VEG,
            role: EmployeeRole.OPS,
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

    // ─── Create Sample Menus (next 7 days) ─────────────────────────
    const today = new Date()
    for (let i = 0; i < 7; i++) {
        const date = new Date(today)
        date.setDate(today.getDate() + i)
        date.setHours(0, 0, 0, 0)

        const dayOfWeek = date.getDay()
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
            null, // No nonveg on Wednesday
            "Egg Curry, Roti, Rice, Salad",
            "Fish Fry, Roti, Rice, Raita",
            "Mutton Curry, Roti, Rice, Dessert",
            null, // No nonveg on Sunday
        ]

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
        console.log(`✅ Menu: ${date.toISOString().split("T")[0]} (nonveg: ${nonvegItems[dayOfWeek] ? "yes" : "no"})`)
    }

    console.log("\n🎉 Seed complete!")
    console.log("\n📋 Test credentials:")
    console.log("  Employee: EMP-1001 / password123")
    console.log("  Employee: EMP-1002 / password123")
    console.log("  Ops:      OPS-001  / password123")
}

main()
    .catch((e) => {
        console.error("❌ Seed failed:", e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
