const socket = (typeof io !== 'undefined') ? io() : null;

const boardEl = document.getElementById('board');
const turnEl = document.getElementById('turn-indicator');
const graveyardWhite = document.getElementById('graveyard-white'); 
const graveyardBlack = document.getElementById('graveyard-black'); 
const scoreWhiteEl = document.getElementById('score-white');
const scoreBlackEl = document.getElementById('score-black');
const btnRestart = document.getElementById('btn-restart');

let currentGameState = { turn: 'white', board: [] };
let selectedSquare = null;

const piecesUnicode = {
    'P': '♟', 'R': '♜', 'N': '♞', 'B': '♝', 'Q': '♛', 'K': '♚',
    'p': '♟', 'r': '♜', 'n': '♞', 'b': '♝', 'q': '♛', 'k': '♚',
};

// --- LOGICA DE XEQUE E XEQUE-MATE ---

// Acha a posição do Rei no tabuleiro
function findKing(color, board) {
    const targetKing = (color === 'white') ? 'K' : 'k';
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (board[r][c] === targetKing) return { r, c };
        }
    }
    return null;
}

// Verifica se uma posição específica está sendo atacada por alguém
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

// Verifica se o rei da cor informada está em Xeque
function isInCheck(color, board) {
    const kingPos = findKing(color, board);
    if (!kingPos) return false;
    const opponentColor = (color === 'white') ? 'black' : 'white';
    return isSquareAttacked(kingPos.r, kingPos.c, opponentColor, board);
}

// Verifica se o jogador não tem movimentos válidos (Mate ou Afogamento)
function hasNoLegalMoves(color, board) {
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = board[r][c];
            if (piece !== '') {
                const isWhite = piece === piece.toUpperCase();
                const pieceColor = isWhite ? 'white' : 'black';
                
                if (pieceColor === color) {
                    // Testa cada casa do tabuleiro para ver se essa peça pode ir pra lá
                    for (let tr = 0; tr < 8; tr++) {
                        for (let tc = 0; tc < 8; tc++) {
                            if (isValidMove(r, c, tr, tc, piece, board)) {
                                // Simula o movimento
                                const tempBoard = board.map(row => [...row]);
                                tempBoard[tr][tc] = piece;
                                tempBoard[r][c] = '';
                                
                                // Se esse movimento tira o rei do xeque, ainda há jogadas
                                if (!isInCheck(color, tempBoard)) return false;
                            }
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
    
    // Não pode bater na própria peça
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

// --- INTERAÇÃO ---
function onSquareClick(row, col) {
    const piece = currentGameState.board[row][col];
    const isMyTurn = (currentGameState.turn === 'white' && piece === piece.toUpperCase() && piece !== '') || 
                     (currentGameState.turn === 'black' && piece === piece.toLowerCase() && piece !== '');

    if (!selectedSquare) {
        if (piece && isMyTurn) {
            selectedSquare = { row, col };
            renderBoard();
        }
    } else {
        const fromR = selectedSquare.row, fromC = selectedSquare.col;
        const movingPiece = currentGameState.board[fromR][fromC];

        // 1. O movimento é fisicamente possível?
        if (isValidMove(fromR, fromC, row, col, movingPiece, currentGameState.board)) {
            
            // 2. Simula para ver se o movimento coloca o próprio rei em xeque (Regra Ilegal)
            const newBoard = currentGameState.board.map(r => [...r]);
            newBoard[row][col] = movingPiece;
            newBoard[fromR][fromC] = '';

            if (!isInCheck(currentGameState.turn, newBoard)) {
                socket.emit('makeMove', { board: newBoard });
            } else {
                alert("Movimento inválido: Você está em XEQUE!");
            }
        }
        selectedSquare = null;
        renderBoard();
    }
}

// --- RENDERIZAÇÃO ---
function renderBoard() {
    boardEl.innerHTML = '';
    const whiteInCheck = isInCheck('white', currentGameState.board);
    const blackInCheck = isInCheck('black', currentGameState.board);

    currentGameState.board.forEach((row, r) => {
        row.forEach((piece, c) => {
            const sq = document.createElement('div');
            sq.className = `square ${(r + c) % 2 === 0 ? 'light' : 'dark'}`;
            
            // Destaca o rei em vermelho se estiver em xeque
            if (piece === 'K' && whiteInCheck) sq.style.backgroundColor = '#ff4d4d';
            if (piece === 'k' && blackInCheck) sq.style.backgroundColor = '#ff4d4d';

            if (piece) {
                const span = document.createElement('span');
                span.className = 'piece';
                span.style.color = piece === piece.toUpperCase() ? '#fff' : '#000';
                span.textContent = piecesUnicode[piece];
                sq.appendChild(span);
            }
            if (selectedSquare?.row === r && selectedSquare?.col === c) sq.classList.add('highlight');
            sq.onclick = () => onSquareClick(r, c);
            boardEl.appendChild(sq);
        });
    });
}

function updateGameInfo() {
    const turn = currentGameState.turn;
    turnEl.textContent = `VEZ DAS ${turn === 'white' ? 'BRANCAS' : 'PRETAS'}`;
    
    // Verifica se o jogo acabou
    if (isInCheck(turn, currentGameState.board)) {
        if (hasNoLegalMoves(turn, currentGameState.board)) {
            const winner = turn === 'white' ? 'PRETAS' : 'BRANCAS';
            turnEl.textContent = `XEQUE-MATE! VITÓRIA DAS ${winner}`;
            turnEl.style.color = "var(--neon-red)";
        } else {
            turnEl.textContent += " (XEQUE!)";
        }
    }
}

// --- SOCKETS ---
if (socket) {
    socket.on('gameState', (state) => {
        currentGameState = state;
        renderBoard();
        updateGameInfo();
    });
    
    btnRestart.onclick = () => {
        if(confirm("Reiniciar a partida para todos?")) {
            turnEl.style.color = "white";
            socket.emit('restartGame');
        }
    };
}