import mysql from "mysql2/promise"

export const db = mysql.createPool({
    host:     "127.0.0.1",
    port:     3306,
    user:     "root",
    password: import.meta.env.DB_PASSWORD || "",
    database: "marcoaldany",
})