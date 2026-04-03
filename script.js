const LINK_FORMULARIO = "https://forms.gle/1NrSipsVeHtBtKwy5";

let currentAudio = document.getElementById('audio') || new Audio();
let appState = {
    isLive: false
};

const tituloOriginal = document.title;

// OTIMIZAÇÃO: Deixei em 4 baseado no seu código enviado
const BackgroundConfig = {
    folder: "Imgs/",
    prefix: "4mfmImg",
    totalImages: 12,
    extension: ".png",
    currentIdx: 1,
    intervalo: 10000
};

// Objeto para guardar as imagens pré-carregadas na memória
const preloadedImages = {};

window.onload = () => {
    const startBtn = document.getElementById('startBtn');
    const notice = document.getElementById('notice');
    const visualizer = document.getElementById('visualizer');
    const shareBtn = document.getElementById('shareBtn');

    setInterval(atualizarRelogioReal, 1000);
    atualizarRelogioReal();
    
    // OTIMIZAÇÃO: Pré-carrega as imagens antes do slideshow começar
    precarregarTodasAsImagens();
    iniciarSlideshow(); 

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            document.title = "📻 Volte para a rádio!";
        } else {
            document.title = "▶️ Tocando agora - 4MFM";
            if (window.showNotification) {
                window.showNotification("Que bom que voltou!", "A rádio continua rolando ao vivo.", "success");
            }
            setTimeout(() => { document.title = tituloOriginal; }, 3000);
        }
    });

    if (startBtn) {
        startBtn.onclick = () => {
            if (typeof playlist !== 'undefined' && playlist.length > 0) {
                startBtn.style.display = 'none';
                if(notice) notice.style.display = 'none';
                if(visualizer) visualizer.classList.remove('hidden');
                if(shareBtn) shareBtn.classList.remove('hidden');
                
                appState.isLive = true;
                
                if (window.showNotification) {
                    window.showNotification("Sintonizado!", "Bem-vindo à 4MFM RADIO.", "success");
                }
                
                iniciarFluxo();
            } else {
                alert("Erro: A lista de músicas (playlist.js) não carregou corretamente.");
            }
        };
    }

    if (shareBtn) {
        shareBtn.onclick = () => {
            if (navigator.share) {
                navigator.share({
                    title: '4MFM RADIO',
                    text: 'Estou ouvindo a 4MFM! Sintonize agora:',
                    url: window.location.href
                });
            } else {
                alert("Copie o link do navegador para compartilhar!");
            }
        };
    }
};

// OTIMIZAÇÃO: Função que baixa as imagens para o cache do navegador
function precarregarTodasAsImagens() {
    for (let i = 1; i <= BackgroundConfig.totalImages; i++) {
        const paddedNum = i.toString().padStart(3, '0');
        const src = `${BackgroundConfig.folder}${BackgroundConfig.prefix}${paddedNum}${BackgroundConfig.extension}`;
        const img = new Image();
        img.src = src;
        preloadedImages[i] = img;
    }
}

function iniciarSlideshow() {
    const bgImage = document.getElementById('bgImage');
    if (!bgImage) return;

    const trocarFundo = () => {
        const paddedNum = BackgroundConfig.currentIdx.toString().padStart(3, '0');
        const novaImagem = `${BackgroundConfig.folder}${BackgroundConfig.prefix}${paddedNum}${BackgroundConfig.extension}`;
        
        bgImage.style.opacity = 0;
        
        setTimeout(() => {
            bgImage.src = novaImagem;
            bgImage.onload = () => { bgImage.style.opacity = 1; };
            BackgroundConfig.currentIdx = (BackgroundConfig.currentIdx % BackgroundConfig.totalImages) + 1;
        }, 1000); // 1 segundo para apagar e acender
    };

    trocarFundo();
    setInterval(trocarFundo, BackgroundConfig.intervalo);
}

function iniciarFluxo() {
    const lastTrackIndex = localStorage.getItem('4mfm_last_index');
    const lastTime = localStorage.getItem('4mfm_last_time');

    if (lastTrackIndex !== null && playlist[lastTrackIndex]) {
        tocarMusica(parseInt(lastTrackIndex), parseFloat(lastTime));
    } else {
        tocarAleatoria(); 
    }

    setInterval(() => {
        if (!currentAudio.paused && appState.isLive) {
            localStorage.setItem('4mfm_last_time', currentAudio.currentTime);
        }
    }, 1000);
}

function tocarAleatoria() {
    const index = Math.floor(Math.random() * playlist.length);
    tocarMusica(index, 0);
}

function tocarMusica(index, startTime = 0) {
    const track = playlist[index];
    localStorage.setItem('4mfm_last_index', index);
    
    document.getElementById('track').textContent = track.title;
    document.getElementById('artist').textContent = track.artist;

    currentAudio.src = track.src;
    currentAudio.currentTime = startTime;
    
    currentAudio.play().then(() => {
        if (window.showNotification) {
            window.showNotification("Tocando Agora 🎵", `${track.title} - ${track.artist}`, "info");
        }
    }).catch(e => {
        console.error("Erro ao dar play. Tentando outra música em 2 segundos...", e);
        // PROTEÇÃO: O delay de 2 segundos evita que o navegador entre em loop e trave
        setTimeout(tocarAleatoria, 2000);
    });

    currentAudio.onerror = () => {
        console.error("Link quebrado. Pulando para a próxima música em 2 segundos...");
        setTimeout(tocarAleatoria, 2000);
    };

    currentAudio.onended = () => {
        // PROTEÇÃO: Um pequeno tempo de respiro antes de chamar a Beatriz ou outra música
        setTimeout(() => {
            if (window.verificarIntervencaoDaBeatriz) {
                window.verificarIntervencaoDaBeatriz(tocarAleatoria);
            } else {
                tocarAleatoria();
            }
        }, 1000);
    };
}

function atualizarRelogioReal() {
    const agora = new Date();
    const h = agora.getHours().toString().padStart(2, '0');
    const m = agora.getMinutes().toString().padStart(2, '0');
    const relogioElement = document.getElementById('liveClock');
    if (relogioElement) relogioElement.textContent = `${h}:${m}`;
}