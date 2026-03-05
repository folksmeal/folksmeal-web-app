import { PrismaClient, MealPreference, EmployeeRole } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
    console.log("🌱 Seeding database...")

    const hashedPassword = await bcrypt.hash("password123", 12)

    // ─── Company: LearnApp ─────────────────────────────────────
    const companyLearnApp = await prisma.company.upsert({
        where: { id: "company-learnapp" },
        update: {},
        create: {
            id: "company-learnapp",
            name: "LearnApp",
            domain: "learnapp.com",
        },
    })

    const addrLearnAppNoida = await prisma.companyAddress.upsert({
        where: { id: "addr-learnapp-noida" },
        update: {},
        create: {
            id: "addr-learnapp-noida",
            companyId: companyLearnApp.id,
            city: "Noida",
            state: "Uttar Pradesh",
            address: "Sector 132, Noida",
            cutoffTime: "18:00",
            timezone: "Asia/Kolkata",
        },
    })

    // ─── Company: Acme Corp ────────────────────────────────────
    const companyAcme = await prisma.company.upsert({
        where: { id: "company-acme" },
        update: {},
        create: {
            id: "company-acme",
            name: "Acme Corp",
            domain: "acmecorp.com",
        },
    })

    const addrAcmeMumbai = await prisma.companyAddress.upsert({
        where: { id: "addr-acme-mumbai" },
        update: {},
        create: {
            id: "addr-acme-mumbai",
            companyId: companyAcme.id,
            city: "Mumbai",
            state: "Maharashtra",
            address: "Lower Parel, Mumbai",
            cutoffTime: "17:30",
            timezone: "Asia/Kolkata",
        },
    })

    console.log(`✅ Companies and Addresses seeded.`)

    // ─── Employees ───────────────────────────────────────────────
    const employees = [
        {
            id: "emp-001",
            companyId: companyLearnApp.id,
            addressId: addrLearnAppNoida.id,
            name: "Rahul Sharma",
            employeeCode: "EMP-1001",
            password: hashedPassword,
            defaultPreference: MealPreference.VEG,
            role: EmployeeRole.EMPLOYEE,
        },
        {
            id: "emp-002",
            companyId: companyLearnApp.id,
            addressId: addrLearnAppNoida.id,
            name: "Priya Patel",
            employeeCode: "EMP-1002",
            password: hashedPassword,
            defaultPreference: MealPreference.NONVEG,
            role: EmployeeRole.EMPLOYEE,
        },
        {
            id: "emp-101",
            companyId: companyAcme.id,
            addressId: addrAcmeMumbai.id,
            name: "Neha Gupta",
            employeeCode: "EMP-2001",
            password: hashedPassword,
            defaultPreference: MealPreference.VEG,
            role: EmployeeRole.EMPLOYEE,
        },
        {
            id: "super-001",
            companyId: companyLearnApp.id,
            addressId: addrLearnAppNoida.id,
            name: "Super Admin",
            employeeCode: "SUPER-001",
            password: hashedPassword,
            defaultPreference: MealPreference.VEG,
            role: EmployeeRole.SUPERADMIN,
        },
    ]

    for (const emp of employees) {
        await prisma.employee.upsert({
            where: { employeeCode: emp.employeeCode },
            update: {
                companyId: emp.companyId,
                addressId: emp.addressId,
            },
            create: emp,
        })
        console.log(`✅ Employee: ${emp.name} (${emp.employeeCode})`)
    }

    // ─── Sample Menus ──────────────────────────────────────────
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

    const addresses = [addrLearnAppNoida, addrAcmeMumbai]
    const today = new Date()

    for (const addr of addresses) {
        for (let i = 0; i < 7; i++) {
            const date = new Date(today)
            date.setDate(today.getDate() + i)
            date.setHours(0, 0, 0, 0)

            const dayOfWeek = date.getDay()

            await prisma.menu.upsert({
                where: {
                    addressId_date: {
                        addressId: addr.id,
                        date: date,
                    },
                },
                update: {},
                create: {
                    addressId: addr.id,
                    date: date,
                    vegItem: vegItems[dayOfWeek] || vegItems[0],
                    nonvegItem: nonvegItems[dayOfWeek],
                },
            })
        }
        console.log(`✅ Menus seeded for: ${addr.city}`)
    }

    console.log("\n🎉 Seed complete!")
    console.log("\n📋 Test credentials (password: password123 for all):")
    console.log("  ┌─────────────────────────────────────────────────────────┐")
    console.log("  │ Role         │ Code        │ Company     │ Notes       │")
    console.log("  ├─────────────────────────────────────────────────────────┤")
    console.log("  │ EMPLOYEE     │ EMP-1001    │ LearnApp    │             │")
    console.log("  │ EMPLOYEE     │ EMP-1002    │ LearnApp    │             │")
    console.log("  │ EMPLOYEE     │ EMP-2001    │ Acme Corp   │             │")
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
