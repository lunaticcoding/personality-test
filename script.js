/**
 * Value Finder - Personality Test
 *
 * ALGORITHM EXPLANATION:
 * =======================
 * After the initial swipe phase, we use a "Swiss Tournament" style comparison
 * system to determine the top 4 values:
 *
 * 1. INITIAL PHASE: User swipes through 40 words, accepting or rejecting each.
 *    Accepted words move to the comparison phase.
 *
 * 2. COMPARISON PHASE (Swiss Tournament):
 *    - Each accepted word starts with a score of 0
 *    - Words are paired for head-to-head comparison
 *    - Winner of each comparison gets +1 point
 *    - After each round, words are sorted by score
 *    - Words with similar scores are paired together (Swiss pairing)
 *    - This continues until we can clearly identify the top 4
 *
 * 3. TERMINATION CONDITION:
 *    The algorithm stops when we have at least 4 words AND there's a clear
 *    gap between the 4th and 5th ranked words (or we've done enough comparisons
 *    to be confident). We run minimum ceil(log2(n)) rounds to ensure adequate
 *    differentiation, where n = number of accepted words.
 *
 * 4. WHY SWISS TOURNAMENT?
 *    - Efficient: O(n log n) comparisons instead of O(n²) for full pairwise
 *    - Fair: Words with similar records face each other
 *    - Quick convergence: Top performers rise to the top quickly
 *    - Good UX: Fewer comparisons = less user fatigue
 */

(function() {
    'use strict';

    // ==================== WORD LIST ====================
    const WORDS = [
        'Achievement', 'Adventure', 'Authenticity', 'Balance', 'Beauty',
        'Belonging', 'Compassion', 'Courage', 'Creativity', 'Curiosity',
        'Discipline', 'Fairness', 'Family', 'Freedom', 'Friendship',
        'Fun', 'Generosity', 'Gratitude', 'Growth', 'Happiness',
        'Health', 'Honesty', 'Humility', 'Humor', 'Independence',
        'Integrity', 'Intelligence', 'Justice', 'Kindness', 'Knowledge',
        'Leadership', 'Love', 'Loyalty', 'Mindfulness', 'Optimism',
        'Passion', 'Patience', 'Peace', 'Respect', 'Wisdom'
    ];

    // ==================== STATE ====================
    let state = {
        phase: 'intro', // 'intro', 'swipe', 'compare', 'result'
        words: [],
        currentIndex: 0,
        accepted: [],
        rejected: [],
        // Comparison phase state
        scores: {}, // word -> score
        comparisons: [], // array of [word1, word2] pairs to compare
        currentComparison: 0,
        roundNumber: 0,
        comparisonsDone: 0
    };

    // ==================== DOM ELEMENTS ====================
    const screens = {
        intro: document.getElementById('intro-screen'),
        swipe: document.getElementById('swipe-screen'),
        compare: document.getElementById('compare-screen'),
        result: document.getElementById('result-screen')
    };

    const elements = {
        startBtn: document.getElementById('start-btn'),
        restartBtn: document.getElementById('restart-btn'),
        card: document.getElementById('card'),
        cardWord: document.getElementById('card-word'),
        progressFill: document.getElementById('progress-fill'),
        progressText: document.getElementById('progress-text'),
        acceptBtn: document.getElementById('accept-btn'),
        rejectBtn: document.getElementById('reject-btn'),
        compareCard1: document.getElementById('compare-card-1'),
        compareCard2: document.getElementById('compare-card-2'),
        compareProgress: document.getElementById('compare-progress'),
        resultCards: document.getElementById('result-cards')
    };

    // ==================== INITIALIZATION ====================
    function init() {
        bindEvents();
        showScreen('intro');
    }

    function bindEvents() {
        elements.startBtn.addEventListener('click', startGame);
        elements.restartBtn.addEventListener('click', restartGame);
        elements.acceptBtn.addEventListener('click', () => handleSwipe('accept'));
        elements.rejectBtn.addEventListener('click', () => handleSwipe('reject'));
        elements.compareCard1.addEventListener('click', () => handleComparison(0));
        elements.compareCard2.addEventListener('click', () => handleComparison(1));

        // Touch events for swiping
        setupSwipeGestures();
    }

    function startGame() {
        state = {
            phase: 'swipe',
            words: shuffle([...WORDS]),
            currentIndex: 0,
            accepted: [],
            rejected: [],
            scores: {},
            comparisons: [],
            currentComparison: 0,
            roundNumber: 0,
            comparisonsDone: 0
        };
        showScreen('swipe');
        showCurrentCard();
    }

    function restartGame() {
        startGame();
    }

    // ==================== SCREEN MANAGEMENT ====================
    function showScreen(name) {
        Object.keys(screens).forEach(key => {
            screens[key].classList.remove('active');
        });
        screens[name].classList.add('active');
        state.phase = name;
    }

    // ==================== SWIPE PHASE ====================
    function showCurrentCard() {
        if (state.currentIndex >= state.words.length) {
            endSwipePhase();
            return;
        }

        const word = state.words[state.currentIndex];
        elements.cardWord.textContent = word;
        elements.card.className = 'card card-enter';

        updateProgress();
    }

    function updateProgress() {
        const progress = ((state.currentIndex) / state.words.length) * 100;
        elements.progressFill.style.width = progress + '%';
        elements.progressText.textContent = `${state.currentIndex + 1} / ${state.words.length}`;
    }

    function handleSwipe(direction) {
        if (state.phase !== 'swipe') return;

        const word = state.words[state.currentIndex];

        if (direction === 'accept') {
            state.accepted.push(word);
            elements.card.classList.add('swiping', 'swipe-right');
        } else {
            state.rejected.push(word);
            elements.card.classList.add('swiping', 'swipe-left');
        }

        state.currentIndex++;

        setTimeout(() => {
            showCurrentCard();
        }, 350);
    }

    function endSwipePhase() {
        if (state.accepted.length < 4) {
            // Not enough words accepted, show result with what we have
            showResults(state.accepted);
            return;
        }

        if (state.accepted.length <= 4) {
            // Exactly 4 or fewer, no comparison needed
            showResults(state.accepted);
            return;
        }

        // Start comparison phase
        startComparisonPhase();
    }

    // ==================== SWIPE GESTURES ====================
    function setupSwipeGestures() {
        let startX = 0;
        let startY = 0;
        let currentX = 0;
        let isDragging = false;

        const container = document.getElementById('card-container');

        container.addEventListener('touchstart', (e) => {
            if (state.phase !== 'swipe') return;
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            isDragging = true;
            elements.card.style.transition = 'none';
        }, { passive: true });

        container.addEventListener('touchmove', (e) => {
            if (!isDragging || state.phase !== 'swipe') return;

            currentX = e.touches[0].clientX - startX;
            const currentY = e.touches[0].clientY - startY;

            // Only handle horizontal swipes
            if (Math.abs(currentX) > Math.abs(currentY)) {
                const rotation = currentX * 0.1;
                elements.card.style.transform = `translateX(${currentX}px) rotate(${rotation}deg)`;

                // Visual feedback
                if (currentX > 50) {
                    elements.card.classList.add('accept-hint');
                    elements.card.classList.remove('reject-hint');
                } else if (currentX < -50) {
                    elements.card.classList.add('reject-hint');
                    elements.card.classList.remove('accept-hint');
                } else {
                    elements.card.classList.remove('accept-hint', 'reject-hint');
                }
            }
        }, { passive: true });

        container.addEventListener('touchend', () => {
            if (!isDragging || state.phase !== 'swipe') return;
            isDragging = false;

            elements.card.style.transition = '';
            elements.card.style.transform = '';
            elements.card.classList.remove('accept-hint', 'reject-hint');

            if (currentX > 100) {
                handleSwipe('accept');
            } else if (currentX < -100) {
                handleSwipe('reject');
            }

            currentX = 0;
        });

        // Mouse events for desktop
        container.addEventListener('mousedown', (e) => {
            if (state.phase !== 'swipe') return;
            startX = e.clientX;
            isDragging = true;
            elements.card.style.transition = 'none';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging || state.phase !== 'swipe') return;

            currentX = e.clientX - startX;
            const rotation = currentX * 0.1;
            elements.card.style.transform = `translateX(${currentX}px) rotate(${rotation}deg)`;

            if (currentX > 50) {
                elements.card.classList.add('accept-hint');
                elements.card.classList.remove('reject-hint');
            } else if (currentX < -50) {
                elements.card.classList.add('reject-hint');
                elements.card.classList.remove('accept-hint');
            } else {
                elements.card.classList.remove('accept-hint', 'reject-hint');
            }
        });

        document.addEventListener('mouseup', () => {
            if (!isDragging || state.phase !== 'swipe') return;
            isDragging = false;

            elements.card.style.transition = '';
            elements.card.style.transform = '';
            elements.card.classList.remove('accept-hint', 'reject-hint');

            if (currentX > 100) {
                handleSwipe('accept');
            } else if (currentX < -100) {
                handleSwipe('reject');
            }

            currentX = 0;
        });
    }

    // ==================== COMPARISON PHASE ====================
    /**
     * Swiss Tournament Implementation
     *
     * The Swiss system pairs players with similar scores against each other.
     * This efficiently finds top performers without requiring every possible pairing.
     */
    function startComparisonPhase() {
        showScreen('compare');

        // Initialize scores for all accepted words
        state.scores = {};
        state.accepted.forEach(word => {
            state.scores[word] = 0;
        });

        state.roundNumber = 0;
        state.comparisonsDone = 0;

        // Start first round
        startNewRound();
    }

    function startNewRound() {
        state.roundNumber++;

        // Sort words by score (descending), then shuffle within same score
        const sorted = [...state.accepted].sort((a, b) => {
            const scoreDiff = state.scores[b] - state.scores[a];
            if (scoreDiff !== 0) return scoreDiff;
            return Math.random() - 0.5; // Random order for same scores
        });

        // Create pairings (Swiss style: pair adjacent items in sorted list)
        state.comparisons = [];
        for (let i = 0; i < sorted.length - 1; i += 2) {
            state.comparisons.push([sorted[i], sorted[i + 1]]);
        }

        state.currentComparison = 0;
        showNextComparison();
    }

    function showNextComparison() {
        // Check if we should end
        if (shouldEndComparisons()) {
            endComparisonPhase();
            return;
        }

        // If we've done all comparisons in this round, start new round
        if (state.currentComparison >= state.comparisons.length) {
            startNewRound();
            return;
        }

        const [word1, word2] = state.comparisons[state.currentComparison];

        elements.compareCard1.querySelector('.compare-word').textContent = word1;
        elements.compareCard2.querySelector('.compare-word').textContent = word2;
        elements.compareCard1.classList.remove('selected');
        elements.compareCard2.classList.remove('selected');
        elements.compareCard1.classList.add('fade-in');
        elements.compareCard2.classList.add('fade-in');

        updateComparisonProgress();
    }

    function updateComparisonProgress() {
        const minRounds = Math.ceil(Math.log2(state.accepted.length));
        const progress = Math.min(state.roundNumber / minRounds, 1);
        const percentage = Math.round(progress * 100);
        elements.compareProgress.textContent = `Round ${state.roundNumber} - Narrowing down your values...`;
    }

    function handleComparison(cardIndex) {
        if (state.phase !== 'compare') return;

        const [word1, word2] = state.comparisons[state.currentComparison];
        const winner = cardIndex === 0 ? word1 : word2;

        // Visual feedback
        const selectedCard = cardIndex === 0 ? elements.compareCard1 : elements.compareCard2;
        selectedCard.classList.add('selected');

        // Update score
        state.scores[winner]++;
        state.comparisonsDone++;
        state.currentComparison++;

        setTimeout(() => {
            showNextComparison();
        }, 300);
    }

    /**
     * Determines if we have enough data to identify the top 4
     *
     * Conditions:
     * 1. Minimum rounds completed (ceil(log2(n)) rounds)
     * 2. Clear separation: 4th place score > 5th place score
     *
     * OR: We've done a maximum number of comparisons to prevent infinite loops
     */
    function shouldEndComparisons() {
        const n = state.accepted.length;
        const minRounds = Math.ceil(Math.log2(n));
        const maxComparisons = n * 3; // Safety limit

        // Must complete minimum rounds
        if (state.roundNumber < minRounds) {
            return false;
        }

        // Safety: max comparisons reached
        if (state.comparisonsDone >= maxComparisons) {
            return true;
        }

        // Check for clear top 4
        const sorted = getSortedWords();
        if (sorted.length >= 5) {
            const score4 = state.scores[sorted[3]];
            const score5 = state.scores[sorted[4]];
            // Clear gap between 4th and 5th
            if (score4 > score5) {
                return true;
            }
        }

        // After 2x minimum rounds, accept the results
        if (state.roundNumber >= minRounds * 2) {
            return true;
        }

        return false;
    }

    function getSortedWords() {
        return [...state.accepted].sort((a, b) => state.scores[b] - state.scores[a]);
    }

    function endComparisonPhase() {
        const sorted = getSortedWords();
        const top4 = sorted.slice(0, 4);
        showResults(top4);
    }

    // ==================== RESULTS ====================
    function showResults(words) {
        showScreen('result');

        const labels = ['#1', '#2', '#3', '#4'];

        elements.resultCards.innerHTML = words.map((word, index) => `
            <div class="result-card fade-in" style="animation-delay: ${index * 0.1}s">
                <span class="rank">${labels[index] || ''}</span>
                ${word}
            </div>
        `).join('');
    }

    // ==================== UTILITIES ====================
    function shuffle(array) {
        const result = [...array];
        for (let i = result.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [result[i], result[j]] = [result[j], result[i]];
        }
        return result;
    }

    // ==================== START ====================
    init();
})();