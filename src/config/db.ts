import { Pool } from "pg";
import { config } from "./index";

const pool = new Pool({
  connectionString: config.databaseUrl,
});

export const query = async (text: string, params?: any[]) => {
  const client = await pool.connect();
  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
};

export default pool;
