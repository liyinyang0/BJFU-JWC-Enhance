# AGENTS.md

## 项目概述

北京林业大学教务系统增强助手 — Tampermonkey 用户脚本，适配强智科技教务平台。

从 [NJUST-JWC-Enhance](https://github.com/NJUST-OpenLib/NJUST-JWC-Enhance) 派生，适配北京林业大学 (`newjwxt.bjfu.edu.cn`)。

## 技术栈

- 纯 JavaScript (ES2015，通过 esbuild 打包)
- Tampermonkey userscript (`@grant unsafeWindow`)
- 构建工具：esbuild（`src/main.js` → `enhance.js`）
- 目标平台：强智科技教务系统，jQuery 1.6-1.8，DataTables 1.9.4

## 文件结构

```
├── enhance.js         # 构建产物（Tampermonkey 安装文件，勿直接编辑）
├── src/               # 源代码
│   ├── main.js        # 入口，按顺序初始化四个模块
│   ├── config/        # 全局配置
│   │   └── constants.js
│   ├── core/          # 模块一：核心增强
│   │   ├── index.js
│   │   ├── log-panel-ui.js
│   │   ├── logger.js
│   │   ├── ui-utils.js
│   │   ├── page-guard.js
│   │   ├── promo-banner.js
│   │   ├── credit-stats.js
│   │   ├── table-enhancer.js
│   │   └── session-keeper.js
│   ├── eval/          # 模块二：自动评教
│   │   ├── index.js
│   │   ├── constants.js
│   │   ├── utils.js
│   │   ├── log-bridge.js
│   │   ├── css.js
│   │   ├── panel.js
│   │   ├── find-page.js
│   │   ├── list-page.js
│   │   └── edit-page.js
│   ├── course-sort/   # 模块三：选课排序
│   │   └── index.js
│   └── captcha/       # 模块四：验证码识别
│       └── index.js
├── scripts/           # 构建与验证脚本
│   ├── build.js
│   └── verify-bundle.js
├── style.css          # GitHub Pages 样式
├── package.json       # 项目元数据
├── LICENSE            # MIT 协议
├── CLAUDE.md          # 开发文档
└── AGENTS.md          # 本文件
```

## 构建

```bash
npm install
npm run build    # 打包生成 enhance.js
npm run dev      # 监听 src/ 变化自动打包
npm run verify   # 验证构建产物
```

修改请针对 `src/` 目录下的源文件，完成后运行 `npm run build` 重新生成根目录的 `enhance.js`，并一并提交。

## 模块架构

### 模块一：核心增强 (`src/core/`)

- **LogPanelUI** (`log-panel-ui.js`) — 左下角悬浮日志面板，队列化输出，标题栏滚动最新日志
- **Logger** (`logger.js`) — 统一日志系统（控制台 + UI 面板双输出），通过 `window.__BJFU_LOGGER__` 暴露给其他模块
- **强智概念版拦截** (`page-guard.js`) — 检测概念版页面，弹出引导到正确入口
- **学分统计** (`credit-stats.js`) — 按课程性质汇总学分，右上角悬浮窗
- **课程信息增强** (`table-enhancer.js`) — 解析表格 DOM，插入老师说明
- **登录保活** (`session-keeper.js`) — 主框架页每 5 分钟通过隐藏 iframe 刷新 Session
- **初始化入口** (`core/index.js`) — `initCore()` 启动监听、执行页面处理

### 模块二：自动评教 (`src/eval/`)

- FIND 页面 (`find-page.js`) — 扫描评价入口
- LIST 页面 (`list-page.js`) — 课程勾选、状态管理、流水线调度
- EDIT 页面 (`edit-page.js`) — 自动填分策略（找分值差最小的题选次高分，其余全最高分）、保存/提交
- 跨窗口通信 — localStorage 共享状态 + storage 事件驱动
- 手动模式 — 评价页顶部快捷填分工具条

### 模块三：选课排序 (`src/course-sort/`)

- 运行方式：GM 脚本注入 `<script>` 到页面上下文（避免沙箱限制 jQuery/DataTable API 调用）
- 核心机制：拦截 DataTables `fnServerData`，`iDisplayLength=9999` 拉全量 → 本地按 `ctsm`(冲突说明)排序 → 分页切片返回
- 持久性：MutationObserver 监控 + `queryKxkcList` 钩子，表格销毁重建后自动重挂排序

### 模块四：验证码识别 (`src/captcha/`)

- 适用页面：登录页 (`/`)，通过检测 `SafeCodeImg` 元素自动激活
- 识别算法：Canvas 二值化 (阈值150) → 去噪 → 4字符切割 → 像素级模板匹配
- 字符库：`1,2,3,b,c,m,n,v,x,z`（10个字符）
- 自动填入 `RANDOMCODE` 输入框，底部短暂弹窗提示
- 可选配置：`AUTO_LOGIN.username/password/autoLogin`（在模块四源码中修改）
- 换一张时自动重新识别（包装 `ReShowCode` + 监听 `btnTest` 点击）
- 算法来源：[WindrunnerMax/SWVerifyCode](https://github.com/WindrunnerMax/SWVerifyCode)
  - 原作者：Czy (WindRunnerMax) — JS 版验证码识别核心
  - 贡献者：SiHuan (sihuan) — 账号密码自动填充 & 自动登录

### 入口 (`src/main.js`)

按顺序初始化：

1. `initCore()` — 必须先初始化，创建 Logger / LogPanelUI
2. `initEval()` — 根据当前 URL 匹配 `xspj_find.do` / `xspj_list.do` / `xspj_edit.do`
3. `initCourseSort()` — 选课列表页拦截 DataTables
4. `initCaptcha()` — 登录页验证码识别

### URL 路径映射

| 功能 | BFU 路径 |
|------|---------|
| 登录页 | `/` |
| 主页框架 | `/jsxsd/framework/xsMain.jsp` |
| 成绩查询 | `/jsxsd/kscj/cjcx_list` |
| 课表 | `/jsxsd/xskb/xskb_list.do` |
| 选课中心 | `/jsxsd/xsxk/xsxk_index` |
| 选课列表 | `/jsxsd/xsxkkc/comeInGgxxkxk` 等 |
| 评教入口 | `/jsxsd/xspj/xspj_find.do` |
| 登录保活 | `/jsxsd/pyfa/kcdgxz` |

### 数据表格列索引 (BFU)

成绩表（12 列）：课程编号=tds[2], 学分=tds[5], 课程属性=tds[7]

## 待办

- [x] 评教自动保存/提交按钮 ID 在 BFU 需实测确认
  - 已实现健壮性回退检测：先按 ID `bc`/`tj` 查找，再按按钮文字/值、`onclick` 中的 `saveData(...)` 特征查找，并记录页面按钮列表到日志面板便于反馈。
  - 仍需在 BFU 真实评教页实测一次，确认自动保存/提交生效。

## 调试

1. Tampermonkey 中检查脚本是否正确加载（菜单栏图标）
2. 页面右下角日志面板查看 `[北林教务助手]` 日志
3. 模块三排序状态看右上角悬浮徽标
4. 浏览器控制台查看 `[北林教务]` 前缀的日志
