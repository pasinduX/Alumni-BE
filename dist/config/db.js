"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.query = void 0;
const pg_1 = require("pg");
const index_1 = require("./index");
const pool = new pg_1.Pool({
    connectionString: index_1.config.databaseUrl,
});
const query = async (text, params) => {
    const client = await pool.connect();
    try {
        return await client.query(text, params);
    }
    finally {
        client.release();
    }
};
exports.query = query;
exports.default = pool;
//# sourceMappingURL=db.js.map