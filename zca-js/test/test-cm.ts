import path from "node:path";
import fs from "node:fs";
import { Zalo } from "../src/index.js";

async function main() {
    const credentials = JSON.parse(fs.readFileSync(path.resolve("./test/credentials.json"), "utf-8"));
    const zalo = new Zalo({
        selfListen: true,
        logging: true,
    });
    
    console.log("Logging in...");
    if (Array.isArray(credentials.cookie)) {
        credentials.cookie = credentials.cookie.map((c: any) => {
            let e = c.expires || c.expirationDate;
            if (typeof e === "number" && e < 10000000000) {
                c.expires = new Date(e * 1000).toISOString();
            }
            return c;
        });
    }
    const api = await zalo.login(credentials);
    console.log("Logged in successfully!");
    
    console.log("Testing getCMRecent(10)...");
    try {
        const recent = await api.getCMRecent(10);
        console.log("getCMRecent response status: success");
        console.log(`Number of conversations returned: ${recent.conversations?.length ?? 0}`);
        if (recent.conversations && recent.conversations.length > 0) {
            console.log("First conversation details:", JSON.stringify(recent.conversations[0], null, 2));
            
            const firstConv = recent.conversations[0];
            const threadId = firstConv.threadId;
            const isGroup = firstConv.type === 1;
            console.log(`Testing getCMOld for threadId: ${threadId}, isGroup: ${isGroup}`);
            const oldMsgs = await api.getCMOld(threadId, 0, 5, isGroup);
            console.log("getCMOld response status: success");
            console.log("Messages found:", oldMsgs.msgs?.length || oldMsgs.groupMsgs?.length || 0);
            if (oldMsgs.msgs && oldMsgs.msgs.length > 0) {
                console.log("First old msg detail:", JSON.stringify(oldMsgs.msgs[0], null, 2));
            } else if (oldMsgs.groupMsgs && oldMsgs.groupMsgs.length > 0) {
                console.log("First old group msg detail:", JSON.stringify(oldMsgs.groupMsgs[0], null, 2));
            }
        } else {
            console.log("No recent conversations found to test getCMOld.");
        }
    } catch (error) {
        console.error("Error testing CM APIs:", error);
    }
}

main().catch(console.error);
