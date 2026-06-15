# 北京林业大学教务系统增强助手

> 🧩 让教务系统更顺手的浏览器脚本 | 基于强智科技教务平台 | 适配北京林业大学

从 [NJUST-JWC-Enhance](https://github.com/NJUST-OpenLib/NJUST-JWC-Enhance) 派生，为北京林业大学教务系统（`newjwxt.bjfu.edu.cn`）适配。

## ✨ 功能

- 📊 **学分统计** — 成绩页右上角弹窗，按课程性质汇总学分与门数
- 🎯 **一键评教** — 自动填分、批量保存、批量提交，同时提供手动模式快捷工具条
- 📋 **选课智能排序** — 可选课程置顶，冲突课程沉底，筛选后自动重排
- 🔄 **登录保活** — 主框架页定时通过隐藏 iframe 刷新 Session，减少掉线
- 🚪 **概念版引导** — 检测到强智科技教务系统概念版时弹出正确登录入口
- 🔐 **验证码识别（可选）** — 登录页自动识别验证码并填入，可在源码中配置自动登录

## 🚀 安装与使用

1. 安装 [Tampermonkey](https://www.tampermonkey.net/) 扩展。
2. 从 Greasy Fork 安装本脚本。
3. 访问 [北林新教务系统](http://newjwxt.bjfu.edu.cn/) 并登录，脚本自动生效。
4. 页面右下角悬浮日志面板显示运行状态。

## ⚠️ 注意事项

- 本脚本完全开源，不对可靠性做任何保证。
- 不会修改服务器数据，关闭插件即恢复原状。
- 所有功能均在本地执行，不会上传或收集任何信息。
- 部分功能可能随教务系统更新而失效，请通过 GitHub 反馈。

## 📄 License

MIT License — 详见 [LICENSE](./LICENSE)。

本项目派生自 [NJUST-OpenLib/NJUST-JWC-Enhance](https://github.com/NJUST-OpenLib/NJUST-JWC-Enhance)，遵循相同协议。
