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

**推荐（自动更新）**：从 Greasy Fork 一键安装  
👉 [北林教务增强助手 V1 \| 支持自动评教](https://greasyfork.org/zh-CN/scripts/582855-%E5%8C%97%E6%9E%97%E6%95%99%E5%8A%A1%E5%A2%9E%E5%BC%BA%E5%8A%A9%E6%89%8B-v1-%E6%94%AF%E6%8C%81%E8%87%AA%E5%8A%A8%E8%AF%84%E6%95%99)

其他方式：

- 法一：打开 Tampermonkey → 创建新脚本 → 将 `enhance.js` 全部内容粘贴 → 保存。
- 法二：下载 `enhance.js` → 拖拽进 Tampermonkey 界面 → 确定安装。

### 3. 使用

访问 [北林新教务系统](http://newjwxt.bjfu.edu.cn/)，登录后脚本自动生效。右下角悬浮面板显示运行状态。

## 📁 项目结构

```
├── enhance.js         # 构建产物（Tampermonkey 安装文件，勿直接编辑）
├── src/               # 源代码
│   ├── main.js        # 入口，按顺序初始化四个模块
│   ├── config/        # 全局配置
│   ├── core/          # 模块一：核心增强（日志、学分统计、登录保活等）
│   ├── eval/          # 模块二：自动评教
│   ├── course-sort/   # 模块三：选课排序
│   └── captcha/       # 模块四：验证码识别
├── scripts/           # 构建与验证脚本
│   ├── build.js       # esbuild 打包
│   └── verify-bundle.js
├── style.css          # GitHub Pages 样式
├── package.json       # 项目元数据
├── LICENSE            # MIT 协议
└── CLAUDE.md          # 开发文档
```

## 🛠 开发

```bash
npm install
npm run build    # 打包生成 enhance.js
npm run dev      # 监听 src/ 变化自动打包
npm run verify   # 验证构建产物
```

修改请针对 `src/` 目录下的源文件，完成后运行 `npm run build` 重新生成根目录的 `enhance.js`，并一并提交。

## ⚠️ 注意事项

- 本脚本完全开源，不对可靠性做任何保证
- 不会修改服务器数据，关闭插件即恢复原状
- 所有功能均在本地执行，不会上传或收集任何信息
- 部分功能可能随教务系统更新而失效

## 📄 License

MIT License — 详见 [LICENSE](./LICENSE)

本项目派生自 [NJUST-OpenLib/NJUST-JWC-Enhance](https://github.com/NJUST-OpenLib/NJUST-JWC-Enhance)，遵循相同协议。
