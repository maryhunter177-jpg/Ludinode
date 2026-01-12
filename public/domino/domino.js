class DominoGame {
    constructor() {
        this.deck = [];
        this.playerHand = [];
        this.cpuHand = [];
        this.board = [];
        this.ends = { left: null, right: null };
        this.turn = 'player';
        this.scores = { player: 0, cpu: 0 };
        this.selectedPieceIndex = null;
        
        // Mapeamento das posições das bolinhas (grid 3x3)
        this.dotPatterns = {
            0: [],
            1: [4],
            2: [0, 8],
            3: [0, 4, 8],
            4: [0, 2, 6, 8],
            5: [0, 2, 4, 6, 8],
            6: [0, 2, 3, 5, 6, 8]
        };

        this.init();
    }

    init() {
        this.deck = [];
        this.playerHand = [];
        this.cpuHand = [];
        this.board = [];
        this.ends = { left: null, right: null };
        this.turn = 'player';
        this.selectedPieceIndex = null;

        this.createDeck();
        this.shuffle();
        this.playerHand = this.deck.splice(0, 7);
        this.cpuHand = this.deck.splice(0, 7);
        
        this.setupEventListeners();
        this.render();
    }

    createDeck() {
        for (let i = 0; i <= 6; i++) {
            for (let j = i; j <= 6; j++) {
                this.deck.push({ a: i, b: j });
            }
        }
    }

    shuffle() {
        this.deck.sort(() => Math.random() - 0.5);
    }

    setupEventListeners() {
        const drawBtn = document.getElementById('draw-btn');
        const skipBtn = document.getElementById('skip-btn');
        
        if(drawBtn) drawBtn.onclick = () => this.drawPiece();
        if(skipBtn) skipBtn.onclick = () => this.skipTurn();
    }

    drawPiece() {
        if (this.turn !== 'player' || this.deck.length === 0) return;
        this.playerHand.push(this.deck.shift());
        this.selectedPieceIndex = null;
        this.render();
        this.checkDraw();
    }

    skipTurn() {
        if (this.turn !== 'player') return;
        this.selectedPieceIndex = null;
        this.endTurn();
    }

    selectPiece(index) {
        if (this.turn !== 'player') return;
        this.selectedPieceIndex = (this.selectedPieceIndex === index) ? null : index;
        this.render();
    }

    tryMove(side) {
        if (this.selectedPieceIndex === null) return;
        const piece = this.playerHand[this.selectedPieceIndex];
        
        if (this.board.length === 0) {
            this.executeMove(this.selectedPieceIndex, true, 'right', piece);
        } else if (side === 'left') {
            if (piece.a === this.ends.left) this.executeMove(this.selectedPieceIndex, true, 'left', { a: piece.b, b: piece.a });
            else if (piece.b === this.ends.left) this.executeMove(this.selectedPieceIndex, true, 'left', piece);
            else alert("Não encaixa na esquerda!");
        } else {
            if (piece.a === this.ends.right) this.executeMove(this.selectedPieceIndex, true, 'right', piece);
            else if (piece.b === this.ends.right) this.executeMove(this.selectedPieceIndex, true, 'right', { a: piece.b, b: piece.a });
            else alert("Não encaixa na direita!");
        }
        this.selectedPieceIndex = null;
    }

    executeMove(index, isPlayer, side, pieceData) {
        const hand = isPlayer ? this.playerHand : this.cpuHand;
        hand.splice(index, 1);
        
        if (side === 'right') {
            this.board.push(pieceData);
            this.ends.right = pieceData.b;
            if (this.board.length === 1) this.ends.left = pieceData.a;
        } else {
            this.board.unshift(pieceData);
            this.ends.left = pieceData.a;
        }
        
        this.render();
        if (!this.checkWin()) this.endTurn();
    }

    endTurn() {
        this.turn = this.turn === 'player' ? 'cpu' : 'player';
        document.getElementById('status-msg').innerText = this.turn === 'player' ? "Sua vez!" : "CPU jogando...";
        if (this.turn === 'cpu') setTimeout(() => this.cpuPlay(), 1200);
    }

    cpuPlay() {
        let move = null;
        for (let i = 0; i < this.cpuHand.length; i++) {
            const p = this.cpuHand[i];
            if (this.board.length === 0) { move = {i, s:'right', d:p}; break; }
            if (p.a === this.ends.right) { move = {i, s:'right', d:p}; break; }
            if (p.b === this.ends.right) { move = {i, s:'right', d:{a:p.b, b:p.a}}; break; }
            if (p.b === this.ends.left) { move = {i, s:'left', d:p}; break; }
            if (p.a === this.ends.left) { move = {i, s:'left', d:{a:p.b, b:p.a}}; break; }
        }

        if (move) {
            this.executeMove(move.i, false, move.s, move.d);
        } else if (this.deck.length > 0) {
            this.cpuHand.push(this.deck.shift());
            this.render();
            setTimeout(() => this.cpuPlay(), 800);
        } else {
            this.endTurn();
        }
    }

    checkWin() {
        if (this.playerHand.length === 0) { this.scores.player += 20; alert("Vitória!"); this.init(); return true; }
        if (this.cpuHand.length === 0) { this.scores.cpu += 20; alert("Derrota!"); this.init(); return true; }
        return false;
    }

    checkDraw() {
        const canPlay = (h) => h.some(p => p.a === this.ends.left || p.b === this.ends.left || p.a === this.ends.right || p.b === this.ends.right);
        if (!canPlay(this.playerHand) && !canPlay(this.cpuHand) && this.deck.length === 0 && this.board.length > 0) {
            alert("Jogo fechado! Empate."); this.init(); return true;
        }
        return false;
    }

    createSideElement(value) {
        const sideDiv = document.createElement('div');
        sideDiv.className = 'side';
        for (let i = 0; i < 9; i++) {
            const dot = document.createElement('div');
            dot.className = 'dot';
            if (this.dotPatterns[value].includes(i)) dot.classList.add('active');
            sideDiv.appendChild(dot);
        }
        return sideDiv;
    }

    createPieceElement(piece, orientation) {
        const div = document.createElement('div');
        div.className = `domino-piece ${orientation}`;
        div.appendChild(this.createSideElement(piece.a));
        div.appendChild(this.createSideElement(piece.b));
        return div;
    }

    render() {
        const handEl = document.getElementById('player-hand');
        const boardEl = document.getElementById('game-board');
        const cpuCountEl = document.getElementById('opp-hand-count');
        const scoreEl = document.getElementById('score-display');

        if(handEl) handEl.innerHTML = ''; 
        if(boardEl) boardEl.innerHTML = '';
        
        if(cpuCountEl) cpuCountEl.innerText = `CPU: ${this.cpuHand.length} | Monte: ${this.deck.length}`;
        if(scoreEl) scoreEl.innerText = `Você: ${this.scores.player} | CPU: ${this.scores.cpu}`;

        this.playerHand.forEach((p, i) => {
            const div = this.createPieceElement(p, 'vertical');
            if (this.selectedPieceIndex === i) div.classList.add('selected');
            div.onclick = () => this.selectPiece(i);
            handEl.appendChild(div);
        });

        if (this.board.length > 0) {
            const l = document.createElement('div'); l.className = 'drop-zone'; l.innerText = 'L';
            l.onclick = () => this.tryMove('left'); boardEl.appendChild(l);
            
            this.board.forEach(p => {
                const isD = p.a === p.b;
                const div = this.createPieceElement(p, isD ? 'vertical' : 'horizontal');
                if (isD) div.classList.add('double');
                boardEl.appendChild(div);
            });
            
            const r = document.createElement('div'); r.className = 'drop-zone'; r.innerText = 'R';
            r.onclick = () => this.tryMove('right'); boardEl.appendChild(r);
        } else {
            const s = document.createElement('div'); s.className = 'drop-zone'; s.innerText = 'INICIAR';
            s.onclick = () => this.tryMove('right'); boardEl.appendChild(s);
        }
    }
}

new DominoGame();