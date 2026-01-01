const AI = {
    async generateCards(text) {
        try {
            // Call the backend proxy
            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ text })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `API Request Failed: ${response.status}`);
            }

            const result = await response.json();

            // The backend should return the parsed JSON cards
            if (Array.isArray(result)) {
                return result;
            } else if (result.cards && Array.isArray(result.cards)) {
                return result.cards;
            } else {
                console.warn("Unexpected API response format:", result);
                return [];
            }

        } catch (error) {
            console.error("AI Service Error:", error);
            // Re-throw to be handled by UI/App
            throw error;
        }
    }
};
