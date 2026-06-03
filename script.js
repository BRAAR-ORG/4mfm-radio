// ============================================================
// VARIÁVEIS GLOBAIS E ESTADO
// ============================================================
let appState = { isLive: false };
let filaReproducao = [];
let lastSaveTime = 0;
const tituloOriginal = document.title;

// --- A Nova Mesa de Som Virtual (Web Audio API) ---
let audioCtx;
let playerA, playerB, currentAudio;
let isCrossfading = false;
const tempoCrossfade = 4; // Segundos para iniciar o crossfade

const BackgroundConfig = {
    folder: "Imgs/", prefix: "4mfmImg", totalImages: 9, extension: ".png", currentIdx: 1, intervalo: 10000
};

const BackgroundConfig1 = {
    folder: "Img-banner/", prefix: "4mfmBanner", totalImages: 7, extension: ".png", currentIdx: 1, intervalo: 10000
};

/* ============================================================
   INICIALIZAÇÃO (WINDOW ONLOAD)
   ============================================================ */
window.onload = () => {
    const startBtn = document.getElementById('startBtn');
    const interactionGroup = document.getElementById('interactionGroup');
    const visualizer = document.getElementById('visualizer');
    const shareBtn = document.getElementById('shareBtn');
    const notice = document.getElementById('notice');

    setInterval(atualizarRelogioReal, 1000);
    atualizarRelogioReal();
    iniciarSlideshow();

    if (startBtn) {
        startBtn.onclick = () => {
            if (typeof playlist !== 'undefined' && playlist.length > 0) {
                // 1. INICIA A MESA DE SOM (Obrigatório ser no clique para o iPhone liberar)
                inicializarMesaDeSom();
                
                startBtn.classList.add('hidden');
                if(notice) notice.classList.add('hidden');
                if(interactionGroup) interactionGroup.classList.remove('hidden');
                if(visualizer) visualizer.classList.remove('hidden');
                
                appState.isLive = true;

                if (window.showNotification) {
                    window.showNotification("Sintonizado!", "Bem-vindo à 4MFM RADIO.", "success");
                }
                
                iniciarFluxo();
            } else {
                alert("Erro: A playlist não foi carregada corretamente.");
            }
        };
    }

    if (shareBtn) {
        shareBtn.onclick = () => {
            const trackEl = document.getElementById('track');
            const artistEl = document.getElementById('artist');
            const shareText = `Estou ouvindo ${trackEl ? trackEl.textContent : "Música"} - ${artistEl ? artistEl.textContent : "Artista"} na 4MFM RADIO! 📻`;

            if (navigator.share) {
                navigator.share({ title: '4MFM RADIO', text: shareText, url: window.location.href })
                    .catch(err => console.log("Compartilhamento cancelado.", err));
            } else {
                navigator.clipboard.writeText(`${shareText} ${window.location.href}`);
                if (window.showNotification) window.showNotification("Copiado!", "Link copiado.", "success");
            }
        };
    }

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            document.title = "📻 Volte para a rádio!";
        } else {
            document.title = "▶️ Tocando agora - 4MFM";
            setTimeout(() => { document.title = tituloOriginal; }, 3000);
        }
    });

    // ===== SENSOR DE INTERNET =====
    window.addEventListener('offline', () => {
        if (appState.isLive && currentAudio) {
            currentAudio.pause(); 
            if (window.showNotification) window.showNotification("Sem Internet 🌐", "Sua conexão caiu...", "warning");
            document.title = "⚠️ Offline - Aguardando conexão";
            
            const trackEl = document.getElementById('track');
            if (trackEl) trackEl.textContent = "Sem conexão de rede...";
        }
    });

    window.addEventListener('online', () => {
        if (appState.isLive && currentAudio) {
            if (window.showNotification) window.showNotification("Conectado! 📶", "Voltando para a 4MFM...", "success");
            document.title = tituloOriginal; 
            
            const index = localStorage.getItem('4mfm_last_index');
            if (index !== null && playlist[index]) {
                const trackEl = document.getElementById('track');
                if (trackEl) trackEl.textContent = playlist[index].title;
            }
            currentAudio.play().catch(e => console.warn("Autoplay impedido após reconectar.", e));
        }
    });
};

/* ============================================================
   O MOTOR WEB AUDIO API (MÁGICA PARA O iPHONE)
   ============================================================ */
function inicializarMesaDeSom() {
    if (audioCtx) return; // Já foi iniciado
    
    // Cria o contexto de áudio (Nativo do navegador)
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    
    // ⚠️ MUDANÇA AQUI: Ignoramos o HTML e criamos players 100% limpos na memória
    playerA = new Audio();
    playerB = new Audio();
    
    // Permite que o áudio seja manipulado pela API sem erro de CORS
    playerA.crossOrigin = "anonymous"; 
    playerB.crossOrigin = "anonymous";

    // Conecta os players na mesa de som
    const sourceA = audioCtx.createMediaElementSource(playerA);
    const sourceB = audioCtx.createMediaElementSource(playerB);

    // Cria os controles de Volume Nativos (GainNodes)
    playerA.gainNode = audioCtx.createGain();
    playerB.gainNode = audioCtx.createGain();

    // Liga tudo na saída (Caixas de som)
    sourceA.connect(playerA.gainNode).connect(audioCtx.destination);
    sourceB.connect(playerB.gainNode).connect(audioCtx.destination);

    currentAudio = playerA;
    window.currentAudio = currentAudio;

    // Desperta o iPhone (desbloqueia o áudio)
    audioCtx.resume();
}

/**
 * Nova versão do fadeAudio: Usa a Mesa de Som para ignorar o bloqueio do iPhone
 */
window.fadeAudio = function(audioEl, destino, duracao = 1000) {
    if (!audioCtx || !audioEl.gainNode) {
        // Fallback caso seja um áudio simples (ex: a própria voz da Anne)
        audioEl.volume = destino;
        return;
    }
    
    const gainNode = audioEl.gainNode;
    const tempoAtual = audioCtx.currentTime;
    
    // ⚠️ MUDANÇA AQUI: Precisão matemática no volume atual para não dar "estalos"
    const volumeAtual = gainNode.gain.value;
    
    gainNode.gain.cancelScheduledValues(tempoAtual);
    gainNode.gain.setValueAtTime(volumeAtual, tempoAtual);
    
    // Faz a rampa de volume suave usando hardware (O iPhone aceita isso!)
    gainNode.gain.linearRampToValueAtTime(destino, tempoAtual + (duracao / 1000));
};

/* ============================================================
   LÓGICA DO SLIDESHOW DUPLO
   ============================================================ */
function iniciarSlideshow() {
    const bgImage = document.getElementById('bgImage');      
    const studioImg = document.getElementById('studioImg');  
    
    const trocarImagens = () => {
        const numBg = BackgroundConfig.currentIdx.toString().padStart(3, '0');
        const numBanner = BackgroundConfig1.currentIdx.toString().padStart(3, '0');

        const pathFundo = `${BackgroundConfig.folder}${BackgroundConfig.prefix}${numBg}${BackgroundConfig.extension}`;
        const pathBanner = `${BackgroundConfig1.folder}${BackgroundConfig1.prefix}${numBanner}${BackgroundConfig1.extension}`;
        
        if(bgImage) bgImage.style.opacity = "0.2"; 
        if(studioImg) studioImg.style.opacity = "0";

        setTimeout(() => {
            if(bgImage) { bgImage.onload = () => bgImage.style.opacity = "1"; bgImage.src = pathFundo; }
            if(studioImg) { studioImg.onload = () => studioImg.style.opacity = "1"; studioImg.src = pathBanner; }

            BackgroundConfig.currentIdx = (BackgroundConfig.currentIdx % BackgroundConfig.totalImages) + 1;
            BackgroundConfig1.currentIdx = (BackgroundConfig1.currentIdx % BackgroundConfig1.totalImages) + 1;
        }, 1000); 
    };

    trocarImagens();
    setInterval(trocarImagens, BackgroundConfig.intervalo);
}

/* ============================================================
   MOTOR DE ÁUDIO, SHUFFLE E CROSSFADE
   ============================================================ */
function embaralharPlaylist() {
    filaReproducao = Array.from(Array(playlist.length).keys());
    for (let i = filaReproducao.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [filaReproducao[i], filaReproducao[j]] = [filaReproducao[j], filaReproducao[i]];
    }
}

function iniciarFluxo() {
    const savedDate = localStorage.getItem('4mfm_last_save_date');
    const validadeSessao = 24 * 60 * 60 * 1000; 
    const agora = Date.now();

    if (savedDate && (agora - parseInt(savedDate) > validadeSessao)) {
        localStorage.removeItem('4mfm_last_index');
        localStorage.removeItem('4mfm_last_time');
        localStorage.removeItem('4mfm_last_save_date');
    }

    embaralharPlaylist();

    const finalLastTrackIndex = localStorage.getItem('4mfm_last_index');
    const finalLastTime = localStorage.getItem('4mfm_last_time');

    if (finalLastTrackIndex !== null && playlist[finalLastTrackIndex]) {
        const indexToPlay = parseInt(finalLastTrackIndex);
        filaReproducao = filaReproducao.filter(i => i !== indexToPlay);
        tocarMusica(indexToPlay, parseFloat(finalLastTime) || 0);
    } else {
        tocarProximaDaFila();
    }
}

function tocarProximaDaFila() {
    if (filaReproducao.length === 0) embaralharPlaylist();
    const proximoIndex = filaReproducao.shift();
    tocarMusica(proximoIndex, 0);
}

function tocarMusica(index, startTime = 0) {
    const track = playlist[index];
    if (!track) return tocarProximaDaFila();

    localStorage.setItem('4mfm_last_index', index);
    
    // Atualiza a interface
    const trackEl = document.getElementById('track');
    const artistEl = document.getElementById('artist');
    const albumArtEl = document.getElementById('albumArt');
    
    if (trackEl) trackEl.textContent = track.title;
    if (artistEl) artistEl.textContent = track.artist;
    
    const coverSrc = track.cover || "icon/logo-4mfm.png";
    if (albumArtEl) albumArtEl.src = coverSrc;

    if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
            title: track.title, artist: track.artist, album: '4MFM RADIO',
            artwork: [{ src: coverSrc, sizes: '512x512', type: 'image/png' }]
        });
    }

    // --- LÓGICA DE DUAL PLAYER ---
    let proximoPlayer = (currentAudio === playerA) ? playerB : playerA;
    let proximoGain = proximoPlayer.gainNode;

    proximoPlayer.src = track.src;
    proximoPlayer.currentTime = startTime;
    
    // Volume zero inicialmente para o Fade In
    if (proximoGain) {
        proximoGain.gain.cancelScheduledValues(audioCtx.currentTime);
        proximoGain.gain.setValueAtTime(0, audioCtx.currentTime);
        proximoGain.gain.value = 0; // Força o valor na marra
    }

    configurarEventosAudio(proximoPlayer);

    proximoPlayer.play().then(() => {
        // ⚠️ MUDANÇA AQUI: Garante que a mesa de som não durma no iOS
        if (audioCtx.state === 'suspended') {
            audioCtx.resume(); 
        }

        // Sobe o volume da nova música (Fade In)
        fadeAudio(proximoPlayer, 1.0, 3000);

        // Abaixa a música velha (Fade Out)
        if (currentAudio !== proximoPlayer && !currentAudio.paused) {
            fadeAudio(currentAudio, 0.0, 3000);
            setTimeout(() => currentAudio.pause(), 3000);
        }

        currentAudio = proximoPlayer;
        window.currentAudio = currentAudio; 
        isCrossfading = false;
        lastSaveTime = startTime;

        if (window.showNotification && startTime === 0) {
            window.showNotification("Tocando Agora 🎵", `${track.title} - ${track.artist}`, "info");
        }
    }).catch(e => {
        console.warn("⚠️ Autoplay impedido.", e);
        currentAudio = proximoPlayer;
        window.currentAudio = currentAudio;
    });
}

function configurarEventosAudio(player) {
    player.ontimeupdate = () => {
        if (!player.paused && appState.isLive) {
            const currentTime = player.currentTime;
            
            // Salvar Progresso
            if (currentTime - lastSaveTime > 5 || currentTime < lastSaveTime) {
                localStorage.setItem('4mfm_last_time', currentTime);
                localStorage.setItem('4mfm_last_save_date', Date.now()); 
                lastSaveTime = currentTime;
            }

            // GATILHO DO CROSSFADE (Aplica antes da música acabar)
            if (!isCrossfading && player.duration && (player.duration - currentTime <= tempoCrossfade)) {
                isCrossfading = true;
                if (window.verificarIntervencaoDaAnne) {
                    window.verificarIntervencaoDaAnne(tocarProximaDaFila);
                } else {
                    tocarProximaDaFila();
                }
            }
        }
    };

    player.onended = () => {
        if (!isCrossfading) {
            if (window.verificarIntervencaoDaAnne) window.verificarIntervencaoDaAnne(tocarProximaDaFila);
            else tocarProximaDaFila();
        }
    };

    player.onerror = () => {
        if (!navigator.onLine) return; 
        console.error("❌ Link de áudio falhou.");
        setTimeout(tocarProximaDaFila, 2000);
    };
}

/* ============================================================
   UTILITÁRIOS
   ============================================================ */
function atualizarRelogioReal() {
    const agora = new Date();
    const h = agora.getHours().toString().padStart(2, '0');
    const m = agora.getMinutes().toString().padStart(2, '0');
    const relogioElement = document.getElementById('liveClock');
    if (relogioElement) relogioElement.textContent = `${h}:${m}`;
}
