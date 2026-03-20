
import { getISTDate, getISTDateString, getTodayMidnightInTimezone, getTomorrowMidnightInTimezone, getISTHours } from "./lib/utils/time";

console.log("--- IST Utility Verification ---");
const ist = getISTDate();
console.log("Current IST Components:", ist);
console.log("IST Date String:", getISTDateString());
console.log("IST Hours:", getISTHours());
console.log("Today Midnight UTC:", getTodayMidnightInTimezone().toISOString());
console.log("Tomorrow Midnight UTC:", getTomorrowMidnightInTimezone().toISOString());

const mockDate = new Date("2026-03-21T00:00:00.000Z"); // Saturday Midnight UTC
console.log("\n--- Mock Date Verification (March 21st Saturday UTC) ---");
console.log("getISTDateString(mockDate):", getISTDateString(mockDate));

console.log("\nVerification complete.");
