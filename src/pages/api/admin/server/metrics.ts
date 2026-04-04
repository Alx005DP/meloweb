import type { APIRoute } from "astro"
import os from "node:os"
import path from "node:path"
import { statfs } from "node:fs/promises"
import { db } from "../../../../lib/db"
import { getLatestBackupFile, requireAdmin } from "../../../../lib/admin-database"

let previousCpuSnapshot: { idle: number; total: number } | null = null

const getCpuSnapshot = () => {
    const totals = os.cpus().reduce(
        (acc, cpu) => {
            const times = cpu.times
            const total = times.user + times.nice + times.sys + times.idle + times.irq
            acc.idle += times.idle
            acc.total += total
            return acc
        },
        { idle: 0, total: 0 }
    )

    return totals
}

const getCpuUsagePercent = () => {
    const current = getCpuSnapshot()

    if (!previousCpuSnapshot) {
        previousCpuSnapshot = current
        return null
    }

    const idleDelta = current.idle - previousCpuSnapshot.idle
    const totalDelta = current.total - previousCpuSnapshot.total
    previousCpuSnapshot = current

    if (totalDelta <= 0) return null
    const usage = 100 - (idleDelta / totalDelta) * 100
    return Math.max(0, Math.min(100, usage))
}

const getDiskMetrics = async () => {
    try {
        const rootPath = path.parse(process.cwd()).root || process.cwd()
        const stats = await statfs(rootPath)
        const blockSize = Number(stats.bsize || 0)
        const total = blockSize * Number(stats.blocks || 0)
        const free = blockSize * Number(stats.bfree || 0)
        const used = Math.max(0, total - free)

        return { total, used, free }
    } catch {
        return null
    }
}

export const GET: APIRoute = async ({ cookies }) => {
    const auth = await requireAdmin(cookies)
    if ("error" in auth) return auth.error

    const totalMem = os.totalmem()
    const freeMem = os.freemem()
    const usedMem = totalMem - freeMem
    const cpuPercent = getCpuUsagePercent()
    const disk = await getDiskMetrics()
    const backup = await getLatestBackupFile()

    let mysqlStatus: "online" | "offline" = "offline"
    let dbLatencyMs: number | null = null

    try {
        const start = Date.now()
        await db.query("SELECT 1")
        dbLatencyMs = Date.now() - start
        mysqlStatus = "online"
    } catch {
        mysqlStatus = "offline"
    }

    const heap = process.memoryUsage()

    return new Response(JSON.stringify({
        timestamp: new Date().toISOString(),
        host: {
            hostname: os.hostname(),
            platform: os.platform(),
            arch: os.arch(),
            cpus: os.cpus().length,
            node: process.version,
            uptimeSec: os.uptime(),
        },
        cpu: {
            usagePercent: cpuPercent,
            loadAvg: os.loadavg(),
        },
        memory: {
            total: totalMem,
            used: usedMem,
            free: freeMem,
            usagePercent: totalMem > 0 ? (usedMem / totalMem) * 100 : 0,
            heapUsed: heap.heapUsed,
            heapTotal: heap.heapTotal,
        },
        disk: disk
            ? {
                total: disk.total,
                used: disk.used,
                free: disk.free,
                usagePercent: disk.total > 0 ? (disk.used / disk.total) * 100 : 0,
            }
            : null,
        services: {
            node: "online",
            mysql: mysqlStatus,
            backup: backup ? "online" : "warning",
            dbLatencyMs,
        },
        backup: backup
            ? {
                name: backup.name,
                size: backup.size,
                modifiedAt: backup.modifiedAt.toISOString(),
            }
            : null,
    }), { status: 200 })
}
