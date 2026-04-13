import { z } from "zod";
import { enqueueOutboundCall, getCallStatus } from "../../modules/calls/call.service.js";

const outboundSchema = z.object({
  phone: z.string().min(6),
  campaign: z.string().default("agendamiento"),
  metadata: z.record(z.any()).optional().default({})
});

export async function createOutboundCallHandler(req, res) {
  const parsed = outboundSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "validation_error", details: parsed.error.flatten() });
  }

  const job = await enqueueOutboundCall(parsed.data, req.correlationId);
  return res.status(202).json(job);
}

export async function getCallStatusHandler(req, res) {
  const status = await getCallStatus(req.params.callId);
  if (!status) {
    return res.status(404).json({ error: "not_found", message: "call not found" });
  }
  return res.status(200).json(status);
}
