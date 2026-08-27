-- Thư viện "Mẫu hợp đồng" — upload file .docx/.pdf/.txt, backend trích xuất text để
-- AI Contract Copilot tham chiếu văn phong/cấu trúc khi soạn thảo (yêu cầu từ Mylife
-- qua chat: "để a upload các hợp đồng mẫu lên để tham chiếu"). Chỉ lưu TEXT đã trích
-- xuất (không lưu file gốc trên Storage) — đủ dùng cho mục đích tham chiếu AI, đơn
-- giản hơn phải cấu hình bucket Supabase Storage riêng.

CREATE TABLE IF NOT EXISTS public.contract_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL CHECK (file_type IN ('docx', 'pdf', 'txt')),
    extracted_text TEXT NOT NULL DEFAULT '',
    created_by UUID REFERENCES public.app_users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contract_templates_created_at ON public.contract_templates(created_at DESC);

ALTER TABLE public.contract_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated full access" ON public.contract_templates;
CREATE POLICY "Allow authenticated full access" ON public.contract_templates
    FOR ALL USING (true) WITH CHECK (true);
