-- Keep the existing production quote form for chatbot_auto_inbox/Douyin in sync
-- with the parent/child quote item structure. The form already exists in prod
-- with this generated code, so updating by code avoids creating a duplicate.

DO $$
DECLARE
    v_columns JSONB := '[
      {"key":"order","label":"STT","type":"auto-number","editable":false,"visible":true},
      {"key":"serviceDescription","label":"Tên dịch vụ","type":"textarea","required":true,"editable":true,"visible":true},
      {"key":"description","label":"Mô tả","type":"textarea","required":false,"editable":true,"visible":true},
      {"key":"unit","label":"ĐVT","type":"text","required":true,"editable":true,"visible":true},
      {"key":"quantity","label":"Số lượng","type":"number","required":true,"editable":true,"visible":true},
      {"key":"unitPrice","label":"Đơn giá (VND)","type":"currency","required":true,"editable":true,"visible":true},
      {"key":"discountPercent","label":"Giảm giá (%)","type":"number","required":true,"defaultValue":0,"editable":true,"visible":true},
      {"key":"vatRate","label":"Thuế VAT","type":"number","required":true,"defaultValue":10,"editable":true,"visible":true},
      {"key":"total","label":"Thành tiền thanh toán (VND)","type":"calculated","editable":false,"visible":true}
    ]'::jsonb;
    v_items JSONB := '[
      {
        "serviceDescription":"Tải video nguồn",
        "description":"Nhóm dịch vụ xử lý video đầu vào cho hệ thống chatbot_auto_inbox và lồng tiếng Douyin.",
        "unit":"Gói",
        "quantity":1,
        "unitPrice":5000000,
        "discountPercent":10,
        "vatRate":10,
        "children":[
          {"serviceDescription":"Tải qua relay bot Telegram công khai","description":"Nhận link Douyin/TikTok từ relay bot Telegram và đưa vào hàng đợi xử lý.","unit":"Tác vụ","quantity":1,"unitPrice":1000000,"discountPercent":0,"vatRate":10},
          {"serviceDescription":"Tải trực tiếp bằng cookie Douyin","description":"Dùng cookie hợp lệ để tải trực tiếp video nguồn khi relay không đủ dữ liệu.","unit":"Tác vụ","quantity":1,"unitPrice":1500000,"discountPercent":50,"vatRate":10},
          {"serviceDescription":"Tự động làm mới cookie Douyin theo lịch","description":"Theo dõi hạn cookie và nhắc/làm mới theo lịch vận hành đã thống nhất.","unit":"Tháng","quantity":1,"unitPrice":1200000,"discountPercent":0,"vatRate":10},
          {"serviceDescription":"Giới hạn thời lượng video nguồn","description":"Áp rule giới hạn thời lượng trước khi đưa video vào pipeline lồng tiếng.","unit":"Rule","quantity":1,"unitPrice":800000,"discountPercent":100,"vatRate":10}
        ]
      },
      {
        "serviceDescription":"Lồng tiếng Douyin và đồng bộ chatbot_auto_inbox",
        "description":"Nhóm xử lý âm thanh, transcript và đồng bộ nội dung đã hoàn thiện về hệ thống inbox tự động.",
        "unit":"Gói",
        "quantity":1,
        "unitPrice":8000000,
        "discountPercent":0,
        "vatRate":10,
        "children":[
          {"serviceDescription":"Tách transcript và chuẩn hóa nội dung","description":"Tạo transcript tiếng gốc, chuẩn hóa câu thoại và loại bỏ đoạn không cần xử lý.","unit":"Gói","quantity":1,"unitPrice":2000000,"discountPercent":0,"vatRate":10},
          {"serviceDescription":"Lồng tiếng Việt theo giọng thương hiệu","description":"Sinh voice tiếng Việt theo cấu hình giọng và tốc độ đọc đã thống nhất.","unit":"Video","quantity":10,"unitPrice":350000,"discountPercent":0,"vatRate":10},
          {"serviceDescription":"Đồng bộ kết quả vào chatbot_auto_inbox","description":"Gắn file hoàn thiện, metadata và trạng thái xử lý vào luồng trả lời tự động.","unit":"Gói","quantity":1,"unitPrice":2500000,"discountPercent":0,"vatRate":10}
        ]
      }
    ]'::jsonb;
    v_form RECORD;
    v_schema JSONB;
    v_sections JSONB;
    v_section JSONB;
    v_fields JSONB;
    v_field JSONB;
BEGIN
    FOR v_form IN
        SELECT id, schema_json
        FROM public.quote_forms
        WHERE code = 'HE_THONG_CHATBOT_AUTO_INBOX_VA_LONG_TIENG_DOUYIN'
    LOOP
        v_schema := COALESCE(v_form.schema_json, '{}'::jsonb);
        v_sections := '[]'::jsonb;

        FOR v_section IN SELECT * FROM jsonb_array_elements(COALESCE(v_schema->'sections', '[]'::jsonb)) LOOP
            v_fields := '[]'::jsonb;

            FOR v_field IN SELECT * FROM jsonb_array_elements(COALESCE(v_section->'fields', '[]'::jsonb)) LOOP
                IF v_field->>'key' = 'quoteItems' THEN
                    v_field := jsonb_set(v_field, '{defaultValue}', v_items, true);
                    v_field := jsonb_set(v_field, '{config,columns}', v_columns, true);
                    v_field := jsonb_set(v_field, '{config,allowAddRows}', 'true'::jsonb, true);
                    v_field := jsonb_set(v_field, '{config,allowDeleteRows}', 'true'::jsonb, true);
                    v_field := jsonb_set(v_field, '{config,allowReorderRows}', 'true'::jsonb, true);
                END IF;

                IF v_field->>'key' = 'quoteTitle' THEN
                    v_field := jsonb_set(v_field, '{defaultValue}', to_jsonb('Hệ thống chatbot_auto_inbox và lồng tiếng Douyin'::text), true);
                END IF;

                v_fields := v_fields || jsonb_build_array(v_field);
            END LOOP;

            v_sections := v_sections || jsonb_build_array(jsonb_set(v_section, '{fields}', v_fields, true));
        END LOOP;

        UPDATE public.quote_forms
        SET
            name = 'Hệ thống chatbot_auto_inbox và lồng tiếng Douyin',
            description = 'Mẫu báo giá dùng cấu trúc dịch vụ cha/con chung cho hệ thống chatbot_auto_inbox, tải video nguồn và lồng tiếng Douyin.',
            schema_json = jsonb_set(v_schema, '{sections}', v_sections, true),
            updated_at = NOW()
        WHERE id = v_form.id;
    END LOOP;
END $$;
