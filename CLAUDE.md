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

### 模块一：核心增强

- **LogPanelUI** — 左下角悬浮日志面板，队列化输出，标题栏滚动最新日志
- **Logger** — 统一日志系统（控制台 + UI 面板双输出）
- **CacheManager** — localStorage 缓存，TTL 86400s
- **课程信息增强** — 解析表格 DOM，插入选修课类别标签、课程大纲链接、老师说明
- **学分统计** — 按课程属性/类别汇总学分，右上角悬浮窗
- **登录保活** — 主框架页每 5 分钟通过隐藏 iframe 刷新 Session
- **强智概念版拦截** — 检测概念版页面，弹出引导到正确入口

### 模块二：自动评教

- FIND 页面 (`xspj_find.do`) — 扫描评价入口
- LIST 页面 (`xspj_list.do`) — 课程勾选、状态管理、流水线调度
- EDIT 页面 (`xspj_edit.do`) — 自动填分策略（找分值差最小的题选次高分，其余全最高分）、保存/提交
- 跨窗口通信 — localStorage 共享状态 + storage 事件驱动
- 手动模式 — 评价页顶部快捷填分工具条

### 模块三：选课排序

- 运行方式：GM 脚本注入 `<script>` 到页面上下文（避免沙箱限制 jQuery/DataTable API 调用）
- 核心机制：拦截 DataTables `fnServerData`，`iDisplayLength=9999` 拉全量 → 本地按 `ctsm`(冲突说明)排序 → 分页切片返回
- 持久性：MutationObserver 监控 + `queryKxkcList` 钩子，表格销毁重建后自动重挂排序
- 数据完整性：`kxkcHandleData()` 处理原始数据以生成操作列 HTML

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
