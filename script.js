let score = 0, lives = 3, jokers = 0, combo = 0, block = 1, timeLeft, maxTime = 15000;
let currentWord = {}, currentOptionsCount = 2, timerInt, isSpinning = false;
let stats = JSON.parse(localStorage.getItem('euskara_stats')) || { history: {}, catErrors: {}, bestScore: 0 };
let audioCtx = null, soundEnabled = true;

const premios = ["❤️ +1 Vida", "💔 -1 Vida", "🃏 +1 Comodín", "🃏 -1 Comodín", "⬆️ +Dificultad", "⬇️ -Dificultad", "⚡ Rápido", "🛡️ Escudo"];

window.onload = () => {
    const cats = [...new Set(diccionario.map(p => p.cat))];
    const container = document.getElementById('setup-categories');
    if(container) {
        cats.forEach(c => {
            container.innerHTML += `<label style="display:block; padding:10px; border-bottom:1px solid #eee; cursor:pointer;"><input type="checkbox" value="${c}" checked> ${c}</label>`;
        });
    }
    updateSuggestion();
};

function startArcadeGame() {
    const activeCats = Array.from(document.querySelectorAll('#setup-categories input:checked')).map(cb => cb.value);
    if(activeCats.length === 0) return alert("Selecciona una categoría");
    document.getElementById('setup-screen').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');
    document.getElementById('game-card').classList.remove('hidden');
    nextQuestion();
}

function nextQuestion() {
    const activeCats = Array.from(document.querySelectorAll('#setup-categories input:checked')).map(cb => cb.value);
    const pool = diccionario.filter(p => activeCats.includes(p.cat));
    currentWord = pool[Math.floor(Math.random() * pool.length)];
    const isES = document.getElementById('initial-mode').value === 'es-eu';
    document.getElementById('target-word').innerText = isES ? currentWord.es : currentWord.euskera;
    const correctAns = isES ? currentWord.euskera : currentWord.es;
    let options = [correctAns];
    while(options.length < Math.min(pool.length, currentOptionsCount)) {
        let rand = pool[Math.floor(Math.random() * pool.length)];
        let val = isES ? rand.euskera : rand.es;
        if(!options.includes(val)) options.push(val);
    }
    options.sort(() => Math.random() - 0.5);
    const grid = document.getElementById('options-grid');
    grid.innerHTML = "";
    options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'opt-btn';
        btn.innerText = opt;
        btn.onclick = () => verify(opt, btn, correctAns);
        grid.appendChild(btn);
    });
    updateHUD();
    startTimer();
}

function startTimer() {
    clearInterval(timerInt);
    timeLeft = maxTime;
    const bar = document.getElementById('timer-bar');
    timerInt = setInterval(() => {
        timeLeft -= 100;
        let per = (timeLeft / maxTime) * 100;
        bar.style.width = per + "%";
        bar.style.background = per > 60 ? "#2a9d8f" : per > 25 ? "#e9c46a" : "#e76f51";
        if(timeLeft <= 0) { playSound('fail'); handleFail("Denbora amaitu da!"); }
    }, 100);
}

function verify(sel, btn, corr) {
    if(timeLeft <= 0) return;
    clearInterval(timerInt);
    if(sel === corr) {
        playSound('success');
        score += Math.ceil(timeLeft / 1000) * block;
        combo++;
        btn.classList.add('correct');
        updateHUD();
        setTimeout(() => { if(combo >= 5) showRoulette(); else nextQuestion(); }, 1000);
    } else {
        playSound('fail');
        btn.classList.add('wrong');
        handleFail(`Era: ${corr}`);
    }
}

function handleFail(msg) {
    clearInterval(timerInt);
    document.getElementById('game-card').classList.add('shake');
    setTimeout(() => document.getElementById('game-card').classList.remove('shake'), 400);
    lives--; combo = 0;
    stats.catErrors[currentWord.cat] = (stats.catErrors[currentWord.cat] || 0) + 1;
    if(score > stats.bestScore) stats.bestScore = score;
    localStorage.setItem('euskara_stats', JSON.stringify(stats));
    updateHUD();
    animateHeartLoss();
    if(lives <= 0) { setTimeout(() => { alert("GAME OVER - Puntuak: " + score); location.reload(); }, 1000); }
    else { 
        document.getElementById('correction-text').innerHTML = `<h2 style="color:var(--error)">Huts egin duzu!</h2><p>${msg}</p>`;
        setTimeout(() => { document.getElementById('fail-modal').classList.remove('hidden'); }, 1000);
    }
}

function animateHeartLoss() {
    const livesDiv = document.getElementById('lives');
    const remaining = "❤️".repeat(lives);
    livesDiv.innerHTML = `${remaining}<span class="heart-lost">❤️</span>`;
}

function showRoulette() {
    const container = document.getElementById('wheel-labels');
    container.innerHTML = "";
    premios.forEach((t, i) => {
        const el = document.createElement('div');
        el.className = 'wheel-label';
        el.style.transform = `rotate(${i * 45 + 22.5}deg)`;
        el.innerText = t;
        container.appendChild(el);
    });
    document.getElementById('roulette-modal').classList.remove('hidden');
}

function spinWheel() {
    if (isSpinning) return;
    isSpinning = true;

    const extraDeg = Math.floor(Math.random() * 360);
    const totalDeg = 3600 + extraDeg; // Siempre reseteamos a base 3600 para que la matemática no se pierda
    
    const wheel = document.getElementById('wheel');
    const pointer = document.getElementById('wheel-pointer');
    
    wheel.style.transition = "transform 4s cubic-bezier(0.15, 0, 0.15, 1)";
    wheel.style.transform = `rotate(${totalDeg}deg)`;

    let lastSector = -1;
    const startTime = performance.now();
    function track() {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(elapsed / 4000, 1);
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const currentPos = totalDeg * easeOut;
        
        // Ajuste +6 para sincronizar puntero visual con sonido
        const sector = (Math.floor(((360 - (currentPos % 360)) % 360) / 45) + 6) % 8;
        
        if(sector !== lastSector) {
            playSound('tick');
            pointer.classList.remove('pointer-snap');
            void pointer.offsetWidth;
            pointer.classList.add('pointer-snap');
            lastSector = sector;
        }
        if(progress < 1) requestAnimationFrame(track);
    }
    requestAnimationFrame(track);

    setTimeout(() => {
        isSpinning = false;
        // La matemática real: extraDeg es el desfase final desde el punto 0
        const indicePremio = (Math.floor(((360 - (extraDeg % 360)) % 360) / 45) + 6) % 8;
        const textoEfecto = aplicarEfectoPremio(indicePremio);

        document.getElementById('roulette-modal').classList.add('hidden');
        document.getElementById('correction-text').innerHTML = `
            <h2 style="color:var(--success)">🎡 Ruleta</h2>
            <p style="font-size:1.4rem"><b>${premios[indicePremio]}</b></p>
            <p>${textoEfecto}</p>
        `;
        document.getElementById('fail-modal').classList.remove('hidden');
        
        // RESET VISUAL SILENCIOSO: Preparamos la rueda para el próximo giro desde 0
        wheel.style.transition = "none";
        wheel.style.transform = "rotate(0deg)";
        
        combo = 0; block++;
    }, 4500);
}

function aplicarEfectoPremio(indice) {
    let msg = "";
    switch(parseInt(indice)) {
        case 0: lives++; msg = "+1 Bizia ❤️"; break;
        case 1: lives = Math.max(1, lives - 1); msg = "-1 Bizia 💔"; break;
        case 2: jokers++; msg = "+1 Komodina 🃏"; break;
        case 3: jokers = Math.max(0, jokers - 1); msg = "-1 Komodina 🃏"; break;
        case 4: currentOptionsCount = Math.min(8, currentOptionsCount + 1); msg = "Zailtasuna +"; break;
        case 5: currentOptionsCount = Math.max(2, currentOptionsCount - 1); msg = "Zailtasuna -"; break;
        case 6: maxTime = Math.max(5000, maxTime - 2000); msg = "Azkarra! ⚡"; break;
        case 7: maxTime += 3000; msg = "Babesa (Denbora +) 🛡️"; break;
    }
    updateHUD();
    return msg;
}

function updateHUD() {
    document.getElementById('lives').innerText = "❤️".repeat(lives);
    document.getElementById('points').innerText = "⭐ " + score;
    document.getElementById('combo-meter').innerText = `Racha: ${combo}/5 🔥`;
    document.getElementById('block-info').innerText = `Bloque: ${block}`;
    const jk = document.getElementById('jokers-display');
    if(jk) jk.innerText = "🃏 " + jokers;
    const jbtn = document.getElementById('joker-btn');
    const jcnt = document.getElementById('joker-btn-count');
    if(jokers > 0) { jbtn.classList.remove('hidden'); jcnt.innerText = jokers; }
    else { jbtn.classList.add('hidden'); }
}

function toggleMute() {
    soundEnabled = !soundEnabled;
    document.getElementById('mute-btn').innerText = soundEnabled ? "🔊" : "🔇";
}

function playSound(type) {
    if (!soundEnabled) return;
    try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        osc.connect(g); g.connect(audioCtx.destination);
        const now = audioCtx.currentTime;
        if (type === 'success') {
            osc.type = 'sine'; osc.frequency.setValueAtTime(660, now);
            g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(0.05, now + 0.05);
            osc.start(now); osc.stop(now + 0.2);
        } else if (type === 'fail') {
            osc.type = 'triangle'; osc.frequency.setValueAtTime(150, now);
            g.gain.setValueAtTime(0.05, now); osc.start(now); osc.stop(now + 0.2);
        } else if (type === 'tick') {
            osc.type = 'sine'; osc.frequency.setValueAtTime(1200, now);
            g.gain.setValueAtTime(0.02, now); osc.start(now); osc.stop(now + 0.03);
        }
    } catch (e) { console.warn("Audio error"); }
}

function showHistory() {
    const total = Object.values(stats.catErrors).reduce((a, b) => a + b, 0);
    let html = `<h2>📊 Historial</h2><p>Best: ⭐ ${stats.bestScore}</p><hr>`;
    for (const [cat, count] of Object.entries(stats.catErrors)) {
        html += `<p>${cat}: ${count} ❌</p>`;
    }
    document.getElementById('correction-text').innerHTML = html;
    document.getElementById('fail-modal').classList.remove('hidden');
}

function useJoker() {
    if(jokers <= 0 || timeLeft <= 0) return;
    jokers--; playSound('success');
    const isES = document.getElementById('initial-mode').value === 'es-eu';
    const corr = isES ? currentWord.euskera : currentWord.es;
    const btns = Array.from(document.querySelectorAll('.opt-btn')).filter(b => b.innerText !== corr);
    const toRem = Math.floor(btns.length / 2);
    for(let i=0; i<toRem; i++) btns[i].classList.add('joker-fade');
    updateHUD();
}

function closeFailModal() { document.getElementById('fail-modal').classList.add('hidden'); if(lives > 0) nextQuestion(); }
function setAllCats(v) { document.querySelectorAll('#setup-categories input').forEach(i => i.checked = v); }
function resetStorage() { if(confirm("¿Reset?")) { localStorage.clear(); location.reload(); } }
function updateSuggestion() {
    const cats = Object.keys(stats.catErrors);
    if(cats.length > 0) {
        const top = cats.reduce((a, b) => stats.catErrors[a] > stats.catErrors[b] ? a : b);
        document.getElementById('suggested-cat').innerText = top;
        document.getElementById('smart-suggestion').classList.remove('hidden');
    }
}
function applySuggestion() {
    const top = document.getElementById('suggested-cat').innerText;
    setAllCats(false);
    const target = document.querySelector(`input[value="${top}"]`);
    if(target) target.checked = true;
    startArcadeGame();
}
function showGameHelp() {
    document.getElementById('correction-text').innerHTML = `<h2>Guía 💡</h2><p>• Racha 5 = Ruleta.<br>• Fallo = -1 ❤️.<br>• Comodín = Quita 50% fallos.</p>`;
    document.getElementById('fail-modal').classList.remove('hidden');
}
