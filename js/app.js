/**
 * DISFRACES DIVERTIDOS - Motor de Juego y Aplicación SPA
 * 100% Offline | Sin dependencias externas
 */

(function () {
  'use strict';

  // --- ESTADO GLOBAL ---
  const state = {
    idioma: 'es',
    nivel: 'infantil5',
    ttsActivo: true,
    caramelos: 0,
    completadas: [],
    pendientes: [],
    imagenActual: null,
    intentosActuales: 0,
    pantallaActual: 'home',
    isSpinning: false,
    wheelAngle: 0,
    resuelta: false,
    giroToken: 0
  };

  // --- SÍNTESIS DE SONIDO WEB AUDIO (100% Offline) ---
  let audioCtx = null;
  function getAudioCtx() {
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContext();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  function playSound(type) {
    try {
      const ctx = getAudioCtx();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'click') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
        osc.start(now);
        osc.stop(now + 0.07);
      } else if (type === 'spinTick') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(450, now);
        osc.frequency.exponentialRampToValueAtTime(750, now + 0.04);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
        osc.start(now);
        osc.stop(now + 0.05);
      } else if (type === 'success') {
        // Acorde alegre de campanillas Do - Mi - Sol - Do
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, idx) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.type = 'triangle';
          o.frequency.setValueAtTime(freq, now + idx * 0.1);
          g.gain.setValueAtTime(0.18, now + idx * 0.1);
          g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.35);
          o.connect(g);
          g.connect(ctx.destination);
          o.start(now + idx * 0.1);
          o.stop(now + idx * 0.1 + 0.36);
        });
      } else if (type === 'fail') {
        // Tono suave de apoyo / no frustrante
        osc.type = 'sine';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.linearRampToValueAtTime(240, now + 0.25);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.32);
      } else if (type === 'candy') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(1320, now + 0.15);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.26);
      } else if (type === 'win') {
        const fanfarria = [523.25, 659.25, 783.99, 1046.50, 1318.51];
        fanfarria.forEach((freq, idx) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.type = 'triangle';
          o.frequency.setValueAtTime(freq, now + idx * 0.12);
          g.gain.setValueAtTime(0.2, now + idx * 0.12);
          g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.5);
          o.connect(g);
          g.connect(ctx.destination);
          o.start(now + idx * 0.12);
          o.stop(now + idx * 0.12 + 0.52);
        });
      }
    } catch (e) {
      console.warn('Audio no inicializado:', e);
    }
  }

  // --- SÍNTESIS DE VOZ (Web Speech API) ---
  let voices = [];
  let preferredVoice = '';
  let speechRate = 0.9;
  try {
    preferredVoice = localStorage.getItem('disfraces-voice') || '';
    speechRate = Number(localStorage.getItem('disfraces-rate')) || 0.9;
  } catch (_) {}
  speechRate = Math.max(0.75, Math.min(1.1, speechRate));

  function voiceScore(voice) {
    const name = voice.name.toLowerCase();
    let score = voice.lang.toLowerCase() === 'es-es' ? 100 : 0;
    // Preferencias orientativas por nombre; el navegador no informa del género.
    if (/mónica|monica|elvira|helena|lucia|lucía|laura|carmen|conchita|isabel|paulina/.test(name)) score += 30;
    if (/natural|premium|enhanced|mejorada/.test(name)) score += 10;
    return score;
  }

  function loadVoices() {
    if (!('speechSynthesis' in window)) return;
    voices = window.speechSynthesis.getVoices()
      .filter(v => /^es(?:-|$)/i.test(v.lang))
      .sort((a, b) => voiceScore(b) - voiceScore(a) || a.name.localeCompare(b.name));
    const select = document.getElementById('cfg-voice');
    if (!select) return;
    select.replaceChildren();
    const automatic = document.createElement('option');
    automatic.value = '';
    automatic.textContent = 'Automática · preferencia femenina de España';
    select.appendChild(automatic);
    voices.forEach(voice => {
      const option = document.createElement('option');
      option.value = voice.voiceURI;
      option.textContent = `${voice.name} · ${voice.lang}${voice.localService ? ' · en el dispositivo' : ''}`;
      select.appendChild(option);
    });
    select.value = voices.some(v => v.voiceURI === preferredVoice) ? preferredVoice : '';
    const note = document.getElementById('voice-note');
    if (note) note.textContent = voices.some(v => v.lang.toLowerCase() === 'es-es')
      ? 'Preferencia por una voz femenina de España. Escucha la muestra para elegir la que más te guste.'
      : 'No se detecta una voz de España. Para mejorar la lectura, instala una voz de español de España en el dispositivo.';
  }

  if ('speechSynthesis' in window) {
    loadVoices();
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
  }

  function getSelectedVoice() {
    if (!voices.length) loadVoices();
    return voices.find(v => v.voiceURI === preferredVoice) || voices[0] || null;
  }

  let speechTimer;
  let introAudio = null;
  function stopSpeech() {
    clearTimeout(speechTimer);
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    if (introAudio) { introAudio.pause(); introAudio.currentTime = 0; }
  }

  function playIntroRecording(automatic = false) {
    if (!state.ttsActivo || (automatic && !document.getElementById('cfg-audio').checked)) return;
    stopSpeech();
    if (!introAudio) introAudio = new Audio('audio/introduccion.mp3');
    const button = document.getElementById('btn-intro-listen');
    button.textContent = '🔊 ESCUCHAR';
    const onError = () => {
      button.textContent = '🔊 VOLVER A ESCUCHAR';
      console.warn('No se ha podido reproducir la grabación inicial.');
    };
    introAudio.onerror = onError;
    const playback = introAudio.play();
    if (playback && playback.catch) playback.catch(onError);
  }
  function speak(text, automatic = false) {
    if (automatic && !document.getElementById('cfg-audio').checked) return;
    stopSpeech();
    if (!state.ttsActivo || !('speechSynthesis' in window) || !text) return;
    try {
      window.speechSynthesis.resume();
      window.speechSynthesis.cancel();

      const cleanText = text.replace(/<[^>]*>/g, '').trim();
      const utterance = new SpeechSynthesisUtterance(cleanText);
      const voice = getSelectedVoice();
      if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang;
      } else {
        utterance.lang = state.idioma === 'en' ? 'en-US' : 'es-ES';
      }
      utterance.rate = speechRate;
      utterance.pitch = 1;

      window._currentUtterance = utterance;
      utterance.onend = () => { window._currentUtterance = null; };
      utterance.onerror = (e) => {
        console.warn('TTS error:', e);
        window._currentUtterance = null;
      };

      // Breve retardo para permitir limpieza de buffer de voz en Chrome/Edge
      speechTimer = setTimeout(() => {
        if (!state.ttsActivo) return;
        window.speechSynthesis.resume();
        window.speechSynthesis.speak(utterance);
      }, 60);
    } catch (err) {
      console.warn('TTS error:', err);
    }
  }

  // --- NAVEGACIÓN ENTRE PANTALLAS (SPA) ---
  function showScreen(screenId) {
    stopSpeech();
    if (screenId !== 'roulette') { state.giroToken++; state.isSpinning = false; }
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(`screen-${screenId}`);
    if (target) {
      target.classList.add('active');
      state.pantallaActual = screenId;
      window.scrollTo(0, 0);
    }

    if (screenId === 'roulette') {
      renderRoulette();
    }
  }

  // --- INICIALIZACIÓN DE LA PARTIDA ---
  function initGame() {
    state.giroToken++;
    state.isSpinning = false;
    state.resuelta = false;
    state.imagenActual = null;
    state.caramelos = 0;
    state.completadas = [];
    state.pendientes = window.MASTER_DATA.imagenes.map(img => img.id);
    updateCandyCounter();
    updateRemainingBadge();
  }

  function updateCandyCounter() {
    const el = document.getElementById('candy-count');
    if (el) {
      el.textContent = `${state.caramelos} / ${window.MASTER_DATA.imagenes.length}`;
      const parent = el.parentElement;
      parent.classList.remove('bounce');
      void parent.offsetWidth; // trigger reflow
      parent.classList.add('bounce');
    }
  }

  function updateRemainingBadge() {
    const el = document.getElementById('roulette-remaining');
    if (el) {
      el.textContent = `${state.pendientes.length} restantes`;
    }
  }

  // --- RULETA INTERACTIVA (CANVAS) ---
  const WHEEL_PALETTE = ['#f87171', '#fb923c', '#fbbf24', '#34d399', '#2dd4bf', '#38bdf8', '#818cf8', '#c084fc', '#f472b6'];

  function renderRoulette() {
    const canvas = document.getElementById('wheel-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const r = cx - 10;

    ctx.clearRect(0, 0, w, h);

    const items = state.pendientes;
    const n = items.length;

    if (n === 0) {
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 24px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('¡COMPLETADO!', cx, cy);
      return;
    }

    const arc = (Math.PI * 2) / n;

    for (let i = 0; i < n; i++) {
      const angle = state.wheelAngle + i * arc;
      ctx.fillStyle = WHEEL_PALETTE[i % WHEEL_PALETTE.length];
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, angle, angle + arc);
      ctx.lineTo(cx, cy);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Texto de la tesela
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle + arc / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#ffffff';
      ctx.font = n > 16 ? 'bold 13px sans-serif' : 'bold 16px sans-serif';
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 4;
      const itemId = items[i];
      const imgData = window.MASTER_DATA.imagenes.find(im => im.id === itemId);
      const label = imgData ? imgData.id.replace('IMG_', '') : itemId;
      ctx.fillText(label, r - 20, 5);
      ctx.restore();
    }
  }

  function spinWheel() {
    if (state.isSpinning || state.pendientes.length === 0) return;
    state.isSpinning = true;
    const giroToken = ++state.giroToken;
    playSound('click');

    const totalSpins = 4 + Math.random() * 3; // Entre 4 y 7 vueltas completas
    const targetAngle = state.wheelAngle + totalSpins * Math.PI * 2 + (Math.random() * Math.PI * 2);
    const duration = 3800; // 3.8 segundos
    const startTime = performance.now();
    const startAngle = state.wheelAngle;
    let lastTickAngle = startAngle;

    function animate(now) {
      if (giroToken !== state.giroToken || state.pantallaActual !== 'roulette') return;
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Easing cúbico hacia desaceleración
      const ease = 1 - Math.pow(1 - progress, 3);
      state.wheelAngle = startAngle + (targetAngle - startAngle) * ease;

      // Sonido de tic en cada cambio de segmento
      const sectorAngle = (Math.PI * 2) / state.pendientes.length;
      if (Math.abs(state.wheelAngle - lastTickAngle) >= sectorAngle) {
        playSound('spinTick');
        lastTickAngle = state.wheelAngle;
      }

      renderRoulette();

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Calcular imagen seleccionada por el puntero (apuntando hacia abajo en ángulo -PI/2)
        const n = state.pendientes.length;
        const arc = (Math.PI * 2) / n;
        // Normalizar ángulo
        let pointerAngle = ((-Math.PI / 2 - state.wheelAngle) % (Math.PI * 2));
        if (pointerAngle < 0) pointerAngle += Math.PI * 2;
        const selectedIndex = Math.floor(pointerAngle / arc) % n;
        const selectedId = state.pendientes[selectedIndex];

        setTimeout(() => {
          if (giroToken !== state.giroToken || state.pantallaActual !== 'roulette') return;
          state.isSpinning = false;
          loadScene(selectedId);
        }, 500);
      }
    }

    requestAnimationFrame(animate);
  }

  // --- CARGA DE LA ESCENA EN EL ESCENARIO DE JUEGO ---
  function loadScene(imageId) {
    const item = window.MASTER_DATA.imagenes.find(im => im.id === imageId);
    if (!item) return;

    state.imagenActual = item;
    state.intentosActuales = 0;

    state.resuelta = false;
    const imgContainer = document.getElementById('scene-image-container');
    imgContainer.replaceChildren();
    const sceneImage = document.createElement('img');
    sceneImage.src = item.imagen;
    sceneImage.alt = item.descripcion.es;
    sceneImage.className = 'scene-placeholder-svg';
    imgContainer.appendChild(sceneImage);
    document.getElementById('scene-feedback').textContent = '¿Cómo se siente el personaje?';
    document.querySelectorAll('.emotion-card-btn').forEach(btn => { btn.disabled = false; });

    const titleEl = document.getElementById('scene-title');
    if (titleEl) {
      titleEl.textContent = state.idioma === 'en' ? item.titulo.en : item.titulo.es;
    }

    const descEl = document.getElementById('scene-desc');
    if (descEl) {
      descEl.textContent = state.idioma === 'en' ? item.descripcion.en : item.descripcion.es;
    }

    // Resetear robot mTiny
    setMtinyFace('dizzy', state.idioma === 'en' ? 'Look closely at the scene! How does the character feel?' : '¡Observa atentamente la lámina! ¿Cómo se siente el personaje?');

    // Ocultar caja de pistas
    const hintBox = document.getElementById('scene-hint-box');
    if (hintBox) hintBox.classList.remove('active');

    // Mostrar badge informativo de misión y ocultar módulo de reflexión
    const missionBadge = document.getElementById('mission-info-badge');
    if (missionBadge) missionBadge.style.display = 'flex';

    const reflectionBox = document.getElementById('scene-reflection-box');
    if (reflectionBox) reflectionBox.style.display = 'none';

    // Resetear teselas de emociones a estado neutro (estilo La Vocecita)
    document.querySelectorAll('.emotion-card-btn').forEach(btn => {
      btn.style.opacity = '1';
      btn.style.pointerEvents = 'auto';
      btn.style.borderColor = '#e2e8f0';
      btn.style.backgroundColor = '#ffffff';
      btn.style.transform = 'none';
      btn.style.boxShadow = 'none';
    });

    const nextBtn = document.getElementById('scene-next-btn');
    if (nextBtn) nextBtn.style.display = 'none';

    showScreen('activity');

    // Locución inicial si TTS está activo
    const descText = state.idioma === 'en' ? item.descripcion.en : item.descripcion.es;
    speak(descText, true);
  }

  function setMtinyFace(emotionId, speechText) {
    const screen = document.getElementById('mtiny-screen');
    const speech = document.getElementById('mtiny-speech');

    const emotionObj = window.MASTER_DATA.emociones.find(e => e.id === emotionId);
    const imgPath = emotionObj ? emotionObj.imagen : 'img/dizzy.png';

    if (screen) {
      screen.innerHTML = `<img src="${imgPath}" alt="${emotionId}">`;
      screen.style.borderColor = emotionObj ? emotionObj.colorBorde : '#10b981';
      screen.style.transform = 'scale(1.15)';
      setTimeout(() => { screen.style.transform = 'scale(1)'; }, 250);
    }
    if (speech && speechText) {
      speech.textContent = speechText;
    }
  }

  // --- COMPROBACIÓN DE EMOCIÓN SELECCIONADA (ESTILO LA VOCECITA) ---
  function selectEmotion(selectedId) {
    if (!state.imagenActual || state.resuelta || state.pantallaActual !== 'activity') return;
    const item = state.imagenActual;
    const isCorrect = (selectedId === item.emocion);

    if (isCorrect) {
      state.resuelta = true;
      document.querySelectorAll('.emotion-card-btn').forEach(btn => { btn.disabled = true; });
      // --- ACIERTO ---
      playSound('success');
      state.caramelos++;
      updateCandyCounter();

      // Quitar de pendientes y marcar completada
      state.pendientes = state.pendientes.filter(id => id !== item.id);
      if (!state.completadas.includes(item.id)) {
        state.completadas.push(item.id);
      }
      updateRemainingBadge();

      // mTiny reacciona con la emoción acertada
      const emotionData = window.MASTER_DATA.emociones.find(e => e.id === item.emocion);
      const emoName = state.idioma === 'en' ? emotionData.en : emotionData.es;
      const praise = state.idioma === 'en'
        ? `Great job! ${item.personaje} feels ${emoName}. +1 Candy!`
        : `¡Estupendo! Has reconocido la emoción: ${emoName.toLowerCase()}. ¡Un caramelo más para la bolsa!`;

      document.getElementById('scene-feedback').textContent = praise;
      setMtinyFace(item.emocion, praise);
      speak(praise, true);

      // Lanzar confeti alegre de acierto
      triggerConfetti(90, 2500);

      // Resaltar tesela acertada con su color temático y atenuar las demás (como en La Vocecita)
      document.querySelectorAll('.emotion-card-btn').forEach(btn => {
        if (btn.dataset.emotion === item.emocion) {
          btn.style.borderColor = emotionData ? emotionData.colorBorde : '#10b981';
          btn.style.backgroundColor = (emotionData ? emotionData.colorBorde : '#10b981') + '22';
          btn.style.transform = 'scale(1.08)';
          btn.style.boxShadow = '0 8px 18px rgba(0, 0, 0, 0.15)';
          btn.style.pointerEvents = 'none';
        } else {
          btn.style.opacity = '0.35';
          btn.style.pointerEvents = 'none';
        }
      });

      // Mostrar módulo de reflexión adaptado al nivel
      showReflectionModule(item);

      // Mostrar botón de continuar
      const nextBtn = document.getElementById('scene-next-btn');
      if (nextBtn) {
        nextBtn.style.display = 'inline-flex';
        nextBtn.textContent = state.pendientes.length === 0 ? '🏆 ¡VER MISIÓN FINAL!' : '🎲 ¡SEGUIR JUGANDO!';
      }

    } else {
      // --- ERROR / PISTA PROGRESIVA ---
      playSound('fail');
      state.intentosActuales++;

      // Atenuar la opción errónea para guiar al niño
      const wrongBtn = document.querySelector(`.emotion-card-btn[data-emotion="${selectedId}"]`);
      if (wrongBtn) {
        wrongBtn.style.opacity = '0.45';
      }

      // mTiny pone cara de duda
      setMtinyFace('confuso', state.idioma === 'en' ? 'Hmm, try again! Look at the clue below.' : 'Mmm, ¡vamos a intentarlo de nuevo! Fíjate en la pista:');

      // Mostrar pista progresiva
      const hintBox = document.getElementById('scene-hint-box');
      const hintText = document.getElementById('scene-hint-text');

      document.getElementById('scene-feedback').textContent = 'Vamos a probar otra vez. Observa su cara y lo que ha ocurrido.';
      if (!document.getElementById('cfg-hints').checked) return;
      let currentHint = '';
      if (state.intentosActuales === 1) {
        currentHint = item.pista_especifica ? (state.idioma === 'en' ? item.pista_especifica.en : item.pista_especifica.es) : window.MASTER_DATA.ayudas_generales[0].es;
      } else if (state.intentosActuales === 2) {
        currentHint = state.idioma === 'en' ? window.MASTER_DATA.ayudas_generales[1].en : window.MASTER_DATA.ayudas_generales[1].es;
      } else {
        currentHint = state.idioma === 'en' ? window.MASTER_DATA.ayudas_generales[Math.min(state.intentosActuales - 1, 3)].en : window.MASTER_DATA.ayudas_generales[Math.min(state.intentosActuales - 1, 3)].es;
      }

      if (hintBox && hintText) {
        hintText.textContent = `💡 Pista: ${currentHint}`;
        hintBox.classList.add('active');
        speak(currentHint, true);
      }
    }
  }

  // --- MOSTRAR PREGUNTAS DE REFLEXIÓN / TOM ---
  function showReflectionModule(item) {
    const box = document.getElementById('scene-reflection-box');
    const teacherSelect = document.getElementById('teacher-level-select');
    const questionText = document.getElementById('reflection-question-text');
    const tomText = document.getElementById('reflection-tom-text');

    if (!box) return;

    if (teacherSelect) {
      teacherSelect.value = state.nivel;
      teacherSelect.onchange = () => {
        state.nivel = teacherSelect.value;
        playSound('click');
        showReflectionModule(item);
      };
    }

    const currentNivelKey = state.nivel;

    // Pregunta por nivel
    const preguntasLevel = item.preguntas[currentNivelKey] || item.preguntas.infantil5;
    const preguntaPrincipal = preguntasLevel[0] || '¿Cómo te sentirías tú?';

    if (questionText) {
      questionText.textContent = preguntaPrincipal;
    }

    if (tomText && item.teoria_mente) {
      const tomQ = state.idioma === 'en' ? item.teoria_mente.en : item.teoria_mente.es;
      tomText.hidden = !document.getElementById('cfg-tom').checked;
      tomText.textContent = `💭 Teoría de la Mente: ${tomQ}`;
    }

    const missionBadge = document.getElementById('mission-info-badge');
    if (missionBadge) missionBadge.style.display = 'none';

    box.style.display = 'flex';
  }

  function handleNextAfterSuccess() {
    if (!state.resuelta) return;
    playSound('click');
    if (state.pendientes.length === 0) {
      // Completado total
      showScreen('final');
      playSound('win');
      triggerConfetti(150, 8000);
      speak(state.idioma === 'en' ? window.MASTER_DATA.final.mensaje_en : window.MASTER_DATA.final.mensaje_es, true);
    } else {
      showScreen('roulette');
    }
  }

  // --- EFECTO DE CONFETI EN CANVAS ---
  let confettiAnimId = null;
  function triggerConfetti(particleCount = 100, durationMs = 3000) {
    const canvas = document.getElementById('confetti-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ['#f87171', '#fbbf24', '#34d399', '#60a5fa', '#c084fc', '#f472b6'];
    const particles = Array.from({ length: particleCount }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      size: Math.random() * 8 + 6,
      dx: Math.random() * 4 - 2,
      dy: Math.random() * 5 + 3,
      color: colors[Math.floor(Math.random() * colors.length)],
      tilt: Math.random() * 10
    }));

    const startTime = performance.now();

    function animate(now) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.x += p.dx;
        p.y += p.dy;
        p.tilt += 0.1;
        ctx.beginPath();
        ctx.lineWidth = p.size;
        ctx.strokeStyle = p.color;
        ctx.moveTo(p.x + p.tilt + p.size, p.y);
        ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.size);
        ctx.stroke();
      });

      if (now - startTime < durationMs) {
        confettiAnimId = requestAnimationFrame(animate);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }

    if (confettiAnimId) cancelAnimationFrame(confettiAnimId);
    confettiAnimId = requestAnimationFrame(animate);
  }

  // --- RENDERIZADO DE LA BOTONERA DE EMOCIONES ---
  function renderEmotionsGrid() {
    const container = document.getElementById('emotions-buttons-grid');
    if (!container) return;
    container.innerHTML = '';

    window.MASTER_DATA.emociones.forEach(emo => {
      const btn = document.createElement('button');
      btn.className = 'emotion-card-btn';
      btn.dataset.emotion = emo.id;
      btn.style.borderColor = '#e2e8f0';
      btn.style.backgroundColor = '#ffffff';

      const label = state.idioma === 'en' ? emo.en : emo.es;

      btn.innerHTML = `
        <img src="${emo.imagen}" alt="${label}">
        <span class="emotion-name">${label}</span>
      `;

      btn.addEventListener('click', () => {
        selectEmotion(emo.id);
      });

      container.appendChild(btn);
    });
  }

  // --- CONFIGURACIÓN DE EVENTOS DEL DOM ---
  document.addEventListener('DOMContentLoaded', () => {
    initGame();
    renderEmotionsGrid();
    loadVoices();
    const voiceSelect = document.getElementById('cfg-voice');
    const rateInput = document.getElementById('cfg-rate');
    const rateLabel = document.getElementById('voice-rate-value');
    rateInput.value = speechRate;
    const updateRateLabel = () => { rateLabel.textContent = Number(speechRate).toFixed(2).replace('.', ',') + '×'; };
    updateRateLabel();
    voiceSelect.addEventListener('change', () => {
      stopSpeech();
      preferredVoice = voiceSelect.value;
      try { localStorage.setItem('disfraces-voice', preferredVoice); } catch (_) {}
    });
    rateInput.addEventListener('input', () => {
      stopSpeech();
      speechRate = Number(rateInput.value);
      updateRateLabel();
      try { localStorage.setItem('disfraces-rate', String(speechRate)); } catch (_) {}
    });
    document.getElementById('btn-test-voice').addEventListener('click', () => {
      state.ttsActivo = true;
      document.getElementById('header-tts-btn').classList.add('active');
      speak('¡Hola! Soy mTiny. Esta noche vamos a descubrir cómo se sienten Sara y sus amigos. ¿Me acompañas?');
    });

    // Portada: Selección de nivel
    document.querySelectorAll('.level-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.level-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.nivel = btn.dataset.level;
        playSound('click');
      });
    });

    // Botón comenzar misión (Portada -> Intro)
    const startMissionBtn = document.getElementById('btn-start-mission');
    if (startMissionBtn) {
      startMissionBtn.addEventListener('click', () => {
        playSound('click');
        initGame();
        showScreen('intro');
        // Reproducir narración del cuento de mTiny
        playIntroRecording(true);
      });
    }

    // Botones de pantalla Intro
    const introContinueBtn = document.getElementById('btn-intro-continue');
    if (introContinueBtn) {
      introContinueBtn.addEventListener('click', () => {
        playSound('click');
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
        showScreen('roulette');
      });
    }

    const introListenBtn = document.getElementById('btn-intro-listen');
    if (introListenBtn) {
      introListenBtn.addEventListener('click', () => {
        playSound('click');
        playIntroRecording();
      });
    }

    // Botón girar ruleta
    const spinBtn = document.getElementById('btn-spin-wheel');
    if (spinBtn) {
      spinBtn.addEventListener('click', () => {
        spinWheel();
      });
    }

    // Botón de siguiente imagen en la actividad
    const nextBtn = document.getElementById('scene-next-btn');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        handleNextAfterSuccess();
      });
    }

    // Botón de audio / leer descripción de escena
    const sceneAudioBtn = document.getElementById('scene-audio-btn');
    if (sceneAudioBtn) {
      sceneAudioBtn.addEventListener('click', () => {
        playSound('click');
        if (state.imagenActual) {
          const descText = state.idioma === 'en' ? state.imagenActual.descripcion.en : state.imagenActual.descripcion.es;
          speak(descText);
        }
      });
    }

    // Botones del Header
    const homeBtn = document.getElementById('header-home-btn');
    if (homeBtn) {
      homeBtn.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); homeBtn.click(); } });
      homeBtn.addEventListener('click', () => {
        playSound('click');
        showScreen('home');
      });
    }

    const ttsToggleBtn = document.getElementById('header-tts-btn');
    if (ttsToggleBtn) {
      ttsToggleBtn.addEventListener('click', () => {
        state.ttsActivo = !state.ttsActivo;
        ttsToggleBtn.classList.toggle('active', state.ttsActivo);
        playSound('click');
        if (!state.ttsActivo && 'speechSynthesis' in window) {
          stopSpeech();
        }
      });
    }

    // Botones de pantalla Final
    const playAgainBtn = document.getElementById('btn-play-again');
    if (playAgainBtn) {
      playAgainBtn.addEventListener('click', () => {
        initGame();
        showScreen('roulette');
        playSound('click');
      });
    }

    const restartHomeBtn = document.getElementById('btn-restart-home');
    if (restartHomeBtn) {
      restartHomeBtn.addEventListener('click', () => {
        initGame();
        showScreen('home');
        playSound('click');
      });
    }

    // Clic en el robot mTiny o en su bocadillo para escuchar su mensaje
    const speakMtiny = () => {
      playSound('click');
      const speechEl = document.getElementById('mtiny-speech');
      if (speechEl && speechEl.textContent) {
        speak(speechEl.textContent);
      }
    };

    const mtinyAvatar = document.getElementById('mtiny-avatar-box');
    if (mtinyAvatar) mtinyAvatar.addEventListener('click', speakMtiny);

    const mtinyBubble = document.getElementById('mtiny-bubble');
    if (mtinyBubble) mtinyBubble.addEventListener('click', speakMtiny);

    // Desbloqueo universal de audio y TTS en cualquier interacción de usuario
    document.addEventListener('pointerdown', () => {
      getAudioCtx();
      if ('speechSynthesis' in window && window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    }, { once: false });

    // Mostrar pantalla de inicio
    showScreen('home');
  });

})();

