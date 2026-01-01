document.addEventListener('DOMContentLoaded', () => {
    // 1. 初始化 UI
    UI.init();

    // 2. 注册文本生成回调
    UI.callbacks.onGenerateText = async (text) => {
        const count = parseInt(UI.elements.questionCount.value) || 5;
        runGeneration(async () => await AI.generateCards(text, count));
    };

    // 3. 注册视频生成回调 (含轮询逻辑)
    UI.callbacks.onGenerateVideo = async (file) => {
        const count = parseInt(UI.elements.questionCount.value) || 5;
        runGeneration(async () => {
            // A. 上传视频
            UI.updateStatus("正在上传视频...");
            const { taskId } = await AI.uploadVideo(file, count);

            // B. 轮询任务状态
            return new Promise((resolve, reject) => {
                const poll = setInterval(async () => {
                    try {
                        const task = await AI.checkTaskStatus(taskId);

                        if (task.status === 'completed') {
                            clearInterval(poll);
                            resolve(task.result); // 成功拿到题目
                        } else if (task.status === 'failed') {
                            clearInterval(poll);
                            reject(new Error(task.error || '任务处理失败'));
                        } else {
                            // C. 更新进度条文字
                            UI.updateStatus(`${task.message} (${task.progress}%)`);
                        }
                    } catch (e) {
                        clearInterval(poll);
                        reject(e);
                    }
                }, 2000); // 每2秒查询一次
            });
        });
    };

    // --- 通用执行器 ---
    async function runGeneration(actionFn) {
        try {
            UI.setLoading(true);
            UI.clearCards();

            // 执行传入的生成函数 (文本或视频)
            const cards = await actionFn();

            if (cards && Array.isArray(cards) && cards.length > 0) {
                UI.renderCards(cards);
                UI.updateStatus("生成完成");
            } else {
                alert('AI 未能生成有效的内容，请尝试更换资料。');
                UI.elements.emptyState.classList.remove('hidden');
            }
        } catch (error) {
            console.error(error);
            alert('发生错误: ' + (error.message || '未知错误'));
            UI.elements.emptyState.classList.remove('hidden');
        } finally {
            UI.setLoading(false);
        }
    }

    console.log('App initialized.');
});