# Tracky - 专业追踪记录小助手 🚀

[English](#english) | [简体中文](#简体中文)

---

<div id="简体中文"></div>

## 简介

**Tracky** 是一款专为 **开发者 (Dev)**、**QA 测试人员** 和 **产品经理 (PM)** 设计的轻量级浏览器插件。

与传统录屏工具不同，Tracky 利用 [rrweb](https://github.com/rrweb-io/rrweb) 技术，录制的不是沉重的视频文件，而是网页的 **DOM 变更序列**。这意味着你可以以极小的存储代价，换取像素级的 1:1 还原回放，并支持在回放中直接审查元素、缩放、调整进度。

### 核心价值

-   **告别沉重的录屏文件**：不再需要上传数百 MB 的 MP4 文件。
-   **100% 还原复现**：记录所有点击、滚动、输入、甚至是 Canvas 动画（支持 AntV G6 等）。
-   **一键导出，随处查看**：导出为自包含的 HTML 报告，无需安装任何播放器即可在浏览器中查看。

## 主要功能

-   **轻量化录制**：基于 DOM 快照与变更记录，文件极小，传输极快。
-   **交互式回放**：内置 rrweb-player，支持暂停、加速、拖拽进度条。
-   **侧边悬浮控制台**：
    -   垂直侧边吸附，不干扰正常页面操作。
    -   支持上下拖拽位置。
    -   纯净 UI，仅保留最核心的“录制”与“导出”。
-   **Canvas 支持**：完美捕捉复杂的图表和可视化绘制过程。
-   **自包含 HTML 导出**：导出的结果是一个独立的网页，集成了播放器和录制数据。

## 使用场景

1.  **Bug 复现 (QA)**：在发现 Bug 时开启录制，将导出的 HTML 报告直接附件到 Jira 或 GitHub Issue 中。
2.  **代码评审 (Dev)**：在演示新功能或交互逻辑时，发送一个 Tracky 记录比视频更清晰且体积更小。
3.  **产品演示 (PM)**：快速记录产品原型及用户路径，方便分享给利益相关者。

## 如何使用

1.  **安装**：
    -   下载此仓库或 Release 包。
    -   打开 Chrome/Edge 扩展程序 (chrome://extensions)。
    -   开启“开发者模式”。
    -   点击“加载已解压的扩展程序”，选择 `tracky` 文件夹。
2.  **录制**：
    -   在页面右侧悬浮窗中点击蓝色按钮 (录制图标) 开始。
    -   在页面上执行你的操作。
3.  **导出**：
    -   再次点击红色按钮 (停止图标) 停止录制。
    -   点击绿色按钮 (下载图标) 导出 HTML 报告。
4.  **回放**：
    -   打开下载到本地的 `.html` 文件即可立即查看。

---

<div id="english"></div>

## Introduction (English Version)

**Tracky** is a lightweight browser extension designed specifically for **Developers**, **QA Testers**, and **Product Managers**.

Unlike traditional screen recording tools, Tracky leverages [rrweb](https://github.com/rrweb-io/rrweb) technology to capture the **sequence of DOM mutations** rather than heavy video frames. This results in tiny file sizes while providing pixel-perfect, 1:1 fidelity replays that allow for element inspection and interaction during playback.

### Core Highlights

-   **Zero Video Burden**: Ditch massive MP4 files for minimal text-based snapshots.
-   **Total Reproduction**: Record every click, scroll, input, and even Canvas animations (e.g., AntV G6).
-   **Self-contained Export**: Generate standalone HTML reports that play back in any browser without extra dependencies.

## Key Features

-   **Ultra-light Recording**: Text-based event sequences for maximum efficiency.
-   **Interactive Player**: Built-in player with pause, speed control, and seeking.
-   **Side-anchored UI**: Minimalist console docked to the right edge, vertically draggable.
-   **Canvas Support**: Captures visualization libraries and complex drawing logic.
-   **Standalone HTML**: Export reports that bundle the player and data together.

## Tech Stack

-   [rrweb](https://github.com/rrweb-io/rrweb) (The core recording engine)
-   Chrome Extension Manifest V3
-   Vanilla JS & CSS (Fast & Native performance)

## License

[MIT](LICENSE)
