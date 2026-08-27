-- Gan mau bao gia voi 1 cong ty phat hanh (1 cong ty co the co nhieu mau; 1 mau
-- chi thuoc dung 1 cong ty, khong dung chung giua cac cong ty). NULL = mau
-- trung tinh dung chung (vd "Mau bao gia chuan") - khong bat buoc moi mau phai
-- co cong ty, chi bat buoc khi tao/sua mau MOI qua UI (validate o frontend).
ALTER TABLE quote_forms
  ADD COLUMN issuer_company_id UUID REFERENCES quote_issuer_companies(id) ON DELETE SET NULL;

CREATE INDEX quote_forms_issuer_company_id_idx ON quote_forms(issuer_company_id);
