/* ============================================================
   CONFIGURAÇÕES E ESTADO GLOBAL
   ============================================================ */
let currentAudio = document.getElementById('audio') || new Audio();
let appState = { isLive: false };
let filaReproducao = [];
const tituloOriginal = document.title;

const BackgroundConfig = {
    folder: "Imgs/",
    prefix: "4mfmImg",
    totalImages: 8,
    extension: ".png",
    currentIdx: 1,
    intervalo: 10000
};

const BackgroundConfig1 = {
    folder: "Img-banner/",
    prefix: "4mfmBanner",
    totalImages: 4,
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

    // Inicia funções básicas
    setInterval(atualizarRelogioReal, 1000);
    atualizarRelogioReal();
    iniciarSlideshow();

    // Evento do Botão Sintonizar
    if (startBtn) {
        startBtn.onclick = () => {
            if (typeof playlist !== 'undefined' && playlist.length > 0) {
                // UI: Esconde o botão e mostra o player
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

    // Evento do Botão Compartilhar
    if (shareBtn) {
        shareBtn.onclick = () => {
            const trackName = document.getElementById('track').textContent;
            const artistName = document.getElementById('artist').textContent;
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

    // Mudança de título quando o usuário sai da aba
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            document.title = "📻 Volte para a rádio!";
        } else {
            document.title = "▶️ Tocando agora - 4MFM";
            setTimeout(() => { document.title = tituloOriginal; }, 3000);
        }
    });
};

/* ============================================================
   LÓGICA DO SLIDESHOW DUPLO (FUNDO E VITRINE)
   ============================================================ */
function iniciarSlideshow() {
    const bgImage = document.getElementById('bgImage');      // Camada de Fundo (Imgs/)
    const studioImg = document.getElementById('studioImg');  // Camada Vitrine (Img-banner/)
    
    const trocarImagens = () => {
        // Formata o número com 3 dígitos (ex: 001, 002...)
        const numBg = BackgroundConfig.currentIdx.toString().padStart(3, '0');
        const numBanner = BackgroundConfig1.currentIdx.toString().padStart(3, '0');

        // Caminhos das fotos
        const pathFundo = `${BackgroundConfig.folder}${BackgroundConfig.prefix}${numBg}${BackgroundConfig.extension}`;
        const pathBanner = `${BackgroundConfig1.folder}${BackgroundConfig1.prefix}${numBanner}${BackgroundConfig1.extension}`;
        
        // 1. Efeito de saída (Fade Out)
        if(bgImage) bgImage.style.opacity = "0.2"; 
        if(studioImg) studioImg.style.opacity = "0";

        setTimeout(() => {
            // 2. Troca os arquivos nas fontes
            if(bgImage) bgImage.src = pathFundo;
            if(studioImg) studioImg.src = pathBanner;

            // 3. Efeito de entrada (Fade In) após carregar
            if(bgImage) {
                bgImage.onload = () => { bgImage.style.opacity = "1"; };
            }
            if(studioImg) {
                studioImg.onload = () => { studioImg.style.opacity = "1"; };
            }

            // 4. Atualiza os índices de forma independente
            BackgroundConfig.currentIdx = (BackgroundConfig.currentIdx % BackgroundConfig.totalImages) + 1;
            BackgroundConfig1.currentIdx = (BackgroundConfig1.currentIdx % BackgroundConfig1.totalImages) + 1;
            
        }, 1000); // Tempo do fade out
    };

    // Executa a primeira vez e define o intervalo
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
        tocarMusica(parseInt(lastTrackIndex), parseFloat(lastTime) || 0);
    } else {
        tocarProximaDaFila();
    }

    // Salva progresso a cada segundo para não perder o ponto se a página recarregar
    setInterval(() => {
        if (!currentAudio.paused && appState.isLive) {
            localStorage.setItem('4mfm_last_time', currentAudio.currentTime);
        }
    }, 1000);
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
    
    // Atualiza a interface do player
    document.getElementById('track').textContent = track.title;
    document.getElementById('artist').textContent = track.artist;

    currentAudio.src = track.src;
    currentAudio.currentTime = startTime;
    
    currentAudio.play().then(() => {
        if (window.showNotification) {
            window.showNotification("Tocando Agora 🎵", `${track.title} - ${track.artist}`, "info");
        }
    }).catch(e => {
        console.warn("Autoplay impedido ou erro no link. Tentando próxima...");
        setTimeout(tocarProximaDaFila, 2000);
    });

    // Quando a música acabar
    currentAudio.onended = () => {
        setTimeout(() => {
            // Verifica se a Anne (IA) quer entrar antes da próxima música
            if (window.verificarIntervencaoDaAnne) {
                window.verificarIntervencaoDaAnne(tocarProximaDaFila);
            } else {
                tocarProximaDaFila();
            }
        }, 1200);
    };

    // Tratamento de erros de link quebrado
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