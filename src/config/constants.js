/**
 * 全局配置选项
 */
export const UI_CONFIG = {
    showNotifications: true // 是否允许弹出系统级通知（目前主要通过 LogPanel 反馈）
};

/**
 * 调试系统配置
 * enabled: 开启后会向控制台和日志面板输出详细过程
 * level: 4(DEBUG), 3(INFO), 2(WARN), 1(ERROR)
 */
export const DEBUG_CONFIG = {
    enabled: true,
    level: 3
};

/**
 * 本项目仓库地址
 * 统一引用入口，避免散落多处后失同步（脚本内 UI、@supportURL 等均指向此处）
 */
export const PROJECT_URL = 'https://github.com/liyinyang0/BJFU-JWC-Enhance';
