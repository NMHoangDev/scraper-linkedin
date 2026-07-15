"""Seed the two real quote form templates (idempotent) for Seeding's CRM.

Requires migration 028_quote_forms_and_quotes.sql to already be applied
(quote_forms/quotes/quote_items tables + customer_leads.quote_id column).

Idempotent: upserts by unique `code`, safe to run multiple times.

Content ported from chatwoot/overrides/app/services/quote_forms/{standard_seed,
villa_automation_seed}.rb — same two templates already used in production Chatwoot,
adapted to the plain JSON shape consumed by modules/quotes on the frontend.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.supabase_client import get_supabase_client  # noqa: E402


def field(key, label, type_, required=False, editable=True, visible=True,
          default_value=None, placeholder=None, help_text=None, options=None,
          config=None, formula=None):
    data = {"key": key, "label": label, "type": type_, "required": required,
            "editable": editable, "visible": visible}
    if default_value is not None:
        data["defaultValue"] = default_value
    if placeholder is not None:
        data["placeholder"] = placeholder
    if help_text is not None:
        data["helpText"] = help_text
    if options is not None:
        data["options"] = options
    if config is not None:
        data["config"] = config
    if formula is not None:
        data["formula"] = formula
    return data


def section(key, title, fields):
    return {"key": key, "title": title, "fields": fields}


def standard_schema():
    return {
        "version": 1,
        "layoutType": "cloudgate_standard_quote",
        "sections": [
            section("seller", "THÔNG TIN ĐƠN VỊ BÁO GIÁ", [
                field("sellerCompanyName", "Tên công ty", "text", required=True, default_value="CÔNG TY TNHH CLOUDGATE"),
                field("sellerAddress", "Địa chỉ công ty", "textarea", default_value=""),
                field("sellerContactName", "Người liên hệ", "text", required=True, default_value="Dương Thị Mai"),
                field("sellerPhone", "SĐT", "phone", required=True, default_value="+84 906750554"),
                field("sellerEmail", "Email", "email", required=True, default_value="sales@getcloudgate.com"),
                field("sellerWebsite", "Website", "text", default_value="Getcloudgate.com"),
            ]),
            section("customer", "THÔNG TIN KHÁCH HÀNG", [
                field("customerRecipient", "Kính gửi", "text", required=True,
                      placeholder="Ví dụ: Anh Nguyễn Văn An",
                      help_text="Nhập tên người nhận báo giá hoặc đại diện khách hàng."),
                field("customerCompanyName", "Khách hàng", "text", required=True,
                      placeholder="Ví dụ: Công ty TNHH Markee",
                      help_text="Nhập đúng tên công ty hoặc dự án của khách hàng."),
                field("customerContactName", "Người liên hệ khách hàng", "text",
                      placeholder="Ví dụ: Nguyễn Văn An",
                      help_text="Nhập người đang trao đổi trực tiếp với bộ phận kinh doanh."),
                field("customerAddress", "Địa chỉ", "textarea",
                      placeholder="Ví dụ: 12 Nguyễn Huệ, Quận 1, TP.HCM",
                      help_text="Nhập địa chỉ xuất hóa đơn hoặc địa chỉ dự án nếu có."),
                field("customerPhone", "Số điện thoại khách hàng", "phone",
                      placeholder="Ví dụ: 0906 750 554",
                      help_text="Dùng số điện thoại khách đang sử dụng để liên hệ trực tiếp."),
                field("customerEmail", "Email khách hàng", "email",
                      placeholder="Ví dụ: khachhang@congty.com",
                      help_text="Nhập email nhận báo giá hoặc email người phụ trách."),
                field("customerTaxCode", "Mã số thuế", "text",
                      placeholder="Ví dụ: 0312345678",
                      help_text="Nhập mã số thuế nếu khách cần xuất hóa đơn."),
            ]),
            section("quoteInfo", "THÔNG TIN CHUNG CỦA BÁO GIÁ", [
                field("quoteTitle", "Tiêu đề báo giá", "text", required=True, default_value="BẢNG BÁO GIÁ",
                      placeholder="Ví dụ: Báo giá triển khai CRM",
                      help_text="Nhập tiêu đề ngắn gọn để khách hiểu nội dung báo giá."),
                field("quoteNumber", "Số báo giá", "text", required=True,
                      config={"generatedWhenCreatingQuote": True}),
                field("quoteDate", "Ngày báo giá", "date", required=True,
                      help_text="Chọn ngày phát hành báo giá."),
                field("validityDays", "Thời hạn hiệu lực", "number", required=True, default_value=30,
                      placeholder="Ví dụ: 30", help_text="Nhập số ngày báo giá còn hiệu lực."),
                field("currency", "Đơn vị tiền tệ", "select", required=True, default_value="VND", options=["VND"]),
                field("defaultVatRate", "Thuế VAT mặc định", "number", required=True, default_value=10),
            ]),
            section("quoteItems", "BẢNG DỊCH VỤ/SẢN PHẨM", [
                field("quoteItems", "Dịch vụ", "repeater-table", required=True, config={
                    "allowAddRows": True, "allowDeleteRows": True, "allowReorderRows": True,
                    "initialRows": 0,
                    "columns": [
                        field("order", "STT", "auto-number", editable=False),
                        field("serviceDescription", "Tên dịch vụ", "textarea", required=True,
                              placeholder="Ví dụ: Thiết kế website doanh nghiệp",
                              help_text="Nhập tên sản phẩm hoặc dịch vụ khách cần."),
                        field("unit", "ĐVT", "text", required=True,
                              placeholder="Ví dụ: Gói, Tháng, Người dùng",
                              help_text="Nhập đơn vị tính phù hợp với dịch vụ."),
                        field("quantity", "Số lượng", "number", required=True,
                              placeholder="Ví dụ: 1", help_text="Nhập số lượng khách đăng ký."),
                        field("unitPrice", "Đơn giá (VND)", "currency", required=True,
                              placeholder="Ví dụ: 15000000", help_text="Nhập giá cho một đơn vị, chưa gồm VAT."),
                        field("subtotal", "Thành tiền trước VAT", "calculated", editable=False,
                              formula="quantity * unitPrice"),
                        field("vatRate", "Thuế VAT", "number", required=True, default_value=10,
                              placeholder="Ví dụ: 10", help_text="Nhập phần trăm thuế, ví dụ 10."),
                        field("vatAmount", "Tiền VAT", "calculated", editable=False, visible=False,
                              formula="subtotal * vatRate / 100"),
                        field("total", "Thành tiền thanh toán (VND)", "calculated", editable=False,
                              formula="subtotal + vatAmount"),
                    ],
                }),
            ]),
            section("totals", "TỔNG TIỀN", [
                field("subtotalAmount", "TỔNG CỘNG CHƯA BAO GỒM THUẾ GTGT", "calculated", editable=False,
                      formula="sum(quoteItems.subtotal)"),
                field("totalVatAmount", "THUẾ GTGT", "calculated", editable=False,
                      formula="sum(quoteItems.vatAmount)"),
                field("totalAmount", "TỔNG THANH TOÁN", "calculated", editable=False,
                      formula="subtotalAmount + totalVatAmount"),
            ]),
            section("notes", "GHI CHÚ", [
                field("notes", "GHI CHÚ", "repeatable-textarea", default_value=[
                    "Giá trên được tính theo đơn vị VND, đã bao gồm thuế GTGT.",
                    "Báo giá có hiệu lực trong vòng 30 ngày kể từ ngày phát hành.",
                    "Phương thức thanh toán sẽ được nhập theo từng báo giá.",
                    "Giảm giá được áp dụng theo từng trường hợp.",
                    "Các hạng mục ngoài phạm vi sẽ được báo giá riêng.",
                ]),
            ]),
            section("representatives", "ĐẠI DIỆN HAI BÊN", [
                field("companyRepresentative", "ĐẠI DIỆN CÔNG TY", "text", default_value="DƯƠNG THỊ MAI"),
                field("customerRepresentative", "KHÁCH HÀNG", "text", default_value=""),
            ]),
        ],
    }


def villa_schema():
    return {
        "version": 1,
        "layoutType": "villa_solution_package",
        "sections": [
            section("quoteInfo", "THÔNG TIN BÁO GIÁ", [
                field("sellerBrandName", "Thương hiệu", "text", required=True, default_value="MARKEE"),
                field("customerRecipient", "Kính gửi", "text", required=True, default_value="",
                      placeholder="Ví dụ: Anh Nguyễn Văn An",
                      help_text="Nhập tên người nhận báo giá hoặc đại diện khách hàng."),
                field("quoteNumber", "Số báo giá", "text", required=True,
                      config={"generatedWhenCreatingQuote": True}),
                field("quoteDate", "Ngày báo giá", "date", required=True,
                      help_text="Chọn ngày phát hành báo giá."),
                field("quoteTitle", "Tiêu đề báo giá", "text", required=True,
                      default_value="GIẢI PHÁP TƯ VẤN ONLINE & GIỮ KHÁCH HÀNG TỰ ĐỘNG",
                      placeholder="Ví dụ: Giải pháp giữ khách tự động",
                      help_text="Nhập tiêu đề ngắn gọn thể hiện gói giải pháp đang báo giá."),
                field("quoteSubtitle", "Nội dung giới thiệu", "textarea", required=False,
                      default_value="Khách nhắn ngoài giờ mà không ai trả lời? → Markee phản hồi tức thì 24/7.",
                      help_text="Nhập đoạn mô tả ngắn về vấn đề của khách và giá trị giải pháp."),
                field("quoteBenefitLine", "Dòng lợi ích", "textarea", required=False,
                      default_value="⭐ Kế toán, tư vấn, giáo dục, sửa chữa, dịch vụ chuyên môn",
                      help_text="Nhập một dòng nêu nhóm ngành hoặc lợi ích chính của gói."),
            ]),
            section("solutions", "DANH SÁCH GIẢI PHÁP", [
                field("solutionItems", "Danh sách giải pháp", "repeater-table", required=True, default_value=[],
                      config={
                          "allowAddRows": True, "allowDeleteRows": True, "allowReorderRows": True,
                          "initialRows": 0,
                          "columns": [
                              field("order", "STT", "auto-number", editable=False),
                              field("solutionName", "Giải pháp", "textarea", required=True,
                                    placeholder="Ví dụ: Website tư vấn tự động",
                                    help_text="Nhập tên gói giải pháp hoặc hạng mục khách cần."),
                              field("customerBenefit", "Bạn nhận được", "textarea", required=True,
                                    placeholder="Ví dụ: Tự động phản hồi khách 24/7",
                                    help_text="Mô tả lợi ích trực tiếp khách nhận được từ hạng mục này."),
                              field("includedFeatures", "Bao gồm", "textarea", required=True,
                                    placeholder="Ví dụ: Landing page, chatbot, hướng dẫn vận hành",
                                    help_text="Liệt kê phạm vi công việc và nội dung bàn giao."),
                              field("offerPrice", "Giá ưu đãi", "currency", required=True,
                                    placeholder="Ví dụ: 15000000",
                                    help_text="Nhập giá bán áp dụng cho khách trong báo giá này."),
                              field("originalPrice", "Giá gốc", "currency", required=False,
                                    placeholder="Ví dụ: 25000000",
                                    help_text="Nhập giá gốc trước ưu đãi nếu cần hiển thị so sánh."),
                              field("pricingNote", "Ghi chú giá", "text", required=False,
                                    default_value="Trọn gói", placeholder="Ví dụ: Trọn gói",
                                    help_text="Ghi chú cách tính giá như trọn gói, theo tháng hoặc theo người dùng."),
                          ],
                      }),
            ]),
            section("commitments", "CAM KẾT", [
                field("commitments", "Cam kết", "repeatable-textarea", default_value=[
                    "1. ✅ Setup hoàn chỉnh",
                    "2. ✅ Hướng dẫn tận tay",
                    "3. ✅ Đồng hành 90 ngày đầu",
                    "4. ✅ Hoàn tiền nếu không triển khai được",
                ]),
            ]),
            section("totals", "CHI PHÍ VÀ THANH TOÁN", [
                field("setupTotalAmount", "Chi phí setup một lần", "calculated", editable=False,
                      formula="sum(solutionItems.offerPrice)"),
                field("monthlyAmount", "Chi phí hàng tháng", "currency", editable=True, default_value=0),
                field("paymentPhaseOnePercent", "Tỷ lệ thanh toán đợt 1", "number", default_value=30),
                field("paymentPhaseTwoPercent", "Tỷ lệ thanh toán đợt 2", "number", default_value=70),
                field("paymentPhaseOneAmount", "Thanh toán đợt 1", "calculated",
                      formula="setupTotalAmount * paymentPhaseOnePercent / 100"),
                field("paymentPhaseTwoAmount", "Thanh toán đợt 2", "calculated",
                      formula="setupTotalAmount * paymentPhaseTwoPercent / 100"),
            ]),
            section("implementation", "TRIỂN KHAI VÀ LIÊN HỆ", [
                field("implementationStepOne", "Bước 1", "text", default_value="Đặt lịch tư vấn 15 phút miễn phí"),
                field("implementationStepTwo", "Bước 2", "text", default_value="Triển khai trong 7 ngày làm việc"),
                field("sellerEmail", "Email liên hệ", "email", default_value="hello@markeeai.com"),
                field("sellerZalo", "Zalo", "text", default_value="076 5055 708"),
                field("offerExpiryText", "Thời hạn ưu đãi", "text", default_value="Ưu đãi hết ngày"),
                field("offerExpiryDate", "Ngày hết hạn ưu đãi", "date", required=False),
            ]),
        ],
    }


TEMPLATES = [
    {
        "code": "STANDARD_QUOTE_FORM",
        "name": "Mẫu báo giá Cloudgate",
        "description": "Mẫu báo giá dùng để nhập thông tin khách hàng, dịch vụ, số lượng, đơn giá, thuế và điều khoản khi tạo deal trong CRM.",
        "status": "active",
        "schema_version": 1,
        "layout_type": "cloudgate_standard_quote",
        "schema_json": standard_schema(),
    },
    {
        "code": "MARKEE_VILLA_AUTOMATION_QUOTE",
        "name": "Giải pháp tư vấn online & giữ khách hàng tự động",
        "description": "Mẫu báo giá giải pháp website, quản lý villa, đồng bộ OTA, dịch vụ du lịch, đa ngôn ngữ, landing page, triển khai production và hạ tầng.",
        "status": "active",
        "schema_version": 1,
        "layout_type": "villa_solution_package",
        "schema_json": villa_schema(),
    },
]


def main() -> int:
    client = get_supabase_client()
    for template in TEMPLATES:
        existing = (
            client.table("quote_forms")
            .select("id, name")
            .eq("code", template["code"])
            .execute()
        )
        if existing.data:
            print(f"SKIP (already exists): {template['code']} -> {existing.data[0]['id']}")
            continue
        result = client.table("quote_forms").insert(template).execute()
        row = result.data[0] if result.data else {}
        print(f"CREATED: {template['code']} -> {row.get('id')} ({template['name']})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
