const CONFIG = {
    MUSIC_API: "https://api.github.com/repos/BRAAR-ORG/4mfm-radio/releases/tags/sertanejo",
    ANN_API: "https://api.github.com/repos/BRAAR-ORG/4mfm-radio/releases/tags/locutoura",
    VIDEOS: Array.from({length: 6}, (_, i) => `video${i + 1}.mp4`),
    IMAGES: Array.from({length: 56}, (_, i) => `img${String(i + 1).padStart(3, '0')}.png`),
    SAVE_KEY: "4mfm_radio_state",
    ANNOUNCER_INTERVAL: 6 * 60 * 1000, // 6 minutos
    IMAGE_DURATION: 7000,
    LOGO_URL: "logo-4mfm.png"
};

/** * ESTADO DO APP
 */
const state = {
    mode: 'video',
    videoIdx: 0,
    imageIdx: 0,
    musicList: [],
    announcerList: [],
    lastAnnouncer: 0,
    isStarted: false,
    isPlaying: false,
    notificationsEnabled: false
};

/** * ELEMENTOS DOM
 */
const el = {
    video: document.getElementById("bgVideo"),
    image: document.getElementById("bgImage"),
    audio: document.getElementById("audio"),
    track: document.getElementById("track"),
    artist: document.getElementById("artist"),
    startBtn: document.getElementById("startBtn"),
    notice: document.getElementById("notice"),
    volumeContainer: document.getElementById("volumeContainer"),
    volumeSlider: document.getElementById("volumeSlider"),
    eqBars: document.getElementById("eqBars")
};

/** * UTILITÁRIOS E INTEGRAÇÃO COM SISTEMA
 */
const utils = {
    shuffle: (arr) => arr.sort(() => Math.random() - 0.5),
    
    formatName: (name) => {
        let clean = name.replace('.mp3', '').replace(/[._]+/g, ' ').trim();
        return clean.split(" - ");
    },

    save: () => {
        if (!el.audio.src) return;
        localStorage.setItem(CONFIG.SAVE_KEY, JSON.stringify({
            src: el.audio.src,
            time: el.audio.currentTime,
            title: el.track.innerText,
            artist: el.artist.innerText,
            lastAnn: state.lastAnnouncer
        }));
    },

    updateMediaSession: (title, artist) => {
        if ('mediaSession' in navigator) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: title,
                artist: artist,
                album: '4MFM RADIO',
                artwork: [{ src: CONFIG.LOGO_URL, sizes: '512x512', type: 'image/png' }]
            });

            navigator.mediaSession.setActionHandler('play', togglePlayPause);
            navigator.mediaSession.setActionHandler('pause', togglePlayPause);
            navigator.mediaSession.setActionHandler('nexttrack', () => playNext());
        }
    },

    sendNotification: (title, body) => {
        if (state.notificationsEnabled && Notification.permission === "granted") {
            try {
                new Notification(title, { body: body, icon: CONFIG.LOGO_URL, silent: true });
            } catch (e) {
                console.warn("Notificações não suportadas neste contexto mobile.");
            }
        }
    }
};

/** * LÓGICA VISUAL E CONTROLES
 */
function updateVisuals() {
    if (state.mode === "video") {
        el.image.style.display = "none";
        el.video.style.display = "block";
        el.video.src = CONFIG.VIDEOS[state.videoIdx];
        el.video.play().catch(() => nextVisual());
    } else {
        if (!el.video.paused) el.video.pause();
        el.video.style.display = "none";
        el.image.style.display = "block";
        el.image.src = CONFIG.IMAGES[state.imageIdx];
        setTimeout(nextVisual, CONFIG.IMAGE_DURATION);
    }
}

function nextVisual() {
    if (state.mode === "video") {
        state.videoIdx++;
        if (state.videoIdx >= CONFIG.VIDEOS.length) {
            state.mode = "image";
            state.imageIdx = 0;
        }
    } else {
        state.imageIdx++;
        if (state.imageIdx >= CONFIG.IMAGES.length) {
            state.mode = "video";
            state.videoIdx = 0;
        }
    }
    updateVisuals();
}

el.video.onended = nextVisual;

// Controle de Volume
el.volumeSlider.addEventListener('input', (e) => {
    el.audio.volume = e.target.value;
});

/** * LÓGICA DE ÁUDIO
 */
async function fetchPlaylist() {
    try {
        const [mRes, aRes] = await Promise.all([
            fetch(CONFIG.MUSIC_API).then(r => r.json()),
            fetch(CONFIG.ANN_API).then(r => r.json()).catch(() => ({ assets: [] })) // Fallback se a locução falhar
        ]);
        
        if (mRes.assets) {
            state.musicList = utils.shuffle(mRes.assets.filter(v => v.name.endsWith('.mp3')));
        }
        if (aRes.assets) {
            state.announcerList = utils.shuffle(aRes.assets.filter(v => v.name.endsWith('.mp3')));
        }
    } catch (err) {
        el.track.innerText = "Erro ao carregar músicas";
        console.error("Erro na API:", err);
    }
}

async function playNext() {
    if (state.musicList.length === 0) await fetchPlaylist();
    if (state.musicList.length === 0) return; // Trava se ainda estiver vazio após o fetch

    const now = Date.now();
    const shouldAnnounce = (now - state.lastAnnouncer) > CONFIG.ANNOUNCER_INTERVAL && Math.random() < 0.3;

    let currentItem, trackTitle, artistName;

    if (shouldAnnounce && state.announcerList.length > 0) {
        currentItem = state.announcerList.shift();
        state.lastAnnouncer = now;
        trackTitle = "Mensagem da Rádio";
        artistName = "Kiara";
    } else {
        currentItem = state.musicList.shift();
        const [artist, track] = utils.formatName(currentItem.name);
        trackTitle = track || artist;
        artistName = track ? artist : "4MFM Hits";
    }

    el.track.innerText = trackTitle;
    el.artist.innerText = artistName;
    el.audio.src = currentItem.browser_download_url;
    
    try {
        await el.audio.play();
        setPlayingState(true);
        utils.updateMediaSession(trackTitle, artistName);
        utils.sendNotification("4MFM RADIO", `Tocando agora: ${trackTitle}`);
    } catch (err) {
        console.error("Erro ao reproduzir áudio:", err);
        setPlayingState(false);
    }
}

el.audio.onended = playNext;

/** * INICIALIZAÇÃO E CONTROLES (TOGGLE PLAY/PAUSE)
 */
function setPlayingState(playing) {
    state.isPlaying = playing;
    if (playing) {
        el.startBtn.innerText = "⏸ Pausar Rádio";
        el.eqBars.classList.remove("hidden");
    } else {
        el.startBtn.innerText = "▶ Continuar Rádio";
        el.eqBars.classList.add("hidden");
    }
}

async function togglePlayPause() {
    if (state.isPlaying) {
        el.audio.pause();
        setPlayingState(false);
    } else {
        el.audio.play().then(() => {
            setPlayingState(true);
        }).catch(err => console.error("Erro no play:", err));
    }
}

// O aviso central também serve para iniciar a rádio
el.notice.onclick = () => el.startBtn.click();

el.startBtn.onclick = async () => {
    // Se já iniciou a sessão, o botão serve apenas para Play/Pause
    if (state.isStarted) {
        togglePlayPause();
        return;
    }

    // Fluxo da Primeira Inicialização (Desbloqueio iOS/Android)
    el.audio.play().catch(() => {});
    el.audio.pause();

    if ("Notification" in window) {
        const permission = await Notification.requestPermission();
        state.notificationsEnabled = (permission === "granted");
    }

    state.isStarted = true;
    el.startBtn.innerText = "Sintonizando...";
    el.notice.classList.add("hidden");
    el.volumeContainer.classList.remove("hidden"); // Mostra o volume

    await fetchPlaylist();
    
    // Tenta restaurar última sessão
    const saved = localStorage.getItem(CONFIG.SAVE_KEY);
    if (saved) {
        try {
            const d = JSON.parse(saved);
            el.audio.src = d.src;
            el.audio.currentTime = d.time;
            el.track.innerText = d.title;
            el.artist.innerText = d.artist;
            state.lastAnnouncer = d.lastAnn;
            
            await el.audio.play();
            setPlayingState(true);
            utils.updateMediaSession(d.title, d.artist);
        } catch (e) {
            playNext();
        }
    } else {
        playNext();
    }

    updateVisuals();
    
    // Auto-save a cada 5 segundos
    setInterval(() => utils.save(), 5000);
};
