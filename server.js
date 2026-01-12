const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Permite conexões de qualquer origem quando estiver online
        methods: ["GET", "POST"]
    }
});

app.use(express.static(path.join(__dirname, 'public')));

// --- ESTADOS INICIAIS ---

function getInitialChessState() {
    return {
        board: [
            ['r','n','b','q','k','b','n','r'],
            ['p','p','p','p','p','p','p','p'],
            ['','','','','','','',''],
            ['','','','','','','',''],
            ['','','','','','','',''],
            ['','','','','','','',''],
            ['P','P','P','P','P','P','P','P'],
            ['R','N','B','Q','K','B','N','R']
        ],
        turn: 'white'
    };
}

function getInitialCheckersState() {
    let board = Array(8).fill(null).map(() => Array(8).fill(null));
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if ((r + c) % 2 !== 0) {
                if (r < 3) board[r][c] = { color: 'black', dama: false };
                else if (r > 4) board[r][c] = { color: 'white', dama: false };
                else board[r][c] = '';
            } else {
                board[r][c] = null;
            }
        }
    }
    return { board, turn: 'white' };
}

let chessGameState = getInitialChessState();
let checkersGameState = getInitialCheckersState();

io.on('connection', (socket) => {
    console.log(`🚀 Usuário conectado: ${socket.id}`);

    // Envia os estados atuais ao conectar
    socket.emit('gameState', chessGameState);
    socket.emit('checkersGameState', checkersGameState);
    
    // --- LÓGICA XADREZ ---
    socket.on('makeMove', (move) => {
        chessGameState.board = move.board;
        chessGameState.turn = chessGameState.turn === 'white' ? 'black' : 'white';
        io.emit('gameState', chessGameState);
    });

    socket.on('restartGame', () => {
        chessGameState = getInitialChessState();
        io.emit('gameState', chessGameState);
        io.emit('chatMessage', { player: 'Sistema', text: 'A partida de Xadrez foi reiniciada!' });
    });

    // --- LÓGICA DAMAS ---
    socket.on('makeMoveCheckers', (state) => {
        checkersGameState = state;
        io.emit('checkersGameState', checkersGameState);
    });

    socket.on('restartCheckers', () => {
        checkersGameState = getInitialCheckersState();
        io.emit('checkersGameState', checkersGameState);
    });

    // --- CHAT GERAL ---
    socket.on('chatMessage', (msgData) => {
        io.emit('chatMessage', msgData);
    });

    // --- CHAT ESPECÍFICO DAMAS ---
    socket.on('checkersChatMsg', (msg) => {
        io.emit('checkersChatMsg', msg);
    });

    socket.on('disconnect', () => {
        console.log(`❌ Usuário desconectado: ${socket.id}`);
    });
});

// AJUSTE PARA DEPLOY: Usa a porta da hospedagem ou 3000 localmente
const PORT = process.env.PORT || 3000;

server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🎮 LUDINODE ONLINE`);
    console.log(`🏠 Local: http://localhost:${PORT}`);
});