import { Logger } from '../core/logger.js';
import { MAX_LOG, KEY_LOG } from './constants.js';

export function clearLogs() { localStorage.removeItem(KEY_LOG); renderLogPanel(); }

export function renderLogPanel() {
    // 日志统一显示在模块一的 LogPanelUI 中
}

export function pushLog(msg, level = 'info') {
    const logs = JSON.parse(localStorage.getItem(KEY_LOG) || '[]');
    logs.push({ ts: new Date().toTimeString().slice(0, 8), msg, level });
    if (logs.length > MAX_LOG) logs.splice(0, logs.length - MAX_LOG);
    localStorage.setItem(KEY_LOG, JSON.stringify(logs));
    renderLogPanel();

    const levelMap = { debug: 4, info: 3, success: 3, warn: 2, error: 1 };
    const loggerLevel = levelMap[level] || 3;
    Logger.log(loggerLevel, `[评教] ${msg}`);
}

export const logInfo = (m) => pushLog(m, 'info');
export const logSuccess = (m) => pushLog(m, 'success');
export const logError = (m) => pushLog(m, 'error');
