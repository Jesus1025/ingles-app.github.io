document.addEventListener('DOMContentLoaded', () => {
    const homeSection = document.getElementById('home-section');
    const phrasesSection = document.getElementById('phrases-section');
    const wordsSection = document.getElementById('words-section');
    const challengeSection = document.getElementById('challenge-section');
    const memoryGameSection = document.getElementById('memory-game-section');

    const learnPhrasesBtn = document.getElementById('learn-phrases-btn');
    const quickWordsBtn = document.getElementById('quick-words-btn');
    const wordChallengeBtn = document.getElementById('word-challenge-btn');
    const memoryGameBtn = document.getElementById('memory-game-btn');
    const backButtons = document.querySelectorAll('.back-button');

    const phrasesContainer = document.getElementById('phrases-container');
    const loadMorePhrasesBtn = document.getElementById('load-more-phrases-btn');
    const noMorePhrasesMsg = document.getElementById('no-more-phrases-msg');

    const wordsContainer = document.getElementById('words-container');
    const loadNewWordsBtn = document.getElementById('load-new-words-btn');

    // Elementos del Desafío de Palabras
    const challengeWordEnglish = document.getElementById('challenge-word-english');
    const challengeOptionsContainer = document.getElementById('challenge-options');
    const challengeFeedback = document.getElementById('challenge-feedback');
    const nextChallengeBtn = document.getElementById('next-challenge-btn');

    // Elementos del Juego de Memoria
    const memoryGrid = document.getElementById('memory-grid');
    const startMemoryGameBtn = document.getElementById('start-memory-game-btn');
    const matchesCountSpan = document.getElementById('matches-count');
    const totalPairsSpan = document.getElementById('total-pairs');
    const memoryGameFeedback = document.getElementById('memory-game-feedback');

    let allPhrases = [];
    let currentPhraseIndex = 0;
    const phrasesPerPage = 10;

    let allWords = []; // Usado para todas las secciones que requieren el diccionario
    let wordDictionary = {}; // Para tooltips en frases

    let currentCorrectWord = null; // Para el desafío de palabras

    // Variables para el Juego de Memoria
    const NUMBER_OF_PAIRS = 12; // Número de pares de palabras para el juego (24 cartas en total)
    let memoryCards = []; // Almacena los elementos DOM de las cartas
    let flippedCards = []; // Almacena las 2 cartas volteadas actualmente
    let matchedPairs = 0;
    let lockBoard = false; // Para evitar clics mientras las cartas se voltean/evalúan

    // --- Funciones de Carga de Datos ---

    async function loadData(filename) {
        try {
            const response = await fetch(`data/${filename}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`Error loading data from ${filename}:`, error);
            alert(`No se pudieron cargar los datos de ${filename}. Asegúrate de que los archivos JSON existen y Live Server está funcionando.`);
            return [];
        }
    }

    async function initializeData() {
        allPhrases = await loadData('phrases.json');
        shuffleArray(allPhrases);

        allWords = await loadData('words.json');
        wordDictionary = allWords.reduce((acc, word) => {
            acc[word.english.toLowerCase()] = word.spanish;
            return acc;
        }, {});
    }

    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    // --- Manejo de Vistas ---
    function showSection(sectionToShow) {
        const sections = [homeSection, phrasesSection, wordsSection, challengeSection, memoryGameSection];
        sections.forEach(section => {
            if (section === sectionToShow) {
                section.classList.remove('hidden-section');
                section.classList.add('section-visible');
            } else {
                section.classList.remove('section-visible');
                section.classList.add('hidden-section');
            }
        });
    }

    learnPhrasesBtn.addEventListener('click', () => {
        showSection(phrasesSection);
        if (phrasesContainer.children.length === 0) {
            loadMorePhrases();
        }
    });

    quickWordsBtn.addEventListener('click', () => {
        showSection(wordsSection);
        load10RandomWords();
    });

    wordChallengeBtn.addEventListener('click', () => {
        showSection(challengeSection);
        generateChallenge();
    });

    memoryGameBtn.addEventListener('click', () => {
        showSection(memoryGameSection);
        resetMemoryGame(); // Reiniciar estado y mostrar el botón de inicio
    });

    backButtons.forEach(button => {
        button.addEventListener('click', () => {
            showSection(homeSection);
            // Limpiar contenido al volver al inicio
            phrasesContainer.innerHTML = '';
            wordsContainer.innerHTML = '';
            challengeOptionsContainer.innerHTML = '';
            challengeFeedback.textContent = '';
            // Resetear estado del juego de memoria
            memoryGrid.innerHTML = '';
            matchesCountSpan.textContent = '0';
            totalPairsSpan.textContent = '0';
            memoryGameFeedback.textContent = '';
            startMemoryGameBtn.style.display = 'block';

            currentPhraseIndex = 0;
            noMorePhrasesMsg.classList.add('hidden');
            loadMorePhrasesBtn.style.display = 'block';
        });
    });

    // --- Funcionalidad de Frases ---
    function createPhraseCard(phraseData) {
        const card = document.createElement('div');
        card.classList.add('card');

        const englishPhraseElement = document.createElement('h3');
        const wordsAndPunctuation = phraseData.english.match(/\b\p{L}+[']?\p{L}*\b|[.,!?;:()"“”‘’]/gu); 

        if (wordsAndPunctuation) {
            englishPhraseElement.innerHTML = wordsAndPunctuation.map(segment => {
                if (segment.match(/\p{L}/u) && !segment.match(/^\d+$/)) {
                    const cleanWord = segment.replace(/^[.,!?;:()"“”‘’]+|[.,!?;:()"“”‘’]+$/g, '').toLowerCase(); 
                    const translation = wordDictionary[cleanWord] || 'Traducción no disponible'; 
                    
                    return `<span class="phrase-word" data-translation="${translation}">${segment}</span>`;
                }
                return segment;
            }).join('');
        } else {
            englishPhraseElement.textContent = phraseData.english;
        }

        card.appendChild(englishPhraseElement);

        const spanishTranslation = document.createElement('p');
        spanishTranslation.classList.add('translation');
        spanishTranslation.textContent = `Traducción: ${phraseData.spanish}`;
        card.appendChild(spanishTranslation);

        if (phraseData.explanation) {
            const explanation = document.createElement('p');
            explanation.classList.add('explanation');
            explanation.textContent = `Explicación: ${phraseData.explanation}`;
            card.appendChild(explanation);
        }
        return card;
    }

    function loadMorePhrases() {
        const startIndex = currentPhraseIndex;
        const endIndex = startIndex + phrasesPerPage;
        const phrasesToLoad = allPhrases.slice(startIndex, endIndex);

        if (phrasesToLoad.length === 0) {
            noMorePhrasesMsg.classList.remove('hidden');
            loadMorePhrasesBtn.style.display = 'none';
            return;
        }

        phrasesToLoad.forEach(phrase => {
            phrasesContainer.appendChild(createPhraseCard(phrase));
        });

        currentPhraseIndex = endIndex;

        if (currentPhraseIndex >= allPhrases.length) {
            noMorePhrasesMsg.classList.remove('hidden');
            loadMorePhrasesBtn.style.display = 'none';
        }
    }

    loadMorePhrasesBtn.addEventListener('click', loadMorePhrases);

    // --- Funcionalidad de 10 Palabras Rápidas ---
    function createWordCard(wordData) {
        const card = document.createElement('div');
        card.classList.add('card');

        const englishWord = document.createElement('h3');
        englishWord.textContent = wordData.english;
        card.appendChild(englishWord);

        const spanishTranslation = document.createElement('p');
        spanishTranslation.classList.add('translation');
        spanishTranslation.textContent = `Traducción: ${wordData.spanish}`;
        card.appendChild(spanishTranslation);

        return card;
    }

    function load10RandomWords() {
        wordsContainer.innerHTML = '';
        if (allWords.length === 0) {
            wordsContainer.innerHTML = '<p class="message">No hay palabras disponibles para cargar.</p>';
            return;
        }

        const shuffledWords = [...allWords];
        shuffleArray(shuffledWords);
        const randomWords = shuffledWords.slice(0, 10);

        randomWords.forEach(word => {
            wordsContainer.appendChild(createWordCard(word));
        });
    }

    loadNewWordsBtn.addEventListener('click', load10RandomWords);

    // --- Funcionalidad de Hover (Tooltip) para Palabras en Frases ---
    phrasesContainer.addEventListener('mouseover', (event) => {
        const target = event.target;
        if (target.classList.contains('phrase-word')) {
            const translation = target.dataset.translation; 

            if (translation) {
                if (!target.querySelector('.tooltip-text')) {
                    const tooltip = document.createElement('span');
                    tooltip.classList.add('tooltip-text');
                    tooltip.textContent = translation;
                    target.appendChild(tooltip);
                }
            }
        }
    });

    phrasesContainer.addEventListener('mouseout', (event) => {
        const target = event.target;
        if (target.classList.contains('phrase-word')) {
            const tooltip = target.querySelector('.tooltip-text');
            if (tooltip) {
                tooltip.remove();
            }
        }
    });

    // --- Funcionalidad del Desafío de Palabras ---

    function generateChallenge() {
        if (allWords.length < 4) {
            challengeWordEnglish.textContent = "¡Necesitas al menos 4 palabras en tu diccionario!";
            challengeOptionsContainer.innerHTML = "";
            challengeFeedback.textContent = "";
            nextChallengeBtn.style.display = 'none';
            return;
        }

        challengeFeedback.textContent = '';
        nextChallengeBtn.style.display = 'none';
        challengeOptionsContainer.innerHTML = '';

        const randomIndex = Math.floor(Math.random() * allWords.length);
        currentCorrectWord = allWords[randomIndex];

        challengeWordEnglish.textContent = currentCorrectWord.english;

        let incorrectOptions = [];
        let allPossibleOptions = [...allWords];
        allPossibleOptions.splice(randomIndex, 1);
        shuffleArray(allPossibleOptions);

        while (incorrectOptions.length < 3 && allPossibleOptions.length > 0) {
            const potentialIncorrect = allPossibleOptions.pop();
            if (potentialIncorrect.spanish.toLowerCase() !== currentCorrectWord.spanish.toLowerCase()) {
                incorrectOptions.push(potentialIncorrect.spanish);
            }
        }

        while (incorrectOptions.length < 3) {
             incorrectOptions.push("Opción de relleno " + (incorrectOptions.length + 1));
        }

        let allOptions = [currentCorrectWord.spanish, ...incorrectOptions];
        shuffleArray(allOptions);

        allOptions.forEach(option => {
            const button = document.createElement('button');
            button.classList.add('challenge-option-button');
            button.textContent = option;
            button.addEventListener('click', () => checkAnswer(button, option));
            challengeOptionsContainer.appendChild(button);
        });
    }

    function checkAnswer(selectedButton, selectedOption) {
        Array.from(challengeOptionsContainer.children).forEach(button => {
            button.classList.add('disabled');
        });

        if (selectedOption.toLowerCase() === currentCorrectWord.spanish.toLowerCase()) {
            selectedButton.classList.add('correct');
            challengeFeedback.textContent = '¡Correcto! Muy bien.';
            challengeFeedback.style.color = 'var(--correct-color)';
        } else {
            selectedButton.classList.add('incorrect');
            challengeFeedback.textContent = `Incorrecto. La respuesta correcta era: "${currentCorrectWord.spanish}"`;
            challengeFeedback.style.color = 'var(--incorrect-color)';

            Array.from(challengeOptionsContainer.children).forEach(button => {
                if (button.textContent.toLowerCase() === currentCorrectWord.spanish.toLowerCase()) {
                    button.classList.add('correct');
                }
            });
        }
        nextChallengeBtn.style.display = 'block';
    }

    nextChallengeBtn.addEventListener('click', generateChallenge);

    // --- Funcionalidad del Juego de Memoria (NUEVO JUEGO) ---

    function resetMemoryGame() {
        memoryGrid.innerHTML = ''; // Limpiar cualquier carta existente
        flippedCards = [];
        matchedPairs = 0;
        lockBoard = false;
        matchesCountSpan.textContent = '0';
        totalPairsSpan.textContent = '0';
        memoryGameFeedback.textContent = '';
        startMemoryGameBtn.style.display = 'block';
    }

    function initializeMemoryGame() {
        if (allWords.length < NUMBER_OF_PAIRS) {
            memoryGameFeedback.textContent = `Necesitas al menos ${NUMBER_OF_PAIRS} palabras únicas en tu diccionario para este juego.`;
            startMemoryGameBtn.style.display = 'none';
            return;
        }

        memoryGrid.innerHTML = ''; // Limpiar el grid antes de iniciar
        memoryGameFeedback.textContent = '';
        startMemoryGameBtn.style.display = 'none'; // Ocultar el botón de inicio

        // 1. Seleccionar un subconjunto aleatorio de palabras para los pares
        const availableWords = [...allWords];
        shuffleArray(availableWords);
        const selectedPairs = availableWords.slice(0, NUMBER_OF_PAIRS);

        // 2. Crear las cartas: cada palabra aparece dos veces (inglés y español)
        let gameCardsData = [];
        selectedPairs.forEach((word, index) => {
            const pairId = `pair-${index}`;
            gameCardsData.push({ id: pairId, type: 'english', text: word.english });
            gameCardsData.push({ id: pairId, type: 'spanish', text: word.spanish });
        });

        // 3. Mezclar las cartas
        shuffleArray(gameCardsData);

        // 4. Renderizar las cartas en el grid
        gameCardsData.forEach(cardData => {
            const cardElement = document.createElement('div');
            cardElement.classList.add('memory-card');
            cardElement.dataset.pairId = cardData.id;
            cardElement.dataset.cardType = cardData.type;

            // Crear las caras directamente como hijos de memory-card
            const cardBack = document.createElement('div');
            cardBack.classList.add('memory-card-face', 'memory-card-back');
            cardBack.textContent = '?'; // El signo de interrogación cuando está boca abajo

            const cardFront = document.createElement('div');
            cardFront.classList.add('memory-card-face', 'memory-card-front');
            cardFront.textContent = cardData.text; // La palabra visible cuando está volteada

            cardElement.appendChild(cardBack);
            cardElement.appendChild(cardFront);

            cardElement.addEventListener('click', () => flipCard(cardElement));
            memoryGrid.appendChild(cardElement);
        });

        totalPairsSpan.textContent = NUMBER_OF_PAIRS;
        matchesCountSpan.textContent = '0';
    }

    function flipCard(card) {
        if (lockBoard || card.classList.contains('flipped') || card.classList.contains('matched')) {
            return;
        }

        card.classList.add('flipped');
        flippedCards.push(card);

        if (flippedCards.length === 2) {
            lockBoard = true;
            checkForMatch();
        }
    }

    function checkForMatch() {
        const [card1, card2] = flippedCards;
        const isMatch = card1.dataset.pairId === card2.dataset.pairId;

        if (isMatch) {
            disableCards();
        } else {
            unflipCards();
        }
    }

    function disableCards() {
        const [card1, card2] = flippedCards;
        card1.classList.add('matched');
        card2.classList.add('matched');
        
        // Remover listeners para que no se puedan volver a voltear
        // Una vez emparejadas, no tienen efecto al hacer click
        card1.removeEventListener('click', () => flipCard(card1));
        card2.removeEventListener('click', () => flipCard(card2));

        matchedPairs++;
        matchesCountSpan.textContent = matchedPairs;
        resetBoard();

        if (matchedPairs === NUMBER_OF_PAIRS) {
            memoryGameFeedback.textContent = "¡Felicidades! ¡Has encontrado todos los pares!";
            memoryGameFeedback.style.color = 'var(--correct-color)';
            startMemoryGameBtn.style.display = 'block'; // Mostrar botón para jugar de nuevo
        }
    }

    function unflipCards() {
        setTimeout(() => {
            flippedCards[0].classList.remove('flipped');
            flippedCards[1].classList.remove('flipped');
            resetBoard();
        }, 1200); // Voltear después de 1.2 segundos
    }

    function resetBoard() {
        [flippedCards, lockBoard] = [[], false];
    }

    startMemoryGameBtn.addEventListener('click', initializeMemoryGame);


    // --- Inicialización ---
    initializeData();
});