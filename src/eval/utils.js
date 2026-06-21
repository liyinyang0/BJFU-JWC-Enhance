import {
    KEY_STORE, KEY_QUEUE, KEY_SUBQUEUE,
    PARAM_AUTO, PARAM_SUBMIT
} from './constants.js';

// HTML 转义防止 XSS
export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// 解析 URL 参数
function escapeRegExp(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function qp(url, key) {
    try { return new URL(url, location.origin).searchParams.get(key) || ''; }
    catch { return url.match(new RegExp(`[?&]${escapeRegExp(key)}=([^&]+)`))?.[1] || ''; }
}

// 生成课程唯一 Key
export function courseKey(url) {
    const cid = qp(url, 'jx02id'), tid = qp(url, 'jg0101id');
    return cid && tid ? `${cid}__${tid}` : null;
}

export function appendParam(url, key, val) {
    return url + (url.includes('?') ? '&' : '?') + encodeURIComponent(key) + '=' + encodeURIComponent(val);
}

export function withAuto(url, val) { return appendParam(url, PARAM_AUTO, val); }
export function withSubmit(url) { return appendParam(url, PARAM_SUBMIT, 'true'); }
export function roundFloat(n) { return Math.round(n * 1e9) / 1e9; }

function safeJsonParse(raw, fallback) {
    try { return JSON.parse(raw || fallback); }
    catch (e) {
        const logger = window.__BJFU_LOGGER__;
        if (logger) logger.warn('[评教] localStorage 解析失败，已重置', e);
        else console.warn('[评教] localStorage 解析失败，已重置', e);
        return JSON.parse(fallback);
    }
}

// LocalStorage 快捷访问
export function loadStore() { return safeJsonParse(localStorage.getItem(KEY_STORE), '{}'); }
export function saveStore(v) { localStorage.setItem(KEY_STORE, JSON.stringify(v)); }
export function loadQueue() { return safeJsonParse(localStorage.getItem(KEY_QUEUE), '[]'); }
export function saveQueue(q) { localStorage.setItem(KEY_QUEUE, JSON.stringify(q)); }
export function loadSubQueue() { return safeJsonParse(localStorage.getItem(KEY_SUBQUEUE), '[]'); }
export function saveSubQueue(q) { localStorage.setItem(KEY_SUBQUEUE, JSON.stringify(q)); }

export function renderStoragePanel() {
    const el = document.getElementById('v80-storage-pre');
    if (el) el.textContent = JSON.stringify(loadStore(), null, 2);
}
