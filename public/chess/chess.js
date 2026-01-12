const socket = (typeof io !== 'undefined') ? io() : null;

const boardEl = document.getElementById('board');
const turnEl = document.getElementById('turn-indicator');
const graveyardWhite = document.getElementById('graveyard-white'); 
const graveyardBlack = document.getElementById('graveyard-black'); 
const btnRestart = document.getElementById('btn-restart');

let currentGameState = { turn: 'white', board: [] };
let selectedSquare = null;

const piecesUnicode = {
    'P': '♟', 'R': '♜', 'N': '♞', 'B': '♝', 'Q': '♛', 'K': '♚',
    'p': '♟', 'r': '♜', 'n': '♞', 'b': '♝', 'q': '♛', 'k': '♚',
};

// --- LOGICA DE XEQUE ---

function findKing(color, board) {
    const targetKing = (color === 'white') ? 'K' : 'k';
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (board[r][c] === targetKing) return { r, c };
        }
    }
    return null;
}

function isSquareAttacked(row, col, attackerColor, board) {
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = board[r][c];
            if (piece !== '') {
                const isWhite = piece === piece.toUpperCase();
                const pieceColor = isWhite ? 'white' : 'black';
                if (pieceColor === attackerColor) {
                    if (isValidMove(r, c, row, col, piece, board)) return true;
                }
            }
        }
    }
    return false;
}

function isInCheck(color, board) {
    const kingPos = findKing(color, board);
    if (!kingPos) return false;
    const opponentColor = (color === 'white') ? 'black' : 'white';
    return isSquareAttacked(kingPos.r, kingPos.c, opponentColor, board);
}

function hasNoLegalMoves(color, board) {
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = board[r][c];
            if (piece !== '' && ((piece === piece.toUpperCase()) === (color === 'white'))) {
                for (let tr = 0; tr < 8; tr++) {
                    for (let tc = 0; tc < 8; tc++) {
                        if (isValidMove(r, c, tr, tc, piece, board)) {
                            const tempBoard = board.map(row => [...row]);
                            tempBoard[tr][tc] = piece;
                            tempBoard[r][c] = '';
                            if (!isInCheck(color, tempBoard)) return false;
                        }
                    }
                }
            }
        }
    }
    return true;
}

// --- REGRAS DE MOVIMENTAÇÃO ---
function isValidMove(fromR, fromC, toR, toC, piece, board) {
    if (fromR === toR && fromC === toC) return false;
    const target = board[toR][toC];
    const isWhite = piece === piece.toUpperCase();
    if (target !== '' && (target === target.toUpperCase()) === isWhite) return false;

    const dr = Math.abs(toR - fromR);
    const dc = Math.abs(toC - fromC);
    const p = piece.toLowerCase();

    if (p === 'p') {
        const dir = isWhite ? -1 : 1;
        if (fromC === toC && target === '') {
            if (toR - fromR === dir) return true;
            if (fromR === (isWhite ? 6 : 1) && toR - fromR === 2 * dir && board[fromR + dir][fromC] === '') return true;
        }
        if (dc === 1 && toR - fromR === dir && target !== '') return true;
        return false;
    }
    if (p === 'n') return (dr === 2 && dc === 1) || (dr === 1 && dc === 2);
    if (p === 'k') return dr <= 1 && dc <= 1;

    if (p === 'r' || p === 'b' || p === 'q') {
        if (p === 'r' && dr !== 0 && dc !== 0) return false;
        if (p === 'b' && dr !== dc) return false;
        if (p === 'q' && dr !== dc && dr !== 0 && dc !== 0) return false;
        const stepR = toR === fromR ? 0 : (toR > fromR ? 1 : -1);
        const stepC = toC === fromC ? 0 : (toC > fromC ? 1 : -1);
        let curR = fromR + stepR, curC = fromC + stepC;
        while (curR !== toR || curC !== toC) {
            if (board[curR][curC] !== '') return false;
            curR += stepR; curC += stepC;
        }
        return true;
    }
    return false;
}

// --- LOGICA DA CPU ---
function makeCPUMove() {
    if (currentGameState.turn !== 'black') return;
    let legalMoves = [];
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = currentGameState.board[r][c];
            if (piece !== '' && piece === piece.toLowerCase()) {
                for (let tr = 0; tr < 8; tr++) {
                    for (let tc = 0; tc < 8; tc++) {
                        if (isValidMove(r, c, tr, tc, piece, currentGameState.board)) {
                            const tempBoard = currentGameState.board.map(row => [...row]);
                            tempBoard[tr][tc] = piece;
                            tempBoard[r][c] = '';
                            if (!isInCheck('black', tempBoard)) {
                                legalMoves.push({ fromR: r, fromC: c, toR: tr, toC: tc, board: tempBoard });
                            }
                        }
                    }
                }
            }
        }
    }
    if (legalMoves.length > 0) {
        const captures = legalMoves.filter(m => currentGameState.board[m.toR][m.toC] !== '');
        const chosenMove = captures.length > 0 
            ? captures[Math.floor(Math.random() * captures.length)] 
            : legalMoves[Math.floor(Math.random() * legalMoves.length)];

        setTimeout(() => {
            socket.emit('makeMove', { board: chosenMove.board });
        }, 1000);
    }
}

// --- INTERAÇÃO ---
function onSquareClick(row, col) {
    const piece = currentGameState.board[row][col];
    const isMyTurn = (currentGameState.turn === 'white' && piece === piece.toUpperCase() && piece !== '');

    if (!selectedSquare) {
        if (piece && isMyTurn) {
            selectedSquare = { row, col };
            renderBoard();
        }
    } else {
        const fromR = selectedSquare.row, fromC = selectedSquare.col;
        const movingPiece = currentGameState.board[fromR][fromC];

        if (isValidMove(fromR, fromC, row, col, movingPiece, currentGameState.board)) {
            const newBoard = currentGameState.board.map(r => [...r]);
            newBoard[row][col] = movingPiece;
            newBoard[fromR][fromC] = '';

            if (!isInCheck(currentGameState.turn, newBoard)) {
                socket.emit('makeMove', { board: newBoard });
            } else {
                alert("Movimento inválido: Rei em XEQUE!");
            }
        }
        selectedSquare = null;
        renderBoard();
    }
}

// --- RENDERIZAÇÃO E CEMITÉRIO ---
function updateGraveyard() {
    // Peças padrão que deveriam estar no tabuleiro
    const startingPieces = {
        'P': 8, 'R': 2, 'N': 2, 'B': 2, 'Q': 1, 'K': 1,
        'p': 8, 'r': 2, 'n': 2, 'b': 2, 'q': 1, 'k': 1
    };
    
    // Conta o que ainda está no tabuleiro
    const currentCounts = {};
    currentGameState.board.forEach(row => row.forEach(p => {
        if(p) currentCounts[p] = (currentCounts[p] || 0) + 1;
    }));

    // Renderiza capturadas
    graveyardWhite.innerHTML = '';
    graveyardBlack.innerHTML = '';

    for (let p in startingPieces) {
        const diff = startingPieces[p] - (currentCounts[p] || 0);
        for (let i = 0; i < diff; i++) {
            const span = document.createElement('span');
            span.className = 'dead-piece';
            span.textContent = piecesUnicode[p];
            if (p === p.toUpperCase()) {
                span.style.color = 'white';
                graveyardBlack.appendChild(span); // Brancas mortas vão para o painel das Pretas
            } else {
                span.style.color = 'black';
                graveyardWhite.appendChild(span); // Pretas mortas vão para o painel das Brancas
            }
        }
    }
}

function renderBoard() {
    boardEl.innerHTML = '';
    const whiteInCheck = isInCheck('white', currentGameState.board);
    const blackInCheck = isInCheck('black', currentGameState.board);

    currentGameState.board.forEach((row, r) => {
        row.forEach((piece, c) => {
            const sq = document.createElement('div');
            sq.className = `square ${(r + c) % 2 === 0 ? 'light' : 'dark'}`;
            
            if (piece === 'K' && whiteInCheck) sq.style.backgroundColor = '#ff4d4d';
            if (piece === 'k' && blackInCheck) sq.style.backgroundColor = '#ff4d4d';

            if (piece) {
                const span = document.createElement('span');
                span.className = 'piece';
                // VOLTOU PARA PRETO E BRANCO:
                span.style.color = piece === piece.toUpperCase() ? 'white' : 'black';
                span.textContent = piecesUnicode[piece];
                sq.appendChild(span);
            }
            if (selectedSquare?.row === r && selectedSquare?.col === c) sq.classList.add('highlight');
            sq.onclick = () => onSquareClick(r, c);
            boardEl.appendChild(sq);
        });
    });
    updateGraveyard();
}

function updateGameInfo() {
    const turn = currentGameState.turn;
    turnEl.textContent = turn === 'white' ? "SUA VEZ (BRANCAS)" : "CPU PENSANDO...";
    
    if (isInCheck(turn, currentGameState.board)) {
        if (hasNoLegalMoves(turn, currentGameState.board)) {
            const winner = turn === 'white' ? 'PRETAS' : 'BRANCAS';
            turnEl.textContent = `XEQUE-MATE! VITÓRIA DAS ${winner}`;
        } else {
            turnEl.textContent += " (XEQUE!)";
        }
    }
    if (turn === 'black') makeCPUMove();
}

if (socket) {
    socket.on('gameState', (state) => {
        currentGameState = state;
        renderBoard();
        updateGameInfo();
    });
    btnRestart.onclick = () => {
        if(confirm("Reiniciar a partida?")) socket.emit('restartGame');
    };
}