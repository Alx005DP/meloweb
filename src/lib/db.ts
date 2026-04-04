import mysql from "mysql2/promise"

const env = {
    DB_HOST: process.env.DB_HOST || import.meta.env.DB_HOST,
    DB_PORT: process.env.DB_PORT || import.meta.env.DB_PORT,
    DB_USER: process.env.DB_USER || import.meta.env.DB_USER,
    DB_PASSWORD: process.env.DB_PASSWORD || import.meta.env.DB_PASSWORD,
    DB_NAME: process.env.DB_NAME || import.meta.env.DB_NAME,
}

export const db = mysql.createPool({
    host: env.DB_HOST || "127.0.0.1",
    port: Number(env.DB_PORT || 3306),
    user: env.DB_USER || "root",
    password: env.DB_PASSWORD || "",
    database: env.DB_NAME || "marcoaldany",
    ssl: false,
})
