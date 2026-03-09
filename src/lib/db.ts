import mysql from "mysql2/promise"

export const db = mysql.createPool({
    host:     "localhost",
    port:     3306,
    user:     "root",       // usuario por defecto en XAMPP
    password: "",           // contraseña vacía por defecto en XAMPP
    database: "marcoaldany",
    waitForConnections: true,
    connectionLimit: 10,
})