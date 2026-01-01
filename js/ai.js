const AI = {
    // 文本生成 (保持不变)
    async generateCards(text, count = 5) {
        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, count })
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Server Error');
        }
        return response.json();
    },

    // 新增：视频生成 (返回 Task ID)
    async uploadVideo(file, count = 5) {
        const formData = new FormData();
        formData.append('video', file);
        formData.append('count', count);

        const response = await fetch('/api/upload-video', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) throw new Error('Upload Failed');
        return response.json(); // returns { taskId }
    },

    // 新增：轮询任务状态
    async checkTaskStatus(taskId) {
        const response = await fetch(`/api/task/${taskId}`);
        if (!response.ok) throw new Error('Status Check Failed');
        return response.json();
    }
};