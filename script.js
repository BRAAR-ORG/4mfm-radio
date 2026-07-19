const TEMPO_CROSSFADE = 4; // Segundos finais para iniciar a transição
const TITULO_ORIGINAL = document.title;

let appState = { 
    isLive: false,
    isCrossfading: false,
    filaReproducao: [],
    lastSaveTime: 0
};
window.appState = appState;

// Configurações do Slideshow (Fundo e Banner)
const BackgroundConfig = { folder: "Imgs/", prefix: "4mfmImg", totalImages: 9, extension: ".png", currentIdx: 1, intervalo: 10000 };
const BackgroundConfig1 = { folder: "Img-banner/", prefix: "4mfmBanner", totalImages: 6, extension: ".png", currentIdx: 1, intervalo: 10000 };

// Instanciação limpa dos players sem CORS (essencial para evitar bloqueios em CDNs externas, como GitHub)
const playerA = document.getElementById('audio') || new Audio();
const playerB = new Audio();

let currentAudio = playerA;
window.currentAudio = currentAudio;

window.playerRadio = {
    audio: currentAudio,
    isPlaying: () => !currentAudio.paused,
    setVolume: (vol) => { currentAudio.volume = vol; }
};

// Cache de Elementos do DOM
const DOM_RADIO = {
    startBtn: document.getElementById('startBtn'),
    interactionGroup: document.getElementById('interactionGroup'),
    visualizer: document.getElementById('visualizer'),
    shareBtn: document.getElementById('shareBtn'),
    notice: document.getElementById('notice'),
    bgImage: document.getElementById('bgImage'),
    studioImg: document.getElementById('studioImg'),
    track: document.getElementById('track'),
    artist: document.getElementById('artist'),
    albumArt: document.getElementById('albumArt'),
    liveClock: document.getElementById('liveClock'),
    chatScreen: document.getElementById('chatScreen'),
    chatMessages: document.getElementById('chatMessages'),
    activeUsersCount: document.getElementById('activeUsersCount'),
    chatInput: document.querySelector('.chat-input'),
    chatBtn: document.querySelector('.chat-btn')
};

// ============================================================
// INICIALIZAÇÃO (ONLOAD)
// ============================================================
window.addEventListener('load', () => {
    configurarEventosAudio(playerA);
    configurarEventosAudio(playerB);

    setInterval(atualizarRelogioReal, 1000);
    atualizarRelogioReal();
    iniciarSlideshow();
    configurarEventosRede(); 

    if (DOM_RADIO.startBtn) {
        DOM_RADIO.startBtn.addEventListener('click', () => {
            if (typeof playlist !== 'undefined' && playlist.length > 0) {
                DOM_RADIO.startBtn.classList.add('hidden');
                if (DOM_RADIO.notice) DOM_RADIO.notice.classList.add('hidden');
                if (DOM_RADIO.interactionGroup) DOM_RADIO.interactionGroup.classList.remove('hidden');
                
                appState.isLive = true;

                if (window.showNotification) {
                    window.showNotification("Sintonizado!", "Bem-vindo à 4MFM RADIO.", "success");
                }
                iniciarFluxo();
            } else {
                alert("Erro: A playlist não foi carregada corretamente. Verifique o arquivo playlist.js.");
            }
        });
    }

    if (DOM_RADIO.shareBtn) {
        DOM_RADIO.shareBtn.addEventListener('click', handleCompartilhamento);
    }

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            document.title = "📻 Volte para a rádio!";
        } else {
            document.title = "▶️ Tocando agora - 4MFM";
            setTimeout(() => { document.title = TITULO_ORIGINAL; }, 3000);
        }
    });

    console.log("🔊 4MFM Radio Engine Inicializado");
});

// ============================================================
// SISTEMA DE ÁUDIO E TRANSIÇÕES
// ============================================================
function transicaoSuaveDOM(elemento, novoValor, isImage = false, tempoFade = 500) {
    if (!elemento) return;
    
    elemento.style.transition = `opacity ${tempoFade}ms ease-in-out`;
    elemento.style.opacity = 0;
    
    setTimeout(() => {
        if (isImage) {
            if (!elemento.src.endsWith(novoValor)) {
                elemento.src = novoValor;
            }
        } else {
            elemento.textContent = novoValor;
        }
        elemento.style.opacity = 1;
    }, tempoFade);
}

window.fadeAudio = function(audioEl, destino, duracao = 1000) {
    if (!audioEl) return;
    const startVolume = audioEl.volume;
    const change = destino - startVolume;
    const startTime = performance.now();

    function animateFade(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duracao, 1);
        
        const novoVolume = startVolume + (change * progress);
        audioEl.volume = Math.max(0, Math.min(1, novoVolume)); 
        
        if (progress < 1) {
            requestAnimationFrame(animateFade);
        } else {
            audioEl.volume = Math.max(0, Math.min(1, destino));
        }
    }
    requestAnimationFrame(animateFade);
};

function configurarEventosAudio(player) {
    player.ontimeupdate = function() {
        if (this !== currentAudio || !appState.isLive || this.paused) return;
        const currentTime = this.currentTime;
        
        if (Math.abs(currentTime - appState.lastSaveTime) > 5) {
            localStorage.setItem('4mfm_last_time', currentTime);
            localStorage.setItem('4mfm_last_save_date', Date.now()); 
            appState.lastSaveTime = currentTime;
        }

        if (this.duration && (this.duration - currentTime <= TEMPO_CROSSFADE) && !appState.isCrossfading) {
            appState.isCrossfading = true;
            if (window.verificarIntervencaoDaCamilla) {
                window.verificarIntervencaoDaCamilla(tocarProximaDaFila);
            } else {
                tocarProximaDaFila();
            }
        }
    };

    player.onended = function() {
        if (this !== currentAudio) return;
        if (!appState.isCrossfading) {
            tocarProximaDaFila();
        }
    };

    player.onerror = function() {
        if (this !== currentAudio || !navigator.onLine) return; 
        console.error("❌ Erro ao carregar o link de áudio. Pulando para a próxima faixa...");
        setTimeout(tocarProximaDaFila, 2500);
    };
}

function iniciarFluxo() {
    const savedDate = localStorage.getItem('4mfm_last_save_date');
    const validadeSessao = 24 * 60 * 60 * 1000; 
    const agora = Date.now();

    if (savedDate && (agora - parseInt(savedDate) > validadeSessao)) {
        ['4mfm_last_index', '4mfm_last_time', '4mfm_last_save_date'].forEach(k => localStorage.removeItem(k));
    }

    embaralharPlaylist();
    const finalLastTrackIndex = localStorage.getItem('4mfm_last_index');
    const finalLastTime = localStorage.getItem('4mfm_last_time');

    if (finalLastTrackIndex !== null && playlist[finalLastTrackIndex]) {
        const indexToPlay = parseInt(finalLastTrackIndex);
        appState.filaReproducao = appState.filaReproducao.filter(i => i !== indexToPlay);
        tocarMusica(indexToPlay, parseFloat(finalLastTime) || 0);
    } else {
        tocarProximaDaFila();
    }
}

function determinarProxima() {
    if (appState.filaReproducao.length === 0) embaralharPlaylist();
    return appState.filaReproducao.shift();
}

window.tocarProximaDaFila = function() {
    tocarMusica(determinarProxima(), 0);
};

function embaralharPlaylist() {
    let arr = Array.from(Array(playlist.length).keys());
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    appState.filaReproducao = arr;
}

function tocarMusica(index, startTime = 0) {
    const track = playlist[index];
    if (!track) return window.tocarProximaDaFila();

    localStorage.setItem('4mfm_last_index', index);
    
    transicaoSuaveDOM(DOM_RADIO.track, track.title, false, 500);
    transicaoSuaveDOM(DOM_RADIO.artist, track.artist, false, 500);
    
    const coverSrc = track.cover || "icon/logo-4mfm.png";
    transicaoSuaveDOM(DOM_RADIO.albumArt, coverSrc, true, 500);

    if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
            title: track.title, 
            artist: track.artist, 
            album: '4MFM RADIO',
            artwork: [{ src: coverSrc, sizes: '512x512', type: 'image/png' }]
        });
    }

    const proximoPlayer = (currentAudio === playerA) ? playerB : playerA;
    const playerAnterior = currentAudio;

    currentAudio = proximoPlayer;
    window.currentAudio = currentAudio;
    if (window.playerRadio) window.playerRadio.audio = currentAudio;

    appState.isCrossfading = false; 

    proximoPlayer.src = track.src;
    proximoPlayer.currentTime = startTime;
    proximoPlayer.volume = 0; 

    proximoPlayer.play().then(() => {
        window.fadeAudio(proximoPlayer, 1.0, 2500);
        
        if (playerAnterior && !playerAnterior.paused) {
            window.fadeAudio(playerAnterior, 0.0, 2500);
            setTimeout(() => { playerAnterior.pause(); }, 2600); 
        }
        
        appState.lastSaveTime = startTime;
        
        if (window.showNotification && startTime === 0) {
            window.showNotification("Tocando Agora 🎵", `${track.title} - ${track.artist}`, "info");
        }
    }).catch(e => {
        console.warn("⚠️ Recuperando fluxo de áudio...", e);
        setTimeout(window.tocarProximaDaFila, 2000);
    });
}

// ============================================================
// COMPONENTES VISUAIS E UTILITÁRIOS
// ============================================================
function iniciarSlideshow() {
    if (!DOM_RADIO.bgImage && !DOM_RADIO.studioImg) return;
    
    const precarregarImagem = (url) => {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(url);
            img.onerror = () => resolve(null);
            img.src = url;
        });
    };

    const trocarImagens = () => {
        const numBg = BackgroundConfig.currentIdx.toString().padStart(3, '0');
        const numBanner = BackgroundConfig1.currentIdx.toString().padStart(3, '0');
        const pathFundo = `${BackgroundConfig.folder}${BackgroundConfig.prefix}${numBg}${BackgroundConfig.extension}`;
        const pathBanner = `${BackgroundConfig1.folder}${BackgroundConfig1.prefix}${numBanner}${BackgroundConfig1.extension}`;
        
        if (DOM_RADIO.bgImage) DOM_RADIO.bgImage.style.opacity = "0.2"; 
        if (DOM_RADIO.studioImg) DOM_RADIO.studioImg.style.opacity = "0";

        Promise.all([precarregarImagem(pathFundo), precarregarImagem(pathBanner)]).then(([resFundo, resBanner]) => {
            if (DOM_RADIO.bgImage && resFundo) DOM_RADIO.bgImage.src = resFundo;
            if (DOM_RADIO.studioImg && resBanner) DOM_RADIO.studioImg.src = resBanner;
            
            setTimeout(() => {
                if (DOM_RADIO.bgImage) DOM_RADIO.bgImage.style.opacity = "1";
                if (DOM_RADIO.studioImg) DOM_RADIO.studioImg.style.opacity = "1";
            }, 50);
            
            BackgroundConfig.currentIdx = (BackgroundConfig.currentIdx % BackgroundConfig.totalImages) + 1;
            BackgroundConfig1.currentIdx = (BackgroundConfig1.currentIdx % BackgroundConfig1.totalImages) + 1;
        });
    };
    
    trocarImagens();
    setInterval(trocarImagens, BackgroundConfig.intervalo);
}

function atualizarRelogioReal() {
    if (!DOM_RADIO.liveClock) return;
    const agora = new Date();
    DOM_RADIO.liveClock.textContent = `${agora.getHours().toString().padStart(2, '0')}:${agora.getMinutes().toString().padStart(2, '0')}`;
}

function handleCompartilhamento() {
    const trackName = DOM_RADIO.track ? DOM_RADIO.track.textContent : "Música";
    const artistName = DOM_RADIO.artist ? DOM_RADIO.artist.textContent : "Artista";
    const shareText = `Estou ouvindo ${trackName} - ${artistName} na 4MFM RADIO! 📻`;

    if (navigator.share) {
        navigator.share({ title: '4MFM RADIO', text: shareText, url: window.location.href }).catch(() => {});
    } else {
        navigator.clipboard.writeText(`${shareText} ${window.location.href}`);
        if (window.showNotification) window.showNotification("Copiado!", "Link copiado para a área de transferência.", "success");
    }
}

function configurarEventosRede() {
    window.addEventListener('offline', () => {
        if (appState.isLive && !currentAudio.paused) {
            currentAudio.pause(); 
            if (window.showNotification) window.showNotification("Sem Internet 🌐", "Aguardando rede...", "warning");
            transicaoSuaveDOM(DOM_RADIO.track, "Sem conexão de rede...", false, 400);
        }
    });
    
    window.addEventListener('online', () => {
        if (appState.isLive) {
            currentAudio.play().catch(() => {});
        }
    });
}