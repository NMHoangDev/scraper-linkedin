import { ZaloApiError } from "../Errors/ZaloApiError.js";
import { apiFactory } from "../utils.js";

export type CMRecentMessage = {
    globalMsgId: string;
    cliMsgId: string;
    msgId: string;
    uidFrom: string;
    idTo: string;
    dName: string;
    ts: number;
    status: number;
    msgType: string;
    content: string | Record<string, unknown>;
    notify: string;
    ttl: number;
    userId: string;
    uin: string;
    topOut: number;
    seq: number;
    at: number;
    cmd: number;
    st: number;
    fromD: string;
    toD: string;
};

export type CMRecentConversation = {
    threadId: string;
    type: number; // 0 = user, 1 = group
    lastMsgs: CMRecentMessage[];
    updateTime: number;
    // Additional fields that may come
    [key: string]: unknown;
};

export type GetCMRecentResponse = {
    conversations: CMRecentConversation[];
    hasMore: boolean;
    lastTime?: number;
};

export const getCMRecentFactory = apiFactory<GetCMRecentResponse>()((api, ctx, utils) => {
    const getCMServiceURLs = (): string[] => {
        const urls: string[] = [];
        const cmKeys = ["group_cloud_message", "cm"];
        for (const key of cmKeys) {
            const mapped = (api.zpwServiceMap as Record<string, string[]>)[key];
            if (mapped && mapped.length > 0) {
                for (const u of mapped) {
                    if (u && !urls.includes(u)) urls.push(u);
                }
            }
        }
        const fallback = "https://tt-group-cm.chat.zalo.me";
        if (!urls.includes(fallback)) urls.push(fallback);
        return urls;
    };

    const RETRY_DELAYS = [1000, 3000, 8000];

    /**
     * Get recent conversations from Zalo's CM (Cloud Message) API.
     * Built-in retry with exponential backoff + multi-URL fallback.
     *
     * @param count Number of conversations to fetch (default: 50)
     * @param lastTime Pagination cursor - timestamp of last conversation
     *
     * @throws {ZaloApiError}
     */
    return async function getCMRecent(count: number = 50, lastTime: number = 0) {
        const cmUrls = getCMServiceURLs();
        const params = {
            count,
            imei: ctx.imei,
            lastTime,
            src: -1,
        };

        const encryptedParams = utils.encodeAES(JSON.stringify(params));
        if (!encryptedParams) throw new ZaloApiError("Failed to encrypt CM params");

        const endpoint = "/api/cm/getrecentv2";
        let lastError: unknown = null;

        for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
            const cmBase = cmUrls[attempt % cmUrls.length];
            try {
                const serviceURL = utils.makeURL(`${cmBase}${endpoint}`, {
                    params: encryptedParams,
                });

                const response = await utils.request(serviceURL, {
                    method: "GET",
                });

                return utils.resolve(response);
            } catch (err: unknown) {
                lastError = err;
                const errMsg = err instanceof Error ? err.message : String(err);
                if (/login|cookie|session|401|403/i.test(errMsg)) {
                    throw err;
                }
                if (attempt < RETRY_DELAYS.length) {
                    await new Promise((r) => setTimeout(r, RETRY_DELAYS[attempt]));
                }
            }
        }

        throw lastError instanceof Error
            ? lastError
            : new ZaloApiError(`getCMRecent failed after ${RETRY_DELAYS.length + 1} attempts`);
    };
});
