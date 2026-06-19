/**
 * Example: Complete Zalo Message Sync for Web App
 *
 * Demonstrates:
 * - QR Login + credential saving
 * - Realtime message sync (personal + group)
 * - Crawling chat history (personal + group)
 * - Auto-reconnect handling
 * - Integration with Express.js backend
 */

import { ZaloSyncService, ThreadType, type SavedCredentials } from "zca-js";
import fs from "node:fs";

const CREDENTIALS_FILE = "./zalo_credentials.json";

// ==============================
// 1. Initialize Service
// ==============================
const syncService = new ZaloSyncService({
    selfListen: true,  // Listen to messages sent by yourself too
    logging: true,
    crawlDelay: 500,   // 500ms delay between crawl requests
    fetchMissedOnReconnect: true,
    autoReconnect: {
        enabled: true,
        maxRetries: 0,        // 0 = infinite retries
        initialDelay: 1000,   // 1 second
        maxDelay: 30000,      // 30 seconds max
        backoffMultiplier: 2, // exponential backoff
    },
});

// ==============================
// 2. Login (QR or saved credentials)
// ==============================
async function login() {
    // Try loading saved credentials first
    if (fs.existsSync(CREDENTIALS_FILE)) {
        try {
            const saved: SavedCredentials = JSON.parse(fs.readFileSync(CREDENTIALS_FILE, "utf-8"));
            console.log("📦 Using saved credentials...");
            await syncService.loginWithCredentials(saved);
            console.log("✅ Logged in with saved credentials!");
            return;
        } catch (error) {
            console.log("⚠️ Saved credentials expired, scanning QR...");
        }
    }

    // Fall back to QR login
    console.log("📱 Scanning QR code...");
    const { credentials } = await syncService.loginWithQR(
        { qrPath: "./qr.png" },
        (event) => {
            switch (event.type) {
                case 0: // QRCodeGenerated
                    console.log("📷 QR generated! Scan file: qr.png");
                    event.actions.saveToFile();
                    break;
                case 2: // QRCodeScanned
                    console.log(`👤 Scanned by: ${event.data.display_name}`);
                    break;
                case 4: // GotLoginInfo
                    console.log("🔑 Got login info!");
                    break;
            }
        },
    );

    // Save credentials for next time
    fs.writeFileSync(CREDENTIALS_FILE, JSON.stringify(credentials, null, 2));
    console.log("💾 Credentials saved!");
}

// ==============================
// 3. Set up event handlers
// ==============================
function setupEventHandlers() {
    // --- Realtime Messages ---
    syncService.on("user_message", (msg) => {
        const isText = typeof msg.data.content === "string";
        console.log(`[DM] From: ${msg.data.uidFrom} | ${isText ? msg.data.content : "[attachment]"}`);

        // Example: Save to database
        // await db.messages.insert({ ... });
    });

    syncService.on("group_message", (msg) => {
        const isText = typeof msg.data.content === "string";
        console.log(`[GROUP ${msg.threadId}] From: ${msg.data.uidFrom} | ${isText ? msg.data.content : "[attachment]"}`);
    });

    // --- Message status ---
    syncService.on("reaction", (reaction) => {
        console.log(`[REACTION] ${reaction.data.content}`);
    });

    syncService.on("undo", (undo) => {
        console.log(`[UNDO] Message recalled: ${undo.data.msgId}`);
    });

    syncService.on("typing", (typing) => {
        console.log(`[TYPING] ${typing.data.uid} is typing...`);
    });

    // --- Connection events ---
    syncService.on("connected", () => {
        console.log("🟢 Connected to Zalo WebSocket");
    });

    syncService.on("disconnected", (code, reason) => {
        console.log(`🔴 Disconnected: ${code} - ${reason}`);
    });

    syncService.on("reconnecting", (attempt, delay) => {
        console.log(`🔄 Reconnecting... attempt ${attempt} (next in ${delay}ms)`);
    });

    syncService.on("reconnected", () => {
        console.log("🟢 Reconnected!");
    });

    syncService.on("missed_messages", (messages, type) => {
        const label = type === ThreadType.User ? "DM" : "GROUP";
        console.log(`📥 Fetched ${messages.length} missed ${label} messages after reconnect`);
    });

    syncService.on("error", (error) => {
        console.error("❌ Error:", error);
    });

    syncService.on("sync_stopped", () => {
        console.log("⏹️ Sync stopped");
    });
}

// ==============================
// 4. Crawl chat history
// ==============================
async function crawlHistory() {
    console.log("\n📚 Crawling chat history...\n");

    // --- Crawl personal chat history ---
    const userId = "TARGET_USER_ID"; // Replace with actual user ID
    try {
        const userHistory = await syncService.crawlUserChatHistory(userId, {
            maxMessages: 200,
            delay: 500, // 500ms between requests
        });
        console.log(`📨 Crawled ${userHistory.totalFetched} DM messages (hasMore: ${userHistory.hasMore})`);

        for (const msg of userHistory.messages) {
            const isText = typeof msg.data.content === "string";
            if (isText) {
                console.log(`  [${msg.data.ts}] ${msg.data.uidFrom}: ${msg.data.content}`);
            }
        }
    } catch (error) {
        console.error("Failed to crawl DM history:", error);
    }

    // --- Crawl group chat history ---
    const groupId = "TARGET_GROUP_ID"; // Replace with actual group ID
    try {
        const groupHistory = await syncService.crawlGroupChatHistory(groupId, {
            maxMessages: 500,
            delay: 500,
        });
        console.log(`📨 Crawled ${groupHistory.totalFetched} group messages (hasMore: ${groupHistory.hasMore})`);
    } catch (error) {
        console.error("Failed to crawl group history:", error);
    }

    // --- Crawl old messages via WebSocket (alternative method) ---
    try {
        const oldUserMsgs = await syncService.crawlOldMessagesViaWs(ThreadType.User, null, 10000);
        console.log(`📨 Got ${oldUserMsgs.length} recent DM messages via WebSocket`);

        const oldGroupMsgs = await syncService.crawlOldMessagesViaWs(ThreadType.Group, null, 10000);
        console.log(`📨 Got ${oldGroupMsgs.length} recent group messages via WebSocket`);
    } catch (error) {
        console.error("Failed to crawl via WebSocket:", error);
    }
}

// ==============================
// 5. Status monitoring
// ==============================
function startStatusMonitor() {
    setInterval(() => {
        const status = syncService.getStatus();
        console.log(
            `[STATUS] Connected: ${status.isConnected} | Listening: ${status.isListening} | Uptime: ${Math.floor(status.uptime / 1000)}s`,
        );
    }, 60_000); // Every 60 seconds
}

// ==============================
// Main
// ==============================
async function main() {
    try {
        await login();
        setupEventHandlers();

        // Start realtime sync
        await syncService.startSync();
        console.log("🚀 Realtime sync started!");

        // Start status monitor
        startStatusMonitor();

        // Optional: Crawl existing history
        // await crawlHistory();

        // Keep alive
        setInterval(() => {
            syncService.keepAlive().catch(() => {});
        }, 5 * 60_000); // Every 5 minutes

        console.log("\n✅ Zalo Sync Service running. Press Ctrl+C to stop.\n");
    } catch (error) {
        console.error("Fatal error:", error);
        process.exit(1);
    }
}

main();
