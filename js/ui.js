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
        
        // --- 搜索与筛选 ---
        searchContainer: document.getElementById('search-container'),
        searchInput: document.getElementById('search-input'),
        filterSelect: document.getElementById('filter-select'),
        
        // --- 报告 ---
        reportBtn: document.getElementById('report-btn'),
        reportModal: document.getElementById('report-modal'),
        closeReportBtn: document.getElementById('close-report'),
        downloadReportBtn: document.getElementById('download-report'),
        reportContent: document.getElementById('report-content'),

        // --- ✅ 新增：庆祝特效元素 ---
        celebrationOverlay: document.getElementById('celebration-overlay'),
        celebrationModal: document.getElementById('celebration-modal'),
        fireworksCanvas: document.getElementById('fireworks-canvas'),
    },

    state: {
        mode: 'text',
        selectedFile: null,
        isPanelCollapsed: false,
        
        // 数据状态
        allCards: [], 
        filteredCards: [],
        
        // 筛选状态
        searchQuery: '',
        filterType: 'all',
        
        // 统计状态
        completedCount: 0,
        correctCount: 0,
        wrongCount: 0,

        // 烟花状态
        isFireworksRunning: false,
    },

    callbacks: {
        onGenerateText: null,
        onGenerateVideo: null,
    },

    init() {
        this.bindEvents();
        this.checkResponsive();
        this.resizeCanvas(); // 初始化画布大小
        
        window.addEventListener('resize', () => {
            this.checkResponsive();
            this.resizeCanvas(); // ✅ 窗口调整时重置画布
        });
    },

    // --- ✅ 新增：画布适配 ---
    resizeCanvas() {
        if (this.elements.fireworksCanvas) {
            this.elements.fireworksCanvas.width = window.innerWidth;
            this.elements.fireworksCanvas.height = window.innerHeight;
        }
    },

    bindEvents() {
        // 侧边栏与模式切换
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

        // 搜索与筛选事件
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

        // 视频联动
        if (this.elements.previewPlayer) {
            this.elements.previewPlayer.addEventListener('timeupdate', () => {
                this.highlightActiveCard(this.elements.previewPlayer.currentTime);
            });
        }

        // 报告相关
        if (this.elements.reportBtn) this.elements.reportBtn.addEventListener('click', () => this.showReport());
        if (this.elements.closeReportBtn) this.elements.closeReportBtn.addEventListener('click', () => this.hideReport());
        if (this.elements.downloadReportBtn) this.elements.downloadReportBtn.addEventListener('click', () => this.downloadReportImage());
    },

    // --- 数据加载与筛选 ---
    setCardsData(cardsData) {
        this.state.allCards = Array.isArray(cardsData) ? cardsData.filter(c => this.isSupportedCard(c.type)) : [];
        this.state.allCards.forEach(card => {
            card._status = 'pending'; 
        });
        
        this.state.completedCount = 0;
        this.state.correctCount = 0;
        this.state.wrongCount = 0;

        this.elements.emptyState.classList.add('hidden');
        this.elements.searchContainer.classList.remove('hidden');
        this.elements.progressContainer.classList.remove('hidden');
        this.elements.reportBtn.classList.remove('hidden');

        this.applyFilters();
    },

    applyFilters() {
        const { allCards, searchQuery, filterType } = this.state;
        let result = allCards;

        if (filterType === 'wrong') {
            result = result.filter(c => c._status === 'wrong');
        } else if (filterType !== 'all') {
            result = result.filter(c => c.type === filterType);
        }

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
            const realIndex = this.state.allCards.indexOf(card);
            const cardEl = this.createCardElement(card, realIndex);
            grid.appendChild(cardEl);
            setTimeout(() => cardEl.classList.remove('opacity-0', 'translate-y-4'), index * 50);
        });
    },

    // --- 卡片创建 ---
    createCardElement(card, index) {
        const div = document.createElement('div');
        div.id = `card-${index}`;
        div.className = `relative bg-ctp-surface0 rounded-xl p-6 shadow-lg border-2 border-transparent transition-all duration-300 hover:shadow-xl flex flex-col gap-4 opacity-0 translate-y-4`;
        div.dataset.timestamp = card.timestamp || -1; 

        // 头部
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

        // 问题
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
        
        if (card._status !== 'pending') {
            this.restoreCardState(contentArea, feedbackArea, card);
        }

        div.appendChild(feedbackArea);

        // 按钮
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

    highlightText(text) {
        if (!this.state.searchQuery) return text;
        const regex = new RegExp(`(${this.state.searchQuery})`, 'gi');
        return text.replace(regex, '<span class="highlight">$1</span>');
    },

    formatTime(seconds) {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    },

    jumpToVideo(time) {
        if (this.elements.previewPlayer) {
            this.elements.previewPlayer.currentTime = time;
            this.elements.previewPlayer.play();
        }
    },

    highlightActiveCard(currentTime) {
        if (!this.lastHighlightCheck || Date.now() - this.lastHighlightCheck > 500) {
            this.lastHighlightCheck = Date.now();
            
            let activeId = -1;
            let minDiff = Infinity;

            this.state.filteredCards.forEach((card, idx) => {
                if (card.timestamp !== undefined && card.timestamp <= currentTime) {
                    const diff = currentTime - card.timestamp;
                    if (diff < 30 && diff < minDiff) {
                        minDiff = diff;
                        activeId = idx;
                    }
                }
            });

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
            if (!userAnswer) {
                input.classList.add('border-ctp-red');
                setTimeout(() => input.classList.remove('border-ctp-red'), 500);
                return;
            }
            
            const standardAnswer = card.correctAnswer ? card.correctAnswer.toString() : "";
            isCorrect = userAnswer.toLowerCase() === standardAnswer.toLowerCase();
        }

        card._status = isCorrect ? 'correct' : 'wrong';
        card._userAnswer = userAnswer;

        this.state.completedCount++;
        if (isCorrect) {
            this.state.correctCount++;
            // ✅ 新增：答对时触发庆祝特效
            this.showCelebration();
            this.playSound('真棒.mp3');
        } else {
            this.state.wrongCount++;
            this.playSound('曼波.mp3');
        }

        this.restoreCardState(contentArea, feedbackArea, card);
        submitBtn.disabled = true;
        submitBtn.textContent = '已完成';
        
        this.updateProgressUI();
    },

    restoreCardState(contentArea, feedbackArea, card) {
        const inputs = contentArea.querySelectorAll('input');
        inputs.forEach(i => i.disabled = true);

        feedbackArea.classList.remove('hidden');
        if (card._status === 'correct') {
            feedbackArea.className = 'mt-4 p-4 rounded-lg text-sm bg-ctp-green/10 border border-ctp-green/20 text-ctp-green';
            feedbackArea.innerHTML = `<strong>🎉 回答正确！</strong><p class="mt-1">${card.explanation || ''}</p>`;
        } else {
            feedbackArea.className = 'mt-4 p-4 rounded-lg text-sm bg-ctp-red/10 border border-ctp-red/20 text-ctp-red';
            feedbackArea.innerHTML = `<strong>❌ 回答错误</strong><p class="mt-1">${card.explanation || ''}</p>`;
        }
    },

    playSound(filename) {
        const audio = new Audio(`audio/${filename}`);
        audio.play().catch(e => console.error("播放音频失败:", e));
    },

    // --- ✅ 新增：庆祝特效逻辑 ---
    showCelebration() {
        const overlay = this.elements.celebrationOverlay;
        const modal = this.elements.celebrationModal;
        const canvas = this.elements.fireworksCanvas;

        if (!overlay || !modal || !canvas) return;

        // 1. 显示层
        overlay.classList.remove('hidden');
        // 强制重绘以触发 transition
        void modal.offsetWidth;
        modal.classList.remove('scale-0');
        modal.classList.add('scale-100');

        // 2. 启动烟花
        this.startFireworks(canvas);

        // 3. 2.5秒后自动关闭
        if (this.celebrationTimer) clearTimeout(this.celebrationTimer);
        this.celebrationTimer = setTimeout(() => {
            modal.classList.remove('scale-100');
            modal.classList.add('scale-0');
            
            // 等动画播完再隐藏
            setTimeout(() => {
                overlay.classList.add('hidden');
                this.stopFireworks();
            }, 500);
        }, 2500);
    },

    // --- 原生 JS 烟花系统 ---
    startFireworks(canvas) {
        const ctx = canvas.getContext('2d');
        let particles = [];
        const colors = ['#f5e0dc', '#f2cdcd', '#f5c2e7', '#cba6f7', '#f38ba8', '#fab387', '#f9e2af', '#a6e3a1', '#94e2d5', '#89dceb'];
        
        this.isFireworksRunning = true;

        const createParticle = (x, y) => {
            const count = 30; // 爆炸粒子数
            for (let i = 0; i < count; i++) {
                particles.push({
                    x: x,
                    y: y,
                    color: colors[Math.floor(Math.random() * colors.length)],
                    radius: Math.random() * 3 + 1,
                    velocity: {
                        x: (Math.random() - 0.5) * 8,
                        y: (Math.random() - 0.5) * 8
                    },
                    alpha: 1,
                    decay: Math.random() * 0.02 + 0.01
                });
            }
        };

        // 随机产生爆炸点
        const autoFire = setInterval(() => {
            if (!this.isFireworksRunning) return clearInterval(autoFire);
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height * 0.6; // 上半部分
            createParticle(x, y);
        }, 300);

        // 立即来一发
        createParticle(canvas.width / 2, canvas.height / 2);

        const animate = () => {
            if (!this.isFireworksRunning) return;
            requestAnimationFrame(animate);
            
            // 拖尾效果
            ctx.fillStyle = 'rgba(30, 30, 46, 0.2)'; 
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            particles.forEach((p, index) => {
                p.velocity.y += 0.05; // 重力
                p.x += p.velocity.x;
                p.y += p.velocity.y;
                p.alpha -= p.decay;

                if (p.alpha <= 0) {
                    particles.splice(index, 1);
                } else {
                    ctx.save();
                    ctx.globalAlpha = p.alpha;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                    ctx.fillStyle = p.color;
                    ctx.fill();
                    ctx.restore();
                }
            });
        };
        
        animate();
    },

    stopFireworks() {
        this.isFireworksRunning = false;
    },

    // --- 报告与导出 ---
    showReport() {
        const { completedCount, correctCount, wrongCount } = this.state;
        const total = completedCount;
        const accuracy = total === 0 ? 0 : Math.round((correctCount / total) * 100);

        document.getElementById('report-date').textContent = new Date().toLocaleDateString();
        document.getElementById('report-score').textContent = accuracy;
        document.getElementById('report-total').textContent = total;
        document.getElementById('report-accuracy').textContent = `${accuracy}%`;
        document.getElementById('report-wrong').textContent = wrongCount;

        const ring = document.getElementById('report-score-ring');
        const circumference = 2 * Math.PI * 56;
        const offset = circumference - (accuracy / 100) * circumference;
        ring.style.strokeDashoffset = offset;
        
        ring.classList.remove('text-ctp-green', 'text-ctp-yellow', 'text-ctp-red');
        if (accuracy >= 80) ring.classList.add('text-ctp-green');
        else if (accuracy >= 60) ring.classList.add('text-ctp-yellow');
        else ring.classList.add('text-ctp-red');

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
                backgroundColor: '#1e1e2e',
                scale: 2
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
        const total = this.state.allCards.length;
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
        this.setCardsData(cards);
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
            let options = card.options;
            if (!options || options.length === 0) {
                if (card.type === 'boolean') {
                    options = ['正确', '错误']; 
                } else {
                    options = [];
                }
            }

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
            
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const submitBtn = container.parentElement.querySelector('button');
                    if (submitBtn && !submitBtn.disabled) submitBtn.click();
                }
            });

            container.appendChild(input);
        }
    },
    isSupportedCard(type) {
        return ['choice', 'boolean', 'fill'].includes(type);
    }
};