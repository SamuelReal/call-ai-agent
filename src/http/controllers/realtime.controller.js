import { getRealtimeRuntimeStats, resetRealtimeRuntimeStats } from "../../modules/realtime/realtime.gateway.js";

export async function getRealtimeStatsHandler(_req, res) {
  const stats = getRealtimeRuntimeStats();
  return res.status(200).json(stats);
}

export async function resetRealtimeStatsHandler(_req, res) {
  const stats = resetRealtimeRuntimeStats();
  return res.status(200).json(stats);
}
