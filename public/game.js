let currentUserId = null;
let currentStake = 10;
let ws = null;

document.addEventListener('DOMContentLoaded', function() {
    initializeUser();
    loadWallet();
    initializeWebSocket();
    initializeLandingScreen();
});

function initializeLandingScreen() {
    const landingScreen = document.getElementById('landing-screen');
    const selectionScreen = document.getElementById('selection-screen');
    const gameScreen = document.getElementById('game-screen');
    const startBtn = document.getElementById('start-selection-btn');
    const stakeButtons = document.querySelectorAll('.stake-btn');
    
    stakeButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const stake = parseInt(this.dataset.stake);
            currentStake = stake;
            window.currentStake = stake;
            
            stakeButtons.forEach(b => b.classList.remove('active-stake'));
            this.classList.add('active-stake');
            
            if (startBtn) {
                startBtn.textContent = `▷ Play ${stake} ETB`;
            }
            
            const currentStakeDisplay = document.getElementById('current-stake');
            if (currentStakeDisplay) {
                currentStakeDisplay.textContent = stake;
            }
        });
    });
    
    if (startBtn) {
        startBtn.addEventListener('click', function() {
            if (landingScreen) landingScreen.style.display = 'none';
            if (selectionScreen) selectionScreen.style.display = 'flex';
            
            generateCardSelection();
        });
    }
    
    const confirmCardBtn = document.getElementById('confirm-card-btn');
    if (confirmCardBtn) {
        confirmCardBtn.addEventListener('click', async function() {
            if (selectedCardId) {
                const result = await handleCardConfirmation(selectedCardId);
                if (result.success) {
                    if (selectionScreen) selectionScreen.style.display = 'none';
                    if (gameScreen) gameScreen.style.display = 'flex';
                    renderPlayerCard(selectedCardId);
                } else {
                    alert(result.message || 'ካርድ ለማረጋገጥ አልተቻለም');
                }
            }
        });
    }
}

let selectedCardId = null;

function generateCardSelection() {
    const grid = document.getElementById('card-selection-grid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    const cardIds = [];
    while (cardIds.length < 6) {
        const randomId = Math.floor(Math.random() * 99) + 1;
        if (!cardIds.includes(randomId)) {
            cardIds.push(randomId);
        }
    }
    
    cardIds.forEach(cardId => {
        const cardElement = document.createElement('div');
        cardElement.className = 'selection-card';
        cardElement.dataset.cardId = cardId;
        
        const cardData = BINGO_CARDS[cardId];
        if (cardData) {
            cardElement.innerHTML = `
                <div class="card-header">Card #${cardId}</div>
                <div class="mini-card-grid">
                    ${cardData.map((row, rowIndex) => 
                        row.map((num, colIndex) => 
                            `<div class="mini-cell${rowIndex === 2 && colIndex === 2 ? ' free-space' : ''}">${num === 0 ? '★' : num}</div>`
                        ).join('')
                    ).join('')}
                </div>
            `;
        }
        
        cardElement.addEventListener('click', function() {
            document.querySelectorAll('.selection-card').forEach(c => c.classList.remove('selected'));
            this.classList.add('selected');
            selectedCardId = cardId;
            
            const confirmBtn = document.getElementById('confirm-card-btn');
            if (confirmBtn) {
                confirmBtn.disabled = false;
            }
            
            const status = document.getElementById('confirmation-status');
            if (status) {
                status.textContent = `ካርድ #${cardId} ተመርጧል`;
            }
        });
        
        grid.appendChild(cardElement);
    });
}

function renderPlayerCard(cardId) {
    const cardContainer = document.getElementById('player-bingo-card');
    if (!cardContainer) return;
    
    const cardData = BINGO_CARDS[cardId];
    if (!cardData) return;
    
    cardContainer.innerHTML = '';
    
    cardData.forEach((row, rowIndex) => {
        row.forEach((num, colIndex) => {
            const cell = document.createElement('div');
            cell.className = 'player-card-cell';
            cell.dataset.number = num;
            
            if (rowIndex === 2 && colIndex === 2) {
                cell.classList.add('free-space', 'marked');
                cell.textContent = '★';
            } else {
                cell.textContent = num;
            }
            
            cell.addEventListener('click', function() {
                if (num !== 0) {
                    this.classList.toggle('marked');
                }
            });
            
            cardContainer.appendChild(cell);
        });
    });
}

function initializeUser() {
    try {
        if (window.Telegram && window.Telegram.WebApp) {
            const tg = window.Telegram.WebApp;
            tg.ready();
            tg.expand();
            
            if (tg.initDataUnsafe && tg.initDataUnsafe.user && tg.initDataUnsafe.user.id) {
                currentUserId = tg.initDataUnsafe.user.id;
                console.log('Telegram user ID:', currentUserId);
            } else {
                const urlParams = new URLSearchParams(window.location.search);
                const tgId = urlParams.get('tg_id');
                if (tgId) {
                    currentUserId = parseInt(tgId);
                    console.log('Telegram ID from URL:', currentUserId);
                } else {
                    currentUserId = null;
                    console.log('No Telegram user ID available');
                }
            }
        } else {
            const urlParams = new URLSearchParams(window.location.search);
            const tgId = urlParams.get('tg_id');
            if (tgId) {
                currentUserId = parseInt(tgId);
                console.log('Telegram ID from URL:', currentUserId);
            } else {
                currentUserId = null;
                console.log('Telegram WebApp not available');
            }
        }
    } catch (error) {
        console.error('Error initializing user:', error);
        currentUserId = null;
    }
}

async function loadWallet() {
    if (!currentUserId) {
        console.log('No user ID, skipping wallet load');
        updateWalletDisplay(0);
        return;
    }
    
    try {
        const response = await fetch(`/api/wallet/${currentUserId}`);
        const data = await response.json();
        
        updateWalletDisplay(data.balance);
        
        if (data.stake) {
            currentStake = data.stake;
        }
        
        console.log('Wallet loaded:', data);
    } catch (error) {
        console.error('Error loading wallet:', error);
        updateWalletDisplay(0);
    }
}

function updateWalletDisplay(balance) {
    const walletElement = document.getElementById('main-wallet-value');
    if (walletElement) {
        walletElement.textContent = parseFloat(balance).toFixed(2);
    }
}

function initializeWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    
    ws = new WebSocket(wsUrl);
    
    ws.onopen = function() {
        console.log('WebSocket connected');
        if (currentUserId && currentUserId !== 999999) {
            ws.send(JSON.stringify({
                type: 'auth_telegram',
                telegramId: currentUserId.toString(),
                username: 'Player_' + currentUserId
            }));
        }
    };
    
    ws.onmessage = function(event) {
        try {
            const data = JSON.parse(event.data);
            handleWebSocketMessage(data);
        } catch (error) {
            console.error('Error parsing WebSocket message:', error);
        }
    };
    
    ws.onclose = function() {
        console.log('WebSocket disconnected');
        setTimeout(initializeWebSocket, 3000);
    };
    
    ws.onerror = function(error) {
        console.error('WebSocket error:', error);
    };
}

function handleWebSocketMessage(data) {
    switch (data.type) {
        case 'init':
            console.log('Game initialized:', data);
            updateTimerDisplay(data.timeLeft);
            updatePhaseDisplay(data.phase);
            renderMasterGrid();
            if (data.calledNumbers && data.calledNumbers.length > 0) {
                data.calledNumbers.forEach(num => {
                    markCalledNumber(num);
                    markMasterNumber(num);
                });
            }
            break;
        case 'auth_success':
            console.log('Authentication successful:', data.user);
            if (data.user && data.user.balance !== undefined) {
                updateWalletDisplay(data.user.balance);
            }
            break;
        case 'balance_update':
            updateWalletDisplay(data.balance);
            break;
        case 'card_confirmed':
            updateWalletDisplay(data.balance);
            renderMasterGrid();
            break;
        case 'phase_change':
            console.log('Phase changed:', data.phase);
            updatePhaseDisplay(data.phase);
            handlePhaseChange(data);
            break;
        case 'number_called':
            console.log('Number called:', data.letter + data.number);
            displayCalledNumber(data.letter, data.number);
            markCalledNumber(data.number);
            markMasterNumber(data.number);
            break;
        case 'timer_update':
            updateTimerDisplay(data.timeLeft);
            updatePhaseDisplay(data.phase);
            break;
        case 'error':
            alert(data.error || 'ችግር ተፈጥሯል');
            break;
        case 'bingo_rejected':
            alert(data.error || 'ቢንጎ ትክክል አይደለም');
            break;
        default:
            console.log('Unknown message type:', data.type);
    }
}

let calledNumbersSet = new Set();

function handlePhaseChange(data) {
    const gameScreen = document.getElementById('game-screen');
    const selectionScreen = document.getElementById('selection-screen');
    const landingScreen = document.getElementById('landing-screen');
    
    if (data.phase === 'selection') {
        // Clear previous game data
        clearCallHistory();
        clearMasterGrid();
        calledNumbersSet.clear();
        selectedCardId = null;
        
        // Clear player card marks
        const playerCells = document.querySelectorAll('.player-card-cell');
        playerCells.forEach(cell => cell.classList.remove('called', 'marked'));
        
        // If on game screen, go back to selection
        if (gameScreen && gameScreen.style.display === 'flex') {
            gameScreen.style.display = 'none';
            if (selectionScreen) {
                selectionScreen.style.display = 'flex';
            }
        }
        
        // Always regenerate cards in selection screen
        if (selectionScreen) {
            generateCardSelection();
        }
        
        // Reset confirm button
        const confirmBtn = document.getElementById('confirm-card-btn');
        if (confirmBtn) confirmBtn.disabled = true;
    } else if (data.phase === 'game') {
        // Game is starting
        renderMasterGrid();
    } else if (data.phase === 'winner') {
        if (data.winner) {
            showWinnerDisplay(data.winner);
        }
    }
}

function showWinnerDisplay(winner) {
    const message = `🎉 አሸናፊ: ${winner.username}\nካርድ: #${winner.cardId}${winner.prize ? '\nሽልማት: ' + winner.prize + ' ብር' : ''}`;
    alert(message);
}

function renderMasterGrid() {
    const masterGrid = document.getElementById('master-grid');
    if (!masterGrid) return;
    
    masterGrid.innerHTML = '';
    
    // Create 5 columns x 15 rows (75 numbers)
    for (let row = 0; row < 15; row++) {
        for (let col = 0; col < 5; col++) {
            const num = col * 15 + row + 1;
            const cell = document.createElement('div');
            cell.className = 'master-cell';
            cell.dataset.number = num;
            cell.textContent = num;
            masterGrid.appendChild(cell);
        }
    }
}

function markMasterNumber(number) {
    const masterGrid = document.getElementById('master-grid');
    if (!masterGrid) return;
    
    const cells = masterGrid.querySelectorAll('.master-cell');
    cells.forEach(cell => {
        if (parseInt(cell.dataset.number) === number) {
            cell.classList.add('called');
        }
    });
}

function clearMasterGrid() {
    const masterGrid = document.getElementById('master-grid');
    if (!masterGrid) return;
    
    const cells = masterGrid.querySelectorAll('.master-cell');
    cells.forEach(cell => cell.classList.remove('called'));
}

function clearCallHistory() {
    const historyElement = document.getElementById('call-history');
    if (historyElement) {
        historyElement.innerHTML = '';
    }
    
    const letterElement = document.getElementById('call-letter');
    const numberElement = document.getElementById('call-number');
    if (letterElement) letterElement.textContent = '';
    if (numberElement) numberElement.textContent = '--';
}

function updateTimerDisplay(timeLeft) {
    const timerElement = document.getElementById('time-left');
    if (timerElement) {
        timerElement.textContent = timeLeft + 's';
    }
}

function updatePhaseDisplay(phase) {
    const phaseElement = document.getElementById('game-phase');
    if (phaseElement) {
        if (phase === 'selection') {
            phaseElement.textContent = 'ካርድ ይምረጡ';
        } else if (phase === 'game') {
            phaseElement.textContent = 'ጨዋታ በሂደት ላይ';
        } else if (phase === 'winner') {
            phaseElement.textContent = 'አሸናፊ!';
        }
    }
}

function displayCalledNumber(letter, number) {
    const letterElement = document.getElementById('call-letter');
    const numberElement = document.getElementById('call-number');
    
    if (letterElement) {
        letterElement.textContent = letter;
    }
    if (numberElement) {
        numberElement.textContent = number;
    }
    
    const callCircle = document.getElementById('current-call');
    if (callCircle) {
        callCircle.classList.add('new-call');
        setTimeout(() => callCircle.classList.remove('new-call'), 500);
    }
    
    // Add to call history
    const historyElement = document.getElementById('call-history');
    if (historyElement) {
        const callItem = document.createElement('span');
        callItem.className = 'history-call';
        callItem.textContent = letter + number;
        historyElement.insertBefore(callItem, historyElement.firstChild);
    }
}

function markCalledNumber(number) {
    calledNumbersSet.add(number);
    
    const cells = document.querySelectorAll('.player-card-cell');
    cells.forEach(cell => {
        if (parseInt(cell.dataset.number) === number) {
            cell.classList.add('called');
        }
    });
}

async function handleCardConfirmation(cardId) {
    if (!currentUserId) {
        console.error('User not initialized');
        return { success: false, message: 'እባክዎ መጀመሪያ ከቴሌግራም ቦት ይመዝገቡ' };
    }
    
    try {
        const response = await fetch('/api/bet', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: currentUserId,
                stakeAmount: currentStake
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            updateWalletDisplay(result.balance);
            
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                    type: 'confirm_card',
                    cardId: cardId
                }));
            }
        }
        
        return result;
    } catch (error) {
        console.error('Error placing bet:', error);
        return { success: false, message: 'Bet failed' };
    }
}

function refreshBalance() {
    loadWallet();
}

// Bingo button functionality
function initializeBingoButton() {
    const bingoBtn = document.getElementById('bingo-btn');
    if (bingoBtn) {
        bingoBtn.addEventListener('click', function() {
            claimBingo();
        });
    }
    
    const exitBtn = document.getElementById('exit-btn');
    if (exitBtn) {
        exitBtn.addEventListener('click', function() {
            const gameScreen = document.getElementById('game-screen');
            const landingScreen = document.getElementById('landing-screen');
            if (gameScreen) gameScreen.style.display = 'none';
            if (landingScreen) landingScreen.style.display = 'flex';
        });
    }
    
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            refreshBalance();
        });
    }
}

function claimBingo() {
    if (!selectedCardId) {
        alert('ካርድ አልመረጡም');
        return;
    }
    
    const isValid = checkBingo(selectedCardId);
    
    if (isValid) {
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                type: 'claim_bingo',
                cardId: selectedCardId,
                isValid: true
            }));
        }
    } else {
        alert('ቢንጎ የለዎትም። ሙሉ መስመር ይፈልጉ።');
    }
}

function checkBingo(cardId) {
    const cardData = BINGO_CARDS[cardId];
    if (!cardData) return false;
    
    // Only use server-called numbers (not manually marked cells)
    const markedNumbers = calledNumbersSet;
    
    // Check rows
    for (let row = 0; row < 5; row++) {
        let rowComplete = true;
        for (let col = 0; col < 5; col++) {
            const num = cardData[row][col];
            if (num === 0) continue; // Free space
            if (!markedNumbers.has(num)) {
                rowComplete = false;
                break;
            }
        }
        if (rowComplete) return true;
    }
    
    // Check columns
    for (let col = 0; col < 5; col++) {
        let colComplete = true;
        for (let row = 0; row < 5; row++) {
            const num = cardData[row][col];
            if (num === 0) continue; // Free space
            if (!markedNumbers.has(num)) {
                colComplete = false;
                break;
            }
        }
        if (colComplete) return true;
    }
    
    // Check diagonals
    let diag1Complete = true;
    let diag2Complete = true;
    for (let i = 0; i < 5; i++) {
        const num1 = cardData[i][i];
        const num2 = cardData[i][4 - i];
        
        if (num1 !== 0 && !markedNumbers.has(num1)) diag1Complete = false;
        if (num2 !== 0 && !markedNumbers.has(num2)) diag2Complete = false;
    }
    
    if (diag1Complete || diag2Complete) return true;
    
    return false;
}

// Initialize Bingo button when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    initializeBingoButton();
});

window.currentUserId = currentUserId;
window.currentStake = currentStake;
window.handleCardConfirmation = handleCardConfirmation;
window.refreshBalance = refreshBalance;
window.claimBingo = claimBingo;
