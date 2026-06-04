const TEMPO_CROSSFADE = 4; // Segundos finais para iniciar a transição
const TITULO_ORIGINAL = document.title;

let appState = { 
    isLive: false,
    isCrossfading: false,
    filaReproducao: [],
    lastSaveTime: 0
};

const BackgroundConfig = { folder: "Imgs/", prefix: "4mfmImg", totalImages: 9, extension: ".png", currentIdx: 1, intervalo: 10000 };
const BackgroundConfig1 = { folder: "Img-banner/", prefix: "4mfmBanner", totalImages: 6, extension: ".png", currentIdx: 1, intervalo: 10000 };

// Instanciação limpa dos players
const playerA = document.getElementById('audio') || new Audio();
const playerB = new Audio();
let currentAudio = playerA;

// ============================================================
// EXPORTAÇÕES GLOBAIS (Para a "Anne" e outros scripts)
// ============================================================
window.currentAudio = currentAudio;

window.playerRadio = {
    audio: currentAudio,
    isPlaying: () => !currentAudio.paused,
    setVolume: (vol) => { currentAudio.volume = vol; }
};

// ============================================================
// CACHE DE ELEMENTOS DO DOM
// ============================================================
const DOM = {
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
    liveClock: document.getElementById('liveClock')
};

// ============================================================
// INICIALIZAÇÃO (ONLOAD)
// ============================================================
window.onload = () => {
    // Configura os players de áudio apenas UMA vez
    configurarEventosAudio(playerA);
    configurarEventosAudio(playerB);

    setInterval(atualizarRelogioReal, 1000);
    atualizarRelogioReal();
    iniciarSlideshow();
    configurarEventosRede(); 

    if (DOM.startBtn) {
        DOM.startBtn.onclick = () => {
            if (typeof playlist !== 'undefined' && playlist.length > 0) {
                DOM.startBtn.classList.add('hidden');
                if (DOM.notice) DOM.notice.classList.add('hidden');
                if (DOM.interactionGroup) DOM.interactionGroup.classList.remove('hidden');
                if (DOM.visualizer) DOM.visualizer.classList.remove('hidden');
                
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

    if (DOM.shareBtn) {
        DOM.shareBtn.onclick = handleCompartilhamento;
    }

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            document.title = "📻 Volte para a rádio!";
        } else {
            document.title = "▶️ Tocando agora - 4MFM";
            setTimeout(() => { document.title = TITULO_ORIGINAL; }, 3000);
        }
    });

    console.log("🔊 4MFM Engine Inicializado com Sucesso");
};

// ============================================================
// SISTEMA DE ÁUDIO E TRANSIÇÕES
// ============================================================

/**
 * Função global de fadeAudio otimizada com requestAnimationFrame.
 * Transição suave de volume independente da latência do navegador.
 */
window.fadeAudio = function(audioEl, destino, duracao = 1000) {
    if (!audioEl) return;
    
    const startVolume = audioEl.volume;
    const change = destino - startVolume;
    const startTime = performance.now();

    function animateFade(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duracao, 1); // Garante que não passe de 1 (100%)
        
        audioEl.volume = startVolume + (change * progress);

        if (progress < 1) {
            requestAnimationFrame(animateFade);
        } else {
            audioEl.volume = destino; // Crava o valor no final para evitar imprecisões de ponto flutuante
        }
    }
    
    requestAnimationFrame(animateFade);
};

function configurarEventosAudio(player) {
    player.ontimeupdate = function() {
        // Ignora se este não for o player principal ativo no momento
        if (this !== currentAudio || !appState.isLive || this.paused) return;

        const currentTime = this.currentTime;
        
        // Salvar progresso
        if (Math.abs(currentTime - appState.lastSaveTime) > 5) {
            localStorage.setItem('4mfm_last_time', currentTime);
            localStorage.setItem('4mfm_last_save_date', Date.now()); 
            appState.lastSaveTime = currentTime;
        }

        // Trigger de Crossfade e chamada da Anne
        if (!appState.isCrossfading && this.duration && !isNaN(this.duration)) {
            if ((this.duration - currentTime) <= TEMPO_CROSSFADE) {
                appState.isCrossfading = true;
                
                if (window.verificarIntervencaoDaAnne) {
                    window.verificarIntervencaoDaAnne(tocarProximaDaFila);
                } else {
                    tocarProximaDaFila();
                }
            }
        }
    };

    player.onended = function() {
        if (this !== currentAudio) return;
        // Se por algum motivo o crossfade falhar, força a próxima
        if (!appState.isCrossfading) {
            if (window.verificarIntervencaoDaAnne) window.verificarIntervencaoDaAnne(tocarProximaDaFila);
            else tocarProximaDaFila();
        }
    };

    player.onerror = function() {
        if (this !== currentAudio || !navigator.onLine) return; 
        console.error("❌ Erro ao carregar o link de áudio.");
        setTimeout(tocarProximaDaFila, 2000);
    };
}

function iniciarFluxo() {
    const savedDate = localStorage.getItem('4mfm_last_save_date');
    const validadeSessao = 24 * 60 * 60 * 1000; // 24h
    const agora = Date.now();

    // Limpa cache se a sessão expirou
    if (savedDate && (agora - parseInt(savedDate) > validadeSessao)) {
        console.log("📅 Sessão antiga expirada. Iniciando nova sessão.");
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

function embaralharPlaylist() {
    let arr = Array.from(Array(playlist.length).keys());
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    appState.filaReproducao = arr;
}

function tocarProximaDaFila() {
    if (appState.filaReproducao.length === 0) embaralharPlaylist();
    tocarMusica(appState.filaReproducao.shift(), 0);
}

function tocarMusica(index, startTime = 0) {
    const track = playlist[index];
    if (!track) return tocarProximaDaFila();

    localStorage.setItem('4mfm_last_index', index);
    
    // Atualiza Interface (UI)
    if (DOM.track) DOM.track.textContent = track.title;
    if (DOM.artist) DOM.artist.textContent = track.artist;
    
    const coverSrc = track.cover || "icon/logo-4mfm.png";
    if (DOM.albumArt) DOM.albumArt.src = coverSrc;

    // Atualiza Metadados do Sistema
    if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
            title: track.title, artist: track.artist, album: '4MFM RADIO',
            artwork: [{ src: coverSrc, sizes: '512x512', type: 'image/png' }]
        });
    }

    // ============================================================
    // 🛡️ CORREÇÃO CRÍTICA DO ERRO DE DOMException (Aborted)
    // ============================================================
    const proximoPlayer = (currentAudio === playerA) ? playerB : playerA;
    const playerAnterior = currentAudio;

    // 1. Atualiza os ponteiros globais AGORA, antes da internet baixar a música.
    // Isso impede que o player anterior fique disparando o loop do ontimeupdate.
    currentAudio = proximoPlayer;
    window.currentAudio = currentAudio;
    if (window.playerRadio) window.playerRadio.audio = currentAudio;

    // 2. Só depois de blindar os ponteiros, liberamos a trava para a nova música.
    appState.isCrossfading = false; 

    // 3. Preparamos e executamos o próximo áudio
    proximoPlayer.src = track.src;
    proximoPlayer.currentTime = startTime;
    proximoPlayer.volume = 0; 

    proximoPlayer.play().then(() => {
        // Sobe o som da nova música
        window.fadeAudio(proximoPlayer, 1.0, 3000);

        // Desce o som da música anterior (se estiver tocando) e pausa no final
        if (playerAnterior && !playerAnterior.paused) {
            window.fadeAudio(playerAnterior, 0.0, 3000);
            
            // Pausa a música antiga após o fade out de 3s terminar
            setTimeout(() => {
                playerAnterior.pause();
            }, 3100); 
        }

        appState.lastSaveTime = startTime;

        if (window.showNotification && startTime === 0) {
            window.showNotification("Tocando Agora 🎵", `${track.title} - ${track.artist}`, "info");
        }
    }).catch(e => {
        console.warn("⚠️ Autoplay impedido ou falha no carregamento. O erro de Abort foi evitado.", e);
        // OBS: Se o link da música estiver quebrado, o player.onerror já está programado
        // para tentar a próxima música automaticamente após 2 segundos.
    });
}

// ============================================================
// LÓGICA DO SLIDESHOW DUPLO (Com Pré-carregamento)
// ============================================================
function iniciarSlideshow() {
    if (!DOM.bgImage && !DOM.studioImg) return;

    const precarregarImagem = (url) => {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(url);
            img.onerror = () => resolve(null); // Resolve vazio se der erro, não para o fluxo
            img.src = url;
        });
    };

    const trocarImagens = () => {
        const numBg = BackgroundConfig.currentIdx.toString().padStart(3, '0');
        const numBanner = BackgroundConfig1.currentIdx.toString().padStart(3, '0');

        const pathFundo = `${BackgroundConfig.folder}${BackgroundConfig.prefix}${numBg}${BackgroundConfig.extension}`;
        const pathBanner = `${BackgroundConfig1.folder}${BackgroundConfig1.prefix}${numBanner}${BackgroundConfig1.extension}`;
        
        // Esconde suavemente
        if (DOM.bgImage) DOM.bgImage.style.opacity = "0.2"; 
        if (DOM.studioImg) DOM.studioImg.style.opacity = "0";

        // Só altera e mostra DEPOIS de carregar as imagens novas na memória
        Promise.all([precarregarImagem(pathFundo), precarregarImagem(pathBanner)]).then(([resFundo, resBanner]) => {
            if (DOM.bgImage && resFundo) DOM.bgImage.src = resFundo;
            if (DOM.studioImg && resBanner) DOM.studioImg.src = resBanner;
            
            // Aguarda um pequeno frame para garantir que o src foi aplicado no DOM
            setTimeout(() => {
                if (DOM.bgImage) DOM.bgImage.style.opacity = "1";
                if (DOM.studioImg) DOM.studioImg.style.opacity = "1";
            }, 50);

            BackgroundConfig.currentIdx = (BackgroundConfig.currentIdx % BackgroundConfig.totalImages) + 1;
            BackgroundConfig1.currentIdx = (BackgroundConfig1.currentIdx % BackgroundConfig1.totalImages) + 1;
        });
    };

    trocarImagens();
    setInterval(trocarImagens, BackgroundConfig.intervalo);
}

// ============================================================
// UTILITÁRIOS E SENSORES
// ============================================================
function atualizarRelogioReal() {
    if (!DOM.liveClock) return;
    const agora = new Date();
    const h = agora.getHours().toString().padStart(2, '0');
    const m = agora.getMinutes().toString().padStart(2, '0');
    DOM.liveClock.textContent = `${h}:${m}`;
}

function handleCompartilhamento() {
    const trackName = DOM.track ? DOM.track.textContent : "Música";
    const artistName = DOM.artist ? DOM.artist.textContent : "Artista";
    const shareText = `Estou ouvindo ${trackName} - ${artistName} na 4MFM RADIO! 📻`;

    if (navigator.share) {
        navigator.share({
            title: '4MFM RADIO',
            text: shareText,
            url: window.location.href
        }).catch(err => console.log("Compartilhamento cancelado ou falhou.", err));
    } else {
        navigator.clipboard.writeText(`${shareText} ${window.location.href}`);
        if (window.showNotification) {
            window.showNotification("Copiado!", "Link e música copiados para a área de transferência.", "success");
        } else {
            alert("Link e música copiados para a área de transferência!");
        }
    }
}

function configurarEventosRede() {
    window.addEventListener('offline', () => {
        if (appState.isLive && !currentAudio.paused) {
            currentAudio.pause(); 
            
            if (window.showNotification) {
                window.showNotification("Sem Internet 🌐", "Sua conexão caiu. Aguardando rede para reconectar...", "warning");
            }
            
            document.title = "⚠️ Offline - Aguardando conexão";
            if (DOM.track) DOM.track.textContent = "Sem conexão de rede...";
            if (DOM.artist) DOM.artist.textContent = "Aguardando internet";
        }
    });

    window.addEventListener('online', () => {
        if (appState.isLive) {
            if (window.showNotification) {
                window.showNotification("Conectado! 📶", "Internet restabelecida. Voltando para a 4MFM...", "success");
            }
            
            document.title = TITULO_ORIGINAL; 
            
            const index = localStorage.getItem('4mfm_last_index');
            if (index !== null && typeof playlist !== 'undefined' && playlist[index]) {
                if (DOM.track) DOM.track.textContent = playlist[index].title;
                if (DOM.artist) DOM.artist.textContent = playlist[index].artist;
            }

            // Tenta dar play novamente de onde parou
            currentAudio.play().catch(e => {
                console.warn("⚠️ O navegador impediu o autoplay após reconectar. O usuário precisa interagir.", e);
            });
        }
    });
}
