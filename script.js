let currentAudio = document.getElementById('audio') || new Audio();
let appState = { isLive: false };
let filaReproducao = [];
let lastSaveTime = 0; // Controle de gravação de progresso
const tituloOriginal = document.title;

const BackgroundConfig = {
    folder: "Imgs/",
    prefix: "4mfmImg",
    totalImages: 18,
    extension: ".png",
    currentIdx: 1,
    intervalo: 10000
};

const BackgroundConfig1 = {
    folder: "Img-banner/",
    prefix: "4mfmBanner",
    totalImages: 5,
    extension: ".png",
    currentIdx: 1,
    intervalo: 10000
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
            const trackName = trackEl ? trackEl.textContent : "Música";
            const artistName = artistEl ? artistEl.textContent : "Artista";
            const shareText = `Estou ouvindo ${trackName} - ${artistName} na 4MFM RADIO! 📻`;

            if (navigator.share) {
                navigator.share({
                    title: '4MFM RADIO',
                    text: shareText,
                    url: window.location.href
                });
            } else {
                navigator.clipboard.writeText(`${shareText} ${window.location.href}`);
                alert("Link e música copiados para a área de transferência!");
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

    // Otimização: Salvar o tempo decorrido com base no evento de áudio (a cada ~5 seg), não com setInterval solto
    currentAudio.addEventListener('timeupdate', () => {
        if (!currentAudio.paused && appState.isLive) {
            const currentTime = currentAudio.currentTime;
            if (currentTime - lastSaveTime > 5 || currentTime < lastSaveTime) {
                localStorage.setItem('4mfm_last_time', currentTime);
                lastSaveTime = currentTime;
            }
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
            // CORREÇÃO: Setar o 'onload' antes do 'src' previne bugs se a imagem estiver em cache
            if(bgImage) {
                bgImage.onload = () => { bgImage.style.opacity = "1"; };
                bgImage.src = pathFundo;
            }
            if(studioImg) {
                studioImg.onload = () => { studioImg.style.opacity = "1"; };
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
   MOTOR DE ÁUDIO E SHUFFLE
   ============================================================ */
function embaralharPlaylist() {
    filaReproducao = Array.from(Array(playlist.length).keys());
    for (let i = filaReproducao.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [filaReproducao[i], filaReproducao[j]] = [filaReproducao[j], filaReproducao[i]];
    }
    console.log("🎲 Playlist embaralhada com sucesso.");
}

function iniciarFluxo() {
    if (filaReproducao.length === 0) embaralharPlaylist();
    
    const lastTrackIndex = localStorage.getItem('4mfm_last_index');
    const lastTime = localStorage.getItem('4mfm_last_time');

    if (lastTrackIndex !== null && playlist[lastTrackIndex]) {
        const indexToPlay = parseInt(lastTrackIndex);
        
        // CORREÇÃO: Remove a música recuperada da fila atual para não ser repetida logo em seguida
        filaReproducao = filaReproducao.filter(i => i !== indexToPlay);
        
        tocarMusica(indexToPlay, parseFloat(lastTime) || 0);
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
    
    const trackEl = document.getElementById('track');
    const artistEl = document.getElementById('artist');
    
    if (trackEl) trackEl.textContent = track.title;
    if (artistEl) artistEl.textContent = track.artist;

    currentAudio.src = track.src;
    currentAudio.currentTime = startTime;
    lastSaveTime = startTime; // Sincroniza o controle de save
    
    currentAudio.play().then(() => {
        if (window.showNotification) {
            window.showNotification("Tocando Agora 🎵", `${track.title} - ${track.artist}`, "info");
        }
    }).catch(e => {
        console.warn("Autoplay impedido ou erro no link. Tentando próxima...");
        setTimeout(tocarProximaDaFila, 2000);
    });

    currentAudio.onended = () => {
        setTimeout(() => {
            if (window.verificarIntervencaoDaAnne) {
                window.verificarIntervencaoDaAnne(tocarProximaDaFila);
            } else {
                tocarProximaDaFila();
            }
        }, 1200);
    };

    currentAudio.onerror = () => {
        console.error("Link de áudio falhou:", track.src);
        setTimeout(tocarProximaDaFila, 1000);
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
