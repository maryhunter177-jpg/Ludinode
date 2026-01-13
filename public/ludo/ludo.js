const boardEl = document.getElementById('ludo-board');
const diceEl = document.getElementById('dice');
const rollBtn = document.getElementById('roll-btn');
const statusEl = document.getElementById('status');
const logEl = document.getElementById('game-log');

let currentRoll = 0;
let currentPlayerIndex = 0; 
const players = ['red', 'green', 'yellow', 'blue'];
const playerNames = { red: 'VOCÊ', green: 'VERDE', yellow: 'AMARELO', blue: 'AZUL' };
const playerColors = { red: '#ff4d4d', green: '#2ecc71', yellow: '#f1c40f', blue: '#3498db' };

const winningScore = 4;
let scores = { red: 0, green: 0, yellow: 0, blue: 0 };

let isRolling = false;

const commonPath = [
    105, 106, 107, 108, 109, 94, 79, 64, 49, 34, 19, 20, 21, 36, 51, 66, 81, 96, 111, 112, 
    113, 114, 115, 116, 131, 146, 145, 144, 143, 142, 141, 156, 171, 186, 201, 216, 231, 230, 
    229, 214, 199, 184, 169, 154, 139, 138, 137, 136, 135, 134, 120, 105
];
const startIndexes = { red: 0, green: 13, yellow: 26, blue: 39 };

let pieceStates = [];
const basePositions = {
    red: [32, 34, 62, 64],
    green: [40, 42, 70, 72],
    yellow: [152, 154, 182, 184],
    blue: [160, 162, 190, 192]
};

players.forEach(color => {
    for(let i=0; i<4; i++) {
        pieceStates.push({ 
            id: color + i, 
            color: color, 
            posIndex: -1, 
            basePos: basePositions[color][i],
            isFinished: false
        });
    }
});

function addLog(msg, colorCode) {
    const entry = document.createElement('div');
    entry.style.padding = "4px 0";
    entry.style.borderBottom = "1px solid rgba(166, 124, 0, 0.1)";
    entry.style.color = colorCode || '#d2b48c';
    entry.innerHTML = `<strong>></strong> ${msg}`;
    logEl.appendChild(entry);
    logEl.scrollTop = logEl.scrollHeight;
}

function updateRanking() {
    players.forEach(color => {
        document.getElementById(`score-${color}`).textContent = scores[color];
    });
}

function createBoard() {
    boardEl.innerHTML = '';
    for (let i = 0; i < 225; i++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.index = i;
        const r = Math.floor(i/15), c = i%15;
        if (r < 6 && c < 6) cell.classList.add('base-red');
        else if (r < 6 && c > 8) cell.classList.add('base-green');
        else if (r > 8 && c < 6) cell.classList.add('base-yellow');
        else if (r > 8 && c > 8) cell.classList.add('base-blue');
        if (i === 112) cell.style.background = "#a67c00";
        boardEl.appendChild(cell);
    }
    renderPieces();
}

function renderPieces() {
    document.querySelectorAll('.piece-ludo').forEach(p => p.remove());
    pieceStates.forEach(p => {
        if (p.isFinished) return; // Peças que ganharam não aparecem mais no caminho

        let displayPos = p.posIndex === -1 ? p.basePos : commonPath[(startIndexes[p.color] + p.posIndex) % 52];
        const cell = document.querySelector(`[data-index="${displayPos}"]`);
        
        if (cell) {
            const pEl = document.createElement('div');
            pEl.className = `piece-ludo ${p.color}`;
            if (players[currentPlayerIndex] === 'red' && p.color === 'red' && currentRoll > 0) {
                // Lógica de verificação de movimento válido para ganhar
                if (p.posIndex === -1 && currentRoll === 6) {
                    pEl.style.boxShadow = "0 0 15px #fff";
                    pEl.onclick = () => tryMove(p);
                } else if (p.posIndex !== -1 && (p.posIndex + currentRoll <= 52)) {
                    pEl.style.boxShadow = "0 0 15px #fff";
                    pEl.onclick = () => tryMove(p);
                }
            }
            cell.appendChild(pEl);
        }
    });
}

async function rollDice() {
    if (isRolling) return;
    isRolling = true;
    rollBtn.disabled = true;

    for(let i=0; i<8; i++) {
        diceEl.textContent = Math.floor(Math.random() * 6) + 1;
        await new Promise(r => setTimeout(r, 70));
    }

    currentRoll = Math.floor(Math.random() * 6) + 1;
    diceEl.textContent = currentRoll;
    isRolling = false;
    
    const color = players[currentPlayerIndex];
    addLog(`${playerNames[color]} rolou ${currentRoll}`, playerColors[color]);
    checkTurnPossibilities();
}

rollBtn.onclick = rollDice;

function checkTurnPossibilities() {
    const color = players[currentPlayerIndex];
    const myPieces = pieceStates.filter(p => p.color === color && !p.isFinished);
    
    // Filtra peças que podem realmente se mover (considerando o limite de 52 casas)
    const movablePieces = myPieces.filter(p => {
        if (p.posIndex === -1) return currentRoll === 6;
        return (p.posIndex + currentRoll <= 52);
    });

    if (movablePieces.length === 0) {
        addLog(`Nenhum movimento possível para ${playerNames[color]}.`, "#777");
        setTimeout(nextTurn, 1000);
    } else {
        if (color === 'red') {
            statusEl.textContent = "Sua vez! Escolha uma peça.";
            renderPieces();
        } else {
            setTimeout(() => cpuThinkAndMove(movablePieces), 800);
        }
    }
}

function cpuThinkAndMove(movable) {
    // Prioridade: Entrar no jogo ou finalizar peça
    const finisher = movable.find(p => p.posIndex + currentRoll === 52);
    const starter = movable.find(p => p.posIndex === -1 && currentRoll === 6);
    const pieceToMove = finisher || starter || movable[0];
    tryMove(pieceToMove);
}

function tryMove(piece) {
    if (currentRoll === 0) return;
    const color = piece.color;

    if (piece.posIndex === -1 && currentRoll === 6) {
        piece.posIndex = 0;
        addLog(`${playerNames[color]} entrou no campo de batalha!`, playerColors[color]);
    } else {
        piece.posIndex += currentRoll;
        addLog(`${playerNames[color]} avançou para a casa ${piece.posIndex}/52`, playerColors[color]);
    }

    // VERIFICA VITÓRIA DA PEÇA
    if (piece.posIndex === 52) {
        piece.isFinished = true;
        scores[color]++;
        addLog(`🏆 UMA PEÇA DE ${playerNames[color]} CHEGOU AO DESTINO!`, "#a67c00");
        updateRanking();
        
        if (scores[color] === winningScore) {
            alert(`FIM DE JOGO! O CLÃ ${playerNames[color]} É O VENCEDOR!`);
            location.reload();
            return;
        }
    }

    checkCapture(piece);
    
    const rolledSix = currentRoll === 6;
    currentRoll = 0; 
    renderPieces();

    if (rolledSix) {
        addLog(`${playerNames[color]} joga novamente!`, playerColors[color]);
        if (players[currentPlayerIndex] !== 'red') {
            setTimeout(rollDice, 1000);
        } else {
            rollBtn.disabled = false;
        }
    } else {
        nextTurn();
    }
}

function checkCapture(movingPiece) {
    if (movingPiece.posIndex === -1 || movingPiece.isFinished) return;
    const currentPos = commonPath[(startIndexes[movingPiece.color] + movingPiece.posIndex) % 52];
    
    pieceStates.forEach(p => {
        if (p.color !== movingPiece.color && p.posIndex !== -1 && !p.isFinished) {
            const targetPos = commonPath[(startIndexes[p.color] + p.posIndex) % 52];
            if (currentPos === targetPos) {
                p.posIndex = -1;
                addLog(`⚔️ ${playerNames[movingPiece.color]} derrubou o ${playerNames[p.color]}!`, "#ffa500");
            }
        }
    });
}

function nextTurn() {
    currentPlayerIndex = (currentPlayerIndex + 1) % 4;
    const color = players[currentPlayerIndex];
    statusEl.textContent = `Vez de ${playerNames[color]}...`;
    
    if (color === 'red') {
        rollBtn.disabled = false;
    } else {
        rollBtn.disabled = true;
        setTimeout(rollDice, 1000);
    }
    renderPieces();
}

updateRanking();
addLog("As Crônicas começam: Bem-vindo à Arena!", "#a67c00");
createBoard();