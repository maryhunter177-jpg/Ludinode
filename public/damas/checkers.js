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
    const directions = piece.dama ? [[1,1],[1,-1],[-1,1],[-1,-1]] : 
                      (piece.color === 'white' ? [[-1,1],[-1,-1]] : [[1,1],[1,-1]]);

    directions.forEach(([dr, dc]) => {
        const midR = r + dr, midC = c + dc;
        const endR = r + dr * 2, endC = c + dc * 2;
        if (endR >= 0 && endR < 8 && endC >= 0 && endC < 8) {
            const midPiece = gameState.board[midR][midC];
            if (midPiece && midPiece !== '' && midPiece.color !== piece.color && gameState.board[endR][endC] === '') {
                jumps.push({ tr: endR, tc: endC });
            }
        }
    });
    return jumps;
}

function onSquareClick(r, c) {
    const piece = gameState.board[r][c];
    
    if (!gameState.selected) {
        if (piece && piece !== '' && piece.color === gameState.turn) {
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

    if (gameState.mustCaptureMoves?.length > 0) {
        const move = gameState.mustCaptureMoves.find(m => m.r === fR && m.c === fC);
        return move ? move.jumps.some(j => j.tr === tR && j.tc === tC) : false;
    }

    const dr = tR - fR;
    const dc = Math.abs(tC - fC);
    const validDir = piece.color === 'white' ? -1 : 1;
    
    if (dc === 1) {
        if (piece.dama) return Math.abs(dr) === 1;
        return dr === validDir;
    }
    return false;
}

function makeMove(fR, fC, tR, tC) {
    const piece = gameState.board[fR][fC];
    let captured = false;

    if (Math.abs(tR - fR) === 2) {
        gameState.board[fR + (tR - fR) / 2][fC + (tC - fC) / 2] = '';
        captured = true;
    }

    gameState.board[tR][tC] = piece;
    gameState.board[fR][fC] = '';

    if ((piece.color === 'white' && tR === 0) || (piece.color === 'black' && tR === 7)) {
        piece.dama = true;
    }

    if (captured && getAvailableJumps(tR, tC).length > 0) {
        gameState.selected = { r: tR, c: tC };
        checkRequiredCaptures();
        gameState.mustCaptureMoves = gameState.mustCaptureMoves.filter(m => m.r === tR && m.c === tC);
    } else {
        gameState.turn = gameState.turn === 'white' ? 'black' : 'white';
        checkRequiredCaptures();
    }

    if (socket) socket.emit('makeMoveCheckers', gameState);
    updateScores();
}

function updateScores() {
    let w = 0, b = 0;
    gameState.board.flat().forEach(p => {
        if (p?.color === 'white') w++;
        if (p?.color === 'black') b++;
    });
    if (scoreWhiteEl) scoreWhiteEl.textContent = `Restam: ${w}`;
    if (scoreBlackEl) scoreBlackEl.textContent = `Restam: ${b}`;
}

function render() {
    if (!boardEl) return;
    boardEl.innerHTML = '';
    
    gameState.board.forEach((row, r) => {
        row.forEach((piece, c) => {
            const sq = document.createElement('div');
            sq.className = `square ${(r + c) % 2 === 0 ? 'light' : 'dark'}`;
            
            // LOGICA DA MEMBRANINHA DE SELEÇÃO
            if (gameState.selected?.r === r && gameState.selected?.c === c) {
                sq.classList.add('highlight');
            }

            // LOGICA DO "OBRIGADO A COMER" (PULSO VERMELHO)
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
    if (turnEl) turnEl.textContent = `VEZ DAS ${gameState.turn === 'white' ? 'BRANCAS' : 'PRETAS'}`;
}

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
    if (restartBtn) restartBtn.onclick = () => socket.emit('restartCheckers');
}

initGame();