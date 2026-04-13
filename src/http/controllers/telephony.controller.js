import { handleZadarmaEvent } from "../../modules/telephony/zadarma/zadarma.service.js";

export async function zadarmaWebhookEchoHandler(req, res) {
  const challenge = String(req.query?.zd_echo || "");
  if (!challenge) {
    return res.status(400).send("missing_zd_echo");
  }

  return res.status(200).type("text/plain").send(challenge);
}

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

  if (result.control) {
    return res.status(200).json(result.control);
  }

  return res.status(200).json({ ok: true, duplicate: Boolean(result.duplicate) });
}
