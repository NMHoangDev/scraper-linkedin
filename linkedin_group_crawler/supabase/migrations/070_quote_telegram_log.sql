-- Lich su gui bao gia qua Telegram (nut "Gui Telegram" o man thanh cong + trang
-- chi tiet bao gia). Append-only - moi lan bam gui (ke ca "Gui lai" sau khi loi)
-- tao 1 dong MOI, khong ghi de dong cu, de giu du vet tung lan thu.
CREATE TABLE quote_telegram_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  chat_id TEXT NOT NULL,
  message_thread_id TEXT,
  telegram_message_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'success', 'failed')),
  error_message TEXT,
  sent_by UUID REFERENCES app_users(id),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX quote_telegram_log_quote_id_idx ON quote_telegram_log(quote_id);
