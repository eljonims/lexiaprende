let score = 0, lives = 3, jokers = 3, combo = 0, block = 1, timeLeft, maxTime = 15000;
let currentWord = {}, currentOptionsCount = 2, timerInt;
let isSpinning = false, crazySpeed = false, currentMode = 'eu-es';
let audioCtx = null, soundEnabled = true;

const premios = ["❤️ Vida +1", "❄️ Congelar", "🔄 voltear idioma", "⚡ flash", "🎭💀 Comodín -1", "🔥 tiempo -2s", "🚫 Respuestas +1", "🎭 Komodina Kendu"];

window.onload = () => {
    // Cargar categorías del diccionario
    const cats = [...new Set(diccionario.map(p => p.cat))];
    const container = document.getElementById('setup-categories');
    cats.forEach(c => {
        container.innerHTML += `
            <label class="cat-card">
                <input type="checkbox" value="${c}" checked>
                <span class="cat-name">${c}</span>
            </label>`;
    });
    updateHUD();
};

// --- MOTOR DE AUDIO RETRO ---
function playSound(type) {
    if (!soundEnabled) return;
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination);
    
    if (type === 'success') {
        osc.frequency.setValueAtTime(600, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    } else if (type === 'fail') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, audioCtx.currentTime);
        osc.frequency.linearRampToValueAtTime(50, audioCtx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    } else if (type === 'tick') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(800, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.02, audioCtx.currentTime);
    }
    osc.start(); osc.stop(audioCtx.currentTime + (type === 'tick' ? 0.05 : 0.2));
}

// --- GESTIÓN DE CONFIGURACIÓN ---
function setMode(mode) {
    currentMode = mode;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`btn-${mode}`).classList.add('active');
}

function setAllCats(state) {
    document.querySelectorAll('#setup-categories input').forEach(cb => cb.checked = state);
}

function startArcadeGame() {
    const active = Array.from(document.querySelectorAll('#setup-categories input:checked')).map(cb => cb.value);
    if (!active.length) return alert("Seleccione al menos una categoría.");
    document.getElementById('setup-screen').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');
    document.getElementById('game-card').classList.remove('hidden');
    nextQuestion();
}

// --- LÓGICA DE JUEGO ---
function nextQuestion() {
    const active = Array.from(document.querySelectorAll('#setup-categories input:checked')).map(cb => cb.value);
    const pool = diccionario.filter(p => active.includes(p.cat));
    currentWord = pool[Math.floor(Math.random() * pool.length)];
    
    const isES = currentMode === 'es-eu';
    document.getElementById('target-word').innerText = isES ? currentWord.es : currentWord.euskera;
    const corr = isES ? currentWord.euskera : currentWord.es;
    
    let opts = [corr];
    while (opts.length < Math.min(pool.length, currentOptionsCount)) {
        let r = pool[Math.floor(Math.random() * pool.length)];
        let v = isES ? r.euskera : r.es;
        if (!opts.includes(v)) opts.push(v);
    }
    opts.sort(() => Math.random() - 0.5);
    
    const grid = document.getElementById('options-grid');
    grid.innerHTML = "";
    opts.forEach(o => {
        const b = document.createElement('button');
        b.className = 'opt-btn';
        b.innerText = o;
        b.onclick = () => verify(o, b, corr);
        grid.appendChild(b);
    });
    startTimer();
}

function verify(selected, button, correct) {
    if (timeLeft <= 0) return;
    clearInterval(timerInt);
    
    if (selected === correct) {
        playSound('success');
        // PUNTOS: Segundos restantes * Bloque actual
        let pointsEarned = Math.ceil(timeLeft / 1000) * block;
        score += pointsEarned;
        combo++;
        button.classList.add('correct');
        updateHUD();
        setTimeout(combo >= 5 ? showRoulette : nextQuestion, 800);
    } else {
        button.classList.add('wrong');
        handleFail(`Zuzena: ${correct}`);
    }
}

function startTimer() {
    clearInterval(timerInt);
    let limit = crazySpeed ? 2000 : maxTime;
    timeLeft = limit;
    crazySpeed = false;
    
    const bar = document.getElementById('timer-bar');
    timerInt = setInterval(() => {
        timeLeft -= 100;
        let p = (timeLeft / limit) * 100;
        bar.style.width = p + "%";
        bar.style.background = p > 60 ? "#2a9d8f" : p > 25 ? "#e9c46a" : "#e76f51";
        if (timeLeft <= 0) { clearInterval(timerInt); handleFail("¡Tiempo agotado!"); }
    }, 100);
}

function handleFail(msg) {
    playSound('fail');
    lives--; 
    combo = 0;
    updateHUD('life');
    document.getElementById('game-card').classList.add('shake');
    
    setTimeout(() => {
        if (lives <= 0) {
            showGameOver();
        } else {
            document.getElementById('correction-text').innerHTML = `<h2>¡Fracasaste!</h2><p>${msg}</p>`;
            document.getElementById('fail-modal').classList.remove('hidden');
            document.getElementById('game-card').classList.remove('shake');
        }
    }, 1200);
}

function showGameOver() {
    let stats = JSON.parse(localStorage.getItem('euskara_stats')) || { bestScore: 0 };
    if (score > stats.bestScore) {
        stats.bestScore = score;
        localStorage.setItem('euskara_stats', JSON.stringify(stats));
    }
    document.getElementById('final-score').innerText = score;
    document.getElementById('best-score').innerText = stats.bestScore;
    document.getElementById('hud').classList.add('hidden');
    document.getElementById('game-card').classList.add('hidden');
    document.getElementById('game-over-modal').classList.remove('hidden');
}

function useJoker() {
    if (jokers <= 0 || timeLeft <= 0) return;
    jokers--;
    updateHUD('joker');
    const corr = currentMode === 'es-eu' ? currentWord.euskera : currentWord.es;
    document.querySelectorAll('.opt-btn').forEach(b => {
        if (b.innerText !== corr) b.style.opacity = "0.2";
        else b.classList.add('correct');
    });
    setTimeout(nextQuestion, 1500);
}

// --- RULETA ---
function showRoulette() {
    clearInterval(timerInt);
    const c = document.getElementById('wheel-labels');
    c.innerHTML = "";
    premios.forEach((t, i) => {
        const e = document.createElement('div');
        e.className = 'wheel-label';
        e.style.transform = `rotate(${i * 45 + 22.5}deg)`;
        e.innerText = t;
        c.appendChild(e);
    });
    document.getElementById('roulette-modal').classList.remove('hidden');
}

function spinWheel() {
    if (isSpinning) return;
    isSpinning = true;
    const deg = 3600 + Math.floor(Math.random() * 360);
    const w = document.getElementById('wheel');
    w.style.transition = "transform 4s cubic-bezier(0.15, 0, 0.15, 1)";
    w.style.transform = `rotate(${deg}deg)`;
    
    let lastS = -1;
    const start = performance.now();
    function track() {
        let p = Math.min((performance.now() - start) / 4000, 1);
        let curr = deg * (1 - Math.pow(1 - p, 3));
        let s = (Math.floor(((360 - (curr % 360)) % 360) / 45) + 6) % 8;
        if (s !== lastS) { playSound('tick'); lastS = s; }
        if (p < 1) requestAnimationFrame(track);
    }
    requestAnimationFrame(track);

    setTimeout(() => {
        isSpinning = false;
        const idx = (Math.floor(((360 - (deg % 360)) % 360) / 45) + 6) % 8;
        const res = applyPrize(idx);
        
        // ESCALADO DE DIFICULTAD
        if (currentOptionsCount < 8) currentOptionsCount++;
        else maxTime = Math.max(4000, maxTime - 1500);

        document.getElementById('roulette-modal').classList.add('hidden');
        document.getElementById('correction-text').innerHTML = `<h2>Ruleta</h2><p>${res}</p>`;
        document.getElementById('fail-modal').classList.remove('hidden');
        w.style.transition = "none";
        w.style.transform = "rotate(0deg)";
        combo = 0; block++;
    }, 4500);
}

function applyPrize(i) {
    switch (parseInt(i)) {
        case 0: lives++; return "Vidas +1 ❤️";
        case 1: clearInterval(timerInt); return "Tiempo congelado ❄️";
        case 2: setMode(currentMode === 'eu-es' ? 'es-eu' : 'eu-es'); return "idiomas cambian su posición! 🔄";
        case 3: crazySpeed = true; return "Próximo: Velocidad loca! ⚡";
        case 4: case 7: jokers = Math.max(0, jokers - 1); updateHUD('joker'); return "Comodines -1 💀";
        case 5: maxTime = Math.max(4000, maxTime - 2000); return "El tiempo pasa más rápido! 🔥";
        case 6: currentOptionsCount = Math.min(8, currentOptionsCount + 1); return "Opciones de respuesta +1 🚫";
    }
}

// --- UTILIDADES ---
function updateHUD(lostItem = null) {
    const lCont = document.getElementById('lives-container');
    const jCont = document.getElementById('jokers-container');
    lCont.innerHTML = "❤️".repeat(lives) + (lostItem === 'life' ? '<span class="lost-anim">❤️</span>' : '');
    jCont.innerHTML = "🃏".repeat(jokers) + (lostItem === 'joker' ? '<span class="lost-anim">🃏</span>' : '');
    document.getElementById('points').innerText = "⭐ " + score;
    document.getElementById('combo-meter').innerText = `Racha: ${combo}/5 🔥`;
    document.getElementById('block-info').innerText = `Bloque: ${block}`;
    
    const jBtn = document.getElementById('joker-btn');
    if (jBtn) {
        jBtn.classList.toggle('hidden', jokers <= 0);
        document.getElementById('joker-btn-count').innerText = jokers;
    }
}

function closeFailModal() { document.getElementById('fail-modal').classList.add('hidden'); nextQuestion(); }
function toggleMute() { soundEnabled = !soundEnabled; document.getElementById('mute-btn').innerText = soundEnabled ? "🔊" : "🔇"; }
function resetStorage() { if (confirm("Datu guztiak ezabatu?")) { localStorage.clear(); location.reload(); } }
