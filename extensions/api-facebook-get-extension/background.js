// background.js - Điều phối auto crawl API

let isRunning = false;
let shouldStop = false;
let currentTabId = null;

// Nhận lệnh từ Popup
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === 'START_AUTO_CRAWL') {
        startAutoCrawl(msg.groups, msg.config || {});
        sendResponse({ success: true });
    } else if (msg.action === 'STOP_AUTO_CRAWL') {
        shouldStop = true;
        isRunning = false;
        sendLog('Cảnh báo: Yêu cầu dừng cào...');
        sendResponse({ success: true });
    }
});

async function sendLog(message, isRaw = false, level = 'info') {
    // In ra console của service worker -- nơi duy nhất xem được log khi chạy
    // trên VPS (không có popup nào mở để nhận message này).
    if (level === 'error') {
        console.error(message);
    } else {
        console.log(message);
    }

    // Gửi log cho Popup của Extension
    chrome.runtime.sendMessage({ action: 'LOG', message, isRaw }).catch(() => {});
    
    // Gửi log cho React Frontend thông qua bridge.js
    chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
            chrome.tabs.sendMessage(tab.id, { 
                action: 'FRONTEND_LOG', 
                message, 
                level 
            }).catch(() => {});
        });
    });
}

function sendFrontendProgress(groupIndex, totalGroups) {
    chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
            chrome.tabs.sendMessage(tab.id, { 
                action: 'FRONTEND_PROGRESS', 
                groupIndex, 
                totalGroups 
            }).catch(() => {});
        });
    });
}

function sendFrontendDone(totalGroups, totalPosts) {
    chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
            chrome.tabs.sendMessage(tab.id, { 
                action: 'FRONTEND_DONE', 
                totalGroups, 
                totalPosts 
            }).catch(() => {});
        });
    });
}

let API_BASE = 'https://dev.seeding.markeeai.com'; // global fallback for save-posts (dev)

async function startAutoCrawl(groups, config = {}) {
    if (isRunning) return;
    isRunning = true;
    shouldStop = false;
    
    const idMember = config.idMember || null;
    // Use the API URL detected by popup, or fall back to storage (bridge.js).
    API_BASE = config.apiBase || (await chrome.storage.local.get('api_base_url')).api_base_url || API_BASE;
    sendLog(`🚀 Bắt đầu quá trình tự động cào ${groups.length} nhóm...`);

    try {
        const tab = await chrome.tabs.create({ url: 'https://www.facebook.com/', active: true });
        currentTabId = tab.id;

        let totalPostsCrawled = 0;

        for (let i = 0; i < groups.length; i++) {
            if (shouldStop) break;
            
            sendFrontendProgress(i, groups.length);
            
            const group = groups[i];
            sendLog(`\n▶ [${i+1}/${groups.length}] Đang xử lý: ${group.name || group.url}`, false, 'info');
            
            // Bước 1: Navigate tới Group
            await chrome.tabs.update(currentTabId, { url: group.url });
            await sleep(5000); // Chờ load trang ban đầu
            
            if (shouldStop) break;

            // Bước 2: Reload 2 lần (theo yêu cầu của USER để làm sạch session/state)
            sendLog(`Vệ sinh session: Reload lần 1...`);
            await chrome.tabs.reload(currentTabId);
            await sleep(5000);
            
            sendLog(`Vệ sinh session: Reload lần 2...`);
            await chrome.tabs.reload(currentTabId);
            await sleep(6000); // Chờ load lại xong hoàn toàn

            if (shouldStop) break;

            // Bước 3: Tiêm Content Script để gọi API GraphQL
            sendLog(`Đang tiêm lệnh gọi GraphQL API vào trang...`);
            let results = await chrome.scripting.executeScript({
                target: { tabId: currentTabId },
                files: ['content.js']
            }).catch(async (e) => {
                sendLog(`❌ Lỗi tiêm script: ${e.message}. Tiến hành tải lại tab và thử lại...`);
                await chrome.tabs.reload(currentTabId);
                await sleep(5000);
                return chrome.scripting.executeScript({
                    target: { tabId: currentTabId },
                    files: ['content.js']
                }).catch(err => {
                    sendLog(`❌ Lỗi tiêm script (lần 2): ${err.message}. Extension sẽ tự động khởi động lại!`);
                    chrome.runtime.reload();
                    return null;
                });
            });

            if (!results || !results[0]) {
                sendLog(`❌ Không thể thực thi script tại group này.`);
                continue;
            }

            // Gửi thông báo bắt đầu cho content.js
            await sleep(1000);
            
            try {
                sendLog(`Đang ra lệnh lấy 100 bài viết qua API...`);
                const response = await chrome.tabs.sendMessage(currentTabId, {
                    action: "FETCH_API_POSTS",
                    count: 100
                });

                if (response && response.success && response.data) {
                    const postCount = response.data.length;
                    totalPostsCrawled += postCount;
                    sendLog(`✅ API trả về ${postCount} bài. Dữ liệu trích xuất được:`, false, 'success');
                    
                    response.data.forEach((p, idx) => {
                        const snippet = (p.content || '').substring(0, 50).replace(/\n/g, ' ') + (p.content?.length > 50 ? '...' : '');
                        sendLog(`   ${idx + 1}. [${p.author_name || 'Khách'}] ${snippet} (❤️ ${p.reactions || 0}, 💬 ${p.comments || 0})`, false, 'info');
                    });
                    
                    sendLog(`Đang gửi ${postCount} bài lên Backend để lọc lấy 3 bài tốt nhất...`, false, 'info');
                    
                    // Bước 4: Gửi đống này lên backend
                    let pushRes = null;

                    let backendRetry = 0;
                    while (backendRetry <= 2) {
                        try {
                            pushRes = await fetch(`${API_BASE}/api/all-platform/extension/save-posts`, {
                                method: "POST",
                                headers: { 
                                    "Content-Type": "application/json",
                                    "x-api-key": "markee-extension-key-2024"
                                },
                                body: JSON.stringify({
                                    posts: response.data,
                                    group_id: '',
                                    group_url: group.url,
                                    id_member: idMember,
                                    extension_version: "API-Automated-1.0",
                                    // Pass keyword filter params (from app UI) to backend
                                    keywords: group.keywords || null,
                                    post_limit: group.post_limit ?? null
                                })

                            });
                            break;
                        } catch(err) {
                            if (backendRetry >= 2) throw err;
                            backendRetry++;
                            sendLog(`⚠️ Backend mất kết nối, thử lại lần ${backendRetry}/2...`, false, 'warn');
                            await sleep(2000);
                        }
                    }

                    if (pushRes && pushRes.ok) {
                        const pushData = await pushRes.json();
                        sendLog(`🎉 Backend phản hồi: Đã lưu ${pushData.count || 0} bài!`, false, 'success');
                    } else {
                        sendLog(`❌ Lỗi Backend: ${pushRes ? pushRes.status : 'Disconnected'}`, false, 'error');
                    }
                } else {
                    sendLog(`⚠️ Không nhận được dữ liệu bài viết.`, false, 'warn');
                }
            } catch (err) {
                sendLog(`❌ Lỗi giao tiếp content script: ${err.message}`, false, 'error');
            }

            // Nghỉ chút trước khi qua group khác
            await sleep(3000);
        }

        sendLog(`\n🏁 HOÀN TẤT TOÀN BỘ TIẾN TRÌNH CÀO!`, false, 'success');
        sendFrontendDone(groups.length, totalPostsCrawled);

    } catch (e) {
        sendLog(`❌ Lỗi nghiêm trọng: ${e.message}`, false, 'error');
    } finally {
        isRunning = false;
        if (currentTabId) {
            chrome.tabs.remove(currentTabId).catch(() => {});
        }
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ── Worker mode: cào theo hàng đợi job từ main server (dùng cho VPS worker) ──
// Khác với startAutoCrawl (kích hoạt thủ công từ tab đang mở), worker mode tự
// poll GET /next-job định kỳ (không cần user mở trang frontend), cào 1 group
// mỗi lần nhận job rồi báo kết quả kèm job_id/worker_id để main server đóng job.

const WORKER_POLL_ALARM = 'crawl-queue-poll';
let workerPolling = false; // chống chạy chồng nếu alarm bắn khi job trước chưa xong

async function getOrCreateWorkerId() {
    const stored = await chrome.storage.local.get('worker_id');
    if (stored.worker_id) return stored.worker_id;
    const workerId = crypto.randomUUID();
    await chrome.storage.local.set({ worker_id: workerId });
    return workerId;
}

async function getWorkerApiBase() {
    const stored = await chrome.storage.local.get(['worker_api_base', 'api_base_url']);
    return stored.worker_api_base || stored.api_base_url || API_BASE;
}

// ── FB Account Pool: tự "xin" 1 acc chưa ai dùng + tự inject cookie ──────────
// Giải quyết vấn đề VM bị cấp lại mất hết chrome.storage.local/cookie login,
// không cần RDP gõ tay -- worker tự claim 1 acc từ pool rồi set cookie thẳng.

async function hasFacebookLoginCookie() {
    const cookie = await chrome.cookies.get({ url: 'https://www.facebook.com', name: 'c_user' });
    return !!cookie;
}

async function claimFbAccount(apiBase) {
    const workerId = await getOrCreateWorkerId();
    const res = await fetch(
        `${apiBase}/api/all-platform/extension/accounts/claim?worker_id=${encodeURIComponent(workerId)}&worker_name=${encodeURIComponent('vps-' + workerId.slice(0, 8))}`,
        { headers: { 'x-api-key': 'markee-extension-key-2024' } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.account || null;
}

async function applyFbAccountCookies(account) {
    for (const cookie of account.cookies) {
        try {
            await chrome.cookies.set(cookie);
        } catch (e) {
            sendLog(`⚠️ Lỗi set cookie ${cookie.name}: ${e.message}`, false, 'warn');
        }
    }
    await chrome.storage.local.set({ fb_account_id: account.id, fb_account_email: account.email });
}

async function ensureFbAccountReady(apiBase) {
    if (await hasFacebookLoginCookie()) return true; // đã có session hợp lệ, không cần xin acc mới

    sendLog('🔑 [FB Account Pool] Chưa có cookie login hợp lệ, đang xin 1 acc chưa ai dùng...');
    const account = await claimFbAccount(apiBase);
    if (!account) {
        sendLog('⚠️ [FB Account Pool] Hết acc khả dụng trong pool, chờ lượt poll kế tiếp.', false, 'warn');
        return false;
    }

    await applyFbAccountCookies(account);
    sendLog(`✅ [FB Account Pool] Đã nhận acc ${account.email}.`, false, 'success');
    return true;
}

async function reportAccountInvalid(apiBase, reason) {
    const stored = await chrome.storage.local.get('fb_account_id');
    if (!stored.fb_account_id) return;
    try {
        await fetch(`${apiBase}/api/all-platform/extension/accounts/report-invalid`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-api-key': 'markee-extension-key-2024' },
            body: JSON.stringify({
                worker_id: await getOrCreateWorkerId(),
                account_id: stored.fb_account_id,
                error_message: String(reason).slice(0, 500)
            })
        });
    } catch (e) {
        // Bỏ qua -- nếu báo lỗi cũng lỗi, acc vẫn còn 'assigned' cho worker này,
        // sẽ tự bị thả về 'available' nếu worker mất heartbeat luôn (xem WORKER_STALE_SECONDS).
    } finally {
        await chrome.storage.local.remove('fb_account_id'); // lượt poll kế tiếp tự xin acc mới
    }
}

async function crawlSingleGroupJob(job, apiBase) {
    const tab = await chrome.tabs.create({ url: 'https://www.facebook.com/', active: false });
    const tabId = tab.id;
    try {
        await chrome.tabs.update(tabId, { url: job.group_url });
        await sleep(5000);
        await chrome.tabs.reload(tabId);
        await sleep(5000);
        await chrome.tabs.reload(tabId);
        await sleep(6000);

        if (!(await hasFacebookLoginCookie())) {
            throw new Error('FB_LOGIN_LOST');
        }

        let results = await chrome.scripting.executeScript({
            target: { tabId },
            files: ['content.js']
        }).catch(async () => {
            await chrome.tabs.reload(tabId);
            await sleep(5000);
            return chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] }).catch(() => null);
        });

        if (!results || !results[0]) {
            throw new Error('Không thể tiêm content script vào group này.');
        }

        await sleep(1000);
        const response = await chrome.tabs.sendMessage(tabId, { action: 'FETCH_API_POSTS', count: 100 });
        if (!response || !response.success || !response.data) {
            const detail = response && response.error ? response.error : 'không có phản hồi hợp lệ';
            throw new Error(`Không nhận được dữ liệu bài viết từ content script: ${detail}`);
        }

        const pushRes = await fetch(`${apiBase}/api/all-platform/extension/save-posts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': 'markee-extension-key-2024'
            },
            body: JSON.stringify({
                posts: response.data,
                group_id: job.group_id || '',
                group_url: job.group_url,
                group_name: job.group_name,
                id_member: job.id_member,
                extension_version: 'Worker-Queue-1.0',
                keywords: job.keywords || null,
                post_limit: job.post_limit ?? null,
                job_id: job.id,
                worker_id: await getOrCreateWorkerId()
            })
        });

        if (!pushRes.ok) {
            throw new Error(`Backend từ chối kết quả: HTTP ${pushRes.status}`);
        }
    } finally {
        chrome.tabs.remove(tabId).catch(() => {});
    }
}

async function reportJobFailure(job, apiBase, errorMessage) {
    try {
        await fetch(`${apiBase}/api/all-platform/extension/queue/job-result`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': 'markee-extension-key-2024'
            },
            body: JSON.stringify({
                job_id: job.id,
                worker_id: await getOrCreateWorkerId(),
                success: false,
                error_message: String(errorMessage).slice(0, 500)
            })
        });
    } catch (e) {
        // Không có gì thêm để làm nếu report lỗi cũng lỗi -- job sẽ tự requeue
        // sau khi heartbeat của worker này hết hạn (xem WORKER_STALE_SECONDS ở backend).
    }
}

async function pollNextJob() {
    if (workerPolling || isRunning) return; // isRunning: đang có luồng cào thủ công từ popup
    workerPolling = true;
    try {
        const workerId = await getOrCreateWorkerId();
        const apiBase = await getWorkerApiBase();

        const ready = await ensureFbAccountReady(apiBase);
        if (!ready) return; // hết acc, đợi lượt poll kế (1 phút sau)

        const res = await fetch(
            `${apiBase}/api/all-platform/extension/queue/next-job?worker_id=${encodeURIComponent(workerId)}&worker_name=${encodeURIComponent('vps-' + workerId.slice(0, 8))}`,
            { headers: { 'x-api-key': 'markee-extension-key-2024' } }
        );
        if (!res.ok) return;
        const data = await res.json();
        const job = data.job;
        if (!job) return; // không có job -> đã tự cập nhật heartbeat "idle" phía server

        sendLog(`📥 [Worker Queue] Nhận job cào: ${job.group_name || job.group_url}`);
        try {
            await crawlSingleGroupJob(job, apiBase);
            sendLog(`✅ [Worker Queue] Hoàn tất job ${job.id}`, false, 'success');
        } catch (e) {
            sendLog(`❌ [Worker Queue] Job ${job.id} lỗi: ${e.message}`, false, 'error');
            await reportJobFailure(job, apiBase, e.message);

            if (e.message === 'FB_LOGIN_LOST' || !(await hasFacebookLoginCookie())) {
                sendLog('🚨 [FB Account Pool] Phát hiện mất login, báo acc hỏng...', false, 'warn');
                await reportAccountInvalid(apiBase, e.message);
            }
        }
    } catch (e) {
        // Lỗi mạng khi poll -- bỏ qua, alarm kế tiếp sẽ tự thử lại.
    } finally {
        workerPolling = false;
    }
}

(async () => {
    const apiBase = await getWorkerApiBase();
    await ensureFbAccountReady(apiBase);
})();

chrome.alarms.create(WORKER_POLL_ALARM, { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === WORKER_POLL_ALARM) {
        pollNextJob();
    }
});
