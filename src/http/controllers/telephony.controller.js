import { handleZadarmaEvent } from "../../modules/telephony/zadarma/zadarma.service.js";

export async function zadarmaWebhookHandler(req, res) {
  const result = await handleZadarmaEvent({
    payload: req.body,
    headers: req.headers,
    rawBody: req.rawBody,
    correlationId: req.correlationId
  });

  if (!result.accepted) {
    return res.status(401).json({ ok: false, error: result.reason });
  }

  return res.status(200).json({ ok: true });
}
