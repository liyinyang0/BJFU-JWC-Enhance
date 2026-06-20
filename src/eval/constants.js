// 存储键名，用于跨页面同步状态
export const KEY_STORE = 'bjfu_eval_v1_store';
export const KEY_RUNNING = 'bjfu_eval_running';
export const KEY_BUSY = 'bjfu_eval_busy';
export const KEY_QUEUE = 'bjfu_eval_queue';
export const KEY_CURLIST = 'bjfu_eval_curlist';
export const KEY_LOG = 'bjfu_eval_log';
export const KEY_LOGLVL = 'bjfu_eval_loglvl';
export const KEY_SUBQUEUE = 'bjfu_eval_subqueue';
export const KEY_SUBRUN = 'bjfu_eval_subrun';
export const KEY_SUBBSY = 'bjfu_eval_subbsy';

// URL 参数
export const PARAM_AUTO = 'isAutoEval';
export const PARAM_SUBMIT = 'isAutoSubmit';

// 日志最大保留条数
export const MAX_LOG = 300;

// 日志级别
export const LOG_LEVELS = { debug: 0, info: 1, success: 2, warn: 3, error: 4 };
export const LOG_LABELS = { debug: 'DBG', info: 'INF', success: 'OK ', warn: 'WRN', error: 'ERR' };
export const LOG_ICONS = { debug: '🔍', info: 'ℹ️', success: '✅', warn: '⚠️', error: '❌' };
