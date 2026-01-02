# Kinda - 交互式学习伴侣

“拒绝无效刷课，从**被动观看**走向**主动掌握**”

## 📖 关于项目 (About)

**Kinda** 是一款拒绝盲目堆砌框架的**轻量级交互式学习工具**。

它利用 **Qwen2.5-VL** 多模态大模型的能力，打破了传统学习“只看不练”的僵局。无论是**复杂的教学视频**还是**冗长的技术文档**，Kinda 都能将其瞬间转化为交互式练习题。

## ⚡️ 设计哲学 (Philosophy)

本项目坚持 **"The Web is the Platform"** 的开发理念：

* 🚫 **Zero Frameworks**: 没有 React，没有 Vue，没有复杂的构建流程。回归 HTML5 + Vanilla JS (ES6+) 的纯粹。
* 🎨 **Tailwind via CDN**: 样式完全通过 Utility Classes 控制，即改即见。
* 🍭 **Catppuccin Themed**: 集成 Catppuccin Latte 配色，提供极度舒适的视觉体验。

## ✨ 核心亮点 (Highlights)

### 1. ☯️ 双模态智能分析 (Dual-Mode Analysis)

Kinda 不挑食，支持两种核心输入模式：

* **📹 视频流深度理解**：直接调用多模态大模型对视频进行端到端分析，识别画面与语音中的知识点。
* **📄 纯文本即时生成**：将技术文档、博客文章或笔记直接粘贴进输入框，AI 即刻提炼重点并生成对应的练习题。

### 2. 🔗 双向锚点交互 (Bi-directional Sync)

视频学习时，体验不再割裂：

* **点击即达**：题目卡片自带“时光机”，点击即可跳转到视频中讲解该知识点的精确秒数。
* **进度感知**：拖动视频进度条，右侧相关的题目会自动高亮，告诉你“现在老师讲的正是这道题”。

### 3. 🎉 情绪价值拉满

学习不该是枯燥的。当你答对题目时，全屏**粒子烟花特效**与专属音效（“真棒！”）会给你即时的正向反馈。

### 4. 📊 学习成果可视化

基于 `html2canvas` 技术，一键生成包含得分、正确率和完成度的**精美学习报告**。不用截屏，直接生成海报分享你的进步。

## 🛠 技术栈 (Tech Stack)

| 领域 | 选型 | 说明 |
| --- | --- | --- |
| **Frontend** | Vanilla JS | 无框架，原生 DOM 操作，极致轻量 |
| **Styling** | Tailwind CSS v3 | 通过 CDN 引入，零编译压力 |
| **Backend** | Express.js | 稳健的 Node.js 服务端框架 |
| **AI Model** | Qwen2.5-VL-72B | 强大的视觉语言模型 (via OpenAI SDK) |
| **Media** | FFmpeg | 视频流预处理辅助 |

## 🚀 快速启动 (Quick Start)

### 1. 环境准备

确保你的系统已安装 **Node.js (v18+)** 和 **pnpm**。
*注意：项目内置了 FFmpeg 自动安装程序，通常无需手动配置系统环境变量。*

### 2. 获取代码

```bash
git clone https://github.com/your-username/kinda.git
cd kinda

```

### 3. 安装依赖

```bash
pnpm install

```

### 4. 配置密钥

在项目根目录下创建一个名为 `api` 的文件（无后缀），填入你的大模型配置：

```properties
apikey=sk-your-api-key-here
baseurl=https://www.sophnet.com/api/open-apis/v1
model=Qwen2.5-VL-72B-Instruct

```



### 5. 启动服务

```bash
pnpm start

```

## 📂 目录结构 (Structure)

```text
Kinda/
├── api                   # [配置] API 密钥文件 (需手动创建)
├── server.js             # [后端] 核心服务入口
├── index.html            # [前端] 单页应用结构
├── js/
│   ├── app.js            # [逻辑] 全局控制器
│   ├── ai.js             # [服务] AI 接口封装 (含视频/文本双通道)
│   └── ui.js             # [视图] UI 渲染与交互
├── assets/               # [资源] 图片与静态资源
└── audio/                # [音频] 交互音效

```

## 🤝 贡献 (Contributing)

我们欢迎任何形式的贡献，特别是对**原生 JS 交互优化**或**新的 Prompt 策略**感兴趣的开发者。

1. Fork 本项目
2. 创建分支 (`git checkout -b feature/CoolFeature`)
3. 提交更改 (`git commit -m 'Add CoolFeature'`)
4. 发起 Pull Request

---

<div align="center">
<p>Made with ❤️ by Kinda Team</p>
</div>