# 北京林业大学教务系统增强助手

> 🧩 让教务系统更顺手的浏览器脚本 | 基于强智科技教务平台 | 适配北京林业大学

从 [NJUST-JWC-Enhance](https://github.com/NJUST-OpenLib/NJUST-JWC-Enhance) 派生，为北京林业大学教务系统 (`newjwxt.bjfu.edu.cn`) 适配。

## ✨ 功能

- 📊 **学分统计** — 成绩页右上角弹窗，按课程性质汇总
- 🎯 **一键评教** — 自动填分、批量保存、批量提交
- 📋 **选课智能排序** — 可选课程置顶，冲突课程沉底，筛选后自动重排
- 🔄 **登录保活** — 自动刷新 Session，减少掉线
- 🚪 **概念版引导** — 检测到强智概念版时弹出正确入口

## 🚀 安装

### 1. 安装 Tampermonkey

[Chrome 商店](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo) · [Edge 商店](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd)

### 2. 安装脚本

法一:打开 Tampermonkey → 创建新脚本 → 将 `enhance.js` 全部内容粘贴 → 保存。

法二:下载“enhance.js”>拖拽进Tampermonkey界面>确定安装。

### 3. 使用

访问 [北林新教务系统](http://newjwxt.bjfu.edu.cn/)，登录后脚本自动生效。右下角悬浮面板显示运行状态。

## 📁 项目结构

```
├── enhance.js         # 主脚本
├── style.css          # GitHub Pages 样式
├── package.json       # 项目元数据
├── LICENSE            # MIT 协议
└── CLAUDE.md          # 本文件
```

## ⚠️ 注意事项

- 本脚本完全开源，不对可靠性做任何保证
- 不会修改服务器数据，关闭插件即恢复原状
- 所有功能均在本地执行，不会上传或收集任何信息
- 部分功能可能随教务系统更新而失效

## 📄 License

MIT License — 详见 [LICENSE](./LICENSE)

本项目派生自 [NJUST-OpenLib/NJUST-JWC-Enhance](https://github.com/NJUST-OpenLib/NJUST-JWC-Enhance)，遵循相同协议。
