import type { MaterialSymbolName } from "@/components/ui/MaterialIcon";

export interface ExtensionGuideStep {
  title: string;
  content: string;
}

export interface ExtensionItem {
  /** ID duy nhất của extension. */
  id: string;
  /** Tên hiển thị. */
  name: string;
  /** Mô tả ngắn. */
  description: string;
  /** Category (nhóm chức năng). */
  category: string;
  /** Icon (Material Symbol). */
  icon: MaterialSymbolName;
  /** Trạng thái: internal = nội bộ, chưa có bản tải công khai. */
  isInternal: boolean;
  /** Đường dẫn file zip nằm trong thư mục public (chỉ extension Available). */
  downloadUrl?: string;
  /** Deep-link tới trang cấu hình tương ứng (chỉ extension Available). */
  configUrl?: string;
  /** Link video hướng dẫn (nếu không có thì ẩn nút, KHÔNG disabled). */
  videoUrl?: string;
  /** Các bước hướng dẫn cài đặt cho Accordion. */
  steps: ExtensionGuideStep[];
}

/**
 * Danh sách extension chính thức của hệ thống.
 * - Nguồn file zip: thư mục `public/`.
 * - Nếu extension có video, điền `videoUrl` → UI tự hiện nút "Video hướng dẫn".
 * - Nếu chưa có video, để `videoUrl` undefined → nút ẩn hoàn toàn.
 * - Extension internal: không có `downloadUrl`/`configUrl`.
 */
export const extensionsData: ExtensionItem[] = [
  {
    id: "api-extension",
    name: "Siêu Tốc Cào Dữ Liệu (API Extension)",
    description:
      "Tự động gọi GraphQL API của Facebook để cào dữ liệu bài viết từ nhóm, lưu về hệ thống theo từ khoá và số lượng đã chọn.",
    category: "Cào dữ liệu",
    icon: "auto_awesome",
    isInternal: false,
    downloadUrl: "/api-facebook-get-extension.zip",
    configUrl: "/all-platform",
    videoUrl: "https://www.youtube.com/watch?v=IL3uP0Rb-54",
    steps: [
      {
        title: "Tải extension",
        content:
          "Bấm nút \"Tải Extension\" để tải file zip về máy, sau đó giải nén ra một thư mục cố định.",
      },
      {
        title: "Cài đặt vào Chrome",
        content:
          "Mở chrome://extensions → bật \"Chế độ nhà phát triển\" → chọn \"Tải tiện ích đã giải nén\" → trỏ tới thư mục vừa giải nén.",
      },
      {
        title: "Mở cấu hình & cào dữ liệu",
        content:
          "Mở trang quản lý, chọn nhóm và từ khoá cần cào, nhấn bắt đầu. Extension sẽ tự chạy và lưu bài viết về hệ thống.",
      },
    ],
  },
  {
    id: "comment-extension",
    name: "Seeding Comment Hàng Loạt",
    description:
      "Tự động comment hàng loạt chạy ngầm trên trình duyệt, không làm gián đoạn công việc, kết hợp hẹn giờ và chọn mẫu câu.",
    category: "Seeding",
    icon: "forum",
    isInternal: false,
    downloadUrl: "/comment-extension.zip",
    configUrl: "/all-platform/post-feed",
    videoUrl: "https://www.youtube.com/watch?v=EWdw2-70vFY",
    steps: [
      {
        title: "Tải extension",
        content:
          "Tải file zip về máy và giải nén vào một thư mục cố định (không xoá sau khi cài).",
      },
      {
        title: "Cài đặt vào Chrome",
        content:
          "Vào chrome://extensions → bật chế độ nhà phát triển → \"Tải tiện ích đã giải nén\" → chọn thư mục vừa giải nén.",
      },
      {
        title: "Mở trang Post Feed",
        content:
          "Bấm \"Mở cấu hình\" để tới trang Post Feed, chọn bài viết, nhập nội dung comment và bắt đầu seeding.",
      },
    ],
  },
  {
    id: "markee-inbox-extension",
    name: "Markee Inbox Facebook",
    description:
      "Đọc tin nhắn Messenger trực tiếp trên trình duyệt seeder (giải mã E2EE), tự động đồng bộ hội thoại về trang Inbox.",
    category: "Inbox",
    icon: "inbox",
    isInternal: false,
    downloadUrl: "/markee-extension.zip",
    configUrl: "/all-platform/inbox",
    videoUrl: "https://www.youtube.com/watch?v=EbmV5aGJyys",
    steps: [
      {
        title: "Tải & cài extension",
        content:
          "Tải file zip về, giải nén rồi cài qua chrome://extensions bằng chế độ nhà phát triển.",
      },
      {
        title: "Đăng nhập Facebook",
        content:
          "Mở extension (góc phải trình duyệt) và đăng nhập Facebook. Giữ một tab Messenger mở để tin nhắn tự đồng bộ.",
      },
      {
        title: "Mở trang Inbox FB",
        content:
          "Bấm \"Mở cấu hình\" để tới trang Inbox Facebook và quản lý hội thoại, đánh dấu khách, trả lời.",
      },
    ],
  },
  {
    id: "markee-zalo-login-extension",
    name: "Markee Zalo Login",
    description:
      "Hỗ trợ đăng nhập/giữ phiên tài khoản Zalo, tích hợp vào trang Tài khoản Zalo để quản lý nhiều tài khoản cùng lúc.",
    category: "Login / Tài khoản",
    icon: "login",
    isInternal: false,
    downloadUrl: "/extension-login-zalo.zip",
    configUrl: "/all-platform/tai-khoan",
    steps: [
      {
        title: "Tải & cài extension",
        content:
          "Tải file zip về, giải nén rồi cài qua chrome://extensions bằng chế độ nhà phát triển.",
      },
      {
        title: "Mở trang Tài khoản Zalo",
        content:
          "Bấm \"Mở cấu hình\" để tới trang Tài khoản Zalo, chọn tài khoản và thực hiện đăng nhập bằng mã QR.",
      },
      {
        title: "Giữ phiên đăng nhập",
        content:
          "Giữ extension bật để phiên Zalo hoạt động ổn định và tự đồng bộ tin nhắn trong giờ làm việc.",
      },
    ],
  },
  {
    id: "post-feed-crawler-extension",
    name: "Facebook Post Feed Crawler",
    description:
      "Tiện ích nội bộ dùng để cào dữ liệu Post Feed phục vụ vận hành, chưa phát hành bản tải công khai.",
    category: "Cào dữ liệu",
    icon: "radar",
    isInternal: true,
    steps: [
      {
        title: "Liên hệ admin",
        content:
          "Đây là extension nội bộ. Hãy liên hệ admin để được cấp bản cài đặt và hướng dẫn chi tiết.",
      },
      {
        title: "Cài đặt bản được cấp",
        content:
          "Sau khi nhận file từ admin, giải nén và cài qua chrome://extensions bằng chế độ nhà phát triển.",
      },
    ],
  },
  {
    id: "seeding-kpi-checker-extension",
    name: "Facebook Seeding KPI Checker",
    description:
      "Công cụ nội bộ kiểm tra, đối soát KPI seeding trên Facebook, chưa có bản tải công khai.",
    category: "KPI / Kiểm tra",
    icon: "verified_user",
    isInternal: true,
    steps: [
      {
        title: "Liên hệ admin",
        content:
          "Đây là extension nội bộ. Hãy liên hệ admin để được cấp bản cài đặt và hướng dẫn chi tiết.",
      },
      {
        title: "Cài đặt bản được cấp",
        content:
          "Sau khi nhận file từ admin, giải nén và cài qua chrome://extensions bằng chế độ nhà phát triển.",
      },
    ],
  },
];
