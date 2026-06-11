// game.js — lógica do jogo + câmara + MediaPipe

/* ── ESTADO ── */
let palavraSecreta = '';
let tentativas = [];
let tentativaAtual = '';
let jogoTerminado = false;
let estadoLetras = {};

/* ── CÂMARA ── */
const video = document.getElementById('video');
const canvas = document.getElementById('canvas-overlay');
const ctx = canvas.getContext('2d');
const letraDiv = document.getElementById('letra-detetada');
const letraTxt = document.getElementById('letra-texto');
const barraDiv = document.getElementById('barra-confirm');

let facingMode = 'environment'; // câmara traseira por defeito
let stream = null;
let letraAtual = null;
let timerConfirm = null;
let progressInterval = null;
let progressVal = 0;
const TEMPO_MS = 1500; // ms a segurar o gesto para confirmar

/* ── ARRANCAR CÂMARA ── */
async function iniciarCamara() {
    try {
        if (stream) stream.getTracks().forEach(t => t.stop());
        stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode,
                width: { ideal: 640 },
                height: { ideal: 480 }
            },
            audio: false
        });
        video.srcObject = stream;
        await video.play();
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        setMsg('Mostra a mão à câmara!');
    } catch (e) {
        setMsg('Sem acesso à câmara — usa o teclado manual.', 'erro');
    }
}

document.getElementById('btn-flip').addEventListener('click', () => {
    facingMode = facingMode === 'environment' ? 'user' : 'environment';
    iniciarCamara();
});

/* ── MEDIAPIPE HANDS ── */
const hands = new Hands({
    locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`
});

hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: 0.75,
    minTrackingConfidence: 0.5
});

hands.onResults(aoReceberMao);

// Loop de processamento frame a frame
async function loopCamara() {
    if (video.readyState >= 2 && !video.paused && !video.ended) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        await hands.send({ image: video });
    }
    requestAnimationFrame(loopCamara);
}

/* ── RESULTADO DO MEDIAPIPE ── */
function aoReceberMao(results) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Sem mão detetada
    if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
        letraDiv.classList.remove('visivel');
        cancelarTimer();
        letraAtual = null;
        return;
    }

    const lm = results.multiHandLandmarks[0];

    // Desenhar esqueleto da mão sobre o vídeo
    drawConnectors(ctx, lm, HAND_CONNECTIONS, { color: '#00FF88', lineWidth: 2 });
    drawLandmarks(ctx, lm, { color: '#FF0077', lineWidth: 1, radius: 4 });

    // Classificar gesto → letra LGP
    const letra = classificarGesto(lm);

    if (letra) {
        letraTxt.textContent = letra;
        letraDiv.classList.add('visivel');

        if (letra !== letraAtual) {
            // Nova letra detectada: reiniciar timer de confirmação
            letraAtual = letra;
            cancelarTimer();
            iniciarTimer(letra);
        }
        // Se for a mesma letra, o timer continua a correr
    } else {
        letraDiv.classList.remove('visivel');
        cancelarTimer();
        letraAtual = null;
    }
}

/* ── TIMER DE CONFIRMAÇÃO ── */
// O utilizador tem de manter o gesto TEMPO_MS ms para a letra ser aceite
function iniciarTimer(letra) {
    progressVal = 0;
    barraDiv.style.background = '#1D9E75';

    progressInterval = setInterval(() => {
        progressVal += 100 / (TEMPO_MS / 50);
        barraDiv.style.width = Math.min(progressVal, 100) + '%';
    }, 50);

    timerConfirm = setTimeout(() => {
        clearInterval(progressInterval);
        barraDiv.style.width = '0%';
        if (!jogoTerminado) {
            handleLetra(letra);
            // Pequeno feedback visual
            barraDiv.style.background = '#fff';
            setTimeout(() => { barraDiv.style.background = '#1D9E75'; }, 150);
        }
    }, TEMPO_MS);
}

function cancelarTimer() {
    clearTimeout(timerConfirm);
    clearInterval(progressInterval);
    barraDiv.style.width = '0%';
    timerConfirm = null;
    progressInterval = null;
}

/* ── MODO CÂMARA / TECLADO ── */
function setModo(modo) {
    document.querySelectorAll('.tab-btn').forEach((b, i) => {
        b.classList.toggle('ativo',
            (i === 0 && modo === 'camara') ||
            (i === 1 && modo === 'teclado')
        );
    });
    document.getElementById('camera-section').style.display =
        modo === 'camara' ? 'block' : 'none';
    document.getElementById('teclado-manual').style.display =
        modo === 'teclado' ? 'flex' : 'none';
}

/* ── LÓGICA DO JOGO ── */
function novoJogo() {
    palavraSecreta = PALAVRAS[Math.floor(Math.random() * PALAVRAS.length)];
    tentativas = [];
    tentativaAtual = '';
    jogoTerminado = false;
    estadoLetras = {};
    setMsg('Mostra a mão à câmara!');
    renderGrelha();
    renderTeclado();
}

function handleLetra(k) {
    if (jogoTerminado) return;

    if (k === '⌫') {
        tentativaAtual = tentativaAtual.slice(0, -1);
        renderGrelha();
        return;
    }
    if (k === '↵') {
        submeter();
        return;
    }
    if (tentativaAtual.length < 5) {
        tentativaAtual += k;
        renderGrelha();
    }
}

function submeter() {
    if (tentativaAtual.length < 5) {
        setMsg('Faltam letras!', 'erro');
        return;
    }
    setMsg('');
    const tent = tentativaAtual;
    atualizarEstadoLetras(tent);
    tentativas.push(tent);
    tentativaAtual = '';
    renderGrelha();
    renderTeclado();

    if (tent === palavraSecreta) {
        jogoTerminado = true;
        const n = tentativas.length;
        setMsg(`🎉 Parabéns! Em ${n} tentativa${n > 1 ? 's' : ''}!`, 'ganhou');
    } else if (tentativas.length >= 6) {
        jogoTerminado = true;
        setMsg(`A palavra era ${palavraSecreta}. Tenta novamente!`, 'erro');
    }
}

function avaliar(tent) {
    const res = Array(5).fill('errado');
    const cnt = {};
    for (const c of palavraSecreta) cnt[c] = (cnt[c] || 0) + 1;
    for (let i = 0; i < 5; i++) {
        if (tent[i] === palavraSecreta[i]) {
            res[i] = 'correto';
            cnt[tent[i]]--;
        }
    }
    for (let i = 0; i < 5; i++) {
        if (res[i] !== 'correto' && cnt[tent[i]] > 0) {
            res[i] = 'presente';
            cnt[tent[i]]--;
        }
    }
    return res;
}

function atualizarEstadoLetras(tent) {
    const PRI = { correto: 3, presente: 2, errado: 1 };
    const av = avaliar(tent);
    tent.split('').forEach((l, i) => {
        if (!estadoLetras[l] || PRI[av[i]] > PRI[estadoLetras[l]]) {
            estadoLetras[l] = av[i];
        }
    });
}

/* ── RENDER ── */
function renderGrelha() {
    const g = document.getElementById('grelha');
    g.innerHTML = '';
    for (let l = 0; l < 6; l++) {
        const linha = document.createElement('div');
        linha.className = 'linha';
        for (let c = 0; c < 5; c++) {
            const cel = document.createElement('div');
            cel.className = 'celula';
            if (l < tentativas.length) {
                cel.textContent = tentativas[l][c];
                cel.classList.add(avaliar(tentativas[l])[c]);
            } else if (l === tentativas.length && !jogoTerminado) {
                const ch = tentativaAtual[c] || '';
                cel.textContent = ch;
                if (ch) cel.classList.add('ativo');
            }
            linha.appendChild(cel);
        }
        g.appendChild(linha);
    }
}

const TECLADO = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ç'],
    ['Z', 'X', 'C', 'V', 'B', 'N', 'M']
];

function renderTeclado() {
    const t = document.getElementById('teclado-manual');
    t.innerHTML = '';
    TECLADO.forEach(linha => {
        const div = document.createElement('div');
        div.className = 'teclado-linha';
        linha.forEach(k => {
            const btn = document.createElement('button');
            btn.className = 'tecla';
            btn.textContent = k;
            if (estadoLetras[k]) btn.classList.add(estadoLetras[k]);
            btn.onclick = () => handleLetra(k);
            div.appendChild(btn);
        });
        t.appendChild(div);
    });
}

function setMsg(txt, tipo = '') {
    const el = document.getElementById('msg-estado');
    el.textContent = txt;
    el.className = tipo;
}

/* ── TECLADO FÍSICO (PC) ── */
document.addEventListener('keydown', e => {
    const k = e.key.toUpperCase();
    if (k === 'BACKSPACE') { handleLetra('⌫'); return; }
    if (k === 'ENTER') { handleLetra('↵'); return; }
    if (/^[A-ZÁÉÍÓÚÀÂÃÇÊÔ]$/.test(k)) handleLetra(k);
});

/* ── ARRANQUE ── */
novoJogo();
iniciarCamara().then(() => {
    video.addEventListener('loadeddata', loopCamara);
});// game.js — lógica do jogo + câmara + MediaPipe

/* ── ESTADO ── */
let palavraSecreta = '';
let tentativas = [];
let tentativaAtual = '';
let jogoTerminado = false;
let estadoLetras = {};

/* ── CÂMARA ── */
const video = document.getElementById('video');
const canvas = document.getElementById('canvas-overlay');
const ctx = canvas.getContext('2d');
const letraDiv = document.getElementById('letra-detetada');
const letraTxt = document.getElementById('letra-texto');
const barraDiv = document.getElementById('barra-confirm');

let facingMode = 'environment'; // câmara traseira por defeito
let stream = null;
let letraAtual = null;
let timerConfirm = null;
let progressInterval = null;
let progressVal = 0;
const TEMPO_MS = 1500; // ms a segurar o gesto para confirmar

/* ── ARRANCAR CÂMARA ── */
async function iniciarCamara() {
    try {
        if (stream) stream.getTracks().forEach(t => t.stop());
        stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode,
                width: { ideal: 640 },
                height: { ideal: 480 }
            },
            audio: false
        });
        video.srcObject = stream;
        await video.play();
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        setMsg('Mostra a mão à câmara!');
    } catch (e) {
        setMsg('Sem acesso à câmara — usa o teclado manual.', 'erro');
    }
}

document.getElementById('btn-flip').addEventListener('click', () => {
    facingMode = facingMode === 'environment' ? 'user' : 'environment';
    iniciarCamara();
});

/* ── MEDIAPIPE HANDS ── */
const hands = new Hands({
    locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`
});

hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: 0.75,
    minTrackingConfidence: 0.5
});

hands.onResults(aoReceberMao);

// Loop de processamento frame a frame
async function loopCamara() {
    if (video.readyState >= 2 && !video.paused && !video.ended) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        await hands.send({ image: video });
    }
    requestAnimationFrame(loopCamara);
}

/* ── RESULTADO DO MEDIAPIPE ── */
function aoReceberMao(results) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Sem mão detetada
    if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
        letraDiv.classList.remove('visivel');
        cancelarTimer();
        letraAtual = null;
        return;
    }

    const lm = results.multiHandLandmarks[0];

    // Desenhar esqueleto da mão sobre o vídeo
    drawConnectors(ctx, lm, HAND_CONNECTIONS, { color: '#00FF88', lineWidth: 2 });
    drawLandmarks(ctx, lm, { color: '#FF0077', lineWidth: 1, radius: 4 });

    // Classificar gesto → letra LGP
    const letra = classificarGesto(lm);

    if (letra) {
        letraTxt.textContent = letra;
        letraDiv.classList.add('visivel');

        if (letra !== letraAtual) {
            // Nova letra detectada: reiniciar timer de confirmação
            letraAtual = letra;
            cancelarTimer();
            iniciarTimer(letra);
        }
        // Se for a mesma letra, o timer continua a correr
    } else {
        letraDiv.classList.remove('visivel');
        cancelarTimer();
        letraAtual = null;
    }
}

/* ── TIMER DE CONFIRMAÇÃO ── */
// O utilizador tem de manter o gesto TEMPO_MS ms para a letra ser aceite
function iniciarTimer(letra) {
    progressVal = 0;
    barraDiv.style.background = '#1D9E75';

    progressInterval = setInterval(() => {
        progressVal += 100 / (TEMPO_MS / 50);
        barraDiv.style.width = Math.min(progressVal, 100) + '%';
    }, 50);

    timerConfirm = setTimeout(() => {
        clearInterval(progressInterval);
        barraDiv.style.width = '0%';
        if (!jogoTerminado) {
            handleLetra(letra);
            // Pequeno feedback visual
            barraDiv.style.background = '#fff';
            setTimeout(() => { barraDiv.style.background = '#1D9E75'; }, 150);
        }
    }, TEMPO_MS);
}

function cancelarTimer() {
    clearTimeout(timerConfirm);
    clearInterval(progressInterval);
    barraDiv.style.width = '0%';
    timerConfirm = null;
    progressInterval = null;
}

/* ── MODO CÂMARA / TECLADO ── */
function setModo(modo) {
    document.querySelectorAll('.tab-btn').forEach((b, i) => {
        b.classList.toggle('ativo',
            (i === 0 && modo === 'camara') ||
            (i === 1 && modo === 'teclado')
        );
    });
    document.getElementById('camera-section').style.display =
        modo === 'camara' ? 'block' : 'none';
    document.getElementById('teclado-manual').style.display =
        modo === 'teclado' ? 'flex' : 'none';
}

/* ── LÓGICA DO JOGO ── */
function novoJogo() {
    palavraSecreta = PALAVRAS[Math.floor(Math.random() * PALAVRAS.length)];
    tentativas = [];
    tentativaAtual = '';
    jogoTerminado = false;
    estadoLetras = {};
    setMsg('Mostra a mão à câmara!');
    renderGrelha();
    renderTeclado();
}

function handleLetra(k) {
    if (jogoTerminado) return;

    if (k === '⌫') {
        tentativaAtual = tentativaAtual.slice(0, -1);
        renderGrelha();
        return;
    }
    if (k === '↵') {
        submeter();
        return;
    }
    if (tentativaAtual.length < 5) {
        tentativaAtual += k;
        renderGrelha();
    }
}

function submeter() {
    if (tentativaAtual.length < 5) {
        setMsg('Faltam letras!', 'erro');
        return;
    }
    setMsg('');
    const tent = tentativaAtual;
    atualizarEstadoLetras(tent);
    tentativas.push(tent);
    tentativaAtual = '';
    renderGrelha();
    renderTeclado();

    if (tent === palavraSecreta) {
        jogoTerminado = true;
        const n = tentativas.length;
        setMsg(`🎉 Parabéns! Em ${n} tentativa${n > 1 ? 's' : ''}!`, 'ganhou');
    } else if (tentativas.length >= 6) {
        jogoTerminado = true;
        setMsg(`A palavra era ${palavraSecreta}. Tenta novamente!`, 'erro');
    }
}

function avaliar(tent) {
    const res = Array(5).fill('errado');
    const cnt = {};
    for (const c of palavraSecreta) cnt[c] = (cnt[c] || 0) + 1;
    for (let i = 0; i < 5; i++) {
        if (tent[i] === palavraSecreta[i]) {
            res[i] = 'correto';
            cnt[tent[i]]--;
        }
    }
    for (let i = 0; i < 5; i++) {
        if (res[i] !== 'correto' && cnt[tent[i]] > 0) {
            res[i] = 'presente';
            cnt[tent[i]]--;
        }
    }
    return res;
}

function atualizarEstadoLetras(tent) {
    const PRI = { correto: 3, presente: 2, errado: 1 };
    const av = avaliar(tent);
    tent.split('').forEach((l, i) => {
        if (!estadoLetras[l] || PRI[av[i]] > PRI[estadoLetras[l]]) {
            estadoLetras[l] = av[i];
        }
    });
}

/* ── RENDER ── */
function renderGrelha() {
    const g = document.getElementById('grelha');
    g.innerHTML = '';
    for (let l = 0; l < 6; l++) {
        const linha = document.createElement('div');
        linha.className = 'linha';
        for (let c = 0; c < 5; c++) {
            const cel = document.createElement('div');
            cel.className = 'celula';
            if (l < tentativas.length) {
                cel.textContent = tentativas[l][c];
                cel.classList.add(avaliar(tentativas[l])[c]);
            } else if (l === tentativas.length && !jogoTerminado) {
                const ch = tentativaAtual[c] || '';
                cel.textContent = ch;
                if (ch) cel.classList.add('ativo');
            }
            linha.appendChild(cel);
        }
        g.appendChild(linha);
    }
}

const TECLADO = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ç'],
    ['Z', 'X', 'C', 'V', 'B', 'N', 'M']
];

function renderTeclado() {
    const t = document.getElementById('teclado-manual');
    t.innerHTML = '';
    TECLADO.forEach(linha => {
        const div = document.createElement('div');
        div.className = 'teclado-linha';
        linha.forEach(k => {
            const btn = document.createElement('button');
            btn.className = 'tecla';
            btn.textContent = k;
            if (estadoLetras[k]) btn.classList.add(estadoLetras[k]);
            btn.onclick = () => handleLetra(k);
            div.appendChild(btn);
        });
        t.appendChild(div);
    });
}

function setMsg(txt, tipo = '') {
    const el = document.getElementById('msg-estado');
    el.textContent = txt;
    el.className = tipo;
}

/* ── TECLADO FÍSICO (PC) ── */
document.addEventListener('keydown', e => {
    const k = e.key.toUpperCase();
    if (k === 'BACKSPACE') { handleLetra('⌫'); return; }
    if (k === 'ENTER') { handleLetra('↵'); return; }
    if (/^[A-ZÁÉÍÓÚÀÂÃÇÊÔ]$/.test(k)) handleLetra(k);
});

/* ── ARRANQUE ── */
novoJogo();
iniciarCamara().then(() => {
    video.addEventListener('loadeddata', loopCamara);
});