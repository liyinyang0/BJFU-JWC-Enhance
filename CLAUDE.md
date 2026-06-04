# CLAUDE.md

## 项目概述

北京林业大学教务系统增强助手 — Tampermonkey 用户脚本，适配强智科技教务平台。

从 [NJUST-JWC-Enhance](https://github.com/NJUST-OpenLib/NJUST-JWC-Enhance) 派生，适配北京林业大学 (`newjwxt.bjfu.edu.cn`)。

## 技术栈

- 纯 JavaScript (ES5 兼容，无构建工具)
- Tampermonkey userscript (`@grant GM_xmlhttpRequest`, `@grant unsafeWindow`)
- 目标平台：强智科技教务系统，jQuery 1.6-1.8，DataTables 1.9.4

## 文件结构

```
├── enhance.js         # 主脚本（三个模块）
├── getKCDG.js         # 课程大纲数据采集脚本（独立运行）
├── data/              # JSON 数据文件
│   ├── xxk.json       # 选修课分类映射
│   └── kcdg.json      # 课程大纲 ID 映射
├── tools/             # 网页工具
│   ├── index.html     # 工具导航
│   ├── csv2json.html  # CSV 转 JSON
│   └── xxk.html       # 选修课分类采集
├── style.css          # GitHub Pages 样式
├── package.json       # 项目元数据
├── LICENSE            # MIT 协议
└── CLAUDE.md          # 本文件
```

## enhance.js 架构

> **读取策略**：文件约 2600 行，修改时不要全量读取。用 `Grep` 定位目标模块的边界注释，再用 `Read offset=X limit=Y` 仅读取需要的段落。

### 行号索引

| 模块 | 行号 | 边界定位标记 |
|------|------|-------------|
| UserScript 头 | L1–L14 | `// ==UserScript==` … `// ==/UserScript==` |
| 模块一：核心增强 | L16–L1330 | `【模块一】核心增强功能模块` |
| 模块二：自动评教 | L1332–L2048 | `【模块二】自动评教助手 V1` |
| 模块三：选课排序 | L2051–L2307 | `【模块三】选课列表智能排序` |
| 模块四：验证码识别 | L2309–L2609 | `【模块四】登录页验证码自动识别` |

### 模块一：核心增强 (L16–L1330)

- **LogPanelUI** (L83–L245) — 左下角悬浮日志面板，队列化输出，标题栏滚动最新日志
- **Logger** (L251–L289) — 统一日志系统（控制台 + UI 面板双输出），通过 `window.__BJFU_LOGGER__` 暴露给其他模块
- **CacheManager** (L295–L391) — localStorage 缓存，TTL 86400s
- **课程信息增强** (L1006–L1123) — 解析表格 DOM，插入选修课类别标签、课程大纲链接、老师说明
- **学分统计** (L820–L1000) — 按课程属性/类别汇总学分，右上角悬浮窗
- **登录保活** (L1129–L1225) — 主框架页每 5 分钟通过隐藏 iframe 刷新 Session
- **强智概念版拦截** (L606–L656) — 检测概念版页面，弹出引导到正确入口
- **初始化入口** (L1230–L1326) — `init()` 异步加载数据、构建映射、启监听

### 模块二：自动评教 (L1332–L2048)

- FIND 页面 (`xspj_find.do`, L1654–L1733) — 扫描评价入口
- LIST 页面 (`xspj_list.do`, L1736–L1900) — 课程勾选、状态管理、流水线调度
- EDIT 页面 (`xspj_edit.do`, L1902–L2047) — 自动填分策略（找分值差最小的题选次高分，其余全最高分）、保存/提交
- 跨窗口通信 — localStorage 共享状态 + storage 事件驱动
- 手动模式 — 评价页顶部快捷填分工具条

### 模块三：选课排序 (L2051–L2307)

- 运行方式：GM 脚本注入 `<script>` 到页面上下文（避免沙箱限制 jQuery/DataTable API 调用）
- 核心机制：拦截 DataTables `fnServerData`，`iDisplayLength=9999` 拉全量 → 本地按 `ctsm`(冲突说明)排序 → 分页切片返回
- 持久性：MutationObserver 监控 + `queryKxkcList` 钩子，表格销毁重建后自动重挂排序

### 模块四：验证码识别 (L2309–L2609)

- 适用页面：登录页 (`/`)，通过检测 `SafeCodeImg` 元素自动激活
- 识别算法：Canvas 二值化 (阈值150) → 去噪 → 4字符切割 → 像素级模板匹配
- 字符库：`1,2,3,b,c,m,n,v,x,z`（10个字符）
- 自动填入 `RANDOMCODE` 输入框，底部短暂弹窗提示
- 可选配置：`AUTO_LOGIN.username/password/autoLogin`（在模块四源码中修改）
- 换一张时自动重新识别（包装 `ReShowCode` + 监听 `btnTest` 点击）
- 算法来源：[WindrunnerMax/SWVerifyCode](https://github.com/WindrunnerMax/SWVerifyCode)
  - 原作者：Czy (WindRunnerMax) — JS 版验证码识别核心
  - 贡献者：SiHuan (sihuan) — 账号密码自动填充 & 自动登录

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

成绩表（12 列）：课程编号=tds[2], 学分=tds[5], 课程属性=tds[7], 课程分类=tds[10]

## 待办

- [ ] 为北林课程重新采集 `data/xxk.json` 和 `data/kcdg.json`
- [ ] 确认 BFU 课程大纲系统 (`kcxxAction.do`) 是否可用
- [ ] 评教自动保存/提交按钮 ID 在 BFU 需实测确认

## 调试

1. Tampermonkey 中检查脚本是否正确加载（菜单栏图标）
2. 页面右下角日志面板查看 `[北林教务助手]` 日志
3. 模块三排序状态看右上角悬浮徽标
4. 浏览器控制台查看 `[北林教务]` 前缀的日志
