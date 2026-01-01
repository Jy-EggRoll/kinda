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
    const ffprobePath = require('@ffprobe-installer/ffprobe').path;
    ffmpeg.setFfprobePath(ffprobePath);
} catch (e) {
    console.warn("未检测到自动安装的二进制文件，尝试使用系统路径...", e.message);
}

const { randomUUID: uuidv4 } = require('crypto');
const cors = require('cors');
const OpenAI = require('openai');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, '.')));

const upload = multer({ dest: 'uploads/' });

// --- 2. 配置文件加载 ---
function loadApiConfig() {
    const apiPath = path.join(__dirname, 'api');
    const config = {
        key: process.env.API_KEY || '',
        baseUrl: 'https://www.sophnet.com/api/open-apis/v1',
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

const client = new OpenAI({
    apiKey: apiConfig.key,
    baseURL: apiConfig.baseUrl
});

const tasks = {};

// --- 3. 核心工具：视频截帧 (修改版：返回时间戳) ---
const extractFrames = (videoPath, outputDir, count = 4) => {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(videoPath, (err, metadata) => {
            if (err) return reject(err);

            const duration = metadata.format.duration;
            const interval = duration / (count + 1);
            // 记录每一帧的具体时间点
            const frameData = Array.from({ length: count }, (_, i) => {
                return {
                    time: (i + 1) * interval,
                    index: i
                };
            });

            const results = [];
            let completed = 0;

            frameData.forEach((item) => {
                const filename = `frame_${path.basename(videoPath)}_${item.index}.jpg`;
                const outputPath = path.join(outputDir, filename);

                ffmpeg(videoPath)
                    .screenshots({
                        timestamps: [item.time],
                        filename: filename,
                        folder: outputDir,
                        size: '800x?'
                    })
                    .on('end', () => {
                        results.push({
                            path: outputPath,
                            timestamp: Math.floor(item.time) // 向下取整秒数
                        });
                        completed++;
                        if (completed === count) {
                            // 按时间排序，保证顺序正确
                            results.sort((a, b) => a.timestamp - b.timestamp);
                            resolve(results);
                        }
                    })
                    .on('error', (err) => {
                        console.error("截图失败:", err);
                        reject(err);
                    });
            });
        });
    });
};

const fileToBase64 = (filePath) => {
    const bitmap = fs.readFileSync(filePath);
    return Buffer.from(bitmap).toString('base64');
};

// --- 4. 核心流程：视觉分析 ---
async function processVideoTask(taskId, videoPath, count = 5) {
    const task = tasks[taskId];
    const framePaths = [];

    try {
        task.message = '正在分析视频画面 (截取关键帧)...';
        console.log(`开始处理视频: ${videoPath}`);

        // 获取带时间戳的帧
        const frames = await extractFrames(videoPath, 'uploads/', 4);
        // 保存路径以便后续清理
        frames.forEach(f => framePaths.push(f.path));
        task.progress = 40;

        task.message = `AI 正在观看视频 (${apiConfig.model})...`;

        // 构建提示词，明确指出每张图的时间点
        let promptText = `这是视频课程的 4 张关键截图。请根据截图提取核心知识点，并生成 ${count} 道互动练习题。`;
        promptText += "\n重要：请根据知识点出现的画面时间，将每道题关联到最接近的时间戳 (timestamp)。";

        const content = [{ type: "text", text: promptText }];

        frames.forEach((frame, index) => {
            const base64Image = fileToBase64(frame.path);
            content.push({
                type: "text",
                text: `截图 ${index + 1} (出现在视频第 ${frame.timestamp} 秒):`
            });
            content.push({
                type: "image_url",
                image_url: {
                    url: `data:image/jpeg;base64,${base64Image}`
                }
            });
        });

        // 修改 System Prompt，强制要求 JSON 包含 timestamp
        const systemPrompt = `
        You are an educational AI assistant. Analyze the provided video frames and generate learning cards.
        Strictly return ONLY valid JSON array. No markdown.
        Schema: [
          {
            "type": "choice"|"boolean"|"fill", 
            "question": "...", 
            "options": ["A","B"] (Required for choice), 
            "correctIndex": 0 (Required for choice/boolean), 
            "correctAnswer": "text_answer" (Required for fill), 
            "explanation": "...",
            "timestamp": 120 
          }
        ]
        Note: "timestamp" is the time in seconds (integer) where this knowledge point appears.
        `;
        const completion = await client.chat.completions.create({
            model: apiConfig.model,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: content }
            ],
            max_tokens: 2000
        });

        task.progress = 80;
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
    const count = req.body.count || 5;
    tasks[taskId] = { status: 'processing', progress: 0, message: 'Starting...', startTime: Date.now() };
    res.json({ taskId });
    processVideoTask(taskId, req.file.path, count);
});

app.get('/api/task/:id', (req, res) => {
    const task = tasks[req.params.id];
    if (!task) return res.status(404).json({ error: "Task not found" });
    res.json(task);
});

app.post('/api/generate', async (req, res) => {
    // 文本生成保持简单逻辑，通常不带时间戳
    try {
        const count = req.body.count || 5;
        const completion = await client.chat.completions.create({
            model: apiConfig.model,
            messages: [
                { role: "system", content: `You are a helper. Generate valid JSON array for learning cards. Generate ${count} questions. Schema: [{"type": "choice"|"boolean"|"fill", "question": "...", "options": ["..."], "correctIndex": 0, "correctAnswer": "text", "explanation": "..."}]` },
                { role: "user", content: req.body.text || '' }
            ]
        });
        const clean = completion.choices[0].message.content.replace(/```json/gi, '').replace(/```/g, '').trim();
        res.json(JSON.parse(clean));
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});