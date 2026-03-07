import { MealPreference } from "@prisma/client"
import bcrypt from "bcryptjs"
import { prisma } from "../lib/prisma"

const SEED_PASSWORD = process.env.SEED_PASSWORD || "password123"

async function main() {
    console.log("🌱 Seeding database...")

    const hashedPassword = await bcrypt.hash(SEED_PASSWORD, 12)

    // ─── Companies ────────────────────────────────────────────────
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
            workingDays: [1, 2, 3, 4, 5],
        },
    })

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
            workingDays: [1, 2, 3, 4, 5],
        },
    })

    console.log("✅ Companies and Addresses seeded.")

    // ─── Platform Admin ───────────────────────────────────────────
    await prisma.user.upsert({
        where: { email: "admin@folksmeal.com" },
        update: {},
        create: {
            id: "super-001",
            name: "Super Admin",
            email: "admin@folksmeal.com",
            password: hashedPassword,
        },
    })
    console.log("✅ Platform Admin seeded")

    // ─── Employees ────────────────────────────────────────────────
    const employees = [
        {
            id: "emp-001",
            companyId: companyLearnApp.id,
            addressId: addrLearnAppNoida.id,
            name: "Rahul Sharma",
            employeeCode: "EMP-1001",
            password: hashedPassword,
            defaultPreference: MealPreference.VEG,
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

    // ─── Seed Menus ───────────────────────────────────────────────
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

            if (addr.workingDays.includes(dayOfWeek)) {
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
        }
        console.log(`✅ Menus seeded for: ${addr.city}`)
    }

    console.log("\n🎉 Seed complete!")
    console.log("\n📋 Credentials (set SEED_PASSWORD env var to override, default: password123):")
    console.log("  Admin:    admin@folksmeal.com")
    console.log("  Employee: EMP-1001")
}

main()
    .catch((e) => {
        console.error("❌ Seed failed:", e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })