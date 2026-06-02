/**
 * Facebook Seeding KPI Checker - Content Script v3 (Rewritten)
 * Chạy trên trang Facebook để kiểm tra comment seeding
 *
 * Luồng hoạt động:
 * 1. Parse URL params để lấy email, profile_id, facebook_name
 * 2. Click nút dropdown "Phù hợp nhất" (default sort) -> chọn "Tất cả bình luận"
 * 3. Scroll để load hết tất cả comments
 * 4. Tìm comment của user dựa trên profile_id hoặc facebook_name
 * 5. Gửi kết quả về cho opener (dashboard)
 * 6. Lưu KPI trực tiếp vào backend API
 */

// ═══════════════════════════════════════════════════════════════════════════
// CẤU HÌNH & BIẾN TOÀN CỤC
// ═══════════════════════════════════════════════════════════════════════════

const CONFIG = {
  SCROLL_DELAY: 1500,
  CLICK_DELAY: 1000,
  MAX_SCROLL_ROUNDS: 20,
  STABLE_THRESHOLD: 3,
  COMMENT_CHECK_DELAY: 500,
  OVERLAY_AUTO_CLOSE: 8000,
  COMMENT_TIMEOUT: 45000,
  API_SAVE_TIMEOUT: 10000,
};

let kpiConfig = {
  email: "",
  profileId: "",
  facebookName: "",
  postUrl: "",
  postContent: "",
  socialAccountId: "",
  platformId: "",
  postId: ""
};

let isRunning = false;

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function safeTrim(str) {
  if (typeof str !== "string") return "";
  return str.trim();
}

function log(...args) {
  console.log("[KPI Extension]", new Date().toISOString(), ...args);
}

function logError(...args) {
  console.error("[KPI Extension ERROR]", new Date().toISOString(), ...args);
}

/**
 * Parse URL hash params để lấy thông tin KPI
 */
function parseKpiParams() {
  try {
    const hash = window.location.hash;
    if (!hash || !hash.includes("kpi_email=")) {
      log("Không có KPI params trong URL");
      return false;
    }

    const params = new URLSearchParams(hash.substring(1));
    kpiConfig.email = decodeURIComponent(params.get("kpi_email") || "") || "";
    kpiConfig.profileId = decodeURIComponent(params.get("kpi_uid") || "") || "";
    kpiConfig.facebookName = decodeURIComponent(params.get("kpi_name") || "") || "";
    kpiConfig.socialAccountId = decodeURIComponent(params.get("social_account_id") || "") || "";
    kpiConfig.platformId = decodeURIComponent(params.get("platform_id") || "") || "";
    kpiConfig.postId = decodeURIComponent(params.get("post_id") || "") || "";
    kpiConfig.postUrl = window.location.href.split("#")[0] || "";

    // Lấy nội dung bài viết - KHÔNG CẦN THIẾT CHO SEEDING COMMENT
    // Chỉ cần URL và thông tin user để xác nhận đã comment
    kpiConfig.postContent = "";

    log("Đã parse KPI params:", {
      email: kpiConfig.email ? kpiConfig.email.substring(0, 3) + "***" : "",
      profileId: kpiConfig.profileId ? "***" : "",
      facebookName: kpiConfig.facebookName ? kpiConfig.facebookName.substring(0, 3) + "***" : "",
      socialAccountId: kpiConfig.socialAccountId || "None"
    });

    return !!(kpiConfig.email && (kpiConfig.profileId || kpiConfig.facebookName));
  } catch (e) {
    logError("Lỗi parse params:", e);
    return false;
  }
}

/**
 * Normalize chuỗi để so sánh (bỏ dấu, lowercase)
 */
function normalizeText(text) {
  if (!text || typeof text !== "string") return "";
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Extract user ID từ URL profile - hỗ trợ nhiều format URL
 * Format: /groups/.../user/100087403596874/?__cft__[0]=...
 */
function extractUserIdFromUrl(url) {
  if (!url || typeof url !== "string") return null;

  // Format mới: /groups/.../user/100087403596874/ hoặc /user/100087403596874/
  const userMatch = url.match(/\/user\/(\d+)/);
  if (userMatch) return userMatch[1];

  // Format cũ: ?id=123 hoặc &id=123
  const idMatch = url.match(/[?&]id=(\d+)/);
  if (idMatch) return idMatch[1];

  // Format profile.php
  const profileMatch = url.match(/\/profile\.php\?id=(\d+)/);
  if (profileMatch) return profileMatch[1];

  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// API CONFIG
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Lấy API config từ chrome.storage
 */
function getApiConfig() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(["apiBaseUrl", "apiKey"], (result) => {
      resolve({
        apiBaseUrl: result.apiBaseUrl || "http://localhost:8000",
        apiKey: result.apiKey || ""
      });
    });
  });
}

/**
 * Lưu KPI trực tiếp vào backend
 * Flow mới: Step 1 = Đánh dấu (markSeeding), Step 2 = Verify (verifySeedingMark)
 * Extension gọi markSeeding khi user bấm nút "Đánh dấu đã seeding"
 */
async function saveKpiToBackend(data) {
  const config = await getApiConfig();
  const payload = {
    email_member: kpiConfig.email || "",
    link_post: data.url || window.location.href.split("#")[0],
    link_comment: data.commentUrl || "",
    content: data.commentContent || "",
    name_profile: data.name || kpiConfig.facebookName || "",
    profile_id: data.userId || kpiConfig.profileId || "",
    facebook_name: data.name || kpiConfig.facebookName || "",
    verify: "yes",
    platform: "Facebook",
    id_social_account: kpiConfig.socialAccountId || null,
    id_platform: kpiConfig.platformId ? parseInt(kpiConfig.platformId) : null
  };

  log("Đang gọi API verify_seeding_mark:", config.apiBaseUrl + "/api/all-platform/facebook/seeding-mark/verify");

  try {
    const response = await fetch(
      config.apiBaseUrl + "/api/all-platform/facebook/seeding-mark/verify",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(config.apiKey ? { "x-api-key": config.apiKey } : {})
        },
        body: JSON.stringify(payload)
      }
    );

    log("API response status:", response.status);

    if (response.ok) {
      const result = await response.json();
      log("✅ Đánh dấu seeding thành công:", result);
      return result;
    } else {
      const errorText = await response.text();
      logError("❌ Lỗi API khi đánh dấu seeding:", response.status, errorText);
      return null;
    }
  } catch (e) {
    logError("❌ Lỗi kết nối API:", e.message);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// UI OVERLAY
// ═══════════════════════════════════════════════════════════════════════════

let overlayInstance = null;

function createOverlay() {
  removeOverlay();

  const overlay = document.createElement("div");
  overlay.id = "fb-kpi-overlay";
  overlay.innerHTML = `
    <style>
      #fb-kpi-overlay {
        position: fixed;
        top: 20px;
        right: 20px;
        width: 340px;
        background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%);
        border-radius: 16px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        z-index: 999999;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        color: white;
        overflow: hidden;
        animation: slideIn 0.3s ease-out;
      }
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      #fb-kpi-overlay .header {
        padding: 16px 20px;
        background: rgba(0, 0, 0, 0.2);
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        display: flex;
        align-items: center;
        gap: 12px;
      }
      #fb-kpi-overlay .header-icon {
        width: 36px;
        height: 36px;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
      }
      #fb-kpi-overlay .header-text h3 { margin: 0; font-size: 14px; font-weight: 600; }
      #fb-kpi-overlay .header-text p { margin: 4px 0 0; font-size: 11px; opacity: 0.7; }
      #fb-kpi-overlay .content { padding: 16px 20px; }
      #fb-kpi-overlay .progress-bar {
        height: 8px;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 4px;
        overflow: hidden;
        margin-bottom: 12px;
      }
      #fb-kpi-overlay .progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #10b981, #34d399);
        border-radius: 4px;
        transition: width 0.3s ease;
        width: 0%;
      }
      #fb-kpi-overlay .progress-text { font-size: 12px; text-align: center; margin-bottom: 16px; opacity: 0.9; }
      #fb-kpi-overlay .step-list { display: flex; flex-direction: column; gap: 8px; }
      #fb-kpi-overlay .step {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px 12px;
        background: rgba(255, 255, 255, 0.08);
        border-radius: 8px;
        font-size: 12px;
        transition: all 0.2s ease;
      }
      #fb-kpi-overlay .step.active { background: rgba(16, 185, 129, 0.3); border: 1px solid rgba(16, 185, 129, 0.5); }
      #fb-kpi-overlay .step.done { background: rgba(16, 185, 129, 0.2); }
      #fb-kpi-overlay .step.error { background: rgba(239, 68, 68, 0.2); border: 1px solid rgba(239, 68, 68, 0.5); }
      #fb-kpi-overlay .step-icon {
        width: 24px; height: 24px; border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        font-size: 12px; background: rgba(255, 255, 255, 0.2); flex-shrink: 0;
      }
      #fb-kpi-overlay .step.done .step-icon { background: #10b981; }
      #fb-kpi-overlay .step.active .step-icon { background: #f59e0b; animation: pulse 1s infinite; }
      #fb-kpi-overlay .step.error .step-icon { background: #ef4444; }
      @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }
      #fb-kpi-overlay .step-label { flex: 1; }
      #fb-kpi-overlay .result-section {
        margin-top: 16px; padding: 12px;
        background: rgba(255, 255, 255, 0.1); border-radius: 8px; text-align: center;
      }
      #fb-kpi-overlay .result-emoji { font-size: 48px; margin-bottom: 8px; }
      #fb-kpi-overlay .result-text { font-size: 14px; font-weight: 600; margin-bottom: 4px; }
      #fb-kpi-overlay .result-detail { font-size: 11px; opacity: 0.7; }
      #fb-kpi-overlay .close-btn {
        position: absolute; top: 12px; right: 12px;
        width: 24px; height: 24px; border: none;
        background: rgba(255, 255, 255, 0.2); border-radius: 50%;
        color: white; cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        font-size: 14px; transition: background 0.2s;
      }
      #fb-kpi-overlay .close-btn:hover { background: rgba(255, 255, 255, 0.3); }
      #fb-kpi-overlay .debug-info {
        margin-top: 8px; padding: 8px;
        background: rgba(0,0,0,0.2); border-radius: 6px;
        font-size: 10px; font-family: monospace;
        max-height: 60px; overflow-y: auto;
        word-break: break-all;
      }
      #fb-kpi-overlay .result-actions { margin-top: 12px; }
      #fb-kpi-overlay .mark-btn {
        width: 100%; padding: 10px 16px;
        border: none; border-radius: 8px;
        font-size: 13px; font-weight: 600;
        cursor: pointer; transition: all 0.2s;
        display: flex; align-items: center; justify-content: center; gap: 6px;
      }
      #fb-kpi-overlay .mark-btn-seeding {
        background: linear-gradient(135deg, #10b981, #059669);
        color: white;
      }
      #fb-kpi-overlay .mark-btn-seeding:hover { background: linear-gradient(135deg, #059669, #047857); }
      #fb-kpi-overlay .mark-btn-seeding:disabled { background: #6b7280; cursor: not-allowed; }
      #fb-kpi-overlay .mark-btn-post-url {
        background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.8);
        border: 1px solid rgba(255,255,255,0.2);
      }
      #fb-kpi-overlay .mark-btn-post-url:hover { background: rgba(255,255,255,0.15); }
      #fb-kpi-overlay .mark-btn-post-url:disabled { opacity: 0.5; cursor: not-allowed; }
      #fb-kpi-overlay .post-url-display {
        margin-top: 6px; padding: 6px 8px;
        background: rgba(0,0,0,0.2); border-radius: 6px;
        font-size: 10px; color: rgba(255,255,255,0.7);
        word-break: break-all; max-height: 40px; overflow-y: auto;
      }
    </style>

    <div class="header">
      <div class="header-icon">KPI</div>
      <div class="header-text">
        <h3>Kiểm tra KPI Seeding</h3>
        <p>Facebook Comment Checker v3</p>
      </div>
      <button class="close-btn" onclick="document.getElementById('fb-kpi-overlay').remove()">×</button>
    </div>

    <div class="content">
      <div class="progress-bar">
        <div class="progress-fill" id="kpi-progress-fill"></div>
      </div>
      <div class="progress-text" id="kpi-progress-text">Đang khởi tạo...</div>

      <div class="step-list">
        <div class="step active" id="step-init">
          <div class="step-icon">1</div>
          <div class="step-label">Đang khởi tạo...</div>
        </div>
        <div class="step" id="step-dropdown">
          <div class="step-icon">2</div>
          <div class="step-label">Mở dropdown bình luận</div>
        </div>
        <div class="step" id="step-scroll">
          <div class="step-icon">3</div>
          <div class="step-label">Tải toàn bộ bình luận</div>
        </div>
        <div class="step" id="step-check">
          <div class="step-icon">4</div>
          <div class="step-label">Kiểm tra comment của bạn</div>
        </div>
        <div class="step" id="step-save">
          <div class="step-icon">5</div>
          <div class="step-label">Lưu KPI vào Google Sheets</div>
        </div>
      </div>

      <div class="result-section" id="kpi-result-section" style="display: none;">
        <div class="result-emoji" id="kpi-result-emoji">⏳</div>
        <div class="result-text" id="kpi-result-text">Đang xử lý...</div>
        <div class="result-detail" id="kpi-result-detail"></div>
      </div>

      <div class="debug-info" id="kpi-debug"></div>
    </div>
  `;

  document.body.appendChild(overlay);
  overlayInstance = overlay;
  log("Overlay created");
}

function updateDebug(text) {
  if (!overlayInstance) return;
  const el = overlayInstance.querySelector("#kpi-debug");
  if (el) el.textContent = text;
}

function updateOverlay(step, progress, text) {
  try {
    if (!overlayInstance) return;

    const progressFill = overlayInstance.querySelector("#kpi-progress-fill");
    const progressText = overlayInstance.querySelector("#kpi-progress-text");

    if (progressFill && typeof progress === "number") {
      progressFill.style.width = Math.min(Math.max(progress, 0), 100) + "%";
    }
    if (progressText && typeof text === "string") {
      progressText.textContent = text;
    }

    const steps = ["step-init", "step-dropdown", "step-scroll", "step-check", "step-save"];
    const stepIndex = steps.indexOf(step);

    steps.forEach((stepId, idx) => {
      try {
        const stepEl = overlayInstance.querySelector("#" + stepId);
        if (!stepEl) return;

        stepEl.classList.remove("active", "done", "error");

        if (idx < stepIndex) {
          stepEl.classList.add("done");
          const icon = stepEl.querySelector(".step-icon");
          if (icon) icon.textContent = "✓";
        } else if (idx === stepIndex) {
          stepEl.classList.add("active");
        }
      } catch (e) {}
    });

    updateDebug(text);
  } catch (e) {
    logError("Lỗi update overlay:", e);
  }
}

function showResult(isSeeded, commentLink, savedToApi) {
  try {
    if (!overlayInstance) return;

    const resultSection = overlayInstance.querySelector("#kpi-result-section");
    const resultEmoji = overlayInstance.querySelector("#kpi-result-emoji");
    const resultText = overlayInstance.querySelector("#kpi-result-text");
    const resultDetail = overlayInstance.querySelector("#kpi-result-detail");

    if (resultSection) resultSection.style.display = "block";

    if (isSeeded) {
      if (resultEmoji) resultEmoji.textContent = "✅";
      if (resultText) resultText.textContent = "Đã xác minh thành công!";
      if (resultDetail) {
        const apiStatus = savedToApi ? " | Đã lưu KPI ✅" : " | Lưu API: ❌";
        resultDetail.textContent = "Đã tìm thấy comment của bạn" + apiStatus;
      }
    } else {
      if (resultEmoji) resultEmoji.textContent = "❌";
      if (resultText) resultText.textContent = "Không tìm thấy comment";
      if (resultDetail) {
        resultDetail.textContent = "Bạn chưa comment bài này hoặc comment đã bị xóa";
      }
    }

    const stepCheck = overlayInstance?.querySelector("#step-check");
    if (stepCheck) {
      stepCheck.classList.remove("active");
      stepCheck.classList.add(isSeeded ? "done" : "error");
      const icon = stepCheck.querySelector(".step-icon");
      if (icon) icon.textContent = isSeeded ? "✓" : "✗";
    }

    // Thêm nút OK để đóng tab
    const existingBtn = overlayInstance.querySelector("#kpi-close-btn");
    if (!existingBtn) {
      const closeBtn = document.createElement("button");
      closeBtn.id = "kpi-close-btn";
      closeBtn.textContent = "OK - Đóng tab";
      closeBtn.style.cssText = `
        margin-top: 16px;
        width: 100%;
        padding: 12px 24px;
        background: linear-gradient(135deg, #10b981, #059669);
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 15px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
      `;
      closeBtn.onmouseover = () => closeBtn.style.opacity = "0.9";
      closeBtn.onmouseout = () => closeBtn.style.opacity = "1";
      closeBtn.onclick = () => {
        log("User nhấn OK - thông báo cho app và đóng tab...");
        // Gửi message cho opener (app chính) biết đã xác minh xong
        try {
          if (window.opener) {
            window.opener.postMessage(
              { type: "KPI_VERIFY_COMPLETE", url: window.location.href },
              "*"
            );
          }
        } catch (e) {
          logError("Lỗi gửi message cho opener:", e);
        }
        // Đóng tab sau khi gửi message
        window.close();
      };

      if (resultSection) {
        resultSection.appendChild(closeBtn);
      }
    }
  } catch (e) {
    logError("Lỗi show result:", e);
  }
}

function removeOverlay() {
  try {
    if (overlayInstance) {
      overlayInstance.remove();
      overlayInstance = null;
    }
  } catch (e) {}
}

// ═══════════════════════════════════════════════════════════════════════════
// COMMENT DETECTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Tìm tất cả comment articles trên trang Facebook
 * Cấu trúc comment: <div role="article" aria-label="Bình luận dưới tên ...">
 * Main post có aria-label="Bài viết của..." - KHÔNG phải comment
 */
function findAllCommentArticles() {
  try {
    // CHỈ lấy elements có aria-label BẮT ĐẦU bằng "Bình luận"
    // Đây là cách chính xác nhất để phân biệt comment vs main post
    const allArticles = document.querySelectorAll('[role="article"]');
    const articles = [];

    for (const article of allArticles) {
      try {
        const ariaLabel = article.getAttribute("aria-label") || "";
        
        // CHỈ chấp nhận elements có aria-label bắt đầu bằng "Bình luận"
        // Main post có aria-label="Bài viết của..." sẽ bị loại
        const isComment = ariaLabel.startsWith("Bình luận") ||
                         ariaLabel.startsWith("comment") ||
                         ariaLabel.includes("commented");
        
        if (!isComment) {
          continue; // Bỏ qua main post và các elements khác
        }

        // Filter: phải có link profile user (/user/)
        const userLink = article.querySelector('a[href*="/user/"]');
        if (!userLink) continue;

        // Filter: loại bỏ share post (có nút Chia sẻ trong actions)
        const hasShareAction = article.querySelector(
          '[aria-label*="Chia sẻ"], [aria-label*="Share"], [aria-label*="Send"]'
        );
        if (hasShareAction) continue;

        articles.push(article);
      } catch (e) {}
    }

    log("Tìm thấy", articles.length, "comment articles (đã lọc main post)");
    return articles;
  } catch (e) {
    logError("Lỗi tìm comments:", e);
    return [];
  }
}

/**
 * Kiểm tra comment có phải của user cần tìm
 * HTML structure:
 *   <article>
 *     <a href="/groups/.../user/USER_ID/?__cft__[0]=...">
 *       <svg avatar>
 *     </a>
 *     <div name-area>
 *       <a href="/groups/.../user/USER_ID/?__cft__[0]=...">
 *         <span dir="auto">TÊN USER</span>
 *       </a>
 *     </div>
 *     <div content-area>
 *       <span dir="auto">NỘI DUNG COMMENT</span>
 *     </div>
 *     <ul actions>
 *       <li><a href="...permalink/.../?comment_id=XXX">thời gian</a></li>  <- comment link
 *     </ul>
 *   </article>
 */
function checkCommentForUser(article) {
  try {
    // Tìm tất cả link có user ID trong href
    // Có 2 loại: avatar link và name link - cả 2 đều chứa user ID
    const allUserLinks = article.querySelectorAll('a[href*="/user/"]');

    for (const link of allUserLinks) {
      try {
        const href = link.getAttribute("href") || "";
        const userId = extractUserIdFromUrl(href);

        // Skip nếu không extract được user ID
        if (!userId) continue;

        // Tìm tên user - ưu tiên lấy từ <span dir="auto"> trong link name
        let name = "";
        const nameSpan = link.querySelector('span[dir="auto"]');
        if (nameSpan) {
          name = (nameSpan.textContent || "").trim();
        }
        // Fallback: lấy text trực tiếp từ link
        if (!name) {
          name = (link.textContent || "").trim();
        }

        // ═══════════════════════════════════════════════════════════
        // CHECK 1: So sánh profile ID
        // ═══════════════════════════════════════════════════════════
        if (kpiConfig.profileId && userId) {
          if (userId === kpiConfig.profileId) {
            log("✅ Match by profile_id:", userId, "| Name:", name);

            // Lấy nội dung comment
            const commentContent = extractCommentContent(article);

            // Tìm comment link
            const commentLinkEl = article.querySelector(
              'a[href*="/permalink/"][href*="comment_id="], ' +  // comment gốc
              'a[href*="#comment_"], ' +                          // anchor comment
              'li a[href*="comment_id="]'                          // trong list actions
            );

            let commentUrl = "";
            if (commentLinkEl) {
              const hrefAttr = commentLinkEl.getAttribute("href") || "";
              commentUrl = hrefAttr.startsWith("http")
                ? hrefAttr
                : window.location.origin + hrefAttr;
            }

            return {
              found: true,
              method: "profile_id",
              userId: userId,
              name: name,
              commentUrl: commentUrl,
              commentContent: commentContent
            };
          }
        }

        // ═══════════════════════════════════════════════════════════
        // CHECK 2: So sánh tên Facebook (normalize bỏ dấu)
        // ═══════════════════════════════════════════════════════════
        if (kpiConfig.facebookName && name) {
          const normalizedName = normalizeText(name);
          const normalizedTarget = normalizeText(kpiConfig.facebookName);

          if (normalizedName && normalizedTarget && normalizedName === normalizedTarget) {
            log("✅ Match by facebook_name:", name);

            // Lấy nội dung comment
            const commentContent = extractCommentContent(article);

            const commentLinkEl = article.querySelector(
              'a[href*="comment_id="], ' +
              'a[href*="/permalink/"], ' +
              'a[href*="#comment_"]'
            );

            let commentUrl = "";
            if (commentLinkEl) {
              const hrefAttr = commentLinkEl.getAttribute("href") || "";
              commentUrl = hrefAttr.startsWith("http")
                ? hrefAttr
                : window.location.origin + hrefAttr;
            }

            return {
              found: true,
              method: "facebook_name",
              userId: userId,
              name: name,
              commentUrl: commentUrl,
              commentContent: commentContent
            };
          }
        }
      } catch (e) {}
    }
  } catch (e) {
    logError("Lỗi check comment:", e);
  }

  return null;
}

/**
 * Trích xuất nội dung comment từ article element
 * Comment có thể là text thuần, sticker, hoặc reply
 */
function extractCommentContent(article) {
  try {
    // Tìm tất cả div/span có dir="auto" - đây là nơi chứa nội dung
    const contentElements = article.querySelectorAll('[dir="auto"]');
    
    // Duyệt qua tất cả elements có dir="auto"
    for (const el of contentElements) {
      const text = (el.textContent || "").trim();
      
      // Bỏ qua text quá ngắn hoặc quá dài
      if (text.length < 1 || text.length > 2000) continue;
      
      // Bỏ qua text trùng với tên user
      const normalizedText = normalizeText(text);
      const normalizedName = normalizeText(kpiConfig.facebookName || "");
      if (normalizedName && normalizedText === normalizedName) continue;
      
      // Bỏ qua text chỉ chứa thời gian
      if (/^\d+\s*(giờ|phút|ngày|giây)/.test(text)) continue;
      
      // Bỏ qua text chứa từ khóa UI như "Thích", "Trả lời", "Chia sẻ"
      const uiKeywords = ['Thích', 'Trả lời', 'Chia sẻ', 'Bình luận', 'Share', 'Reply', 'Like'];
      if (uiKeywords.some(kw => text.includes(kw) && text.length < 20)) continue;
      
      // Comment thường nằm trong div có style="text-align: start"
      const parentStyle = el.getAttribute('style') || "";
      if (parentStyle.includes('text-align: start') || parentStyle.includes('text-align:start')) {
        log("Tìm thấy comment:", text);
        return text;
      }
      
      // Fallback: Chấp nhận mọi thẻ DIV hoặc SPAN có text hợp lệ
      if (el.tagName === 'DIV' || el.tagName === 'SPAN') {
        if (text.length > 0) {
          log("Tìm thấy comment (fallback mở rộng):", text);
          return text;
        }
      }
    }
    
    // Cách 2: Tìm trực tiếp div có style chứa comment
    const allDivs = article.querySelectorAll('div[style*="text-align"]');
    for (const div of allDivs) {
      const text = (div.textContent || "").trim();
      if (text.length > 0 && text.length < 500) {
        // Bỏ qua nếu trùng với tên user
        if (normalizeText(text) === normalizeText(kpiConfig.facebookName || "")) continue;
        // Bỏ qua nếu là thời gian
        if (/^\d+\s*(giờ|phút|ngày)/.test(text)) continue;
        
        log("Tìm thấy comment (cách 2):", text);
        return text;
      }
    }
    
    // Cách 3: Tìm tất cả text node trực tiếp (không phải từ nested elements)
    const textNodes = [];
    const walker = document.createTreeWalker(
      article,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: function(node) {
          const text = node.textContent || "";
          // Chỉ lấy text có nội dung và không phải whitespace
          if (text.trim().length > 0 && text.trim().length < 500) {
            return NodeFilter.FILTER_ACCEPT;
          }
          return NodeFilter.FILTER_REJECT;
        }
      }
    );
    
    while (textNodes.length < 10) { // Giới hạn 10 nodes
      const node = walker.nextNode();
      if (!node) break;
      textNodes.push(node.textContent || "");
    }
    
    // Tìm text phù hợp nhất - thường là text ngắn ở giữa
    for (const text of textNodes) {
      const trimmed = text.trim();
      
      // Bỏ qua nếu trùng với tên user
      if (normalizeText(trimmed) === normalizeText(kpiConfig.facebookName || "")) continue;
      
      // Bỏ qua nếu là thời gian
      if (/^\d+\s*(giờ|phút|ngày)/.test(trimmed)) continue;
      
      // Comment thường ngắn hơn 100 ký tự và không chứa từ khóa UI
      if (trimmed.length > 0 && trimmed.length < 100) {
        const uiKeywords = ['Thích', 'Trả lời', 'Chia sẻ', 'Bình luận'];
        const isUI = uiKeywords.some(kw => trimmed.includes(kw));
        
        if (!isUI) {
          log("Tìm thấy comment (cách 3):", trimmed);
          return trimmed;
        }
      }
    }
    
    return "";
  } catch (e) {
    logError("Lỗi extract comment content:", e);
    return "";
  }
}

/**
 * Tìm kiếm comment của user
 */
function findUserComment() {
  try {
    const articles = findAllCommentArticles();
    log("Tìm thấy", articles.length, "comments trên trang");

    for (const article of articles) {
      const result = checkCommentForUser(article);
      if (result && result.found) {
        log("✅ Tìm thấy comment của user:", result.method, result.name);
        return result;
      }
    }
  } catch (e) {
    logError("Lỗi tìm user comment:", e);
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// CLICK HANDLERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Click nút sort comments và chọn "Tất cả bình luận"
 * Đợi tối đa 15 giây để trang load xong và tìm dropdown
 * Nếu không tìm được → reload trang để thử lại
 */
async function clickAllCommentsDropdown() {
  try {
    updateOverlay("step-dropdown", 15, "Đang chờ trang load...");

    let dropdownBtn = null;
    let currentText = "";
    let retryCount = 0;
    const maxRetries = 3;

    // Thử tìm dropdown, nếu không thấy thì reload trang và thử lại
    while (!dropdownBtn && retryCount < maxRetries) {
      if (retryCount > 0) {
        log(`Reload trang để thử lại (lần ${retryCount + 1}/${maxRetries})...`);
        updateOverlay("step-dropdown", 15, `Reload để thử lại... (${retryCount + 1}/${maxRetries})`);
        window.location.reload();
        // Đợi reload xong
        await delay(10000);
      }

      // Đợi 10 giây để trang load xong
      for (let wait = 0; wait < 100; wait++) {
        const allDropdowns = document.querySelectorAll(
          '[aria-haspopup="menu"][role="button"], ' +
          'div[aria-haspopup="menu"][role="button"], ' +
          'span[aria-haspopup="menu"][role="button"]'
        );

        for (const btn of allDropdowns) {
          const text = (btn.textContent || "").trim();
          const isShare = /\b(Chia sẻ|Share|Send|Gửi)\b/i.test(text);
          const isReact = /\b(Cảm xúc|Like|React)\b/i.test(text);
          const isBookmark = /\b(Lưu|Save|Bookmark)\b/i.test(text);
          const isReport = /\b(Báo cáo|Report)\b/i.test(text);
          const isCommentSort = /\b(Phù hợp nhất|Mới nhất|Tất cả bình luận|All comments)\b/i.test(text);

          if (isCommentSort) {
            dropdownBtn = btn;
            currentText = text;
            log("Tìm thấy nút sort sau", (wait + 1) * 100, "ms:", currentText);
            break;
          }

          if (!isShare && !isReact && !isBookmark && !isReport && text.length > 0 && text.length < 60) {
            if (!dropdownBtn) {
              const parent = btn.closest('[role="article"]') || btn.parentElement?.closest('[role="article"]');
              if (parent) {
                dropdownBtn = btn;
                currentText = text;
              }
            }
          }
        }

        if (dropdownBtn) break;

        // Log tiến trình mỗi giây
        if (wait % 10 === 0 && wait > 0) {
          updateOverlay("step-dropdown", 15, `Đang chờ load trang... ${Math.floor((wait + 1) / 10)}s`);
        }

        await delay(100);
      }

      retryCount++;
    }

    if (!dropdownBtn) {
      log("Không tìm thấy dropdown sort comments sau", maxRetries, "lần thử");
      updateOverlay("step-dropdown", 25, "⚠️ Không có dropdown - scroll trực tiếp");
      return true;
    }

    // Check: nếu đang ở mode "Tất cả bình luận" thì skip
    const isAllCommentsMode = /\b(Tất cả|All)\b/i.test(currentText);
    if (isAllCommentsMode) {
      log("Đang ở mode 'Tất cả bình luận' - skip dropdown");
      updateOverlay("step-dropdown", 25, "✓ Đang ở chế độ tất cả bình luận");
      return true;
    }

    // Check: nếu dropdown đang mở (aria-expanded=true)
    const isExpanded = dropdownBtn.getAttribute("aria-expanded") === "true";
    log("Dropdown trạng thái:", isExpanded ? "ĐANG MỞ" : "ĐÓNG", "| Text:", currentText);

    if (!isExpanded) {
      // Dropdown đang đóng → click để mở menu
      dropdownBtn.click();
      log("Đã click để mở dropdown");
      updateOverlay("step-dropdown", 18, "Đang mở menu sắp xếp...");
      await delay(CONFIG.CLICK_DELAY);
    } else {
      log("Dropdown đã mở - tìm option trong menu hiện tại");
      updateOverlay("step-dropdown", 18, "Menu đang mở - tìm option...");
    }

    // Đợi menu xuất hiện
    await delay(CONFIG.CLICK_DELAY);

    // Tìm và click option "Tất cả bình luận"
    // Cấu trúc: <div role="menuitem"><div><div><span>TÊN</span></div><div><span>MÔ TẢ</span></div></div></div>
    let foundOption = false;

    for (let wait = 0; wait < 30 && !foundOption; wait++) {
      const menuItems = document.querySelectorAll('[role="menuitem"]');

      for (const item of menuItems) {
        // Lấy span đầu tiên có dir="auto" trong menuitem - đây là TITLE của option
        const titleSpan = item.querySelector('span[dir="auto"]');
        if (!titleSpan) continue;
        const titleText = (titleSpan.textContent || "").trim();
        
        // Log menu option để debug (chỉ log vòng đầu)
        if (wait === 0) {
          log("Menu option:", titleText);
        }
        
        // Kiểm tra title có phải "Tất cả bình luận" không
        if (titleText === "Tất cả bình luận") {
          log("Tìm thấy option 'Tất cả bình luận'");
          item.click();
          foundOption = true;
          break;
        }
      }

      if (!foundOption) {
        await delay(100);
      }
    }

    if (foundOption) {
      log("✅ Đã chọn 'Tất cả bình luận'");
      updateOverlay("step-dropdown", 25, "✓ Đã chọn 'Tất cả bình luận'");
      await delay(CONFIG.CLICK_DELAY);
      return true;
    }

    // Fallback: click bằng text content trực tiếp
    log("Fallback: tìm bằng text content...");
    for (const item of document.querySelectorAll('[role="menuitem"]')) {
      const content = (item.textContent || "").trim();
      if (content.includes("Tất cả bình luận")) {
        log("Tìm thấy 'Tất cả bình luận' bằng fallback");
        item.click();
        foundOption = true;
        break;
      }
    }

    if (foundOption) {
      log("✅ Đã click 'Tất cả bình luận' (fallback)");
      updateOverlay("step-dropdown", 25, "✓ Đã chọn 'Tất cả bình luận'");
      await delay(CONFIG.CLICK_DELAY);
      return true;
    }

    logError("Không tìm thấy option 'Tất cả bình luận'");
    return false;
  } catch (e) {
    logError("Lỗi click dropdown:", e);
    return false;
  }
}

/**
 * Click tất cả nút "Xem thêm"
 */
async function clickLoadMoreButtons() {
  try {
    const buttons = document.querySelectorAll('[role="button"][tabindex="0"], div[role="button"]');
    let clicked = 0;

    for (const btn of buttons) {
      try {
        const text = (btn.textContent || "").trim();

        const loadMoreTexts = [
          "Xem thêm bình luận", "View more comments",
          "Xem thêm", "View more",
          "Xem thêm phản hồi", "View more replies",
          "Phản hồi trước đó", "Previous replies",
          "Thêm phản hồi"
        ];

        const shouldClick = loadMoreTexts.some(loadText =>
          text.toLowerCase().includes(loadText.toLowerCase())
        );

        if (shouldClick) {
          btn.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
          clicked++;
          await delay(CONFIG.CLICK_DELAY);
        }
      } catch (e) {}
    }

    return clicked;
  } catch (e) {
    return 0;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SCROLL & LOAD
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Scroll để load hết tất cả comments
 */
async function scrollToLoadComments() {
  try {
    updateOverlay("step-scroll", 30, "Đang tải bình luận...");

    let prevCommentCount = 0;
    let stableRounds = 0;
    let scrollRounds = 0;
    const maxComments = 500; // Giới hạn an toàn

    while (stableRounds < CONFIG.STABLE_THRESHOLD && scrollRounds < CONFIG.MAX_SCROLL_ROUNDS) {
      const currentCount = findAllCommentArticles().length;

      // Scroll xuống cuối trang
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
      await delay(CONFIG.SCROLL_DELAY);

      // Click tất cả nút "Xem thêm"
      const loaded = await clickLoadMoreButtons();
      if (loaded > 0) {
        log("Đã click", loaded, "nút 'Xem thêm'");
      }

      await delay(CONFIG.SCROLL_DELAY);

      const newCount = findAllCommentArticles().length;
      log("Scroll round", scrollRounds + 1, "| Comments:", currentCount, "->", newCount);

      if (newCount === prevCommentCount) {
        stableRounds++;
      } else {
        stableRounds = 0;
      }

      // Nếu đã load đủ rồi thì dừng
      if (newCount >= maxComments) {
        log("Đã đạt giới hạn", maxComments, "comments - dừng scroll");
        break;
      }

      prevCommentCount = newCount;
      scrollRounds++;

      const progress = 30 + (scrollRounds / CONFIG.MAX_SCROLL_ROUNDS) * 40;
      updateOverlay("step-scroll", Math.min(progress, 70), "Đã tải " + newCount + " bình luận...");
    }

    const finalCount = findAllCommentArticles().length;
    log("✅ Scroll xong - tổng", finalCount, "comments");
    return finalCount;
  } catch (e) {
    logError("Lỗi scroll:", e);
    return 0;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN LOGIC
// ═══════════════════════════════════════════════════════════════════════════

async function runKpiCheck() {
  if (isRunning) {
    log("Đang chạy, bỏ qua...");
    return;
  }
  isRunning = true;

  try {
    // Bước 1: Khởi tạo
    createOverlay();
    updateOverlay("step-init", 5, "Đã nhận thông tin KPI...");

    await delay(500);

    // Kiểm tra đã đăng nhập Facebook chưa
    const loginCheck = document.querySelector('[href="/login/"]');
    if (loginCheck) {
      updateOverlay("step-init", 5, "⚠️ Vui lòng đăng nhập Facebook!");
      showResult(false, null, false);
      setTimeout(() => { removeOverlay(); isRunning = false; }, 5000);
      return;
    }

    // Bước 2: Mở dropdown và chọn "Tất cả bình luận"
    updateOverlay("step-dropdown", 10, "Đang mở dropdown sắp xếp...");
    const dropdownClicked = await clickAllCommentsDropdown();

    if (!dropdownClicked) {
      log("Dropdown không click được, tiếp tục scroll...");
    }

    // Bước 3: Scroll load comments
    const commentCount = await scrollToLoadComments();

    if (commentCount === 0) {
      log("Không có comments nào được tải");
    }

    // Bước 4: Kiểm tra comment của user
    updateOverlay("step-check", 75, "Đang kiểm tra bình luận của bạn...");
    await delay(CONFIG.COMMENT_CHECK_DELAY);

    const result = findUserComment();

    // Gửi kết quả về dashboard và hiển thị overlay
    if (result && result.found) {
      updateOverlay("step-check", 80, "✅ Đã tìm thấy comment!");
      showResult(true, result.commentUrl, true);

      // Đợi gửi API thành công trước khi đóng
      const sent = await sendResultToOpener({
        success: true,
        status: "seeded",
        url: kpiConfig.postUrl || window.location.href.split("#")[0],
        content: result.commentContent || "",
        message: "Đã tìm thấy comment (" + (result.method || "unknown") + ")",
        userId: result.userId || "",
        userName: result.name || "",
        commentUrl: result.commentUrl || "",
        foundBy: result.method || "unknown"
      });

      log("Kết quả gửi API:", sent ? "THÀNH CÔNG" : "THẤT BẠI");
    } else {
      updateOverlay("step-check", 100, "❌ Không tìm thấy bình luận");
      showResult(false, null, false);

      // Vẫn thông báo để frontend biết
      await sendResultToOpener({
        success: true,
        status: "not_seeded",
        url: kpiConfig.postUrl || window.location.href.split("#")[0],
        content: kpiConfig.postContent || "",
        message: "Không tìm thấy comment của bạn trong bài viết này"
      });
    }

    // Đợi thêm 3 giây để backend xử lý xong
    await delay(3000);
    setTimeout(() => { removeOverlay(); isRunning = false; }, CONFIG.OVERLAY_AUTO_CLOSE);
  } catch (e) {
    logError("Lỗi trong runKpiCheck:", e);
    removeOverlay();
    isRunning = false;
  }
}

/**
 * Gửi kết quả về backend qua background script - ĐẢM BẢO thành công
 */
async function sendResultToOpener(data) {
  const payload = {
    type: "SAVE_SEEDING_KPI",
    data: {
      email_member: kpiConfig.email || "",
      link_post: data.url || kpiConfig.postUrl || "",
      name: data.userName || "",
      name_profile: data.userName || kpiConfig.facebookName || "",
      platform: "facebook",
      content: data.content || "",
      link_comment: data.commentUrl || "",
      profile_id: data.userId || kpiConfig.profileId || "",
      facebook_name: kpiConfig.facebookName || "",
      verify: data.status === "seeded" ? "yes" : "pending",
      id_social_account: kpiConfig.socialAccountId || null,
      id_platform: kpiConfig.platformId ? parseInt(kpiConfig.platformId) : null,
      id_post: kpiConfig.postId || null
    }
  };

  log("Bắt đầu gửi kết quả về backend...");
  log("Payload:", JSON.stringify(payload.data, null, 2));

  // Thử gửi với retry logic cho đến khi thành công
  let lastError = null;
  const maxRetries = 5;
  const retryDelay = 3000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Sử dụng chrome.runtime.sendMessage với Promise wrapper
      const response = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(payload, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(response);
          }
        });
      });

      if (response && response.success) {
        log(`✅ Gửi thành công ở lần ${attempt}`);
        return true;
      } else {
        logError(`Background trả lỗi (lần ${attempt}):`, response?.error);
        lastError = new Error(response?.error || "Unknown error");
      }
    } catch (e) {
      logError(`Lỗi gửi message (lần ${attempt}/${maxRetries}):`, e.message);
      lastError = e;
    }

    // Nếu không phải lần cuối, đợi rồi thử lại
    if (attempt < maxRetries) {
      log(`Đợi ${retryDelay / 1000}s trước khi thử lại...`);
      await delay(retryDelay);
    }
  }

  logError("Đã thử tối đa lần nhưng không gửi được:", lastError?.message);
  return false;
}

// ═══════════════════════════════════════════════════════════════════════════
// KHỞI CHẠY
// ═══════════════════════════════════════════════════════════════════════════

function init() {
  if (!parseKpiParams()) {
    log("Không có thông tin KPI trong URL - bỏ qua");
    return;
  }

  // Chờ DOM load xong
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      log("DOM ready - bắt đầu sau 2 giây");
      setTimeout(runKpiCheck, 2000);
    });
  } else {
    log("DOM đã sẵn sàng - bắt đầu sau 2 giây");
    setTimeout(runKpiCheck, 2000);
  }
}

// Expose cho debug
window.__runKpiCheck = runKpiCheck;
window.__kpiConfig = kpiConfig;

init();
