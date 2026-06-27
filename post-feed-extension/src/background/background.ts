/**
 * Background Service Worker cho PostFeed Crawler Extension
 * Luồng: App gửi groups → Mở 1 tab → Navigate Group 1 → Cào → Lưu → Group 2 → ... → Xong
 */

interface Message {
  action: string;
  data?: any;
}

interface MessageResponse {
  success: boolean;
  error?: string;
  data?: any;
}

interface FeedGroup {
  name: string;
  url: string;
  id: string;  // group_id UUID
}

interface CrawlConfig {
  maxPosts?: number;
  scrollDelay?: number;
  idMember?: string;   // id_member UUID từ user đang login (optional)
  groupId?: string;   // group_id UUID của group hiện tại (optional)
}

interface CrawlState {
  isRunning: boolean;
  shouldStop: boolean;
  posts: any[];
  scrolls: number;
  groupName: string;
  groupUrl: string;
}

class FeedCrawler {
  public isRunning = false;

  private state: CrawlState = {
    isRunning: false,
    shouldStop: false,
    posts: [],
    scrolls: 0,
    groupName: '',
    groupUrl: ''
  };

  private currentTabId: number | null = null;

  async start(groups: FeedGroup[], config: CrawlConfig = {}): Promise<void> {
    if (this.state.isRunning) {
      console.log('[FeedCrawler] Đang chạy, bỏ qua...');
      return;
    }

    // Reset state
    this.state = {
      isRunning: true,
      shouldStop: false,
      posts: [],
      scrolls: 0,
      groupName: '',
      groupUrl: ''
    };
    this.isRunning = true;

    const { maxPosts = 100, scrollDelay = 2000, idMember = '' } = config;

    console.log('[FeedCrawler] Bắt đầu crawl:', groups.length, 'groups, idMember:', idMember);

    try {
      // ─── Bước 1: Mở 1 tab duy nhất ───
      this.sendLogToUI('info', 'Đang mở tab Facebook...');
      this.sendProgress(0, groups.length, '');

      const tab = await chrome.tabs.create({
        url: 'https://www.facebook.com/',
        active: true
      });
      this.currentTabId = tab.id!;

      // Đợi tab load xong
      await this.waitForTabReady(tab.id!, 10000);
      await this.sleep(2000); // Thêm thời gian để Facebook render

      // ─── Bước 2: Cào từng group trên CÙNG TAB ───
      for (let i = 0; i < groups.length; i++) {
        if (this.state.shouldStop) {
          this.sendLogToUI('warn', 'Đã dừng theo yêu cầu');
          break;
        }

        const group = groups[i];
        console.log(`[FeedCrawler] Group ${i + 1}/${groups.length}:`, group.name);

        // Update progress
        this.sendProgress(i, groups.length, group.name);
        this.sendLogToUI('info', `Đang cào group: ${group.name} (${i + 1}/${groups.length})`);

        // Navigate tới group (trên cùng tab)
        this.sendLogToUI('info', `Navigate tới: ${group.url}`);
        await chrome.tabs.update(this.currentTabId, { url: group.url });
        await this.waitForTabReady(this.currentTabId, 15000);
        await this.sleep(3000); // Đợi feed load

        // Reset state cho group mới
        this.state.posts = [];
        this.state.scrolls = 0;
        this.state.groupName = group.name;
        this.state.groupUrl = group.url;

        // ─── Bước 3: Bắt đầu cào trên tab ───
        this.sendLogToUI('info', 'Bắt đầu scroll và cào bài...');

        // Gửi lệnh START_FEED_CRAWL cho content script
        await this.sendToTab({
          action: 'START_FEED_CRAWL',
          config: { maxPosts, scrollDelay }
        });

        // ─── Bước 4: Poll status cho đến khi done ───
        let pollCount = 0;
        const maxPolls = Math.ceil(maxPosts / 10) * 3; // Timeout sau ~3 lần scroll mỗi 10 posts

        while (pollCount < maxPolls) {
          if (this.state.shouldStop) break;

          // Poll status từ content script
          const status = await this.getCrawlStatus();
          this.state.scrolls = status.scrolls;
          this.state.posts = status.posts || [];

          this.sendLogToUI('info', `Scroll ${status.scrolls} - Thu thập ${status.posts?.length || 0} bài`);
          this.sendProgress(i, groups.length, group.name);

          if (status.done) {
            this.sendLogToUI('success', `Hoàn tất group "${group.name}": ${status.posts?.length || 0} bài`);
            break;
          }

          await this.sleep(scrollDelay);
          pollCount++;
        }

        // ─── Bước 5: Lấy data và lưu Supabase ───
        if (!this.state.shouldStop) {
          const data = await this.getCrawlData();
          const allPosts = data.posts || this.state.posts;

          // Chỉ lấy bài trong ngày
          let todayPosts = allPosts.filter((p: any) => p.is_today);
          
          // Tính điểm tương tác để xếp hạng
          todayPosts = todayPosts.map((p: any) => {
             const reactions = p.reactions || 0;
             const comments = p.comments || 0;
             const shares = p.shares || 0;
             const score = reactions + (comments * 2) + (shares * 3);
             return { ...p, score };
          });
          
          // Sắp xếp điểm số từ cao xuống thấp
          todayPosts.sort((a: any, b: any) => b.score - a.score);
          
          // Chỉ lấy tối đa 3 bài cao nhất
          const postsToSave = todayPosts.slice(0, 3);

          if (postsToSave.length > 0) {
            // Lấy group_id từ group hiện tại
            const groupId = group.id || config.groupId || '';
            this.sendLogToUI('info', `Lưu ${postsToSave.length} bài vào Supabase...`);
            await this.savePostsToSupabase(postsToSave, group, groupId, idMember);
            this.sendLogToUI('success', `Đã lưu ${postsToSave.length} bài vào Supabase (schema mới)`);
          } else {
            this.sendLogToUI('warn', `Không có bài nào để lưu cho group "${group.name}"`);
          }
        }

        // Dừng crawl trên content script
        await this.sendToTab({ action: 'STOP_CRAWL' }).catch(() => {});

        // Đợi trước khi chuyển group tiếp theo
        await this.sleep(1000);
        
        // Cập nhật giao diện nhảy sang nhóm tiếp theo
        if (i + 1 < groups.length) {
          this.sendLogToUI('info', `✅ Chuyển sang group tiếp theo: ${i + 2}/${groups.length}`);
          this.state.posts = [];
          this.state.scrolls = 0;
          await this.sendProgress(i + 1, groups.length, groups[i + 1].name);
        }
      }

      // ─── Bước 6: Hoàn tất ───
      const totalPosts = groups.length > 0
        ? groups.reduce((sum, _, idx) => sum + (this.state.posts.length || 0), 0)
        : 0;

      this.sendDone(totalPosts, groups.length);
      this.sendLogToUI('success', `🎉 Hoàn tất! Đã cào ${totalPosts} bài từ ${groups.length} groups`);

    } catch (err: any) {
      console.error('[FeedCrawler] Lỗi:', err);
      this.sendLogToUI('error', `Lỗi: ${err.message || 'Không xác định'}`);
      this.sendError(err.message || 'Lỗi không xác định');
    } finally {
      if (this.currentTabId) {
        chrome.tabs.remove(this.currentTabId).catch(() => {});
      }
      this.state.isRunning = false;
      this.isRunning = false;
      this.currentTabId = null;
    }
  }

  stop(): void {
    console.log('[FeedCrawler] Stop requested');
    this.state.shouldStop = true;
    this.sendLogToUI('warn', 'Đang dừng crawl...');

    // Gửi stop tới content script
    if (this.currentTabId) {
      this.sendToTab({ action: 'STOP_CRAWL' }).catch(() => {});
    }
  }

  // ─── Private helpers ───────────────────────────────────────

  private async waitForTabReady(tabId: number, timeoutMs: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      const check = async () => {
        try {
          // Thử gửi ping tới content script
          const resp = await chrome.tabs.sendMessage(tabId, { action: 'PING' });
          if (resp?.pong) {
            resolve();
            return;
          }
        } catch (e) {
          // Content script chưa ready, tiếp tục đợi
        }

        if (Date.now() - startTime > timeoutMs) {
          // Timeout nhưng vẫn resolve (có thể page load nhưng script chưa inject)
          console.log('[FeedCrawler] waitForTabReady timeout, continuing...');
          resolve();
          return;
        }

        setTimeout(check, 500);
      };

      check();
    });
  }

  private async getCrawlStatus(): Promise<{ scrolls: number; posts: any[]; done: boolean }> {
    if (!this.currentTabId) return { scrolls: 0, posts: [], done: true };

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const resp = await chrome.tabs.sendMessage(this.currentTabId, { action: 'GET_CRAWL_STATUS' });
        return resp || { scrolls: 0, posts: [], done: true };
      } catch (e) {
        console.log(`[FeedCrawler] getCrawlStatus attempt ${attempt} failed`);
        if (attempt < 3) await this.sleep(500);
      }
    }
    return { scrolls: 0, posts: this.state.posts, done: true };
  }

  private async getCrawlData(): Promise<{ posts: any[]; groupUrl: string }> {
    if (!this.currentTabId) return { posts: [], groupUrl: '' };

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const resp = await chrome.tabs.sendMessage(this.currentTabId, { action: 'GET_CRAWL_DATA' });
        return resp || { posts: [], groupUrl: '' };
      } catch (e) {
        console.log(`[FeedCrawler] getCrawlData attempt ${attempt} failed`);
        if (attempt < 3) await this.sleep(500);
      }
    }
    return { posts: this.state.posts, groupUrl: this.state.groupUrl };
  }

  private async sendToTab(message: any, retries = 5): Promise<any> {
    if (!this.currentTabId) return null;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const resp = await chrome.tabs.sendMessage(this.currentTabId!, message);
        return resp;
      } catch (err: any) {
        console.log(`[FeedCrawler] sendToTab attempt ${attempt}/${retries} failed:`, err.message?.substring(0, 100));
        if (attempt < retries) {
          await this.sleep(1000); // Đợi 1s trước khi retry
        }
      }
    }
    
    console.warn('[FeedCrawler] sendToTab failed after retries');
    return null;
  }

  private async savePostsToSupabase(posts: any[], group: FeedGroup, groupId: string, idMember: string): Promise<void> {
    try {
      // Gọi API mới: /save-posts (schema đúng facebook_posts)
      const response = await fetch('https://seeding.markeeai.com/api/all-platform/extension/save-posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'markee-extension-key-2024'
        },
        body: JSON.stringify({
          posts: posts.map(p => ({
            post_url: p.post_url || p.url || '',
            author_name: p.author_name || '',
            author_url: p.author_url || '',
            timestamp_raw: p.timestamp_raw || p.date || '',
            content: p.content || '',
            reactions: p.reactions || 0,
            comments: p.comments || 0,
            shares: p.shares || 0,
            images: p.images || [],
            video_url: p.video_url || p.media_url || null,
            crawled_at: p.crawled_at || new Date().toISOString()
          })),
          group_id: groupId,           // UUID từ frontend
          id_member: idMember,          // UUID từ frontend
          group_url: group.url,
          extension_version: '1.0.0'
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        console.warn('[FeedCrawler] Lưu Supabase thất bại:', response.status, errText);
        this.sendLogToUI('error', `Lưu thất bại (${response.status}): ${errText}`);
        
        // Thử gọi API cũ như fallback
        await this.savePostsToSupabaseLegacy(posts, group);
      } else {
        const result = await response.json();
        console.log('[FeedCrawler] Lưu thành công:', result);
        this.sendLogToUI('success', `Đã lưu ${result.count || 0} bài vào Supabase (schema mới)`);
      }
    } catch (err) {
      console.error('[FeedCrawler] Lỗi lưu Supabase:', err);
      this.sendLogToUI('error', `Lỗi kết nối: ${(err as Error).message}`);
      
      // Fallback: gọi API cũ
      await this.savePostsToSupabaseLegacy(posts, group);
    }
  }

  // Legacy: Gọi API cũ /crawl-result (lưu vào bảng fb_posts)
  private async savePostsToSupabaseLegacy(posts: any[], group: FeedGroup): Promise<void> {
    try {
      const response = await fetch('https://seeding.markeeai.com/api/all-platform/extension/crawl-result', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'markee-extension-key-2024'
        },
        body: JSON.stringify({
          posts: posts.map(p => ({
            post_url: p.post_url || p.url || '',
            author_name: p.author_name || '',
            author_url: p.author_url || '',
            timestamp_raw: p.timestamp_raw || p.date || '',
            timestamp_class: 'unknown',
            content: p.content || '',
            reactions: p.reactions || 0,
            comments: p.comments || 0,
            shares: p.shares || 0,
            images: p.images || [],
            video_url: p.video_url || p.media_url || null,
            group_url: group.url,
            crawled_at: new Date().toISOString()
          })),
          group_name: group.name,
          group_url: group.url,
          extension_version: '1.0.0'
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        console.warn('[FeedCrawler] Lưu Legacy thất bại:', response.status, errText);
        this.sendLogToUI('error', `Lưu Legacy thất bại (${response.status})`);
      }
    } catch (err) {
      console.error('[FeedCrawler] Lỗi lưu Legacy:', err);
      this.sendLogToUI('error', `Lỗi kết nối Legacy: ${(err as Error).message}`);
    }
  }

  private async sendLogToUI(level: 'info' | 'success' | 'warn' | 'error', message: string): Promise<void> {
    // Gửi qua storage
    await chrome.storage.local.set({
      lastLog: { level, message, time: new Date().toISOString() }
    });

    // Forward qua provision-bridge nếu tab dashboard đang mở
    try {
      const tabs = await chrome.tabs.query({});
      for (const tab of tabs) {
        if (tab.id && tab.url && (tab.url.includes('localhost:3000') || tab.url.includes('127.0.0.1:3000') || tab.url.includes('seeding.markeeai.com') || tab.url.includes('seeding.zenithglobal.dev'))) {
          chrome.tabs.sendMessage(tab.id, {
            action: 'CRAWL_LOG',
            data: { level, message }
          }).catch(() => {});
        }
      }
    } catch (e) {}
  }

  private async sendProgress(groupIndex: number, totalGroups: number, groupName: string): Promise<void> {
    await chrome.storage.local.set({
      lastProgress: { groupIndex, totalGroups, groupName, scrolls: this.state.scrolls, posts: this.state.posts.length }
    });

    try {
      const tabs = await chrome.tabs.query({});
      for (const tab of tabs) {
        if (tab.id && tab.url && (tab.url.includes('localhost:3000') || tab.url.includes('127.0.0.1:3000') || tab.url.includes('seeding.markeeai.com') || tab.url.includes('seeding.zenithglobal.dev'))) {
          chrome.tabs.sendMessage(tab.id, {
            action: 'CRAWL_PROGRESS',
            data: { groupIndex, totalGroups, groupName, posts: this.state.posts.length, scrolls: this.state.scrolls }
          }).catch(() => {});
        }
      }
    } catch (e) {}
  }

  private async sendDone(totalPosts: number, totalGroups: number): Promise<void> {
    try {
      const tabs = await chrome.tabs.query({});
      for (const tab of tabs) {
        if (tab.id && tab.url && (tab.url.includes('localhost:3000') || tab.url.includes('127.0.0.1:3000') || tab.url.includes('seeding.markeeai.com') || tab.url.includes('seeding.zenithglobal.dev'))) {
          chrome.tabs.sendMessage(tab.id, {
            action: 'CRAWL_DONE',
            data: { totalPosts, totalGroups }
          }).catch(() => {});
        }
      }
    } catch (e) {}
  }

  private async sendError(message: string): Promise<void> {
    try {
      const tabs = await chrome.tabs.query({});
      for (const tab of tabs) {
        if (tab.id && tab.url && (tab.url.includes('localhost:3000') || tab.url.includes('127.0.0.1:3000') || tab.url.includes('seeding.markeeai.com') || tab.url.includes('seeding.zenithglobal.dev'))) {
          chrome.tabs.sendMessage(tab.id, {
            action: 'CRAWL_ERROR',
            data: { message }
          }).catch(() => {});
        }
      }
    } catch (e) {}
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

const feedCrawler = new FeedCrawler();

// ─── Message Handler ──────────────────────────────────────────
chrome.runtime.onMessage.addListener((message: Message, sender: chrome.runtime.MessageSender, sendResponse: (response?: MessageResponse) => void) => {
  console.log('[BG] Nhận message:', message.action);

  switch (message.action) {
    case 'getServiceStatus':
      chrome.storage.local.get(['lastProgress'], (res) => {
        sendResponse({
          success: true,
          data: { 
            isConnected: true, 
            isRunning: feedCrawler.isRunning,
            progress: res.lastProgress
          }
        });
      });
      return true; // Bắt buộc return true khi dùng sendResponse bất đồng bộ

    case 'LAUNCH_FROM_APP': {
      const { groups, config } = message.data || {};
      const idMember = config?.idMember || '';

      if (!groups || !Array.isArray(groups) || groups.length === 0) {
        sendResponse({ success: false, error: 'Không có danh sách groups' });
        break;
      }

      // Chạy async, không blocking
      feedCrawler.start(groups, { ...config, idMember }).catch((err: Error) => {
        console.error('[BG] FeedCrawler error:', err);
      });

      sendResponse({
        success: true,
        data: { started: true, totalGroups: groups.length }
      });
      break;
    }

    case 'CRAWL_COMPLETE': {
      // Nhận kết quả từ content script, forward về frontend
      console.log('[BG] CRAWL_COMPLETE:', message.data);
      sendToFrontend('CRAWL_COMPLETE', message.data);
      sendResponse({ success: true });
      break;
    }

    case 'STOP_CRAWL':
      feedCrawler.stop();
      sendResponse({ success: true });
      break;

    default:
      sendResponse({ success: false, error: `Unknown action: ${message.action}` });
  }

  return true;
});

// Gửi message về frontend (app localhost:3000)
function sendToFrontend(action: string, data: any) {
  chrome.tabs.query({}, (tabs) => {
    for (const tab of tabs) {
      if (tab.id && tab.url && (tab.url.includes('localhost:3000') || tab.url.includes('127.0.0.1:3000') || tab.url.includes('seeding.markeeai.com') || tab.url.includes('seeding.zenithglobal.dev'))) {
        chrome.tabs.sendMessage(tab.id, { action, data }).catch(() => {});
      }
    }
  });
}

console.log('[BG] PostFeed Crawler Extension loaded');
