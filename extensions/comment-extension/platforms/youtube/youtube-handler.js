/**
 * =============================================================================
 * MASTER MODULE YOUTUBE COMMENT HANDLER (platforms/youtube/youtube-handler.js)
 * =============================================================================
 * Tự động hóa Seeding Comment trên YouTube (Video Thường & Shorts).
 * Giải pháp tìm kiếm Icon Shorts Active & Khắc phục Timeout/Double Comment:
 * 1. findDeep & findAllDeep: Đâm xuyên qua mọi nốt .shadowRoot bằng đệ quy.
 * 2. Thuật toán lọc Active Shorts Icon: Kiểm tra [is-active] + kích thước + Lưới lọc Viewport (top >= 0 && top < innerHeight).
 * 3. humanComboClick(element): Đánh thức Khung Placeholder & Nút Shorts Active (Focus + Enter + Viewport Mouse/Pointer Events + click()).
 * 4. safeSubmitClick(element): Bấm nút Gửi (#submit-button) (Chỉ Click Chuột theo tọa độ thực, KHÔNG bấm Enter để tránh Double Comment).
 * 5. Asynchronous Message Channel: Giữ `return true;` trong chrome.runtime.onMessage listener.
 * Cô lập hoàn toàn với luồng Facebook.
 */

// -----------------------------------------------------------------------------
// 1. CORE UTILITIES & SHADOW DOM PENETRATOR (VŨ KHÍ ĐÂM XUYÊN SHADOW DOM)
// -----------------------------------------------------------------------------

/**
 * Trễ bất đồng bộ ms
 */
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * VŨ KHÍ CỐT LÕI 1: Tìm kiếm đệ quy Element xuyên qua mọi nốt .shadowRoot (Polymer)
 * @param {string} selector - CSS Selector cần tìm
 * @param {Document|Element|ShadowRoot} root - Nốt gốc để bắt đầu quét
 * @returns {Element|null}
 */
function findDeep(selector, root = document) {
  if (!root) return null;

  // 1. Quét trực tiếp ở cấp DOM hiện tại
  const direct = root.querySelector(selector);
  if (direct) return direct;

  // 2. Quét đệ quy xuyên qua tất cả các Shadow Root của Web Components (Polymer)
  const allNodes = root.querySelectorAll("*");
  for (const node of allNodes) {
    if (node.shadowRoot) {
      const found = findDeep(selector, node.shadowRoot);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Tìm tất cả các phần tử khớp selector xuyên qua Shadow DOM
 */
function findAllDeep(selector, root = document, results = []) {
  if (!root) return results;

  const direct = root.querySelectorAll(selector);
  direct.forEach((el) => results.push(el));

  const allNodes = root.querySelectorAll("*");
  for (const node of allNodes) {
    if (node.shadowRoot) {
      findAllDeep(selector, node.shadowRoot, results);
    }
  }
  return results;
}

/**
 * MutationObserver chờ đợi Element xuất hiện xuyên qua Shadow DOM
 */
function waitForElementDeep(selector, timeoutMs = 8000, root = document) {
  return new Promise((resolve) => {
    const initial = findDeep(selector, root);
    if (initial) return resolve(initial);

    let timer = null;
    const observer = new MutationObserver(() => {
      const el = findDeep(selector, root);
      if (el) {
        if (timer) clearTimeout(timer);
        observer.disconnect();
        resolve(el);
      }
    });

    observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true,
    });

    timer = setTimeout(() => {
      observer.disconnect();
      resolve(findDeep(selector, root));
    }, timeoutMs);
  });
}

/**
 * HÀM 1: humanComboClick(element)
 * ĐỒN COMBO ACCESSIBILITY: CHỈ DÙNG ĐỂ ĐÁNH THỨC #placeholder-area VÀ ÉP MỞ PANEL SHORTS.
 * Combo Focus + Phím Enter + Chuỗi Pointer/Mouse Events + .click().
 */
function humanComboClick(element) {
  if (!element) return false;

  const targetBtn = element.closest('button, ytd-button-renderer, #placeholder-area, #simplebox-placeholder, yt-formatted-string.simplebox-placeholder, a[role="button"], div[role="button"]') || element;

  try {
    const rect = targetBtn.getBoundingClientRect();
    const centerX = rect.left + (rect.width > 0 ? rect.width / 2 : 10);
    const centerY = rect.top + (rect.height > 0 ? rect.height / 2 : 10);
    const screenX = (window.screenX || 0) + centerX;
    const screenY = (window.screenY || 0) + centerY;

    if (typeof targetBtn.focus === "function") {
      targetBtn.focus();
    }

    // Tấn công bằng phím Enter (Đánh thức DOM Polymer)
    const enterDown = new KeyboardEvent("keydown", {
      key: "Enter",
      code: "Enter",
      keyCode: 13,
      which: 13,
      bubbles: true,
      cancelable: true,
      view: window,
    });
    const enterUp = new KeyboardEvent("keyup", {
      key: "Enter",
      code: "Enter",
      keyCode: 13,
      which: 13,
      bubbles: true,
      cancelable: true,
      view: window,
    });
    targetBtn.dispatchEvent(enterDown);
    targetBtn.dispatchEvent(enterUp);

    // Tấn công bằng chuột kèm tọa độ X, Y
    const mouseOpts = {
      bubbles: true,
      cancelable: true,
      view: window,
      composed: true,
      clientX: centerX,
      clientY: centerY,
      screenX: screenX,
      screenY: screenY,
      button: 0,
      buttons: 1,
      pointerId: 1,
      pointerType: "mouse",
      isPrimary: true,
      width: 1,
      height: 1,
      pressure: 0.5,
    };

    targetBtn.dispatchEvent(new PointerEvent("pointerover", mouseOpts));
    targetBtn.dispatchEvent(new PointerEvent("pointerenter", { ...mouseOpts, bubbles: false }));
    targetBtn.dispatchEvent(new PointerEvent("pointerdown", mouseOpts));
    targetBtn.dispatchEvent(new MouseEvent("mousedown", mouseOpts));
    targetBtn.dispatchEvent(new PointerEvent("pointerup", mouseOpts));
    targetBtn.dispatchEvent(new MouseEvent("mouseup", mouseOpts));
    targetBtn.dispatchEvent(new MouseEvent("click", mouseOpts));

    if (typeof targetBtn.click === "function") {
      targetBtn.click();
    }

    return true;
  } catch (err) {
    console.warn("[YouTube Extension] Lỗi humanComboClick:", err);
    return false;
  }
}

/**
 * HÀM 2: safeSubmitClick(element)
 * CHỈ DÙNG ĐỂ BẤM NÚT GỬI (#submit-button).
 * Lấy tọa độ trung tâm (X, Y) và dispatch chuỗi event chuột cơ bản:
 * pointerdown -> mousedown -> pointerup -> mouseup -> click
 * KHÔNG CÓ phím Enter và KHÔNG gọi thêm .click() trùng lặp để tránh lỗi Double Comment.
 */
function safeSubmitClick(element) {
  if (!element) return false;

  const targetBtn = element.closest("button, ytd-button-renderer, #submit-button") || element;

  try {
    if (typeof targetBtn.focus === "function") {
      targetBtn.focus();
    }

    const rect = targetBtn.getBoundingClientRect();
    const centerX = rect.left + (rect.width > 0 ? rect.width / 2 : 10);
    const centerY = rect.top + (rect.height > 0 ? rect.height / 2 : 10);
    const screenX = (window.screenX || 0) + centerX;
    const screenY = (window.screenY || 0) + centerY;

    const mouseOpts = {
      bubbles: true,
      cancelable: true,
      view: window,
      composed: true,
      clientX: centerX,
      clientY: centerY,
      screenX: screenX,
      screenY: screenY,
      button: 0,
      buttons: 1,
      pointerId: 1,
      pointerType: "mouse",
      isPrimary: true,
    };

    // Dispatch chuỗi event chuột chuẩn xác có tọa độ (KHÔNG BẮN PHÍM ENTER)
    targetBtn.dispatchEvent(new PointerEvent("pointerdown", mouseOpts));
    targetBtn.dispatchEvent(new MouseEvent("mousedown", mouseOpts));
    targetBtn.dispatchEvent(new PointerEvent("pointerup", mouseOpts));
    targetBtn.dispatchEvent(new MouseEvent("mouseup", mouseOpts));
    targetBtn.dispatchEvent(new MouseEvent("click", mouseOpts));

    return true;
  } catch (err) {
    console.warn("[YouTube Extension] Lỗi safeSubmitClick:", err);
    return false;
  }
}

/**
 * HACK MỞ KHÓA NÚT SUBMIT (#submit-button):
 * Xóa thuộc tính disabled / aria-disabled và dùng safeSubmitClick để gửi bình luận.
 */
function unlockAndClickSubmit(submitBtn, textbox) {
  if (!submitBtn) return false;

  // 1. Ép ô textbox phát sự kiện input để Polymer nhận dạng có dữ liệu
  if (textbox) {
    textbox.dispatchEvent(new InputEvent("input", { inputType: "insertText", bubbles: true, cancelable: true }));
    textbox.dispatchEvent(new Event("change", { bubbles: true }));
  }

  // 2. Tìm nốt nút bấm thực sự
  const btnElement = submitBtn.matches("button") ? submitBtn : submitBtn.querySelector("button") || submitBtn;
  const parentContainer = submitBtn.closest("ytd-button-renderer, #submit-button") || submitBtn;

  // 3. Xóa hoàn toàn thuộc tính disabled và aria-disabled
  [btnElement, parentContainer, submitBtn].forEach((el) => {
    if (!el) return;
    el.removeAttribute("disabled");
    el.setAttribute("aria-disabled", "false");
    if (el.disabled !== undefined) el.disabled = false;
  });

  // 4. Dùng safeSubmitClick gửi bình luận (Tránh Double Comment!)
  return safeSubmitClick(btnElement || submitBtn);
}

// -----------------------------------------------------------------------------
// 2. MÔ PHỎNG GIẢ LẬP GÕ PHÍM NGƯỜI THẬT (HUMAN-LIKE TYPING SIMULATION)
// -----------------------------------------------------------------------------

/**
 * Giả lập hành vi gõ phím của con người:
 * - Bắn chuỗi event: keydown -> keypress -> input -> keyup
 * - Delay ngẫu nhiên 30ms - 150ms mỗi ký tự
 * - 5% tỷ lệ ngắt nhịp (pause) 300ms - 500ms để mô phỏng "suy nghĩ"
 *
 * @param {HTMLElement} element - Ô nhập liệu contenteditable
 * @param {string} text - Nội dung comment
 */
async function simulateHumanTyping(element, text) {
  if (!element) throw new Error("Element nhập liệu không tồn tại.");
  element.focus();
  await delay(500); // Nghỉ nửa giây trước khi bắt đầu xóa text

  // Xóa nội dung cũ nếu có
  element.innerHTML = "";
  element.textContent = "";

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const keyCode = char.charCodeAt(0);

    element.dispatchEvent(new KeyboardEvent("keydown", { key: char, code: `Key${char.toUpperCase()}`, keyCode: keyCode, which: keyCode, bubbles: true, cancelable: true }));
    element.dispatchEvent(new KeyboardEvent("keypress", { key: char, code: `Key${char.toUpperCase()}`, keyCode: keyCode, which: keyCode, bubbles: true, cancelable: true }));

    let inserted = false;
    try { inserted = document.execCommand("insertText", false, char); } catch (e) { inserted = false; }
    if (!inserted) { element.textContent += char; }

    element.dispatchEvent(new InputEvent("input", { inputType: "insertText", data: char, bubbles: true, cancelable: true }));
    element.dispatchEvent(new KeyboardEvent("keyup", { key: char, code: `Key${char.toUpperCase()}`, keyCode: keyCode, which: keyCode, bubbles: true, cancelable: true }));

    // GIẢM TỐC ĐỘ GÕ: Tăng delay giữa các ký tự lên 80ms - 250ms (người gõ chậm)
    let charDelay = Math.floor(Math.random() * (250 - 80 + 1)) + 80;

    // TĂNG TỶ LỆ KHỰNG LẠI: 10% xác suất dừng lại suy nghĩ từ 0.5s đến 1.5s
    if (Math.random() < 0.10) {
      charDelay += Math.floor(Math.random() * (1500 - 500 + 1)) + 500;
    }

    await delay(charDelay);
  }

  await delay(1000); // Gõ xong dừng 1s đọc lại rồi mới gửi
}

// -----------------------------------------------------------------------------
// 3. LUỒNG XỬ LÝ VIDEO THƯỜNG (NORMAL WATCH VIDEO: /watch?v=...)
// -----------------------------------------------------------------------------

async function handleNormalVideo(commentText) {
  console.log("[YouTube Extension] Đang xử lý Seeding cho Video Thường...");

  // 1. Scroll trang xuống 800px và đợi
  window.scrollBy({ top: 800, behavior: "smooth" });
  await delay(2000);

  if (!findDeep("ytd-comments")) {
    window.scrollBy({ top: 400, behavior: "smooth" });
    await delay(2000);
  }

  // 2. Tìm Khung Fake: Quét tìm #placeholder-area, #simplebox-placeholder, yt-formatted-string.simplebox-placeholder
  const placeholderSelectors = ["#placeholder-area", "#simplebox-placeholder", "yt-formatted-string.simplebox-placeholder", "ytd-comment-simplebox-renderer"];

  let visibleFakeBox = null;

  for (const sel of placeholderSelectors) {
    const candidates = findAllDeep(sel);
    const visibleCandidates = candidates.filter((el) => {
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });

    if (visibleCandidates.length > 0) {
      visibleFakeBox = visibleCandidates[0];
      break;
    }
  }

  if (!visibleFakeBox) {
    visibleFakeBox = await waitForElementDeep("#placeholder-area, #simplebox-placeholder, yt-formatted-string.simplebox-placeholder", 7000);
  }

  // Lấy khung Fake đầu tiên hiển thị, gọi humanComboClick(khungFake) để đánh thức DOM
  if (visibleFakeBox) {
    humanComboClick(visibleFakeBox);
    console.log("[YouTube Extension] Đã gọi humanComboClick trên Khung Fake hiển thị.");
  }

  // Đợi 2.5s cho YouTube mount #contenteditable-root thật
  await delay(2500);

  // 3. Dùng findDeep tìm #contenteditable-root, gọi hàm giả lập gõ phím (simulateHumanTyping)
  const textbox = await waitForElementDeep('#contenteditable-root[contenteditable="true"], ytd-commentbox #contenteditable-root', 8000);

  if (!textbox) {
    throw new Error("Không thể tìm thấy ô nhập bình luận (#contenteditable-root) trên Video Thường.");
  }

  // Giả lập gõ phím người thật
  await simulateHumanTyping(textbox, commentText);

  // 4. Hack nút Submit: Dùng findDeep tìm nút submit, xóa disabled, dispatch event input, rồi gọi safeSubmitClick vào nút submit (TRÁNH DOUBLE COMMENT!)
  const submitBtn = await waitForElementDeep("ytd-commentbox #submit-button button, #submit-button button, #submit-button", 5000);

  if (!submitBtn) {
    throw new Error("Không tìm thấy nút Gửi bình luận (#submit-button).");
  }

  const clicked = unlockAndClickSubmit(submitBtn, textbox);
  if (!clicked) {
    throw new Error("Lỗi khi thực hiện unlockAndClickSubmit trên Video Thường.");
  }
  console.log("[YouTube Extension] Đã unlock & safeSubmitClick nút Gửi cho Video Thường!");

  await delay(3000);

  return {
    success: true,
    url: window.location.href,
    platform: "youtube",
    type: "normal_video",
  };
}

/**
 * ⚠️ HÀM MỚI: QUÉT LIÊN TỤC TÌM NÚT COMMENT TRÊN SHORTS (V3.0 - Đánh chặn bằng Tọa độ và Keyword)
 */
async function scanForActiveShortsCommentButton(timeoutMs = 15000) {
  const startTime = Date.now();
  console.log("[YouTube Shorts] Bắt đầu radar quét tìm Icon Comment...");

  // Bao lưới tất cả các trường hợp thuộc tính mà YouTube có thể gắn vào nút
  const selectors = ["#comments-button", "ytd-button-renderer#comments-button", "[aria-label*='Bình luận']", "[aria-label*='bình luận']", "[title*='Bình luận']", "[title*='bình luận']", "[aria-label*='Comment']", "[aria-label*='comment']", "[title*='Comment']", "[title*='comment']"];

  while (Date.now() - startTime < timeoutMs) {
    for (const selector of selectors) {
      const candidates = findAllDeep(selector);

      for (const cand of candidates) {
        const rect = cand.getBoundingClientRect();
        const centerY = rect.top + rect.height / 2;

        // Lưới lọc Vàng: Nút phải có kích thước thật (width > 0) VÀ nằm TRONG vùng nhìn thấy của màn hình
        // Khoảng cách > 50 và < innerHeight - 50 để chắc chắn nút không bị lấp lửng ở mép trên/dưới của video khác
        if (rect.width > 0 && rect.height > 0 && centerY > 50 && centerY < window.innerHeight - 50) {
          console.log(`[YouTube Shorts] 🎯 Tóm được Icon Comment bằng selector: ${selector}`, cand);

          // Ưu tiên trả về thẻ <button> hoặc [role="button"] bên trong để click cho chính xác
          return cand.querySelector("button, [role='button']") || cand;
        }
      }
    }

    // Nghỉ nửa giây để nhường CPU cho trình duyệt render, sau đó quét tiếp
    await delay(500);
  }

  return null; // Hết 15s vẫn không thấy
}

// -----------------------------------------------------------------------------
// 4b. LUỒNG XỬ LÝ VIDEO SHORTS (/shorts/...) - BẢN RADAR SCANNER
// -----------------------------------------------------------------------------
async function handleShorts(commentText) {
  console.log("[YouTube Extension] Đang xử lý Seeding cho Video Shorts...");

  const commentBtn = await scanForActiveShortsCommentButton(15000);
  if (!commentBtn) throw new Error("Không tìm thấy Icon Comment trên Video Shorts đang xem (Time-out 15s).");

  humanComboClick(commentBtn);
  await delay(3000);

  const panelSelector = 'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-comments"], ytd-engagement-panel-section-list-renderer';
  const panel = await waitForElementDeep(panelSelector, 6000);

  const placeholderSelectors = ["#placeholder-area", "#simplebox-placeholder", "yt-formatted-string.simplebox-placeholder", "ytd-comment-simplebox-renderer"];
  let placeholderEl = null;
  for (const pSel of placeholderSelectors) {
    placeholderEl = findDeep(pSel, panel || document);
    if (placeholderEl) break;
  }
  if (!placeholderEl) placeholderEl = await waitForElementDeep("#placeholder-area, #simplebox-placeholder", 5000, panel || document);
  if (placeholderEl) {
    // Delay ngẫu nhiên 1-2 giây mô phỏng người thật đang nhìn màn hình trước khi click
    await delay(1000 + Math.random() * 1000);
    humanComboClick(placeholderEl);
  }
  await delay(2000);

  const textbox = await waitForElementDeep('#contenteditable-root[contenteditable="true"]', 8000, panel || document);
  if (!textbox) throw new Error("Không thể tìm thấy ô nhập bình luận (#contenteditable-root) trên Shorts Panel.");

  humanComboClick(textbox);
  textbox.focus();
  // Tăng delay trước khi gõ từ 500ms lên 2000-3000ms (mô phỏng người đọc lại nội dung)
  await delay(2000 + Math.random() * 1000);
  await simulateHumanTyping(textbox, commentText);

  const submitBtn = await waitForElementDeep("ytd-engagement-panel-section-list-renderer #submit-button button, #submit-button button, #submit-button", 5000, panel || document);
  if (!submitBtn) throw new Error("Không tìm thấy nút Gửi bình luận (#submit-button) trên Shorts Panel.");

  const clicked = unlockAndClickSubmit(submitBtn, textbox);
  if (!clicked) throw new Error("Lỗi khi thực hiện unlockAndClickSubmit trên Video Shorts.");

  await delay(3500);
  return { success: true, url: window.location.href, platform: "youtube", type: "shorts" };
}

// -----------------------------------------------------------------------------
// 5. MAIN LISTENER & DISPATCHER (LẮNG NGHE LỆNH TỪ BACKGROUND)
// -----------------------------------------------------------------------------

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action !== "EXECUTE_COMMENT") {
    return false;
  }

  if (!window.location.hostname.includes("youtube.com")) {
    return false;
  }

  console.log("[YouTube Extension] Nhận được lệnh EXECUTE_COMMENT:", request.payload);

  (async () => {
    try {
      const { text, url: payloadUrl } = request.payload || {};

      if (!text || !text.trim()) {
        throw new Error("Nội dung comment trống.");
      }

      const targetUrl = payloadUrl || window.location.href;
      const currentUrl = window.location.href;

      let result;
      if (targetUrl.includes("/shorts/") || currentUrl.includes("/shorts/")) {
        // Đợi 3s cho trang Shorts kịp render đầy đủ DOM trước khi bắt đầu quét
        await delay(3000);
        result = await handleShorts(text.trim());
      } else if (targetUrl.includes("/watch") || currentUrl.includes("/watch")) {
        result = await handleNormalVideo(text.trim());
      } else {
        throw new Error("URL không phải dạng Video (/watch) hoặc Shorts (/shorts/) hợp lệ.");
      }

      sendResponse(result);
    } catch (error) {
      console.error("[YouTube Extension] Lỗi thực thi Comment YouTube:", error);
      sendResponse({
        success: false,
        error: error.message || "Lỗi không xác định khi comment YouTube.",
        platform: "youtube",
      });
    }
  })();

  return true; // BẮT BUỘC: Giữ kênh giao tiếp Asynchronous mở, tránh đóng tab giữa chừng
});
