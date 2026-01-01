const UI = {
    elements: {
        leftPanel: document.getElementById('left-panel'),
        toggleBtn: document.getElementById('toggle-panel-btn'),
        expandBtn: document.getElementById('expand-panel-btn'),
        panelContent: document.querySelectorAll('.panel-content'),
        collapsedContent: document.querySelector('.collapsed-content'),
        cardsGrid: document.getElementById('cards-grid'),
        emptyState: document.getElementById('empty-state'),
        progressBar: document.getElementById('progress-bar'),
        progressText: document.getElementById('progress-text'),
        progressContainer: document.getElementById('progress-container'),
        statusIndicator: document.querySelector('#status-indicator span.animate-ping'),
        statusDot: document.querySelector('#status-indicator span.relative'),
        statusText: document.getElementById('status-text'),
        generateBtn: document.getElementById('generate-btn'),
        sourceText: document.getElementById('source-text'),
    },

    state: {
        isPanelCollapsed: false,
        totalCards: 0,
        completedCards: 0,
    },

    callbacks: {
        onGenerate: null,
    },

    init() {
        this.bindEvents();
        this.checkResponsive();
        window.addEventListener('resize', () => this.checkResponsive());
    },

    bindEvents() {
        this.elements.toggleBtn.addEventListener('click', () => this.togglePanel());
        this.elements.expandBtn.addEventListener('click', () => this.togglePanel());

        this.elements.generateBtn.addEventListener('click', () => {
            const text = this.elements.sourceText.value.trim();
            if (!text) {
                alert('请先输入学习资料文本');
                return;
            }
            if (this.callbacks.onGenerate) {
                this.callbacks.onGenerate(text);
            }
        });
    },

    togglePanel() {
        this.state.isPanelCollapsed = !this.state.isPanelCollapsed;
        const panel = this.elements.leftPanel;

        if (this.state.isPanelCollapsed) {
            panel.classList.remove('w-96');
            panel.classList.add('w-16');
            this.elements.panelContent.forEach(el => el.classList.add('hidden'));
            this.elements.collapsedContent.classList.remove('hidden');
            setTimeout(() => this.elements.collapsedContent.classList.remove('opacity-0'), 50);
        } else {
            panel.classList.remove('w-16');
            panel.classList.add('w-96');
            this.elements.collapsedContent.classList.add('opacity-0');
            this.elements.collapsedContent.classList.add('hidden');
            this.elements.panelContent.forEach(el => el.classList.remove('hidden'));
        }
    },

    checkResponsive() {
        if (window.innerWidth < 768 && !this.state.isPanelCollapsed) {
            this.togglePanel();
        }
    },

    setLoading(isLoading) {
        const btn = this.elements.generateBtn;
        if (isLoading) {
            btn.disabled = true;
            btn.innerHTML = `<span class="h-5 w-5 rounded-full border-2 border-ctp-base border-t-ctp-blue animate-spin"></span><span>生成中...</span>`;
            btn.classList.add('opacity-75', 'cursor-not-allowed');
            this.elements.statusIndicator.classList.remove('hidden');
            this.elements.statusDot.classList.remove('bg-ctp-surface2');
            this.elements.statusDot.classList.add('bg-ctp-green');
            this.elements.statusText.textContent = "AI 思考中...";
        } else {
            btn.disabled = false;
            btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg><span>生成卡片</span>`;
            btn.classList.remove('opacity-75', 'cursor-not-allowed');
            this.elements.statusIndicator.classList.add('hidden');
            this.elements.statusDot.classList.add('bg-ctp-surface2');
            this.elements.statusDot.classList.remove('bg-ctp-green');
            this.elements.statusText.textContent = "就绪";
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
        const supportedCards = cardsData.filter(card => this.isSupportedCard(card.type));
        this.state.totalCards = supportedCards.length;
        this.state.completedCards = 0;
        this.updateProgressUI();
        this.elements.progressContainer.classList.toggle('hidden', this.state.totalCards === 0);

        cardsData.forEach((card, index) => {
            const cardEl = this.createCardElement(card, index);
            this.elements.cardsGrid.appendChild(cardEl);
            // Staggered animation
            setTimeout(() => {
                cardEl.classList.remove('opacity-0', 'translate-y-4');
            }, index * 150);
        });
    },

    createCardElement(card, index) {
        const div = document.createElement('div');
        div.className = `bg-ctp-surface0 rounded-xl p-6 shadow-lg border border-ctp-surface1 opacity-0 translate-y-4 transition-all duration-500 hover:border-ctp-blue hover:shadow-xl flex flex-col gap-4 ${card.size === 'large' ? 'md:col-span-2' : ''}`;
        div.dataset.id = index;
        const isSupported = this.isSupportedCard(card.type);

        // Header / Type
        const header = document.createElement('div');
        header.className = 'flex justify-between items-start mb-2';
        header.innerHTML = `
            <span class="text-xs font-bold uppercase tracking-wider text-ctp-overlay1 bg-ctp-base px-2 py-1 rounded">${this.getCardTypeLabel(card.type)}</span>
            <span class="text-ctp-surface2 hover:text-ctp-overlay1 cursor-help" title="题目 #${index + 1}">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            </span>
        `;
        div.appendChild(header);

        // Question
        const question = document.createElement('h3');
        question.className = 'text-lg font-semibold text-ctp-text leading-relaxed';
        question.textContent = card.question;
        div.appendChild(question);

        // Content Area (Options, Inputs, etc.)
        const contentArea = document.createElement('div');
        contentArea.className = 'flex-1 mt-2 space-y-3';
        this.renderCardContent(contentArea, card, index, isSupported);
        div.appendChild(contentArea);

        // Feedback Area
        const feedbackArea = document.createElement('div');
        feedbackArea.className = 'hidden mt-4 p-4 rounded-lg bg-ctp-base border border-ctp-surface1 text-sm transition-all duration-300';
        div.appendChild(feedbackArea);

        // Actions
        const actions = document.createElement('div');
        actions.className = 'mt-6 flex justify-end';
        const submitBtn = document.createElement('button');
        submitBtn.className = 'bg-ctp-mauve hover:bg-ctp-pink text-ctp-base font-bold py-2 px-6 rounded-lg transition-colors shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed';
        submitBtn.textContent = '提交';
        submitBtn.onclick = () => this.handleCardSubmit(card, div, contentArea, feedbackArea, submitBtn);
        if (!isSupported) {
            submitBtn.disabled = true;
            submitBtn.textContent = '暂未支持';
            submitBtn.classList.add('opacity-60', 'cursor-not-allowed');
        }
        actions.appendChild(submitBtn);
        div.appendChild(actions);

        return div;
    },

    getCardTypeLabel(type) {
        const map = {
            'choice': '选择题',
            'boolean': '判断题',
            'fill': '填空题',
            'drag': '配对题'
        };
        return map[type] || '练习';
    },

    renderCardContent(container, card, index, isSupported) {
        if (!isSupported) {
            container.innerHTML = '<p class="text-ctp-overlay0 text-sm">暂未支持此题型，稍后会更新。</p>';
            return;
        }
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
        if (!this.isSupportedCard(card.type)) {
            return;
        }
        let isCorrect = false;
        let userAnswer = null;

        if (card.type === 'choice' || card.type === 'boolean') {
            const selected = contentArea.querySelector('input:checked');
            if (!selected) {
                // Shake animation for error
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
                cardEl.classList.add('animate-pulse');
                setTimeout(() => cardEl.classList.remove('animate-pulse'), 500);
                return;
            }
            // Simple fuzzy match
            isCorrect = userAnswer.toLowerCase() === card.correctAnswer.toLowerCase();
        }

        // UI Updates
        submitBtn.disabled = true;
        const inputs = contentArea.querySelectorAll('input');
        inputs.forEach(i => i.disabled = true);

        feedbackArea.classList.remove('hidden');
        if (isCorrect) {
            feedbackArea.classList.add('bg-ctp-green/10', 'border-ctp-green/20', 'text-ctp-green');
            feedbackArea.innerHTML = `
                <div class="flex items-center gap-2 font-bold mb-1">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                    回答正确！
                </div>
                <p class="text-ctp-subtext0">${card.explanation || '做得好！'}</p>
            `;
            this.state.completedCards++;
            this.updateProgressUI();
        } else {
            feedbackArea.classList.add('bg-ctp-red/10', 'border-ctp-red/20', 'text-ctp-red');
            feedbackArea.innerHTML = `
                <div class="flex items-center gap-2 font-bold mb-1">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    回答错误
                </div>
                <p class="text-ctp-subtext0">${card.explanation || '请再接再厉。'}</p>
            `;
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
