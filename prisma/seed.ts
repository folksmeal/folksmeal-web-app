import { MealPreference, SelectionStatus } from "@prisma/client"
import bcrypt from "bcryptjs"
import { prisma } from "../lib/prisma"

const SEED_PASSWORD = process.env.SEED_PASSWORD || "password123"

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

async function main() {
    console.log("🌱 Seeding database...\n")

    // Clean existing data (order matters due to foreign keys)
    await prisma.mealRating.deleteMany()
    await prisma.mealSelection.deleteMany()
    await prisma.menu.deleteMany()
    await prisma.employee.deleteMany()
    await prisma.companyAddress.deleteMany()
    await prisma.company.deleteMany()
    await prisma.user.deleteMany()
    console.log("🗑️  Cleaned existing data")

    const hashedPassword = await bcrypt.hash(SEED_PASSWORD, 12)

    // ─── Companies ────────────────────────────────────────────────────
    const companies = [
        { id: "company-techsolutions", name: "TechSolutions India", domain: "techsolutions.in" },
        { id: "company-greenleaf", name: "GreenLeaf Pharma", domain: "greenleafpharma.com" },
        { id: "company-stellar", name: "Stellar Fintech", domain: "stellarfintech.io" },
        { id: "company-urbancraft", name: "UrbanCraft Design", domain: "urbancraft.co.in" },
    ]

    for (const c of companies) {
        await prisma.company.upsert({ where: { id: c.id }, update: {}, create: c })
    }
    console.log(`✅ ${companies.length} Companies seeded`)

    // ─── Company Addresses ────────────────────────────────────────────
    const addresses = [
        { id: "addr-tech-noida", companyId: "company-techsolutions", city: "Noida", state: "Uttar Pradesh", address: "A-62, Sector 132, Noida Expressway", cutoffTime: "18:00", timezone: "Asia/Kolkata", workingDays: [1, 2, 3, 4, 5] },
        { id: "addr-tech-bangalore", companyId: "company-techsolutions", city: "Bangalore", state: "Karnataka", address: "2nd Floor, RMZ Ecoworld, Outer Ring Road, Bellandur", cutoffTime: "18:00", timezone: "Asia/Kolkata", workingDays: [1, 2, 3, 4, 5] },
        { id: "addr-green-mumbai", companyId: "company-greenleaf", city: "Mumbai", state: "Maharashtra", address: "Tower B, Piramal Agastya, Lower Parel", cutoffTime: "17:30", timezone: "Asia/Kolkata", workingDays: [1, 2, 3, 4, 5] },
        { id: "addr-green-hyderabad", companyId: "company-greenleaf", city: "Hyderabad", state: "Telangana", address: "Plot 18, HITEC City, Madhapur", cutoffTime: "17:30", timezone: "Asia/Kolkata", workingDays: [1, 2, 3, 4, 5] },
        { id: "addr-stellar-pune", companyId: "company-stellar", city: "Pune", state: "Maharashtra", address: "6th Floor, Cerebrum IT Park, Kalyani Nagar", cutoffTime: "18:30", timezone: "Asia/Kolkata", workingDays: [1, 2, 3, 4, 5] },
        { id: "addr-stellar-gurgaon", companyId: "company-stellar", city: "Gurgaon", state: "Haryana", address: "DLF Cyber City, Tower C, Sector 25A", cutoffTime: "18:00", timezone: "Asia/Kolkata", workingDays: [1, 2, 3, 4, 5] },
        { id: "addr-urban-delhi", companyId: "company-urbancraft", city: "New Delhi", state: "Delhi", address: "301, Connaught Place, Block A", cutoffTime: "17:00", timezone: "Asia/Kolkata", workingDays: [1, 2, 3, 4, 5] },
    ]

    for (const a of addresses) {
        await prisma.companyAddress.upsert({ where: { id: a.id }, update: {}, create: a })
    }
    console.log(`✅ ${addresses.length} Addresses seeded`)

    // ─── Platform Admins ─────────────────────────────────────────────
    const admins = [
        { id: "admin-001", name: "Arjun Mehta", email: "admin@folksmeal.com", password: hashedPassword },
        { id: "admin-002", name: "Priya Iyer", email: "priya@folksmeal.com", password: hashedPassword },
    ]

    for (const a of admins) {
        await prisma.user.upsert({ where: { email: a.email }, update: {}, create: a })
    }
    console.log(`✅ ${admins.length} Admins seeded`)

    // ─── Employees ───────────────────────────────────────────────────
    const employeeData: { id: string; companyId: string; addressId: string; name: string; employeeCode: string; defaultPreference: MealPreference }[] = [
        // TechSolutions Noida (8 employees)
        { id: "emp-001", companyId: "company-techsolutions", addressId: "addr-tech-noida", name: "Rahul Sharma", employeeCode: "TS-1001", defaultPreference: MealPreference.VEG },
        { id: "emp-002", companyId: "company-techsolutions", addressId: "addr-tech-noida", name: "Sneha Gupta", employeeCode: "TS-1002", defaultPreference: MealPreference.VEG },
        { id: "emp-003", companyId: "company-techsolutions", addressId: "addr-tech-noida", name: "Vikram Singh", employeeCode: "TS-1003", defaultPreference: MealPreference.NONVEG },
        { id: "emp-004", companyId: "company-techsolutions", addressId: "addr-tech-noida", name: "Ananya Joshi", employeeCode: "TS-1004", defaultPreference: MealPreference.VEG },
        { id: "emp-005", companyId: "company-techsolutions", addressId: "addr-tech-noida", name: "Karan Verma", employeeCode: "TS-1005", defaultPreference: MealPreference.NONVEG },
        { id: "emp-006", companyId: "company-techsolutions", addressId: "addr-tech-noida", name: "Meera Patel", employeeCode: "TS-1006", defaultPreference: MealPreference.VEG },
        { id: "emp-007", companyId: "company-techsolutions", addressId: "addr-tech-noida", name: "Aditya Kumar", employeeCode: "TS-1007", defaultPreference: MealPreference.NONVEG },
        { id: "emp-008", companyId: "company-techsolutions", addressId: "addr-tech-noida", name: "Pooja Nair", employeeCode: "TS-1008", defaultPreference: MealPreference.VEG },

        // TechSolutions Bangalore (5 employees)
        { id: "emp-009", companyId: "company-techsolutions", addressId: "addr-tech-bangalore", name: "Deepak Reddy", employeeCode: "TS-2001", defaultPreference: MealPreference.NONVEG },
        { id: "emp-010", companyId: "company-techsolutions", addressId: "addr-tech-bangalore", name: "Lavanya Krishnan", employeeCode: "TS-2002", defaultPreference: MealPreference.VEG },
        { id: "emp-011", companyId: "company-techsolutions", addressId: "addr-tech-bangalore", name: "Suresh Hegde", employeeCode: "TS-2003", defaultPreference: MealPreference.VEG },
        { id: "emp-012", companyId: "company-techsolutions", addressId: "addr-tech-bangalore", name: "Shruti Bhat", employeeCode: "TS-2004", defaultPreference: MealPreference.NONVEG },
        { id: "emp-013", companyId: "company-techsolutions", addressId: "addr-tech-bangalore", name: "Ravi Shankar", employeeCode: "TS-2005", defaultPreference: MealPreference.VEG },

        // GreenLeaf Mumbai (6 employees)
        { id: "emp-014", companyId: "company-greenleaf", addressId: "addr-green-mumbai", name: "Neha Deshmukh", employeeCode: "GL-3001", defaultPreference: MealPreference.VEG },
        { id: "emp-015", companyId: "company-greenleaf", addressId: "addr-green-mumbai", name: "Rohan Kulkarni", employeeCode: "GL-3002", defaultPreference: MealPreference.NONVEG },
        { id: "emp-016", companyId: "company-greenleaf", addressId: "addr-green-mumbai", name: "Simran Kaur", employeeCode: "GL-3003", defaultPreference: MealPreference.VEG },
        { id: "emp-017", companyId: "company-greenleaf", addressId: "addr-green-mumbai", name: "Amit Jain", employeeCode: "GL-3004", defaultPreference: MealPreference.VEG },
        { id: "emp-018", companyId: "company-greenleaf", addressId: "addr-green-mumbai", name: "Divya Saxena", employeeCode: "GL-3005", defaultPreference: MealPreference.NONVEG },
        { id: "emp-019", companyId: "company-greenleaf", addressId: "addr-green-mumbai", name: "Rajesh Menon", employeeCode: "GL-3006", defaultPreference: MealPreference.VEG },

        // GreenLeaf Hyderabad (4 employees)
        { id: "emp-020", companyId: "company-greenleaf", addressId: "addr-green-hyderabad", name: "Sai Kiran", employeeCode: "GL-4001", defaultPreference: MealPreference.NONVEG },
        { id: "emp-021", companyId: "company-greenleaf", addressId: "addr-green-hyderabad", name: "Padma Lakshmi", employeeCode: "GL-4002", defaultPreference: MealPreference.VEG },
        { id: "emp-022", companyId: "company-greenleaf", addressId: "addr-green-hyderabad", name: "Varun Rao", employeeCode: "GL-4003", defaultPreference: MealPreference.NONVEG },
        { id: "emp-023", companyId: "company-greenleaf", addressId: "addr-green-hyderabad", name: "Kavitha Reddy", employeeCode: "GL-4004", defaultPreference: MealPreference.VEG },

        // Stellar Pune (5 employees)
        { id: "emp-024", companyId: "company-stellar", addressId: "addr-stellar-pune", name: "Nikhil Patil", employeeCode: "SF-5001", defaultPreference: MealPreference.NONVEG },
        { id: "emp-025", companyId: "company-stellar", addressId: "addr-stellar-pune", name: "Aparna Deshpande", employeeCode: "SF-5002", defaultPreference: MealPreference.VEG },
        { id: "emp-026", companyId: "company-stellar", addressId: "addr-stellar-pune", name: "Siddharth Joshi", employeeCode: "SF-5003", defaultPreference: MealPreference.VEG },
        { id: "emp-027", companyId: "company-stellar", addressId: "addr-stellar-pune", name: "Tanvi More", employeeCode: "SF-5004", defaultPreference: MealPreference.NONVEG },
        { id: "emp-028", companyId: "company-stellar", addressId: "addr-stellar-pune", name: "Manoj Bhosale", employeeCode: "SF-5005", defaultPreference: MealPreference.VEG },

        // Stellar Gurgaon (4 employees)
        { id: "emp-029", companyId: "company-stellar", addressId: "addr-stellar-gurgaon", name: "Ritu Malhotra", employeeCode: "SF-6001", defaultPreference: MealPreference.VEG },
        { id: "emp-030", companyId: "company-stellar", addressId: "addr-stellar-gurgaon", name: "Ashish Trehan", employeeCode: "SF-6002", defaultPreference: MealPreference.NONVEG },
        { id: "emp-031", companyId: "company-stellar", addressId: "addr-stellar-gurgaon", name: "Nisha Aggarwal", employeeCode: "SF-6003", defaultPreference: MealPreference.VEG },
        { id: "emp-032", companyId: "company-stellar", addressId: "addr-stellar-gurgaon", name: "Gaurav Kapoor", employeeCode: "SF-6004", defaultPreference: MealPreference.NONVEG },

        // UrbanCraft Delhi (4 employees)
        { id: "emp-033", companyId: "company-urbancraft", addressId: "addr-urban-delhi", name: "Ishaan Batra", employeeCode: "UC-7001", defaultPreference: MealPreference.VEG },
        { id: "emp-034", companyId: "company-urbancraft", addressId: "addr-urban-delhi", name: "Sakshi Chawla", employeeCode: "UC-7002", defaultPreference: MealPreference.NONVEG },
        { id: "emp-035", companyId: "company-urbancraft", addressId: "addr-urban-delhi", name: "Manish Tiwari", employeeCode: "UC-7003", defaultPreference: MealPreference.VEG },
        { id: "emp-036", companyId: "company-urbancraft", addressId: "addr-urban-delhi", name: "Aisha Khan", employeeCode: "UC-7004", defaultPreference: MealPreference.NONVEG },
    ]

    for (const emp of employeeData) {
        await prisma.employee.upsert({
            where: { employeeCode: emp.employeeCode },
            update: { companyId: emp.companyId, addressId: emp.addressId },
            create: { ...emp, password: hashedPassword },
        })
    }
    console.log(`✅ ${employeeData.length} Employees seeded`)

    // ─── Menus (30 days, past 14 + future 16) ────────────────────────
    const vegMenuItems = [
        "Paneer Butter Masala, Butter Naan, Jeera Rice, Salad",
        "Dal Tadka, Aloo Gobi, Roti, Steamed Rice, Raita",
        "Chole Bhature, Green Salad, Pickle, Lassi",
        "Rajma Chawal, Papad, Boondi Raita, Gulab Jamun",
        "Mix Veg Curry, Roti, Veg Pulao, Cucumber Raita",
        "Kadhi Pakora, Roti, Rice, Kachumber Salad",
        "Palak Paneer, Tandoori Roti, Rice, Onion Salad",
        "Baingan Bharta, Dal Fry, Roti, Rice, Papad",
        "Mushroom Masala, Roti, Veg Biryani, Raita",
        "Malai Kofta, Naan, Rice, Green Chutney",
        "Aloo Matar, Paratha, Rice, Mixed Pickle",
        "Veg Kheema, Roti, Pulao, Salad",
        "Bhindi Masala, Dal Makhani, Roti, Rice",
        "Paneer Tikka Masala, Rumali Roti, Rice, Raita",
    ]

    const nonvegMenuItems = [
        "Chicken Curry, Tandoori Roti, Rice, Salad",
        "Butter Chicken, Garlic Naan, Rice, Onion Rings",
        null,
        "Egg Bhurji, Roti, Rice, Raita",
        "Mutton Rogan Josh, Naan, Rice, Salad",
        "Fish Fry, Rice, Dal, Papad",
        null,
        "Chicken Biryani, Raita, Salad, Boiled Egg",
        "Keema Matar, Roti, Rice, Pickle",
        null,
        "Chicken Tikka Masala, Naan, Rice, Salad",
        "Egg Curry, Paratha, Rice, Raita",
        null,
        "Tandoori Chicken, Naan, Rice, Salad",
    ]

    const sideBeverages = [
        "Buttermilk + Papad",
        "Sweet Lassi",
        "Masala Chaas",
        "Fresh Lime Soda",
        "Jal Jeera",
        null,
        "Rooh Afza",
    ]

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    let menuCount = 0
    for (const addr of addresses) {
        for (let i = -14; i <= 16; i++) {
            const date = new Date(today)
            date.setDate(today.getDate() + i)
            date.setHours(0, 0, 0, 0)
            const dow = date.getDay()

            if (!addr.workingDays.includes(dow)) continue

            const idx = Math.abs(i + 14) % vegMenuItems.length
            await prisma.menu.upsert({
                where: { addressId_date: { addressId: addr.id, date } },
                update: {},
                create: {
                    addressId: addr.id,
                    date,
                    day: dayNames[dow],
                    vegItem: vegMenuItems[idx],
                    nonvegItem: nonvegMenuItems[idx],
                    sideBeverage: sideBeverages[idx % sideBeverages.length],
                },
            })
            menuCount++
        }
    }
    console.log(`✅ ${menuCount} Menus seeded`)

    // ─── Meal Selections (past 14 days) ──────────────────────────────
    let selectionCount = 0
    let ratingCount = 0
    const ratingComments = [
        "Loved the paneer today!",
        "Dal was a bit bland.",
        "Excellent food, keep it up!",
        "Rice was perfectly cooked.",
        "Could use more spice.",
        null,
        "Best biryani so far 🔥",
        null,
        "Roti was too hard today.",
        "Great variety this week!",
        null,
        "Very tasty, thanks!",
        "Portion was too small.",
        null,
        "Absolutely delicious!",
        null,
        "Salad was fresh and crispy.",
        "Would love more non-veg options.",
        null,
        null,
    ]

    for (const emp of employeeData) {
        const addr = addresses.find(a => a.id === emp.addressId)!

        for (let i = -14; i <= -1; i++) {
            const date = new Date(today)
            date.setDate(today.getDate() + i)
            date.setHours(0, 0, 0, 0)
            const dow = date.getDay()

            if (!addr.workingDays.includes(dow)) continue

            // 85% opt-in rate
            const optIn = Math.random() < 0.85
            const status = optIn ? SelectionStatus.OPT_IN : SelectionStatus.OPT_OUT
            const preference = optIn ? emp.defaultPreference : null

            await prisma.mealSelection.upsert({
                where: { employeeId_date: { employeeId: emp.id, date } },
                update: {},
                create: {
                    employeeId: emp.id,
                    date,
                    status,
                    preference,
                },
            })
            selectionCount++

            // 60% of opt-in employees leave ratings
            if (optIn && Math.random() < 0.60) {
                const rating = [3, 4, 4, 4, 5, 5, 5, 5, 3, 2][Math.floor(Math.random() * 10)]
                const comment = ratingComments[Math.floor(Math.random() * ratingComments.length)]

                await prisma.mealRating.upsert({
                    where: { employeeId_date: { employeeId: emp.id, date } },
                    update: {},
                    create: {
                        employeeId: emp.id,
                        date,
                        rating,
                        comment,
                    },
                })
                ratingCount++
            }
        }

        // Today and tomorrow selections (future — opt-in only, no rating)
        for (let i = 0; i <= 1; i++) {
            const date = new Date(today)
            date.setDate(today.getDate() + i)
            date.setHours(0, 0, 0, 0)
            const dow = date.getDay()

            if (!addr.workingDays.includes(dow)) continue

            const optIn = Math.random() < 0.80
            await prisma.mealSelection.upsert({
                where: { employeeId_date: { employeeId: emp.id, date } },
                update: {},
                create: {
                    employeeId: emp.id,
                    date,
                    status: optIn ? SelectionStatus.OPT_IN : SelectionStatus.OPT_OUT,
                    preference: optIn ? emp.defaultPreference : null,
                },
            })
            selectionCount++
        }
    }
    console.log(`✅ ${selectionCount} Meal Selections seeded`)
    console.log(`✅ ${ratingCount} Meal Ratings seeded`)

    // ─── Summary ─────────────────────────────────────────────────────
    console.log("\n🎉 Seed complete!\n")
    console.log("📋 Credentials (default password: password123):")
    console.log("  Admin:      admin@folksmeal.com / priya@folksmeal.com")
    console.log("  Employees:  TS-1001 through TS-2005 (TechSolutions)")
    console.log("              GL-3001 through GL-4004 (GreenLeaf)")
    console.log("              SF-5001 through SF-6004 (Stellar)")
    console.log("              UC-7001 through UC-7004 (UrbanCraft)")
}

main()
    .catch((e) => {
        console.error("❌ Seed failed:", e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })