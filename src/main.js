import { initCore } from './core/index.js';
import { initEval } from './eval/index.js';
import { initCourseSort } from './course-sort/index.js';
import { initCaptcha } from './captcha/index.js';

(function () {
    'use strict';

    function runAll() {
        // 1. 核心模块必须先初始化（创建 Logger / LogPanelUI）
        initCore();

        // 2. 其他模块按页面条件初始化
        initEval();
        initCourseSort();
        initCaptcha();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', runAll);
    } else {
        runAll();
    }
})();
