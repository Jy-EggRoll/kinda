const UI = {
    elements: {
        // --- 基础布局元素 ---
        leftPanel: document.getElementById('left-panel'),
        toggleBtn: document.getElementById('toggle-panel-btn'),
        expandBtn: document.getElementById('expand-panel-btn'),
        panelContent: document.querySelectorAll('.panel-content'),
        collapsedContent: document.querySelector('.collapsed-content'),
        
        // --- Tab 与面板 ---
        tabText: document.getElementById('tab-text'),
        tabVideo: document.getElementById('tab-video'),
        panelText: document.getElementById('panel-text'),
        panelVideo: document.getElementById('panel-video'),
        
        // --- 视频相关 ---
        videoInput: document.getElementById('video-input'),
        dropZone: document.getElementById('drop-zone'),
        videoPreview: document.getElementById('video-preview'),
        previewPlayer: document.getElementById('preview-player'),
        clearVideoBtn: document.getElementById('clear-video'),
        
        // --- 输入与生成 ---
        generateBtn: document.getElementById('generate-btn'),
        sourceText: document.getElementById('source-text'),
        
        // --- 右侧展示区 ---
        cardsGrid: document.getElementById('cards-grid'),
        emptyState: document.getElementById('empty-state'),
        
        // --- 状态栏与工具 ---
        progressBar: document.getElementById('progress-bar'),
        progressText: document.getElementById('progress-text'),
        progressContainer: document.getElementById('progress-container'),
        statusIndicator: document.querySelector('#status-indicator span.animate-ping'),
        statusDot: document.querySelector('#status-indicator span.relative'),
        statusText: document.getElementById('status-text'),
        
        // --- 新增：搜索与筛选 ---
        searchContainer: document.getElementById('search-container'),
        searchInput: document.getElementById('search-input'),
        filterSelect: document.getElementById('filter-select'),
        
        // --- 新增：报告 ---
        reportBtn: document.getElementById('report-btn'),
        reportModal: document.getElementById('report-modal'),
        closeReportBtn: document.getElementById('close-report'),
        downloadReportBtn: document.getElementById('download-report'),
        reportContent: document.getElementById('report-content'),
    },

    state: {
        mode: 'text',
        selectedFile: null,
        isPanelCollapsed: false,
        
        // 数据状态
        allCards: [], // 存储原始数据
        filteredCards: [],
        
        // 筛选状态
        searchQuery: '',
        filterType: 'all',
        
        // 统计状态
        completedCount: 0,
        correctCount: 0,
        wrongCount: 0,
    },

    callbacks: {
        onGenerateText: null,
        onGenerateVideo: null,
    },

    init() {
        this.bindEvents();
        this.checkResponsive();
        window.addEventListener('resize', () => this.checkResponsive());
    },

    bindEvents() {
        // 侧边栏与模式切换 (保持不变)
        if (this.elements.toggleBtn) this.elements.toggleBtn.addEventListener('click', () => this.togglePanel());
        if (this.elements.expandBtn) this.elements.expandBtn.addEventListener('click', () => this.togglePanel());
        if (this.elements.tabText && this.elements.tabVideo) {
            this.elements.tabText.addEventListener('click', () => this.switchMode('text'));
            this.elements.tabVideo.addEventListener('click', () => this.switchMode('video'));
        }

        // 文件操作
        if (this.elements.videoInput) this.elements.videoInput.addEventListener('change', (e) => this.handleFile(e.target.files[0]));
        if (this.elements.clearVideoBtn) this.elements.clearVideoBtn.addEventListener('click', () => this.clearVideo());

        // 生成按钮
        if (this.elements.generateBtn) {
            this.elements.generateBtn.addEventListener('click', () => {
                if (this.state.mode === 'text') {
                    const text = this.elements.sourceText.value.trim();
                    if (!text) return alert('请先输入学习资料文本');
                    if (this.callbacks.onGenerateText) this.callbacks.onGenerateText(text);
                } else {
                    if (!this.state.selectedFile) return alert('请先上传视频文件');
                    if (this.callbacks.onGenerateVideo) this.callbacks.onGenerateVideo(this.state.selectedFile);
                }
            });
        }

        // --- 新增：搜索与筛选事件 ---
        if (this.elements.searchInput) {
            this.elements.searchInput.addEventListener('input', (e) => {
                this.state.searchQuery = e.target.value.trim();
                this.applyFilters();
            });
        }
        if (this.elements.filterSelect) {
            this.elements.filterSelect.addEventListener('change', (e) => {
                this.state.filterType = e.target.value;
                this.applyFilters();
            });
        }

        // --- 新增：视频联动 ---
        if (this.elements.previewPlayer) {
            this.elements.previewPlayer.addEventListener('timeupdate', () => {
                this.highlightActiveCard(this.elements.previewPlayer.currentTime);
            });
        }

        // --- 新增：报告相关 ---
        if (this.elements.reportBtn) this.elements.reportBtn.addEventListener('click', () => this.showReport());
        if (this.elements.closeReportBtn) this.elements.closeReportBtn.addEventListener('click', () => this.hideReport());
        if (this.elements.downloadReportBtn) this.elements.downloadReportBtn.addEventListener('click', () => this.downloadReportImage());
    },

    // --- 核心逻辑改造：数据加载与筛选 ---
    
    setCardsData(cardsData) {
        // 初始化数据
        this.state.allCards = Array.isArray(cardsData) ? cardsData.filter(c => this.isSupportedCard(c.type)) : [];
        // 为每个卡片附加状态，而不是修改原始数据结构
        this.state.allCards.forEach(card => {
            card._status = 'pending'; // 'pending' | 'correct' | 'wrong'
        });
        
        // 重置统计
        this.state.completedCount = 0;
        this.state.correctCount = 0;
        this.state.wrongCount = 0;

        // UI 状态
        this.elements.emptyState.classList.add('hidden');
        this.elements.searchContainer.classList.remove('hidden');
        this.elements.progressContainer.classList.remove('hidden');
        this.elements.reportBtn.classList.remove('hidden');

        this.applyFilters();
    },

    applyFilters() {
        const { allCards, searchQuery, filterType } = this.state;
        
        let result = allCards;

        // 1. 类型筛选
        if (filterType === 'wrong') {
            result = result.filter(c => c._status === 'wrong');
        } else if (filterType !== 'all') {
            result = result.filter(c => c.type === filterType);
        }

        // 2. 文本搜索
        if (searchQuery) {
            const regex = new RegExp(searchQuery, 'i');
            result = result.filter(c => regex.test(c.question));
        }

        this.state.filteredCards = result;
        this.renderFilteredCards();
        this.updateProgressUI();
    },

    renderFilteredCards() {
        const grid = this.elements.cardsGrid;
        grid.innerHTML = '';
        
        if (this.state.filteredCards.length === 0) {
            grid.innerHTML = `<div class="col-span-full text-center text-ctp-overlay1 py-10">没有找到匹配的题目</div>`;
            return;
        }

        this.state.filteredCards.forEach((card, index) => {
            // 查找该卡片在原始数组中的真实索引，用于唯一标识
            const realIndex = this.state.allCards.indexOf(card);
            const cardEl = this.createCardElement(card, realIndex);
            grid.appendChild(cardEl);
            
            // 简单入场动画
            setTimeout(() => cardEl.classList.remove('opacity-0', 'translate-y-4'), index * 50);
        });
    },

    // --- 卡片创建与高亮 (Search Highlight & Timestamp Link) ---
    
    createCardElement(card, index) {
        const div = document.createElement('div');
        div.id = `card-${index}`;
        div.className = `relative bg-ctp-surface0 rounded-xl p-6 shadow-lg border-2 border-transparent transition-all duration-300 hover:shadow-xl flex flex-col gap-4 opacity-0 translate-y-4`;
        div.dataset.timestamp = card.timestamp || -1; // 存储时间戳用于联动

        // 头部：类型标签 + 视频跳转按钮
        const header = document.createElement('div');
        header.className = 'flex justify-between items-start mb-1';
        
        let jumpBtnHtml = '';
        if (card.timestamp !== undefined && this.state.mode === 'video') {
            jumpBtnHtml = `
                <button class="text-ctp-blue hover:text-ctp-sapphire text-xs flex items-center gap-1 bg-ctp-blue/10 px-2 py-1 rounded transition-colors"
                    onclick="UI.jumpToVideo(${card.timestamp})">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd" /></svg>
                    <span>${this.formatTime(card.timestamp)}</span>
                </button>
            `;
        }

        header.innerHTML = `
            <span class="text-xs font-bold uppercase tracking-wider text-ctp-overlay1 bg-ctp-base px-2 py-1 rounded">${this.getCardTypeLabel(card.type)}</span>
            ${jumpBtnHtml}
        `;
        div.appendChild(header);

        // 问题 (支持高亮)
        const question = document.createElement('h3');
        question.className = 'text-lg font-semibold text-ctp-text leading-relaxed';
        question.innerHTML = this.highlightText(card.question);
        div.appendChild(question);

        // 内容区
        const contentArea = document.createElement('div');
        contentArea.className = 'flex-1 mt-2 space-y-3';
        this.renderCardContent(contentArea, card, index);
        div.appendChild(contentArea);

        // 反馈区
        const feedbackArea = document.createElement('div');
        feedbackArea.className = `mt-4 p-4 rounded-lg text-sm transition-all duration-300 ${card._status === 'pending' ? 'hidden' : ''}`;
        
        // 如果已答题，恢复状态
        if (card._status !== 'pending') {
            this.restoreCardState(contentArea, feedbackArea, card);
        }

        div.appendChild(feedbackArea);

        // 按钮 (如果已答题则禁用)
        const actions = document.createElement('div');
        actions.className = 'mt-6 flex justify-end';
        const submitBtn = document.createElement('button');
        submitBtn.className = 'bg-ctp-mauve hover:bg-ctp-pink text-ctp-base font-bold py-2 px-6 rounded-lg transition-colors shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed';
        submitBtn.textContent = card._status === 'pending' ? '提交' : '已完成';
        submitBtn.disabled = card._status !== 'pending';
        
        submitBtn.onclick = () => this.handleCardSubmit(card, index, div, contentArea, feedbackArea, submitBtn);
        actions.appendChild(submitBtn);
        div.appendChild(actions);

        return div;
    },

    // 辅助：高亮搜索词
    highlightText(text) {
        if (!this.state.searchQuery) return text;
        const regex = new RegExp(`(${this.state.searchQuery})`, 'gi');
        return text.replace(regex, '<span class="highlight">$1</span>');
    },

    // 辅助：秒转 MM:SS
    formatTime(seconds) {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    },

    // --- 视频联动逻辑 ---
    
    jumpToVideo(time) {
        if (this.elements.previewPlayer) {
            this.elements.previewPlayer.currentTime = time;
            this.elements.previewPlayer.play();
        }
    },

    highlightActiveCard(currentTime) {
        // 简单的节流，避免每一帧都操作 DOM
        if (!this.lastHighlightCheck || Date.now() - this.lastHighlightCheck > 500) {
            this.lastHighlightCheck = Date.now();
            
            // 找到最接近当前时间且不超过当前时间的卡片
            let activeId = -1;
            let minDiff = Infinity;

            this.state.filteredCards.forEach((card, idx) => {
                if (card.timestamp !== undefined && card.timestamp <= currentTime) {
                    const diff = currentTime - card.timestamp;
                    // 假设一个知识点有效期为 30秒
                    if (diff < 30 && diff < minDiff) {
                        minDiff = diff;
                        activeId = idx; // 这里使用 filtered 里的 index 可能会有问题，应该用 unique ID
                    }
                }
            });

            // 更新样式
            const cardEls = this.elements.cardsGrid.children;
            for (let i = 0; i < cardEls.length; i++) {
                if (i === activeId) {
                    cardEls[i].classList.add('border-ctp-yellow', 'bg-ctp-base');
                    cardEls[i].classList.remove('border-transparent', 'bg-ctp-surface0');
                } else {
                    cardEls[i].classList.remove('border-ctp-yellow', 'bg-ctp-base');
                    cardEls[i].classList.add('border-transparent', 'bg-ctp-surface0');
                }
            }
        }
    },

    // --- 答题逻辑 ---

    handleCardSubmit(card, index, cardEl, contentArea, feedbackArea, submitBtn) {
        let isCorrect = false;
        let userAnswer = null;

        if (card.type === 'choice' || card.type === 'boolean') {
            const selected = contentArea.querySelector('input:checked');
            if (!selected) {
                cardEl.classList.add('animate-pulse');
                setTimeout(() => cardEl.classList.remove('animate-pulse'), 500);
                return;
            }
            userAnswer = parseInt(selected.value);
            isCorrect = userAnswer === card.correctIndex;
        } else if (card.type === 'fill') {
            const input = contentArea.querySelector('input');
            userAnswer = input.value.trim();
            if (!userAnswer) return;
            isCorrect = userAnswer.toLowerCase() === card.correctAnswer.toLowerCase(); // 简单匹配
        }

        // 更新数据状态
        card._status = isCorrect ? 'correct' : 'wrong';
        card._userAnswer = userAnswer;

        // 更新统计
        this.state.completedCount++;
        if (isCorrect) this.state.correctCount++;
        else this.state.wrongCount++;

        // 更新 UI
        this.restoreCardState(contentArea, feedbackArea, card);
        submitBtn.disabled = true;
        submitBtn.textContent = '已完成';
        
        this.updateProgressUI();
    },

    restoreCardState(contentArea, feedbackArea, card) {
        // 禁用输入
        const inputs = contentArea.querySelectorAll('input');
        inputs.forEach(i => i.disabled = true);

        // 显示反馈
        feedbackArea.classList.remove('hidden');
        if (card._status === 'correct') {
            feedbackArea.className = 'mt-4 p-4 rounded-lg text-sm bg-ctp-green/10 border border-ctp-green/20 text-ctp-green';
            feedbackArea.innerHTML = `<strong>🎉 回答正确！</strong><p class="mt-1">${card.explanation || ''}</p>`;
        } else {
            feedbackArea.className = 'mt-4 p-4 rounded-lg text-sm bg-ctp-red/10 border border-ctp-red/20 text-ctp-red';
            feedbackArea.innerHTML = `<strong>❌ 回答错误</strong><p class="mt-1">${card.explanation || ''}</p>`;
        }
    },

    // --- 报告与导出 ---

    showReport() {
        const { completedCount, correctCount, wrongCount } = this.state;
        const total = completedCount;
        const accuracy = total === 0 ? 0 : Math.round((correctCount / total) * 100);

        // 更新 DOM
        document.getElementById('report-date').textContent = new Date().toLocaleDateString();
        document.getElementById('report-score').textContent = accuracy;
        document.getElementById('report-total').textContent = total;
        document.getElementById('report-accuracy').textContent = `${accuracy}%`;
        document.getElementById('report-wrong').textContent = wrongCount;

        // 环形进度条动画
        const ring = document.getElementById('report-score-ring');
        const circumference = 2 * Math.PI * 56; // r=56
        const offset = circumference - (accuracy / 100) * circumference;
        ring.style.strokeDashoffset = offset;
        
        // 颜色根据分数变化
        ring.classList.remove('text-ctp-green', 'text-ctp-yellow', 'text-ctp-red');
        if (accuracy >= 80) ring.classList.add('text-ctp-green');
        else if (accuracy >= 60) ring.classList.add('text-ctp-yellow');
        else ring.classList.add('text-ctp-red');

        // 显示模态框
        const modal = this.elements.reportModal;
        modal.classList.remove('pointer-events-none', 'opacity-0');
        modal.firstElementChild.classList.remove('scale-95');
        modal.firstElementChild.classList.add('scale-100');
    },

    hideReport() {
        const modal = this.elements.reportModal;
        modal.classList.add('pointer-events-none', 'opacity-0');
        modal.firstElementChild.classList.remove('scale-100');
        modal.firstElementChild.classList.add('scale-95');
    },

    async downloadReportImage() {
        const btn = this.elements.downloadReportBtn;
        const originalText = btn.innerHTML;
        btn.innerHTML = '生成中...';
        btn.disabled = true;

        try {
            const element = this.elements.reportContent;
            const canvas = await html2canvas(element, {
                backgroundColor: '#1e1e2e', // ctp-base
                scale: 2 // 高清
            });

            const link = document.createElement('a');
            link.download = `学习报告_${new Date().toISOString().slice(0,10)}.png`;
            link.href = canvas.toDataURL();
            link.click();
        } catch (e) {
            console.error('Export failed', e);
            alert('报告生成失败');
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    },

    // --- 其他辅助 ---

    updateProgressUI() {
        const total = this.state.allCards.length; // 进度通常基于总数
        const completed = this.state.completedCount;
        const percentage = total === 0 ? 0 : (completed / total) * 100;
        this.elements.progressBar.style.width = `${percentage}%`;
        this.elements.progressText.textContent = `${completed}/${total}`;
    },

    clearCards() {
        this.state.allCards = [];
        this.state.filteredCards = [];
        this.elements.cardsGrid.innerHTML = '';
        this.elements.emptyState.classList.remove('hidden');
        this.elements.searchContainer.classList.add('hidden');
        this.elements.progressContainer.classList.add('hidden');
        this.elements.reportBtn.classList.add('hidden');
    },

    renderCards(cards) {
        // 接管来自 app.js 的调用
        this.setCardsData(cards);
    },
    
    // UI Helpers (togglePanel etc 保持原样或微调)
    togglePanel() {
        this.state.isPanelCollapsed = !this.state.isPanelCollapsed;
        const panel = this.elements.leftPanel;
        if (this.state.isPanelCollapsed) {
            panel.classList.remove('w-96');
            panel.classList.add('w-16');
            this.elements.panelContent.forEach(el => el.classList.add('hidden'));
            if (this.elements.collapsedContent) {
                this.elements.collapsedContent.classList.remove('hidden');
                setTimeout(() => this.elements.collapsedContent.classList.remove('opacity-0'), 50);
            }
        } else {
            panel.classList.remove('w-16');
            panel.classList.add('w-96');
            if (this.elements.collapsedContent) {
                this.elements.collapsedContent.classList.add('opacity-0');
                this.elements.collapsedContent.classList.add('hidden');
            }
            this.elements.panelContent.forEach(el => el.classList.remove('hidden'));
        }
    },
    switchMode(mode) {
        this.state.mode = mode;
        const activeClass = ['bg-ctp-blue', 'text-ctp-base', 'shadow-sm', 'font-bold'];
        const inactiveClass = ['text-ctp-subtext0', 'hover:text-ctp-text', 'font-medium'];

        if (mode === 'text') {
            this.elements.tabText.classList.add(...activeClass);
            this.elements.tabText.classList.remove(...inactiveClass);
            this.elements.tabVideo.classList.remove(...activeClass);
            this.elements.tabVideo.classList.add(...inactiveClass);
            this.elements.panelText.classList.remove('-translate-x-full');
            this.elements.panelVideo.classList.add('translate-x-full');
        } else {
            this.elements.tabVideo.classList.add(...activeClass);
            this.elements.tabVideo.classList.remove(...inactiveClass);
            this.elements.tabText.classList.remove(...activeClass);
            this.elements.tabText.classList.add(...inactiveClass);
            this.elements.panelText.classList.add('-translate-x-full');
            this.elements.panelVideo.classList.remove('translate-x-full');
        }
    },
    handleFile(file) {
        if (!file) return;
        this.state.selectedFile = file;
        this.elements.dropZone.classList.add('hidden');
        this.elements.videoPreview.classList.remove('hidden');
        this.elements.previewPlayer.src = URL.createObjectURL(file);
    },
    clearVideo() {
        this.state.selectedFile = null;
        if(this.elements.videoInput) this.elements.videoInput.value = '';
        this.elements.dropZone.classList.remove('hidden');
        this.elements.videoPreview.classList.add('hidden');
        this.elements.previewPlayer.src = '';
    },
    checkResponsive() {
        if (window.innerWidth < 768 && !this.state.isPanelCollapsed) {
            this.togglePanel();
        }
    },
    updateStatus(message) {
        if(this.elements.statusText) this.elements.statusText.textContent = message;
    },
    setLoading(isLoading) {
        const btn = this.elements.generateBtn;
        if (isLoading) {
            btn.disabled = true;
            btn.innerHTML = `<span class="h-5 w-5 rounded-full border-2 border-ctp-base border-t-ctp-blue animate-spin"></span><span>处理中...</span>`;
            btn.classList.add('opacity-75', 'cursor-not-allowed');
            this.elements.statusIndicator.classList.remove('hidden');
            this.elements.statusDot.classList.remove('bg-ctp-surface2');
            this.elements.statusDot.classList.add('bg-ctp-green');
        } else {
            btn.disabled = false;
            btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg><span>开始生成</span>`;
            btn.classList.remove('opacity-75', 'cursor-not-allowed');
            this.elements.statusIndicator.classList.add('hidden');
            this.elements.statusDot.classList.add('bg-ctp-surface2');
            this.elements.statusDot.classList.remove('bg-ctp-green');
            this.updateStatus("就绪");
        }
    },
    getCardTypeLabel(type) {
        const map = { 'choice': '选择题', 'boolean': '判断题', 'fill': '填空题' };
        return map[type] || '练习';
    },
    renderCardContent(container, card, index) {
        if (card.type === 'choice' || card.type === 'boolean') {
            const options = card.options || (card.type === 'boolean' ? ['正确', '错误'] : []);
            options.forEach((opt, i) => {
                const label = document.createElement('label');
                label.className = 'flex items-center p-3 rounded-lg border border-ctp-surface1 hover:bg-ctp-surface1/50 cursor-pointer transition-colors group';
                const input = document.createElement('input');
                input.type = 'radio';
                input.name = `card-${index}`; // 注意：这里的index需要唯一
                input.value = i;
                input.className = 'form-radio text-ctp-blue focus:ring-ctp-blue bg-ctp-base border-ctp-overlay0';
                
                const text = document.createElement('span');
                text.className = 'ml-3 text-ctp-subtext0 group-hover:text-ctp-text';
                text.textContent = opt;

                label.appendChild(input);
                label.appendChild(text);
                container.appendChild(label);
            });
        } else if (card.type === 'fill') {
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'w-full bg-ctp-base border border-ctp-surface1 rounded-lg p-3 text-ctp-text focus:border-ctp-blue focus:ring-1 focus:ring-ctp-blue outline-none';
            input.placeholder = '请输入答案...';
            container.appendChild(input);
        }
    },
    isSupportedCard(type) {
        return ['choice', 'boolean', 'fill'].includes(type);
    }
};