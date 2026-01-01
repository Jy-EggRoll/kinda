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
        
        // --- 状态栏 ---
        progressBar: document.getElementById('progress-bar'),
        progressText: document.getElementById('progress-text'),
        progressContainer: document.getElementById('progress-container'),
        statusIndicator: document.querySelector('#status-indicator span.animate-ping'),
        statusDot: document.querySelector('#status-indicator span.relative'),
        statusText: document.getElementById('status-text'),
    },

    state: {
        mode: 'text', // 'text' | 'video'
        selectedFile: null,
        isPanelCollapsed: false,
        totalCards: 0,
        completedCards: 0,
    },

    callbacks: {
        onGenerateText: null,
        onGenerateVideo: null,
    },

    init() {
        // 绑定所有事件
        this.bindEvents();
        // 检查响应式布局
        this.checkResponsive();
        window.addEventListener('resize', () => this.checkResponsive());
    },

    bindEvents() {
        // 侧边栏折叠/展开
        if (this.elements.toggleBtn) {
            this.elements.toggleBtn.addEventListener('click', () => this.togglePanel());
        }
        if (this.elements.expandBtn) {
            this.elements.expandBtn.addEventListener('click', () => this.togglePanel());
        }

        // Tab 切换
        if (this.elements.tabText && this.elements.tabVideo) {
            this.elements.tabText.addEventListener('click', () => this.switchMode('text'));
            this.elements.tabVideo.addEventListener('click', () => this.switchMode('video'));
        }

        // 视频文件选择
        if (this.elements.videoInput) {
            this.elements.videoInput.addEventListener('change', (e) => this.handleFile(e.target.files[0]));
        }
        // 清除视频
        if (this.elements.clearVideoBtn) {
            this.elements.clearVideoBtn.addEventListener('click', () => this.clearVideo());
        }

        // 生成按钮点击
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
    },

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
            // UI 样式切换
            this.elements.tabText.classList.add(...activeClass);
            this.elements.tabText.classList.remove(...inactiveClass);
            this.elements.tabVideo.classList.remove(...activeClass);
            this.elements.tabVideo.classList.add(...inactiveClass);
            
            // 面板内容切换
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

    clearCards() {
        this.elements.cardsGrid.innerHTML = '';
        this.elements.emptyState.classList.remove('hidden');
        this.elements.progressContainer.classList.add('hidden');
        this.state.totalCards = 0;
        this.state.completedCards = 0;
    },

    renderCards(cardsData) {
        this.elements.emptyState.classList.add('hidden');
        
        // 过滤支持的题型
        const supportedCards = Array.isArray(cardsData) ? cardsData.filter(card => this.isSupportedCard(card.type)) : [];
        
        this.state.totalCards = supportedCards.length;
        this.state.completedCards = 0;
        this.updateProgressUI();
        this.elements.progressContainer.classList.toggle('hidden', this.state.totalCards === 0);

        supportedCards.forEach((card, index) => {
            const cardEl = this.createCardElement(card, index);
            this.elements.cardsGrid.appendChild(cardEl);
            // 动画
            setTimeout(() => {
                cardEl.classList.remove('opacity-0', 'translate-y-4');
            }, index * 150);
        });
    },

    createCardElement(card, index) {
        const div = document.createElement('div');
        div.className = `bg-ctp-surface0 rounded-xl p-6 shadow-lg border border-ctp-surface1 opacity-0 translate-y-4 transition-all duration-500 hover:border-ctp-blue hover:shadow-xl flex flex-col gap-4 ${card.size === 'large' ? 'md:col-span-2' : ''}`;
        
        // 卡片头部
        const header = document.createElement('div');
        header.className = 'flex justify-between items-start mb-2';
        header.innerHTML = `
            <span class="text-xs font-bold uppercase tracking-wider text-ctp-overlay1 bg-ctp-base px-2 py-1 rounded">${this.getCardTypeLabel(card.type)}</span>
            <span class="text-ctp-surface2 hover:text-ctp-overlay1 cursor-help">#${index + 1}</span>
        `;
        div.appendChild(header);

        // 问题
        const question = document.createElement('h3');
        question.className = 'text-lg font-semibold text-ctp-text leading-relaxed';
        question.textContent = card.question;
        div.appendChild(question);

        // 内容区
        const contentArea = document.createElement('div');
        contentArea.className = 'flex-1 mt-2 space-y-3';
        this.renderCardContent(contentArea, card, index, true);
        div.appendChild(contentArea);

        // 反馈区
        const feedbackArea = document.createElement('div');
        feedbackArea.className = 'hidden mt-4 p-4 rounded-lg bg-ctp-base border border-ctp-surface1 text-sm transition-all duration-300';
        div.appendChild(feedbackArea);

        // 按钮
        const actions = document.createElement('div');
        actions.className = 'mt-6 flex justify-end';
        const submitBtn = document.createElement('button');
        submitBtn.className = 'bg-ctp-mauve hover:bg-ctp-pink text-ctp-base font-bold py-2 px-6 rounded-lg transition-colors shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed';
        submitBtn.textContent = '提交';
        submitBtn.onclick = () => this.handleCardSubmit(card, div, contentArea, feedbackArea, submitBtn);
        actions.appendChild(submitBtn);
        div.appendChild(actions);

        return div;
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
                input.name = `card-${index}`;
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

    handleCardSubmit(card, cardEl, contentArea, feedbackArea, submitBtn) {
        let isCorrect = false;
        
        if (card.type === 'choice' || card.type === 'boolean') {
            const selected = contentArea.querySelector('input:checked');
            if (!selected) {
                cardEl.classList.add('animate-pulse');
                setTimeout(() => cardEl.classList.remove('animate-pulse'), 500);
                return;
            }
            isCorrect = parseInt(selected.value) === card.correctIndex;
        } else if (card.type === 'fill') {
            const input = contentArea.querySelector('input');
            const val = input.value.trim().toLowerCase();
            if (!val) return;
            isCorrect = val === card.correctAnswer.toLowerCase();
        }

        // 锁定与反馈
        submitBtn.disabled = true;
        const inputs = contentArea.querySelectorAll('input');
        inputs.forEach(i => i.disabled = true);

        feedbackArea.classList.remove('hidden');
        if (isCorrect) {
            feedbackArea.classList.add('bg-ctp-green/10', 'border-ctp-green/20', 'text-ctp-green');
            feedbackArea.innerHTML = `<strong>🎉 回答正确！</strong><p>${card.explanation || ''}</p>`;
            this.state.completedCards++;
            this.updateProgressUI();
        } else {
            feedbackArea.classList.add('bg-ctp-red/10', 'border-ctp-red/20', 'text-ctp-red');
            feedbackArea.innerHTML = `<strong>❌ 回答错误</strong><p>${card.explanation || ''}</p>`;
        }
    },

    updateProgressUI() {
        const { completedCards, totalCards } = this.state;
        const percentage = totalCards === 0 ? 0 : (completedCards / totalCards) * 100;
        this.elements.progressBar.style.width = `${percentage}%`;
        this.elements.progressText.textContent = `${completedCards}/${totalCards}`;
    },

    isSupportedCard(type) {
        return ['choice', 'boolean', 'fill'].includes(type);
    }
};