/**
 * Quick Test - Chạy: bun run test/quick-test.ts
 * 
 * Test nhanh:
 * 1. Login QR
 * 2. Nhận tin nhắn realtime (cá nhân + nhóm)
 * 3. Gửi tin nhắn (echo lại)
 * 4. Crawl lịch sử chat cá nhân (getUserChatHistory)
 * 5. Auto-reconnect
 */

import fs from "node:fs";
import { Zalo, ThreadType, type Credentials, type API } from "../src/index.js";

const CRED_FILE = "./test/credentials.json";

// ====== Login ======
async function login(): Promise<API> {
    const zalo = new Zalo({ selfListen: true, logging: true });

    // Thử dùng credentials đã lưu
    if (fs.existsSync(CRED_FILE)) {
        try {
            const creds: Credentials = JSON.parse(fs.readFileSync(CRED_FILE, "utf-8"));
            console.log("📦 Dùng credentials đã lưu...");
            return await zalo.login(creds);
        } catch (e) {
            console.log("⚠️ Credentials hết hạn, scan QR lại...");
        }
    }

    // QR Login
    const api = await zalo.loginQR({ qrPath: "./test/qr.png" }, (event) => {
        if (event.type === 0) {
            event.actions.saveToFile("./test/qr.png");
            console.log("\n📱 Mở file test/qr.png và quét bằng Zalo trên điện thoại!\n");
        }
        if (event.type === 2) console.log(`👤 ${event.data.display_name} đã quét`);
        if (event.type === 4) {
            // Lưu credentials
            fs.mkdirSync("./test", { recursive: true });
            fs.writeFileSync(CRED_FILE, JSON.stringify({
                imei: event.data.imei,
                cookie: event.data.cookie,
                userAgent: event.data.userAgent,
            }, null, 2));
            console.log("💾 Đã lưu credentials → test/credentials.json");
        }
    });

    return api;
}

// ====== Main ======
async function main() {
    console.log("=".repeat(50));
    console.log("🧪 QUICK TEST - ZCA-JS Enhanced");
    console.log("=".repeat(50));

    const api = await login();
    console.log("\n✅ Đăng nhập thành công!\n");

    // ---- Test 1: Realtime tin nhắn ----
    let msgCount = 0;
    const startTime = Date.now();

    api.listener.on("connected", () => {
        console.log("🟢 WebSocket connected!");
        console.log("\n📨 Đang lắng nghe tin nhắn... Hãy gửi tin nhắn tới tài khoản này!\n");
    });

    api.listener.on("message", async (message) => {
        msgCount++;
        const isUser = message.type === ThreadType.User;
        const typeLabel = isUser ? "👤 DM" : "👥 GROUP";
        const content = typeof message.data.content === "string"
            ? message.data.content
            : "[attachment/media]";

        console.log(`[${typeLabel}] #${msgCount} | From: ${message.data.uidFrom} | Thread: ${message.threadId}`);
        console.log(`  └─ Content: ${content}`);
        console.log(`  └─ isSelf: ${message.isSelf} | msgId: ${message.data.msgId}`);

        // ---- Test 2: Echo lại tin nhắn (gửi realtime) ----
        // Đã tắt tự động gửi lại tin nhắn (echo) để tránh làm phiền liên hệ Zalo thực tế.
        // Nếu muốn test gửi tin nhắn, bạn có thể uncomment đoạn code dưới đây:
        /*
        if (!message.isSelf && typeof message.data.content === "string") {
            try {
                const result = await api.sendMessage(
                    `✅ Echo: ${message.data.content}`,
                    message.threadId,
                    message.type,
                );
                console.log(`  └─ ✅ Đã echo lại! msgId: ${result.message?.msgId}`);
            } catch (err) {
                console.log(`  └─ ❌ Gửi thất bại:`, err);
            }
        }
        */
        console.log();
    });

    api.listener.on("disconnected", (code, reason) => {
        console.log(`🔴 Disconnected: code=${code} reason=${reason}`);
    });

    api.listener.on("reconnecting", (attempt, delay) => {
        console.log(`🔄 Reconnecting #${attempt} in ${delay}ms...`);
    });

    api.listener.on("reconnected", () => {
        console.log("🟢 Reconnected thành công!");
    });

    api.listener.on("error", (err) => {
        console.error("❌ Error:", err);
    });

    // Start listener
    api.listener.start({ retryOnClose: true });

    // ---- Test 3: Crawl lịch sử chat cá nhân (sau 5 giây) ----
    setTimeout(async () => {
        console.log("\n" + "=".repeat(50));
        console.log("🔍 Test getUserChatHistory (sau 5s)...");
        console.log("=".repeat(50));

        try {
            // Lấy tin nhắn cũ qua WebSocket (Promise-based)
            const oldUserMsgs = await api.listener.requestOldMessagesAsync(ThreadType.User, null, 15000);
            console.log(`\n📬 requestOldMessagesAsync(User): ${oldUserMsgs.length} tin nhắn`);
            for (const msg of oldUserMsgs.slice(0, 3)) {
                const c = typeof msg.data.content === "string" ? msg.data.content : "[media]";
                console.log(`  └─ [${msg.data.uidFrom}]: ${c.substring(0, 80)}`);
            }

            const oldGroupMsgs = await api.listener.requestOldMessagesAsync(ThreadType.Group, null, 15000);
            console.log(`\n📬 requestOldMessagesAsync(Group): ${oldGroupMsgs.length} tin nhắn`);
            for (const msg of oldGroupMsgs.slice(0, 3)) {
                const c = typeof msg.data.content === "string" ? msg.data.content : "[media]";
                console.log(`  └─ [${msg.data.uidFrom} → ${msg.threadId}]: ${c.substring(0, 80)}`);
            }
        } catch (err) {
            console.log("⚠️ requestOldMessagesAsync:", err);
        }

        try {
            // Test getUserChatHistory HTTP API
            // Dùng uidFrom từ tin nhắn cũ nếu có
            const testUserId = "0"; // "0" = chính mình (send2me)
            console.log(`\n🔍 getUserChatHistory("${testUserId}", 5)...`);
            const history = await api.getUserChatHistory(testUserId, 5);
            console.log(`📚 Kết quả: ${history?.msgs?.length ?? 0} tin nhắn, more: ${history?.more}`);
            if (history?.msgs) {
                for (const msg of history.msgs.slice(0, 3)) {
                    const c = typeof msg.data.content === "string" ? msg.data.content : "[media]";
                    console.log(`  └─ [${msg.data.uidFrom}]: ${c.substring(0, 80)}`);
                }
            }
            console.log("\n✅ getUserChatHistory HOẠT ĐỘNG!");
        } catch (err: any) {
            console.log(`\n⚠️ getUserChatHistory lỗi: ${err.message}`);
            console.log("   (Có thể cần userId thực, sẽ test khi nhận tin nhắn đầu tiên)");
        }

        console.log("\n" + "=".repeat(50));
        console.log("📊 Tiếp tục lắng nghe tin nhắn realtime...");
        console.log("   Nhấn Ctrl+C để dừng");
        console.log("=".repeat(50) + "\n");
    }, 5000);

    // ---- Test getUserChatHistory khi nhận tin nhắn DM đầu tiên ----
    let testedHistory = false;
    api.listener.on("message", async (message) => {
        if (testedHistory || message.type !== ThreadType.User || message.isSelf) return;
        testedHistory = true;

        const userId = message.data.uidFrom;
        console.log(`\n🔍 Auto-test getUserChatHistory với userId thực: ${userId}`);
        try {
            const history = await api.getUserChatHistory(userId, 10);
            console.log(`✅ getUserChatHistory("${userId}"): ${history?.msgs?.length ?? 0} tin nhắn`);
            if (history?.msgs) {
                for (const msg of history.msgs.slice(0, 5)) {
                    const c = typeof msg.data.content === "string" ? msg.data.content : "[media]";
                    console.log(`  └─ ${c.substring(0, 100)}`);
                }
            }
        } catch (err: any) {
            console.log(`❌ getUserChatHistory thất bại: ${err.message}`);
        }
    });

    // Keep alive
    setInterval(() => api.keepAlive().catch(() => {}), 5 * 60_000);
}

main().catch(console.error);
