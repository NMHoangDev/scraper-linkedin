const { Zalo } = require("zca-js");
const fs = require("fs");
const path = require("path");

async function main() {
  const jsonPath = path.resolve(__dirname, "../artifacts/zca-auth/zl_8d9a6a45.json");
  if (!fs.existsSync(jsonPath)) {
    console.error("Auth file not found at " + jsonPath);
    return;
  }
  const account = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  
  console.log("Logging in...");
  const cookie = typeof account.cookies === "string" ? JSON.parse(account.cookies) : account.cookies;
  const zalo = new Zalo({ selfListen: true, checkUpdate: false, logging: false });
  const api = await zalo.login({
    cookie,
    imei: account.imei,
    userAgent: account.userAgent
  });
  
  console.log("Login OK! OwnId:", api.getOwnId());
  console.log("Service Map:", JSON.stringify(api.zpwServiceMap, null, 2));
}

main().catch(console.error);
