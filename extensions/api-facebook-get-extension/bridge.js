// bridge.js - Cầu nối giao tiếp giữa React Frontend và Background của Extension API MỚI

// Save the current backend URL to storage so popup.js and background.js
// can read it instead of using hardcoded production URL.
chrome.storage.local.set({ api_base_url: window.location.origin });

window.addEventListener('message', (event) => {
    if (event.source !== window) return;

    if (event.data && event.data.type === 'API_LAUNCH_FROM_APP') {
        const groups = event.data.data.groups;
        const config = event.data.data.config;
        
        chrome.runtime.sendMessage({
            action: 'START_AUTO_CRAWL',
            groups: groups,
            config: config
        }, (response) => {
            window.postMessage({ type: 'API_LAUNCH_FROM_APP_RESULT', success: true }, '*');
        });
    }

    if (event.data && event.data.type === 'API_STOP_CRAWL') {
        chrome.runtime.sendMessage({ action: 'STOP_AUTO_CRAWL' });
    }

    if (event.data && event.data.type === 'API_MARKEE_FB_PING') {
        window.postMessage({ type: 'API_MARKEE_FB_PONG', installed: true, isRunning: false }, '*');
    }
});

chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === 'FRONTEND_LOG') {
        window.postMessage({ 
            type: 'API_CRAWL_LOG', 
            level: msg.level || 'info',
            message: msg.message 
        }, '*');
    }
    
    if (msg.action === 'FRONTEND_PROGRESS') {
        window.postMessage({ 
            type: 'API_CRAWL_PROGRESS', 
            groupIndex: msg.groupIndex,
            totalGroups: msg.totalGroups
        }, '*');
    }

    if (msg.action === 'FRONTEND_DONE') {
        window.postMessage({ 
            type: 'API_CRAWL_DONE',
            totalGroups: msg.totalGroups,
            totalPosts: msg.totalPosts
        }, '*');
    }
});

window.postMessage({ type: 'API_MARKEE_FB_PONG', installed: true, isRunning: false }, '*');
window.postMessage({ type: 'API_MARKEE_FB_EXTENSION_READY' }, '*');
