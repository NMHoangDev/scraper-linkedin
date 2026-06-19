/**
 * ZaloSyncService - Complete wrapper service for Zalo message synchronization
 *
 * Features:
 * - Realtime message sync (personal + group)
 * - Chat history crawling with pagination
 * - Auto-reconnect with exponential backoff
 * - Message gap detection on reconnect
 * - Credential persistence (avoid re-QR scan)
 * - Event-based architecture for web app integration
 *
 * Usage:
 * ```typescript
 * import { ZaloSyncService } from "./ZaloSyncService.js";
 *
 * const service = new ZaloSyncService({ logging: true });
 *
 * // Login with saved credentials or QR
 * await service.loginWithCredentials(savedCredentials);
 * // OR: const creds = await service.loginWithQR();
 *
 * // Listen for realtime messages
 * service.on("message", (msg) => console.log(msg));
 *
 * // Start sync
 * await service.startSync();
 *
 * // Crawl history
 * const userMsgs = await service.crawlUserChatHistory("USER_ID", { maxMessages: 200 });
 * const groupMsgs = await service.crawlGroupChatHistory("GROUP_ID", { maxMessages: 500 });
 * ```
 */

import EventEmitter from "events";
import { Zalo, type Credentials, type API } from "./zalo.js";
import { ThreadType } from "./models/index.js";
import type { Message, UserMessage, GroupMessage } from "./models/Message.js";
import type { Reaction } from "./models/Reaction.js";
import type { Typing } from "./models/Typing.js";
import type { FriendEvent } from "./models/FriendEvent.js";
import type { GroupEvent } from "./models/GroupEvent.js";
import type { Undo } from "./models/Undo.js";
import type { SeenMessage } from "./models/SeenMessage.js";
import type { DeliveredMessage } from "./models/DeliveredMessage.js";
import { CloseReason, type AutoReconnectOptions } from "./apis/listen.js";
import type { LoginQRCallback } from "./apis/loginQR.js";
import type { Options } from "./context.js";

// ========== Types ==========

export type SyncServiceOptions = Partial<Options> & {
    /** Auto-reconnect configuration */
    autoReconnect?: Partial<AutoReconnectOptions>;
    /** Delay between crawl requests in ms to avoid rate limiting (default: 500) */
    crawlDelay?: number;
    /** Whether to fetch missed messages after reconnect (default: true) */
    fetchMissedOnReconnect?: boolean;
};

export type SavedCredentials = Credentials & {
    savedAt?: number;
};

export type CrawlOptions = {
    /** Maximum number of messages to crawl (default: 100) */
    maxMessages?: number;
    /** Starting message ID for pagination */
    startFromMsgId?: string;
    /** Delay between pagination requests in ms (default: 500) */
    delay?: number;
};

export type CrawlResult<T> = {
    messages: T[];
    totalFetched: number;
    hasMore: boolean;
    lastMsgId?: string;
};

export type SyncStatus = {
    isConnected: boolean;
    isListening: boolean;
    reconnectAttempts: number;
    lastUserMsgId: string | null;
    lastGroupMsgId: string | null;
    uptime: number;
};

interface SyncServiceEvents {
    // Message events
    message: [message: Message];
    user_message: [message: UserMessage];
    group_message: [message: GroupMessage];
    old_messages: [messages: Message[], type: ThreadType];

    // Status events
    reaction: [reaction: Reaction];
    typing: [typing: Typing];
    undo: [data: Undo];
    seen_messages: [messages: SeenMessage[]];
    delivered_messages: [messages: DeliveredMessage[]];

    // Social events
    friend_event: [data: FriendEvent];
    group_event: [data: GroupEvent];

    // Connection events
    connected: [];
    disconnected: [code: CloseReason, reason: string];
    reconnecting: [attempt: number, delay: number];
    reconnected: [];
    closed: [code: CloseReason, reason: string];
    error: [error: unknown];

    // Sync events
    sync_started: [];
    sync_stopped: [];
    credentials_ready: [credentials: SavedCredentials];
    missed_messages: [messages: Message[], type: ThreadType];
}

// ========== Service ==========

export class ZaloSyncService extends EventEmitter<SyncServiceEvents> {
    private zalo: Zalo;
    private api: API | null = null;
    private options: SyncServiceOptions;
    private startTime: number = 0;
    private isListening = false;
    private credentials: SavedCredentials | null = null;

    constructor(options: SyncServiceOptions = {}) {
        super();
        this.options = {
            crawlDelay: 500,
            fetchMissedOnReconnect: true,
            ...options,
        };
        this.zalo = new Zalo(options);
    }

    // ========== Login Methods ==========

    /**
     * Login with saved credentials (cookie/imei/userAgent)
     * Use this to avoid re-scanning QR code
     */
    async loginWithCredentials(credentials: SavedCredentials): Promise<API> {
        this.credentials = credentials;
        this.api = await this.zalo.login(credentials);
        return this.api;
    }

    /**
     * Login with QR code
     * Returns credentials that can be saved for future logins
     */
    async loginWithQR(
        options?: { userAgent?: string; language?: string; qrPath?: string },
        callback?: LoginQRCallback,
    ): Promise<{ api: API; credentials: SavedCredentials }> {
        // Intercept the callback to capture credentials
        let savedCreds: SavedCredentials | null = null;

        const wrappedCallback: LoginQRCallback = (event) => {
            if (event.type === 4 /* GotLoginInfo */) {
                savedCreds = {
                    imei: event.data.imei,
                    cookie: event.data.cookie,
                    userAgent: event.data.userAgent,
                    savedAt: Date.now(),
                };
                this.credentials = savedCreds;
                this.emit("credentials_ready", savedCreds);
            }
            if (callback) callback(event);
        };

        this.api = await this.zalo.loginQR(options, wrappedCallback);

        if (!savedCreds) {
            throw new Error("Failed to capture credentials during QR login");
        }

        return { api: this.api, credentials: savedCreds };
    }

    // ========== Sync Control ==========

    /**
     * Start realtime message synchronization
     * Listens for all messages (personal + group) in realtime
     */
    async startSync(): Promise<void> {
        if (!this.api) throw new Error("Not logged in. Call loginWithCredentials() or loginWithQR() first.");
        if (this.isListening) throw new Error("Already syncing");

        const listener = this.api.listener;
        this.startTime = Date.now();

        // Wire up all events
        listener.on("connected", () => {
            this.emit("connected");
        });

        listener.on("message", (message) => {
            this.emit("message", message);
            if (message.type === ThreadType.User) {
                this.emit("user_message", message as UserMessage);
            } else {
                this.emit("group_message", message as GroupMessage);
            }
        });

        listener.on("old_messages", (messages, type) => {
            this.emit("old_messages", messages, type);
        });

        listener.on("reaction", (reaction) => this.emit("reaction", reaction));
        listener.on("typing", (typing) => this.emit("typing", typing));
        listener.on("undo", (data) => this.emit("undo", data));
        listener.on("seen_messages", (msgs) => this.emit("seen_messages", msgs));
        listener.on("delivered_messages", (msgs) => this.emit("delivered_messages", msgs));
        listener.on("friend_event", (data) => this.emit("friend_event", data));
        listener.on("group_event", (data) => this.emit("group_event", data));

        listener.on("disconnected", (code, reason) => {
            this.emit("disconnected", code, reason);
        });

        listener.on("reconnecting", (attempt, delay) => {
            this.emit("reconnecting", attempt, delay);
        });

        listener.on("reconnected", async () => {
            this.emit("reconnected");

            // Fetch missed messages after reconnect
            if (this.options.fetchMissedOnReconnect) {
                try {
                    await this.fetchMissedMessages();
                } catch (error) {
                    this.emit("error", error);
                }
            }
        });

        listener.on("closed", (code, reason) => {
            this.isListening = false;
            this.emit("closed", code, reason);
            this.emit("sync_stopped");
        });

        listener.on("error", (error) => {
            this.emit("error", error);
        });

        // Start listening with auto-retry
        listener.start({ retryOnClose: true });
        this.isListening = true;
        this.emit("sync_started");
    }

    /**
     * Stop realtime synchronization
     */
    stopSync(): void {
        if (this.api && this.isListening) {
            this.api.listener.stop();
            this.isListening = false;
            this.emit("sync_stopped");
        }
    }

    // ========== Chat History Crawling ==========

    /**
     * Crawl personal (DM) chat history with automatic pagination
     *
     * @param userId User ID to get chat history with
     * @param options Crawl options
     */
    async crawlUserChatHistory(userId: string, options: CrawlOptions = {}): Promise<CrawlResult<UserMessage>> {
        if (!this.api) throw new Error("Not logged in");

        const maxMessages = options.maxMessages ?? 100;
        const delay = options.delay ?? this.options.crawlDelay ?? 500;
        let lastMsgId = options.startFromMsgId;
        let allMessages: UserMessage[] = [];
        let hasMore = true;

        try {
            // Try via HTTP API first
            while (allMessages.length < maxMessages && hasMore) {
                const batchSize = Math.min(50, maxMessages - allMessages.length);
                const result = await this.api.getUserChatHistory(userId, batchSize, lastMsgId);

                if (!result || !result.msgs || result.msgs.length === 0) {
                    hasMore = false;
                    break;
                }

                allMessages = allMessages.concat(result.msgs as UserMessage[]);
                hasMore = result.more === 1;

                if (hasMore && result.msgs.length > 0) {
                    const lastMsg = result.msgs[result.msgs.length - 1];
                    lastMsgId = (lastMsg as unknown as { data: { msgId: string } }).data?.msgId || lastMsgId;
                }

                // Rate limiting delay
                if (hasMore && allMessages.length < maxMessages) {
                    await this.sleep(delay);
                }
            }
        } catch (httpError: any) {
            // Fallback to WebSocket-based catchup if HTTP returns 404 or fails
            if (this.isListening) {
                let consecutiveEmptyBatches = 0;
                while (allMessages.length < maxMessages && hasMore) {
                    const wsMsgs = await this.api.listener.requestOldMessagesAsync(ThreadType.User, lastMsgId, 15000);
                    
                    if (!wsMsgs || wsMsgs.length === 0) {
                        hasMore = false;
                        break;
                    }

                    // Filter messages belonging to this user thread
                    const batch = wsMsgs.filter(msg => msg.threadId === userId) as UserMessage[];
                    
                    if (batch.length === 0) {
                        consecutiveEmptyBatches++;
                        if (consecutiveEmptyBatches >= 3) {
                            hasMore = false;
                            break;
                        }
                    } else {
                        consecutiveEmptyBatches = 0;
                        allMessages = allMessages.concat(batch);
                    }

                    const lastGlobalMsg = wsMsgs[wsMsgs.length - 1];
                    lastMsgId = lastGlobalMsg.data?.msgId || lastMsgId;

                    if (hasMore && allMessages.length < maxMessages) {
                        await this.sleep(delay);
                    }
                }
            } else {
                throw new Error(`Failed to crawl history via HTTP (${httpError.message}) and WebSocket listener is not active to attempt fallback. Please call startSync() first.`);
            }
        }

        return {
            messages: allMessages,
            totalFetched: allMessages.length,
            hasMore,
            lastMsgId,
        };
    }

    /**
     * Crawl group chat history with automatic pagination
     *
     * @param groupId Group ID to get chat history from
     * @param options Crawl options
     */
    async crawlGroupChatHistory(groupId: string, options: CrawlOptions = {}): Promise<CrawlResult<GroupMessage>> {
        if (!this.api) throw new Error("Not logged in");

        const maxMessages = options.maxMessages ?? 100;
        const delay = options.delay ?? this.options.crawlDelay ?? 500;
        let lastMsgId = options.startFromMsgId;
        let allMessages: GroupMessage[] = [];
        let hasMore = true;

        while (allMessages.length < maxMessages && hasMore) {
            const batchSize = Math.min(50, maxMessages - allMessages.length);
            const result = await this.api.getGroupChatHistory(groupId, batchSize);

            if (!result || !result.groupMsgs || result.groupMsgs.length === 0) {
                hasMore = false;
                break;
            }

            allMessages = allMessages.concat(result.groupMsgs as GroupMessage[]);
            hasMore = result.more === 1;

            if (hasMore && result.groupMsgs.length > 0) {
                const lastMsg = result.groupMsgs[result.groupMsgs.length - 1];
                lastMsgId = (lastMsg as unknown as { data: { msgId: string } }).data?.msgId || lastMsgId;
            }

            // Rate limiting delay
            if (hasMore && allMessages.length < maxMessages) {
                await this.sleep(delay);
            }
        }

        return {
            messages: allMessages,
            totalFetched: allMessages.length,
            hasMore,
            lastMsgId,
        };
    }

    /**
     * Crawl old messages via WebSocket (Promise-based)
     * Works for both personal and group messages
     */
    async crawlOldMessagesViaWs(
        threadType: ThreadType,
        lastMsgId: string | null = null,
        timeoutMs: number = 10000,
    ): Promise<Message[]> {
        if (!this.api) throw new Error("Not logged in");
        if (!this.isListening) throw new Error("Listener not started. Call startSync() first.");

        return this.api.listener.requestOldMessagesAsync(threadType, lastMsgId, timeoutMs);
    }

    // ========== Utility Methods ==========

    /**
     * Get all groups the user belongs to
     */
    async getAllGroups() {
        if (!this.api) throw new Error("Not logged in");
        return this.api.getAllGroups();
    }

    /**
     * Get all friends
     */
    async getAllFriends() {
        if (!this.api) throw new Error("Not logged in");
        return this.api.getAllFriends();
    }

    /**
     * Get group info
     */
    async getGroupInfo(groupId: string) {
        if (!this.api) throw new Error("Not logged in");
        return this.api.getGroupInfo(groupId);
    }

    /**
     * Send a message (personal or group)
     */
    async sendMessage(content: string, threadId: string, type: ThreadType = ThreadType.User) {
        if (!this.api) throw new Error("Not logged in");
        return this.api.sendMessage(content, threadId, type);
    }

    /**
     * Get current sync status
     */
    getStatus(): SyncStatus {
        const lastIds = this.api?.listener.getLastMessageIds() ?? { user: null, group: null };
        return {
            isConnected: this.api?.listener.isConnected() ?? false,
            isListening: this.isListening,
            reconnectAttempts: 0,
            lastUserMsgId: lastIds.user,
            lastGroupMsgId: lastIds.group,
            uptime: this.startTime > 0 ? Date.now() - this.startTime : 0,
        };
    }

    /**
     * Get the underlying API instance for advanced usage
     */
    getAPI(): API | null {
        return this.api;
    }

    /**
     * Get saved credentials (for persistence)
     */
    getSavedCredentials(): SavedCredentials | null {
        return this.credentials;
    }

    /**
     * Keep the connection alive (call periodically)
     */
    async keepAlive() {
        if (!this.api) throw new Error("Not logged in");
        return this.api.keepAlive();
    }

    // ========== Private Methods ==========

    /**
     * Fetch messages that might have been missed during a disconnection
     */
    private async fetchMissedMessages(): Promise<void> {
        if (!this.api || !this.isListening) return;

        try {
            // Fetch missed user messages
            const userMsgs = await this.api.listener.requestOldMessagesAsync(ThreadType.User, null, 15000);
            if (userMsgs.length > 0) {
                this.emit("missed_messages", userMsgs, ThreadType.User);
            }
        } catch {
            // Timeout or error fetching user messages — non-fatal
        }

        try {
            // Fetch missed group messages
            const groupMsgs = await this.api.listener.requestOldMessagesAsync(ThreadType.Group, null, 15000);
            if (groupMsgs.length > 0) {
                this.emit("missed_messages", groupMsgs, ThreadType.Group);
            }
        } catch {
            // Timeout or error fetching group messages — non-fatal
        }
    }

    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
