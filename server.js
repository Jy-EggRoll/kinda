require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');

// --- 1. FFmpeg & FFprobe 自动路径配置 ---
try {
    const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
    ffmpeg.setFfmpegPath(ffmpegPath);

    // ✅ 新增：配置 ffprobe 路径 (解决 "Cannot find ffprobe" 报错)
    const ffprobePath = require('@ffprobe-installer/ffprobe').path;
    ffmpeg.setFfprobePath(ffprobePath);
} catch (e) {
    console.warn("未检测到自动安装的二进制文件，尝试使用系统路径...", e.message);
}

// ✅ 修复：使用原生 crypto 替代 uuid 包
const { randomUUID: uuidv4 } = require('crypto');
const cors = require('cors');
const OpenAI = require('openai');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
// 增加 JSON 大小限制 (为了传图片 Base64)
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, '.')));

const upload = multer({ dest: 'uploads/' });

// --- 2. 配置文件加载 ---
function loadApiConfig() {
    const apiPath = path.join(__dirname, 'api');
    const config = {
        key: process.env.API_KEY || '',
        baseUrl: 'https://www.sophnet.com/api/open-apis/v1',
        // 使用多模态模型 (视觉理解)
        model: 'Qwen2.5-VL-72B-Instruct',
    };

    if (fs.existsSync(apiPath)) {
        try {
            const raw = fs.readFileSync(apiPath, 'utf8');
            const keyMatch = raw.match(/apikey\s*[:=]\s*(\S+)/i);
            const baseMatch = raw.match(/base[_-]?url\s*[:=]\s*["\']?([^"'\s,]+)["\']?/i);
            const modelMatch = raw.match(/model\s*[:=]\s*["\']?([^"'\s,]+)["\']?/i);

            if (keyMatch) config.key = keyMatch[1].trim();
            if (baseMatch) config.baseUrl = baseMatch[1].trim();
            if (modelMatch) config.model = modelMatch[1].trim();
        } catch (err) {
            console.error("Error reading 'api' file:", err);
        }
    }
    return config;
}

const apiConfig = loadApiConfig();

// 最小改动：同时加载 `api_base` 与 `api_video`（若存在），并创建两个客户端
function loadApiFile(filename, defaults) {
    const p = path.join(__dirname, filename);
    const cfg = Object.assign({}, defaults);
    if (!fs.existsSync(p)) return cfg;
    try {
        const raw = fs.readFileSync(p, 'utf8');
        const keyMatch = raw.match(/apikey\s*[:=]\s*(\S+)/i);
        const baseMatch = raw.match(/base[_-]?url\s*[:=]\s*["']?([^"'\s,]+)["']?/i);
        const modelMatch = raw.match(/model\s*[:=]\s*["']?([^"'\s,]+)["']?/i);
        if (keyMatch) cfg.key = keyMatch[1].trim();
        if (baseMatch) cfg.baseUrl = baseMatch[1].trim();
        if (modelMatch) cfg.model = modelMatch[1].trim();
    } catch (e) {
        console.error(`读取 ${filename} 失败:`, e.message);
    }
    return cfg;
}

const defaultBase = { key: process.env.API_KEY || '', baseUrl: 'https://www.sophnet.com/api/open-apis/v1', model: 'DeepSeek-V3.2' };
const defaultVideo = { key: process.env.API_KEY || '', baseUrl: 'https://www.sophnet.com/api/open-apis/v1', model: 'Qwen2.5-VL-72B-Instruct' };

const baseConfig = loadApiFile('api_base', defaultBase);
const videoConfig = loadApiFile('api_video', defaultVideo);

const clientBase = new OpenAI({ apiKey: baseConfig.key, baseURL: baseConfig.baseUrl });
const clientVideo = new OpenAI({ apiKey: videoConfig.key, baseURL: videoConfig.baseUrl });

const tasks = {};

// --- 3. 核心工具：视频截帧 ---
const extractFrames = (videoPath, outputDir, count = 4) => {
    return new Promise((resolve, reject) => {
        // 这一步现在应该能正常工作了 (ffprobe 已就绪)
        ffmpeg.ffprobe(videoPath, (err, metadata) => {
            if (err) return reject(err);

            const duration = metadata.format.duration;
            // 均匀截取 4 张图
            const interval = duration / (count + 1);
            const timestamps = Array.from({ length: count }, (_, i) => (i + 1) * interval);
            const screenshots = [];

            let completed = 0;

            timestamps.forEach((time, index) => {
                const filename = `frame_${path.basename(videoPath)}_${index}.jpg`;
                const outputPath = path.join(outputDir, filename);

                ffmpeg(videoPath)
                    .screenshots({
                        timestamps: [time],
                        filename: filename,
                        folder: outputDir,
                        size: '800x?' // 限制宽800，高自适应
                    })
                    .on('end', () => {
                        screenshots.push(outputPath);
                        completed++;
                        if (completed === count) resolve(screenshots);
                    })
                    .on('error', (err) => {
                        console.error("截图失败:", err);
                        reject(err);
                    });
            });
        });
    });
};

// 辅助：文件转 Base64
const fileToBase64 = (filePath) => {
    const bitmap = fs.readFileSync(filePath);
    return Buffer.from(bitmap).toString('base64');
};

// --- 4. 核心流程：视觉分析 ---
async function processVideoTask(taskId, videoPath) {
    const task = tasks[taskId];
    const framePaths = [];

    try {
        // 步骤 1: 截取关键帧
        task.message = '正在分析视频画面 (截取关键帧)...';
        console.log(`开始处理视频: ${videoPath}`);

        const frames = await extractFrames(videoPath, 'uploads/', 4);
        framePaths.push(...frames);
        task.progress = 40;

        // 步骤 2: 构造多模态请求 (使用 video 配置)
        task.message = `AI 正在观看视频 (${videoConfig.model})...`;
        console.log(`调用模型: ${videoConfig.model}`);

        const content = [
            { type: "text", text: "这是视频课程的 4 张关键截图。请根据截图中的 PPT、板书或画面内容，提取核心知识点，并生成 3-5 道互动练习题。" }
        ];

        frames.forEach(framePath => {
            const base64Image = fileToBase64(framePath);
            content.push({
                type: "image_url",
                image_url: {
                    url: `data:image/jpeg;base64,${base64Image}`
                }
            });
        });

        const systemPrompt = `
You are an educational AI assistant. Analyze the provided video frames and generate learning cards.
Strictly return ONLY valid JSON array. No markdown.
Schema: [{"type": "choice"|"boolean"|"fill", "question": "...", "options": ["A","B"], "correctIndex": 0, "explanation": "..."}]
        `;

        const completion = await clientVideo.chat.completions.create({
            model: videoConfig.model,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: content }
            ],
            max_tokens: 2000
        });

        task.progress = 80;

        // 步骤 3: 解析结果
        task.message = '正在生成卡片...';
        const responseContent = completion.choices[0].message.content;
        const clean = responseContent.replace(/```json/gi, '').replace(/```/g, '').trim();

        let cards;
        try {
            cards = JSON.parse(clean);
        } catch (e) {
            const match = clean.match(/\[.*\]/s);
            if (match) cards = JSON.parse(match[0]);
            else throw new Error("JSON 解析失败");
        }

        task.progress = 100;
        task.status = 'completed';
        task.result = cards;

    } catch (error) {
        console.error(`Task ${taskId} failed:`, error);
        task.status = 'failed';
        task.error = error.message || "Unknown Error";
    } finally {
        // 清理
        if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath);
        framePaths.forEach(p => {
            if (fs.existsSync(p)) fs.unlinkSync(p);
        });
    }
}

// --- 5. 路由 ---
app.post('/api/upload-video', upload.single('video'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No video file" });
    const taskId = uuidv4();
    tasks[taskId] = { status: 'processing', progress: 0, message: 'Starting...', startTime: Date.now() };
    res.json({ taskId });
    processVideoTask(taskId, req.file.path);
});

app.get('/api/task/:id', (req, res) => {
    const task = tasks[req.params.id];
    if (!task) return res.status(404).json({ error: "Task not found" });
    res.json(task);
});

app.post('/api/generate', async (req, res) => {
    try {
        const completion = await clientBase.chat.completions.create({
            model: baseConfig.model,
            messages: [{ role: "user", content: req.body.text || '' }]
        });

        const responseContent = completion.choices?.[0]?.message?.content || '';
        try {
            const clean = responseContent.replace(/```json/gi, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(clean);
            return res.json(parsed);
        } catch (e) {
            return res.json({ text: responseContent });
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});