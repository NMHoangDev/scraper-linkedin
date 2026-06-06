import { useState } from "react";
import { AuthService } from "../services/login";
import { useAuthContext } from "../../../shared/components/contexts/AuthContext";
import { LoginFormValues } from "../schemas/login_shemas";
import { useRouter } from "next/navigation";

export const useAuthHook = () => {
  const route = useRouter();
  const { saveUserSession } = useAuthContext();
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  const [isOtpModalOpen, setIsOtpModalOpen] = useState<boolean>(false);
  const [currentSessionId, setCurrentSessionId] = useState<string>("");

  // Thêm state để lưu trữ cookie và quản lý hiển thị Modal Copy
  const [cookieData, setCookieData] = useState<any>(null);
  const [showCookieModal, setShowCookieModal] = useState<boolean>(false);

  const handleLogin = async (values: LoginFormValues) => {
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      // Gọi API login bước 1
      const res = await AuthService.login(values);

      if (res.status === "success") {
        setIsLoading(false);
        setSuccessMessage("Đăng nhập thành công!");
        saveUserSession(values.email, values.password);
        
        // Nhận cookie từ backend và mở bảng Copy
        if (res.cookie) {
          setCookieData(res.cookie);
          setShowCookieModal(true);
        }
        // Tạm tắt auto redirect để khách copy xong mới đi
        // route.push("/minhhoang-scraper/crawl-data"); 
      } 
      else if (res.status === "need_otp" && res.session_id) {
        setIsLoading(false);
        setCurrentSessionId(res.session_id);
        setIsOtpModalOpen(true);
      } 
      else if ((res.status === "need_phone_approval" || res.status === "processing") && res.session_id) {
        const sessionId = res.session_id;
        setCurrentSessionId(sessionId);
        
        if (res.status === "need_phone_approval") {
          setSuccessMessage("Vui lòng MỞ ĐIỆN THOẠI bấm xác nhận 'Đây là tôi'. Đang chờ đồng bộ (tối đa 60s)...");
        } else {
          setSuccessMessage("Hệ thống đang xử lý đăng nhập ngầm, vui lòng giữ nguyên trang...");
        }
        
        // Gọi API bước 2 để tiếp tục lắng nghe tiến trình ngầm
        try {
          const approvalRes = await AuthService.checkPhoneApproval(sessionId);
          
          if (approvalRes.status === "success") {
            setIsLoading(false);
            setSuccessMessage("Đăng nhập thành công!");
            saveUserSession(values.email, values.password);
            
            // Nhận cookie từ backend (bước 2) và mở bảng Copy
            if (approvalRes.cookie) {
              setCookieData(approvalRes.cookie);
              setShowCookieModal(true);
            }
            // route.push("/minhhoang-scraper/crawl-data");
          } 
          else if (approvalRes.status === "need_otp") {
            setIsLoading(false);
            setSuccessMessage(null); 
            setIsOtpModalOpen(true); 
          } 
          else if (approvalRes.status === "error_bot_blocked") {
            setIsLoading(false);
            setSuccessMessage(null);
            setErrorMessage("Đăng nhập thất bại: Tài khoản bị Facebook chặn xác minh Bot/CAPTCHA.");
          }
          else {
            setIsLoading(false);
            setSuccessMessage(null);
            setErrorMessage(approvalRes.message || "Đăng nhập thất bại.");
          }
        } catch (err) {
          setIsLoading(false);
          setErrorMessage("Mất kết nối với máy chủ khi đang theo dõi đăng nhập.");
        }
      } 
      else if (res.status === "error_bot_blocked") {
        setIsLoading(false);
        setErrorMessage("Đăng nhập thất bại: Tài khoản bị Facebook chặn xác minh Bot/CAPTCHA.");
      } 
      else {
        setIsLoading(false);
        setErrorMessage(res.message || "Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.");
      }
    } catch (error) {
      setIsLoading(false);
      setErrorMessage("Lỗi kết nối đến máy chủ.");
    }
  };

  const handleVerifyOtp = async (otpCode: string, originalValues: LoginFormValues) => {
    if (!otpCode.trim()) {
      setErrorMessage("Vui lòng nhập mã OTP");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await AuthService.submitOtp(currentSessionId, otpCode);

      if (res.status === "success") {
        setIsLoading(false);
        setSuccessMessage("Xác thực OTP thành công!");
        setIsOtpModalOpen(false);
        
        saveUserSession(originalValues.email, originalValues.password);
        
        // Nhận cookie từ backend (bước 3) và mở bảng Copy
        if (res.cookie) {
          setCookieData(res.cookie);
          setShowCookieModal(true);
        }
        // route.push("/minhhoang-scraper/crawl-data");
      } else {
        setIsLoading(false);
        setErrorMessage(res.message || "Mã OTP không chính xác hoặc đã hết hạn.");
      }
    } catch (error) {
      setIsLoading(false);
      setErrorMessage("Lỗi xác thực OTP với máy chủ.");
    }
  };

  return {
    isLoading,
    errorMessage,
    successMessage,
    isOtpModalOpen,
    setIsOtpModalOpen,
    cookieData,              // Xuất state để dùng cho Modal
    showCookieModal,         // Xuất state bật/tắt Modal
    setShowCookieModal,      // Cho phép UI chủ động đóng Modal
    handleLogin,
    handleVerifyOtp,
  };
};