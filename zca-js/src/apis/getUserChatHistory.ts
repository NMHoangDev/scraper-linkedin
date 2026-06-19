import { ZaloApiError } from "../Errors/ZaloApiError.js";
import { apiFactory } from "../utils.js";

import { UserMessage, type TMessage } from "../models/index.js";

export type GetUserChatHistoryResponse = {
    lastActionId: string;
    lastActionIdOther: string;
    more: number;
    msgs: UserMessage[];
};

export const getUserChatHistoryFactory = apiFactory<GetUserChatHistoryResponse>()((api, ctx, utils) => {
    const serviceURL = utils.makeURL(`${api.zpwServiceMap.chat[0]}/api/message/history`);

    /**
     * Get user (personal/DM) chat history
     *
     * @param userId user id to get chat history with
     * @param count count of messages to return (default: 50)
     * @param globalMsgId last message global id for pagination (optional)
     *
     * @throws {ZaloApiError}
     */
    return async function getUserChatHistory(userId: string, count: number = 50, globalMsgId?: string) {
        const params: Record<string, unknown> = {
            toid: userId,
            count: count,
            imei: ctx.imei,
        };

        if (globalMsgId) {
            params.globalmsgid = globalMsgId;
        }

        const encryptedParams = utils.encodeAES(JSON.stringify(params));
        if (!encryptedParams) throw new ZaloApiError("Failed to encrypt params");

        const response = await utils.request(utils.makeURL(serviceURL, { params: encryptedParams }), {
            method: "GET",
        });

        return utils.resolve(response, (result) => {
            let data = result.data as unknown as GetUserChatHistoryResponse | string;

            if (typeof data === "string") {
                data = JSON.parse(data) as GetUserChatHistoryResponse;
            }

            for (let i = 0; i < data.msgs.length; i++) {
                data.msgs[i] = new UserMessage(ctx.uid, data.msgs[i] as unknown as TMessage);
            }

            return data;
        });
    };
});
