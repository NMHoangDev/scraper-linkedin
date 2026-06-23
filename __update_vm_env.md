# ============================================================
# CẬP NHẬT ENV - service_fb_seeding trên VM
# ============================================================
# SSH vào VM: seeding@10.120.80.45
# Pass: 1
# ============================================================

# Thêm vào cuối file ~/service_fb_seeding/service/.env

# ============================================================
# KPI BACKEND INTEGRATION
# ============================================================

# URL của backend để lưu KPI post Facebook
# Production: URL của linkedin_group_crawler backend
# Local test: URL của backend local (cần VPN hoặc public URL)

# VD Production:
KPI_BACKEND_URL=https://api-crawler.your-domain.com
KPI_BACKEND_API_KEY=your_backend_api_key

# VD Local Test (cần public URL hoặc VPN):
# KPI_BACKEND_URL=http://your-local-ip:8001
# KPI_BACKEND_API_KEY=local_dev_kpi_key-2026
