import crypto from "crypto";
import { Pool, PoolClient } from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

interface KeyPair {
  raw: string;
  hash: string;
}

interface Seed {
  clientName: string;
  permissions: string[];
}

function generateKey(): KeyPair {
  const raw  = crypto.randomBytes(32).toString("hex");
  const hash = crypto.createHash("sha256").update(raw).digest("hex");
  return { raw, hash };
}

const seeds: Seed[] = [
  { clientName: "analytics-dashboard", permissions: ["read:alumni", "read:analytics"] },
  { clientName: "ar-app", permissions: ["read:alumni_of_day"] },
];

async function main(): Promise<void> {
  const client: PoolClient = await pool.connect();
  try {
    for (const seed of seeds) {
      const { raw, hash } = generateKey();

      await client.query(
        `INSERT INTO api_keys (client_name, key_hash, permissions)
         VALUES ($1, $2, $3)
         ON CONFLICT (key_hash) DO NOTHING`,
        [seed.clientName, hash, JSON.stringify(seed.permissions)]
      );

      console.log(`label       : ${seed.label}`);
      console.log(`raw API key : ${raw}`);
      console.log("---------------------------------------------------");
    }

    console.log("Seed complete. Store the raw keys above — they cannot be recovered later.");
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err: unknown) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
