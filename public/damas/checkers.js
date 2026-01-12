const socket = (typeof io !== 'undefined') ? io() : null;
const boardEl = document.getElementById('board');
const turnEl = document.getElementById('turn-indicator');
const scoreWhiteEl = document.getElementById('score-white');
const scoreBlackEl = document.getElementById('score-black');
const chatInput = document.getElementById('chat-input');
const chatSend = document.getElementById('chat-send');
const chatMessages = document.getElementById('chat-messages');

let gameState = {
    board: [],
    turn: 'white',
    selected: null,
    mustCaptureMoves: []
};

// --- INICIALIZAÇÃO ---
function initGame() {
    gameState.board = Array(8).fill(null).map(() => Array(8).fill(null));
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if ((r + c) % 2 !== 0) {
                if (r < 3) gameState.board[r][c] = { color: 'black', dama: false };
                else if (r > 4) gameState.board[r][c] = { color: 'white', dama: false };
                else gameState.board[r][c] = '';
            } else {
                gameState.board[r][c] = null;
            }
        }
    }
    checkRequiredCaptures();
    render();
}

// --- LÓGICA DE CAPTURA OBRIGATÓRIA ---
function checkRequiredCaptures() {
    gameState.mustCaptureMoves = [];
    if (!gameState.board) return;

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = gameState.board[r][c];
            if (piece && piece !== '' && piece.color === gameState.turn) {
                const jumps = getAvailableJumps(r, c);
                if (jumps && jumps.length > 0) {
                    gameState.mustCaptureMoves.push({ r, c, jumps });
                }
            }
        }
    }
}

function getAvailableJumps(r, c) {
    const piece = gameState.board[r][c];
    if (!piece || piece === '') return [];
    const jumps = [];
    
    // Direções: Damas movem em todas, peças normais apenas para frente (baseado na cor)
    const directions = piece.dama ? [[1,1],[1,-1],[-1,1],[-1,-1]] : 
                      (piece.color === 'white' ? [[-1,1],[-1,-1]] : [[1,1],[1,-1]]);

    directions.forEach(([dr, dc]) => {
        const midR = r + dr, midC = c + dc;
        const endR = r + dr * 2, endC = c + dc * 2;
        
        if (endR >= 0 && endR < 8 && endC >= 0 && endC < 8) {
            const midPiece = gameState.board[midR][midC];
            // Verifica se tem inimigo no meio e espaço vazio depois
            if (midPiece && midPiece !== '' && midPiece.color !== piece.color && gameState.board[endR][endC] === '') {
                jumps.push({ tr: endR, tc: endC });
            }
        }
    });
    return jumps;
}

// --- LÓGICA DA CPU ---
function makeCPUMove() {
    if (gameState.turn !== 'black') return;

    setTimeout(() => {
        let possibleMoves = [];

        // 1. Prioridade máxima: Capturas obrigatórias
        if (gameState.mustCaptureMoves.length > 0) {
            const moveData = gameState.mustCaptureMoves[Math.floor(Math.random() * gameState.mustCaptureMoves.length)];
            const jump = moveData.jumps[Math.floor(Math.random() * moveData.jumps.length)];
            makeMove(moveData.r, moveData.c, jump.tr, jump.tc);
            return;
        }

        // 2. Movimentos normais (se não houver capturas)
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = gameState.board[r][c];
                if (piece && piece.color === 'black') {
                    const directions = piece.dama ? [[1,1],[1,-1],[-1,1],[-1,-1]] : [[1,1],[1,-1]];
                    directions.forEach(([dr, dc]) => {
                        const tr = r + dr, tc = c + dc;
                        if (tr >= 0 && tr < 8 && tc >= 0 && tc < 8 && gameState.board[tr][tc] === '') {
                            possibleMoves.push({ fR: r, fC: c, tR: tr, tC: tc });
                        }
                    });
                }
            }
        }

        if (possibleMoves.length > 0) {
            const move = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
            makeMove(move.fR, move.fC, move.tR, move.tC);
        }
    }, 800); // Delay para parecer que está pensando
}

// --- INTERAÇÃO DO JOGADOR ---
function onSquareClick(r, c) {
    if (gameState.turn === 'black') return; // Impede clicar na vez da CPU

    const piece = gameState.board[r][c];
    
    if (!gameState.selected) {
        if (piece && piece !== '' && piece.color === gameState.turn) {
            // Se tem captura obrigatória, só deixa selecionar quem pode capturar
            if (gameState.mustCaptureMoves?.length > 0) {
                if (!gameState.mustCaptureMoves.some(m => m.r === r && m.c === c)) return;
            }
            gameState.selected = { r, c };
        }
    } else {
        if (isValidMove(gameState.selected.r, gameState.selected.c, r, c)) {
            makeMove(gameState.selected.r, gameState.selected.c, r, c);
        }
        gameState.selected = null;
    }
    render();
}

function isValidMove(fR, fC, tR, tC) {
    const piece = gameState.board[fR][fC];
    if (!piece || gameState.board[tR][tC] !== '') return false;

    // Se existe captura obrigatória na mesa
    if (gameState.mustCaptureMoves?.length > 0) {
        const move = gameState.mustCaptureMoves.find(m => m.r === fR && m.c === fC);
        return move ? move.jumps.some(j => j.tr === tR && j.tc === tC) : false;
    }

    const dr = tR - fR;
    const dc = Math.abs(tC - fC);
    const validDir = piece.color === 'white' ? -1 : 1;
    
    // Movimento diagonal simples
    if (dc === 1) {
        if (piece.dama) return Math.abs(dr) === 1;
        return dr === validDir;
    }
    return false;
}

// --- EXECUTAR MOVIMENTO ---
function makeMove(fR, fC, tR, tC) {
    const piece = gameState.board[fR][fC];
    let captured = false;

    // Se pulou 2 casas, houve captura
    if (Math.abs(tR - fR) === 2) {
        gameState.board[fR + (tR - fR) / 2][fC + (tC - fC) / 2] = '';
        captured = true;
    }

    gameState.board[tR][tC] = piece;
    gameState.board[fR][fC] = '';

    // Transformar em dama
    if ((piece.color === 'white' && tR === 0) || (piece.color === 'black' && tR === 7)) {
        piece.dama = true;
    }

    // Regra de capturas múltiplas (Combo)
    if (captured && getAvailableJumps(tR, tC).length > 0) {
        gameState.selected = { r: tR, c: tC };
        checkRequiredCaptures();
        // Força o próximo movimento a ser com a mesma peça
        gameState.mustCaptureMoves = gameState.mustCaptureMoves.filter(m => m.r === tR && m.c === tC);
        
        if (gameState.turn === 'black') makeCPUMove(); // CPU continua se puder comer mais
    } else {
        gameState.turn = gameState.turn === 'white' ? 'black' : 'white';
        checkRequiredCaptures();
        if (gameState.turn === 'black') makeCPUMove(); // Passa a vez para a CPU
    }

    if (socket) socket.emit('makeMoveCheckers', gameState);
    updateScores();
    render();
}

// --- UI E RENDERIZAÇÃO ---
function updateScores() {
    let w = 0, b = 0;
    gameState.board.flat().forEach(p => {
        if (p?.color === 'white') w++;
        if (p?.color === 'black') b++;
    });
    if (scoreWhiteEl) scoreWhiteEl.textContent = `Restam: ${w}`;
    if (scoreBlackEl) scoreBlackEl.textContent = `Restam: ${b}`;

    if (w === 0 || b === 0) {
        const winner = w === 0 ? "PRETAS" : "BRANCAS";
        alert(`FIM DE JOGO! Vitória das ${winner}`);
    }
}

function render() {
    if (!boardEl) return;
    boardEl.innerHTML = '';
    
    gameState.board.forEach((row, r) => {
        row.forEach((piece, c) => {
            const sq = document.createElement('div');
            sq.className = `square ${(r + c) % 2 === 0 ? 'light' : 'dark'}`;
            
            if (gameState.selected?.r === r && gameState.selected?.c === c) {
                sq.classList.add('highlight');
            }

            const isMustJump = gameState.mustCaptureMoves?.some(m => m.r === r && m.c === c);
            if (isMustJump) {
                sq.classList.add('must-jump');
            }

            if (piece && piece !== '') {
                const pDiv = document.createElement('div');
                pDiv.className = `piece ${piece.color}-piece ${piece.dama ? 'is-dama' : ''}`;
                sq.appendChild(pDiv);
            }
            
            sq.onclick = () => onSquareClick(r, c);
            boardEl.appendChild(sq);
        });
    });
    if (turnEl) {
        turnEl.textContent = gameState.turn === 'white' ? 'SUA VEZ (BRANCAS)' : 'CPU PENSANDO...';
        turnEl.style.color = gameState.turn === 'white' ? 'var(--neon-blue)' : '#a855f7';
    }
}

// --- CHAT E SOCKETS ---
function sendMessage() {
    const text = chatInput.value.trim();
    if (text && socket) {
        socket.emit('checkersChatMsg', { text, color: gameState.turn });
        chatInput.value = '';
    }
}

if (chatSend) chatSend.onclick = sendMessage;
if (chatInput) chatInput.onkeydown = (e) => { if (e.key === 'Enter') sendMessage(); };

if (socket) {
    socket.on('checkersGameState', (state) => {
        gameState = state;
        render();
        updateScores();
    });

    socket.on('checkersChatMsg', (msg) => {
        const div = document.createElement('div');
        div.className = `msg msg-${msg.color}`;
        div.textContent = msg.text;
        chatMessages.appendChild(div);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    });

    const restartBtn = document.getElementById('btn-restart');
    if (restartBtn) restartBtn.onclick = () => {
        if(confirm("Reiniciar partida contra a CPU?")) socket.emit('restartCheckers');
    };
}

initGame();