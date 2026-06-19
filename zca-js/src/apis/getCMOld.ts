import { ZaloApiError } from "../Errors/ZaloApiError.js";
import { apiFactory } from "../utils.js";

export type CMOldMessage = {
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
    at: number;
    cmd: number;
    st: number;
    fromD: string;
    toD: string;
    quote?: Record<string, unknown>;
};

export type GetCMOldResponse = {
    msgs?: CMOldMessage[];
    groupMsgs?: CMOldMessage[];
    hasMore: boolean;
};

export const getCMOldFactory = apiFactory<GetCMOldResponse>()((api, ctx, utils) => {
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
     * Get older messages for a specific conversation from CM API.
     * Built-in retry with exponential backoff + multi-URL fallback.
     *
     * @param threadId The conversation thread ID (group ID or user ID)
     * @param globalMsgId The cursor message ID — fetch messages older than this
     * @param count Number of messages to fetch (default: 50)
     * @param isGroup Whether this is a group conversation
     *
     * @throws {ZaloApiError}
     */
    return async function getCMOld(
        threadId: string,
        globalMsgId: string | number = 0,
        count: number = 50,
        isGroup: boolean = true,
    ) {
        const cmUrls = getCMServiceURLs();
        const params = {
            groupId: threadId,
            globalMsgId,
            count,
            msgIds: [] as string[],
            imei: ctx.imei,
            src: -1,
        };

        const encryptedParams = utils.encodeAES(JSON.stringify(params));
        if (!encryptedParams) throw new ZaloApiError("Failed to encrypt CM params");

        const endpoint = "/api/cm/getoldv2";
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
                // Don't retry on auth errors
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
            : new ZaloApiError(`getCMOld failed after ${RETRY_DELAYS.length + 1} attempts`);
    };
});
