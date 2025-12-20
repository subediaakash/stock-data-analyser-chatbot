import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/drizzle/db";

export const auth = betterAuth({
    database: drizzleAdapter(db, {
        provider: "pg",
    }),
    emailAndPassword: {
        enabled: true,
    },
    trustedOrigins: [
        "https://stock-data-analyser-chatbot.vercel.app/",
        "https://www.stock-data-analyser-chatbot.vercel.app/",
    ],
});
