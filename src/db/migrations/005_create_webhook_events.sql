CREATE TABLE IF NOT EXISTS webhook_events (
  event_key CHAR(64) PRIMARY KEY,
  provider VARCHAR(32) NOT NULL,
  event_name VARCHAR(80) NULL,
  call_id VARCHAR(64) NULL,
  payload_json JSON NOT NULL,
  received_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_webhook_events_provider_received_at (provider, received_at),
  KEY idx_webhook_events_call_id (call_id)
);
