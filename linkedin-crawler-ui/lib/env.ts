function normalizeLoopbackApiUrl(url: string): string {
  if (typeof window === "undefined") {
    return url;
  }

  try {
    const apiUrl = new URL(url);
    const appHost = window.location.hostname;
    const loopbackHosts = new Set(["localhost", "127.0.0.1"]);

    // Keep FE and BE on the same loopback hostname so browser cookies remain usable after reload.
    if (
      loopbackHosts.has(apiUrl.hostname) &&
      loopbackHosts.has(appHost) &&
      apiUrl.hostname !== appHost
    ) {
      apiUrl.hostname = appHost;
      return apiUrl.toString().replace(/\/+$/, "");
    }
  } catch {
    return url;
  }

  return url;
}

export const API_BASE_URL = normalizeLoopbackApiUrl(
  process.env.NEXT_PUBLIC_LINKEDIN_CRAWLER_API_URL?.replace(/\/+$/, "") ??
    "http://localhost:8000",
);

export const API_KEY = process.env.NEXT_PUBLIC_LINKEDIN_CRAWLER_API_KEY ?? "";
