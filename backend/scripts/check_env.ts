
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

console.log("Checking Env Vars...");
console.log("DATABASE_URL:", process.env.DATABASE_URL ? "Present" : "Missing");
console.log("SUPABASE_DB_URL:", process.env.SUPABASE_DB_URL ? "Present" : "Missing");
console.log("POSTGRES_URL:", process.env.POSTGRES_URL ? "Present" : "Missing");
