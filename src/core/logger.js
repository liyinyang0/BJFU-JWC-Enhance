import { DEBUG_CONFIG } from '../config/constants.js';
import { LogPanelUI } from './log-panel-ui.js';

/**
 * 统一的日志入口，负责格式化输出并同步到 LogPanelUI。
 */
export const Logger = {
    LEVELS: { ERROR: 1, WARN: 2, INFO: 3, DEBUG: 4 },

    log(level, message, ...args) {
        if (!DEBUG_CONFIG.enabled || level > DEBUG_CONFIG.level) return;

        const timestamp = new Date().toLocaleTimeString();
        const levelNames = ['', 'error', 'warn', 'info', 'debug'];
        const lvlName = levelNames[level] || 'info';

        console.log(`[${timestamp}] [北林教务助手]`, message, ...args);

        let displayMessage = message;
        if (args.length > 0) {
            const formattedArgs = args.map(arg => {
                if (typeof arg === 'object' && arg !== null) {
                    try {
                        return JSON.stringify(arg, null, 1)
                            .replace(/^{|}$/g, '')
                            .replace(/"/g, '')
                            .replace(/\n/g, ' ');
                    } catch (e) { return '[Object]'; }
                }
                return String(arg);
            }).join(' ');
            displayMessage += ' ' + formattedArgs;
        }

        LogPanelUI.add(lvlName, displayMessage);
    },

    error(message, ...args) { this.log(this.LEVELS.ERROR, message, ...args); },
    warn(message, ...args) { this.log(this.LEVELS.WARN, message, ...args); },
    info(message, ...args) { this.log(this.LEVELS.INFO, message, ...args); },
    debug(message, ...args) { this.log(this.LEVELS.DEBUG, message, ...args); }
};
