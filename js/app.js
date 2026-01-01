document.addEventListener('DOMContentLoaded', () => {
    // Initialize UI
    UI.init();

    // Register the generation callback
    UI.callbacks.onGenerate = async (text) => {
        try {
            // Update UI state
            UI.setLoading(true);
            UI.clearCards();

            // Call AI service
            // Note: This expects the backend server to be running to handle /api/generate
            const cards = await AI.generateCards(text);

            // Render results
            if (cards && cards.length > 0) {
                UI.renderCards(cards);
            } else {
                // Handle empty or invalid response
                alert('未能根据提供的文本生成有效的学习卡片。请尝试提供更多上下文或不同的文本。');
                UI.elements.emptyState.classList.remove('hidden');
            }
        } catch (error) {
            console.error('Application Error:', error);
            alert('生成过程中发生错误: ' + (error.message || '未知错误'));
            UI.elements.emptyState.classList.remove('hidden');
        } finally {
            // Reset UI state
            UI.setLoading(false);
        }
    };

    // Optional: Add some initial demo data or check server status
    console.log('Application initialized. Waiting for user input.');
});
