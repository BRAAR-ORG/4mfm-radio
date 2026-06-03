
let appState = { isLive: false };
let filaReproducao = [];
let lastSaveTime = 0; 
const tituloOriginal = document.title;

// --- O SISTEMA DOS DOIS TOCA-DISCOS (CROSSFADE) ---
let playerA = new Audio();
let playerB = new Audio();
// Permite que o iPhone processe o áudio (CORS)
playerA.crossOrigin = "anonymous"; 
playerB.crossOrigin = "anonymous";

let currentAudio = playerA; // Indica quem está tocando
window.currentAudio = currentAudio; // Para a Anne.js encontrar
let isCrossfading = false;
const tempoCrossfade = 4; // Faltando 4 segundos, começa a transição

// --- WEB AUDIO API (Mesa de Som Virtual para o iPhone) ---
window.audioCtx = null;

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
                // 1. OBRIGATÓRIO PARA O IPHONE: Inicializa o som no primeiro toque
                inicializarWebAudioAPI();

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
                alert("Erro: A playlist não foi carregada corretamente. Verifique o arquivo playlist.js.");
            }
        };
    }

    if (shareBtn) {
        shareBtn.onclick = () => {
            const trackEl = document.getElementById('track');
            const artistEl = document.getElementById('artist');
            const trackName = trackEl ? trackEl.textContent : "Música";
            const artistName = artistEl ? artistEl.textContent : "Artista";
            const shareText = `Estou ouvindo ${trackName} - ${artistName} na 4MFM RADIO! 📻`;

            if (navigator.share) {
                navigator.share({
                    title: '4MFM RADIO', text: shareText, url: window.location.href
                }).catch(err => console.log("Compartilhamento cancelado.", err));
            } else {
                navigator.clipboard.writeText(`${shareText} ${window.location.href}`);
                if (window.showNotification) window.showNotification("Copiado!", "Link copiado.", "success");
                else alert("Link e música copiados para a área de transferência!");
            }
        };
    }

    // ===== SENSORES DE TELA E INTERNET =====
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            document.title = "📻 Volte para a rádio!";
        } else {
            document.title = "▶️ Tocando agora - 4MFM";
            setTimeout(() => { document.title = tituloOriginal; }, 3000);
        }
    });

    window.addEventListener('offline', () => {
        if (appState.isLive) {
            currentAudio.pause(); 
            if (window.showNotification) window.showNotification("Sem Internet 🌐", "Sua conexão caiu. Aguardando rede...", "warning");
            document.title = "⚠️ Offline - Aguardando conexão";
            
            const trackEl = document.getElementById('track');
            const artistEl = document.getElementById('artist');
            if (trackEl) trackEl.textContent = "Sem conexão de rede...";
            if (artistEl) artistEl.textContent = "Aguardando internet";
        }
    });

    window.addEventListener('online', () => {
        if (appState.isLive) {
            if (window.showNotification) window.showNotification("Conectado! 📶", "Voltando para a 4MFM...", "success");
            document.title = tituloOriginal;
            
            const index = localStorage.getItem('4mfm_last_index');
            if (index !== null && playlist[index]) {
                const trackEl = document.getElementById('track');
                const artistEl = document.getElementById('artist');
                if (trackEl) trackEl.textContent = playlist[index].title;
                if (artistEl) artistEl.textContent = playlist[index].artist;
            }

            currentAudio.play().catch(e => console.warn("⚠️ Autoplay impedido após reconectar.", e));
        }
    });
};

/* ============================================================
   LÓGICA DO SLIDESHOW DUPLO (FUNDO E VITRINE)
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
            if(bgImage) {
                bgImage.onload = () => { bgImage.style.opacity = "1"; };
                bgImage.onerror = () => { console.warn("Fundo não encontrado:", pathFundo); };
                bgImage.src = pathFundo;
            }
            if(studioImg) {
                studioImg.onload = () => { studioImg.style.opacity = "1"; };
                studioImg.onerror = () => { console.warn("Vitrine não encontrada:", pathBanner); };
                studioImg.src = pathBanner;
            }
            BackgroundConfig.currentIdx = (BackgroundConfig.currentIdx % BackgroundConfig.totalImages) + 1;
            BackgroundConfig1.currentIdx = (BackgroundConfig1.currentIdx % BackgroundConfig1.totalImages) + 1;
        }, 1000); 
    };

    trocarImagens();
    setInterval(trocarImagens, BackgroundConfig.intervalo);
}

/* ============================================================
   O MOTOR DE ÁUDIO (WEB AUDIO API + CROSSFADE + SHUFFLE)
   ============================================================ */
function inicializarWebAudioAPI() {
    if (window.audioCtx) return; // Só inicia uma vez
    
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    window.audioCtx = new AudioContext();

    // Conecta o Player A na mesa de som
    const trackA = window.audioCtx.createMediaElementSource(playerA);
    playerA.gainNode = window.audioCtx.createGain();
    trackA.connect(playerA.gainNode).connect(window.audioCtx.destination);

    // Conecta o Player B na mesa de som
    const trackB = window.audioCtx.createMediaElementSource(playerB);
    playerB.gainNode = window.audioCtx.createGain();
    trackB.connect(playerB.gainNode).connect(window.audioCtx.destination);

    // Acorda o AudioContext no iOS
    if (window.audioCtx.state === 'suspended') {
        window.audioCtx.resume();
    }
}

function embaralharPlaylist() {
    filaReproducao = Array.from(Array(playlist.length).keys());
    for (let i = filaReproducao.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [filaReproducao[i], filaReproducao[j]] = [filaReproducao[j], filaReproducao[i]];
    }
    console.log("🎲 Playlist embaralhada com sucesso.");
}

function iniciarFluxo() {
    const finalLastTrackIndex = localStorage.getItem('4mfm_last_index');
    const finalLastTime = localStorage.getItem('4mfm_last_time');
    const savedDate = localStorage.getItem('4mfm_last_save_date');
    const validadeSessao = 24 * 60 * 60 * 1000; 

    if (savedDate && (Date.now() - parseInt(savedDate) > validadeSessao)) {
        console.log("📅 Sessão antiga expirada. Iniciando um novo dia na 4MFM.");
        localStorage.removeItem('4mfm_last_index');
        localStorage.removeItem('4mfm_last_time');
        localStorage.removeItem('4mfm_last_save_date');
    }

    embaralharPlaylist();

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
    
    // UI Update
    const trackEl = document.getElementById('track');
    const artistEl = document.getElementById('artist');
    const albumArtEl = document.getElementById('albumArt');
    
    if (trackEl) trackEl.textContent = track.title;
    if (artistEl) artistEl.textContent = track.artist;
    
    const coverSrc = track.cover || "icon/logo-4mfm.png";
    if (albumArtEl) albumArtEl.src = coverSrc;

    // Tela de bloqueio do celular
    if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
            title: track.title, artist: track.artist, album: '4MFM RADIO',
            artwork: [{ src: coverSrc, sizes: '512x512', type: 'image/png' }]
        });
    }

    // --- LÓGICA DE CROSSFADE ---
    let proximoPlayer = (currentAudio === playerA) ? playerB : playerA;
    
    proximoPlayer.src = track.src;
    proximoPlayer.currentTime = startTime;
    
    // Começa mudo e sobe o volume suavemente (Fade In)
    if (proximoPlayer.gainNode) proximoPlayer.gainNode.gain.value = 0; 
    else proximoPlayer.volume = 0; 

    configurarEventosAudio(proximoPlayer);

    proximoPlayer.play().then(() => {
        fadeAudio(proximoPlayer, 1.0, 3000); // Sobe a música nova em 3 segs

        // Abaixa a música velha (Fade Out)
        if (currentAudio !== proximoPlayer && !currentAudio.paused) {
            fadeAudio(currentAudio, 0.0, 3000);
            setTimeout(() => { currentAudio.pause(); }, 3000); 
        }

        currentAudio = proximoPlayer;
        window.currentAudio = currentAudio; 
        isCrossfading = false;
        lastSaveTime = startTime;

        if (window.showNotification && startTime === 0) {
            window.showNotification("Tocando Agora 🎵", `${track.title} - ${track.artist}`, "info");
        }
    }).catch(e => {
        console.warn("⚠️ Autoplay impedido. Aguardando toque na tela.");
        currentAudio = proximoPlayer; window.currentAudio = currentAudio;
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

            // O GATILHO DO CROSSFADE (Faltando 4s para acabar)
            if (!isCrossfading && player.duration && (player.duration - currentTime <= tempoCrossfade)) {
                isCrossfading = true;
                if (window.verificarIntervencaoDaAnne) window.verificarIntervencaoDaAnne(tocarProximaDaFila);
                else tocarProximaDaFila();
            }
        }
    };

    player.onended = () => {
        if (!isCrossfading) { // Fallback se a música pular e perder o gatilho
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

/**
 * Função de Fade turbinada. Funciona no Android, PC e, agora, no iPhone.
 */
function fadeAudio(audioEl, destino, duracao = 1000) {
    // 1. Se o navegador suportar Web Audio API (Salvador do iPhone)
    if (audioEl.gainNode && window.audioCtx && window.audioCtx.state === 'running') {
        const agora = window.audioCtx.currentTime;
        audioEl.gainNode.gain.cancelScheduledValues(agora);
        audioEl.gainNode.gain.setValueAtTime(audioEl.gainNode.gain.value, agora);
        // Faz a rampa de volume pelo processador nativo
        audioEl.gainNode.gain.linearRampToValueAtTime(destino, agora + (duracao / 1000));
        
        // Sincroniza a tag html só por precaução
        setTimeout(() => { audioEl.volume = destino; }, duracao);
        return;
    }

    // 2. Fallback padrão para navegadores simples / antigos
    const passos = 20;
    const incremento = (destino - audioEl.volume) / passos;
    const intervalo = duracao / passos;
    let contador = 0;
    
    const timer = setInterval(() => {
        audioEl.volume = Math.max(0, Math.min(1, audioEl.volume + incremento));
        contador++;
        if (contador >= passos) clearInterval(timer);
    }, intervalo);
}
