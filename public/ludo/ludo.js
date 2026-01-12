const socket = io();
const boardEl = document.getElementById('ludo-board');
const diceEl = document.getElementById('dice');
const rollBtn = document.getElementById('roll-btn');
const statusEl = document.getElementById('status');

let currentRoll = 0;

// Mapeamento do caminho do Ludo (índices do grid 15x15)
const paths = {
    red: [91, 92, 93, 94, 95, 81, 66, 51, 36, 21, 6, 7, 8, 23, 38, 53, 68, 83, 99, 100, 101, 102, 103, 104, 119, 134, 133, 132, 131, 130, 129, 143, 158, 173, 188, 203, 218, 217, 216, 201, 186, 171, 156, 141, 125, 124, 123, 122, 121, 120, 105],
    // Adicione os outros caminhos conforme necessário
};

let pieceStates = [
    { id: 'r1', color: 'red', posIndex: -1, basePos: 32 },
    { id: 'r2', color: 'red', posIndex: -1, basePos: 34 },
    { id: 'g1', color: 'green', posIndex: -1, basePos: 40 },
    { id: 'g2', color: 'green', posIndex: -1, basePos: 42 },
    { id: 'y1', color: 'yellow', posIndex: -1, basePos: 182 },
    { id: 'y2', color: 'yellow', posIndex: -1, basePos: 184 },
    { id: 'b1', color: 'blue', posIndex: -1, basePos: 190 },
    { id: 'b2', color: 'blue', posIndex: -1, basePos: 192 }
];

function createBoard() {
    boardEl.innerHTML = '';
    for (let i = 0; i < 225; i++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.index = i;
        const row = Math.floor(i / 15);
        const col = i % 15;

        if (row < 6 && col < 6) cell.classList.add('base-red');
        else if (row < 6 && col > 8) cell.classList.add('base-green');
        else if (row > 8 && col < 6) cell.classList.add('base-yellow');
        else if (row > 8 && col > 8) cell.classList.add('base-blue');

        boardEl.appendChild(cell);
    }
    renderPieces();
}

function renderPieces() {
    document.querySelectorAll('.piece-ludo').forEach(p => p.remove());
    pieceStates.forEach(p => {
        const targetIndex = p.posIndex === -1 ? p.basePos : paths.red[p.posIndex]; // Simplificado para teste com Red
        const cell = document.querySelector(`[data-index="${targetIndex}"]`);
        if (cell) {
            const pEl = document.createElement('div');
            pEl.className = `piece-ludo ${p.color}`;
            pEl.onclick = () => movePiece(p);
            cell.appendChild(pEl);
        }
    });
}

rollBtn.onclick = () => socket.emit('rollDice');

socket.on('diceResult', (result) => {
    currentRoll = result;
    diceEl.textContent = result;
    diceEl.style.boxShadow = "0 0 30px #00f2fe";
});

function movePiece(piece) {
    if (currentRoll === 0) return;

    if (piece.posIndex === -1) {
        if (currentRoll === 6) piece.posIndex = 0; // Sai da base com 6
    } else {
        piece.posIndex = Math.min(piece.posIndex + currentRoll, paths.red.length - 1);
    }

    currentRoll = 0;
    diceEl.style.boxShadow = "none";
    renderPieces();
}

createBoard();