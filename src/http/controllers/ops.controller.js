import { getRealtimeRuntimeStats } from "../../modules/realtime/realtime.gateway.js";
import { getReadinessReport } from "../../ops/readiness.service.js";

export async function getRuntimeSnapshotHandler(_req, res) {
  const memory = process.memoryUsage();
  const cpu = process.cpuUsage();
  const readiness = await getReadinessReport();

  return res.status(200).json({
    process: {
      pid: process.pid,
      nodeVersion: process.version,
      uptimeSec: Math.round(process.uptime()),
      platform: process.platform,
      arch: process.arch,
      memory,
      cpu
    },
    readiness,
    realtime: getRealtimeRuntimeStats()
  });
}
