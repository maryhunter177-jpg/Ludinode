const socket = io();

// UI Selectors
const pHand = document.getElementById('player-hand');
const dHand = document.getElementById('dealer-hand');
const pScore = document.getElementById('player-score');
const dScore = document.getElementById('dealer-score');
const winsCount = document.getElementById('win-count');
const lossCount = document.getElementById('loss-count');
const statusMsg = document.getElementById('status-msg');

const cInput = document.getElementById('chat-input');
const cMsgs = document.getElementById('chat-messages');
const cBtn = document.getElementById('chat-send');

let playerPoints = 0, dealerPoints = 0, gameOver = false;
let wins = 0, losses = 0;

// SISTEMA DE CHAT
cBtn.onclick = () => {
    if (cInput.value.trim()) {
        socket.emit('chatMessage', { msg: cInput.value });
        cInput.value = '';
    }
};
cInput.onkeypress = (e) => { if (e.key === 'Enter') cBtn.onclick(); };
socket.on('chatMessage', (data) => {
    cMsgs.innerHTML += `<div><b>${data.user}:</b> ${data.msg}</div>`;
    cMsgs.scrollTop = cMsgs.scrollHeight;
});

// BLACKJACK ENGINE
const suits = [{s:'♥',c:'red'}, {s:'♦',c:'red'}, {s:'♣',c:'black'}, {s:'♠',c:'black'}];
const vals = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];

function calcVal(v, p) {
    if (v === 'A') return (p + 11 <= 21) ? 11 : 1;
    return (['J','Q','K'].includes(v)) ? 10 : parseInt(v);
}

function spawnCard(container, card) {
    const div = document.createElement('div');
    div.className = `playing-card ${card.suit.c}`;
    div.innerHTML = `<div>${card.v}${card.suit.s}</div><div style="font-size:45px;align-self:center">${card.suit.s}</div><div style="transform:rotate(180deg)">${card.v}${card.suit.s}</div>`;
    container.appendChild(div);
}

document.getElementById('draw-btn').onclick = () => {
    if (gameOver) return;
    const card = { suit: suits[Math.floor(Math.random()*4)], v: vals[Math.floor(Math.random()*13)] };
    playerPoints += calcVal(card.v, playerPoints);
    spawnCard(pHand, card);
    pScore.textContent = playerPoints;
    if (playerPoints > 21) { 
        losses++; lossCount.textContent = losses;
        endMatch("VOCÊ ESTOUROU! ❌"); 
    }
};

document.getElementById('stand-btn').onclick = async () => {
    if (gameOver || playerPoints === 0) return;
    gameOver = true;
    while (dealerPoints < 17) {
        await new Promise(r => setTimeout(r, 650));
        const card = { suit: suits[Math.floor(Math.random()*4)], v: vals[Math.floor(Math.random()*13)] };
        dealerPoints += calcVal(card.v, dealerPoints);
        spawnCard(dHand, card);
        dScore.textContent = dealerPoints;
    }
    if (dealerPoints > 21 || playerPoints > dealerPoints) { 
        wins++; winsCount.textContent = wins; endMatch("VOCÊ VENCEU! 🏆"); 
    } else if (dealerPoints > playerPoints) { 
        losses++; lossCount.textContent = losses; endMatch("BANCA VENCEU! ❌"); 
    } else { endMatch("EMPATE! 🤝"); }
};

function endMatch(msg) {
    statusMsg.innerHTML = `<span style="color:#ffd700; font-family:'Orbitron'">${msg}</span>`;
    gameOver = true;
    document.getElementById('draw-btn').disabled = true;
    document.getElementById('stand-btn').disabled = true;
}

document.getElementById('clear-btn').onclick = () => {
    pHand.innerHTML = ''; dHand.innerHTML = '';
    playerPoints = 0; dealerPoints = 0; gameOver = false;
    pScore.textContent = "0"; dScore.textContent = "0";
    statusMsg.textContent = "AGUARDANDO APOSTA...";
    document.getElementById('draw-btn').disabled = false;
    document.getElementById('stand-btn').disabled = false;
};