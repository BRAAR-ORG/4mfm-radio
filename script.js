/** * CONFIGURAÇÕES E CONSTANTES */
const CONFIG = {
    MUSIC_API: "https://api.github.com/repos/BRAAR-ORG/4mfm-radio/releases/tags/musica",
    ANN_API: "https://api.github.com/repos/BRAAR-ORG/4mfm-radio/releases/tags/announcer",
    // Caminhos atualizados para as pastas vids/ e imgs/
    VIDEOS: Array.from({length: 6}, (_, i) => `vids/video${i + 1}.mp4`),
    IMAGES: Array.from({length: 56}, (_, i) => `imgs/img${String(i + 1).padStart(3, '0')}.png`),
    SAVE_KEY: "4mfm_radio_state",
    ANNOUNCER_INTERVAL: 6 * 60 * 1000,
    IMAGE_DURATION: 7000,
    LOGO_URL: "icon/logo-4mfm.png", // Caminho atualizado para a pasta icon/
    // Silêncio para desbloqueio imediato no iPhone
    SILENCE_SRC: "data:audio/wav;base64,UklGRigAAABXQVZFRm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAP8A/w=="
};

/** * ESTADO DO APP */
const state = {
    mode: 'video',
    videoIdx: 0,
    imageIdx: 0,
    musicList: [],
    announcerList: [],
    lastAnnouncer: 0,
    isStarted: false,
    notificationsEnabled: false
};

/** * ELEMENTOS DOM */
const el = {
    video: document.getElementById("bgVideo"),
    image: document.getElementById("bgImage"),
    audio: document.getElementById("audio"),
    track: document.getElementById("track"),
    artist: document.getElementById("artist"),
    startBtn: document.getElementById("startBtn"),
    notice: document.getElementById("notice")
};

/** * UTILITÁRIOS */
const utils = {
    shuffle: (arr) => arr.sort(() => Math.random() - 0.5),
    
    formatName: (name) => {
        let clean = name.replace('.mp3', '').replace(/[._]+/g, ' ').trim();
        return clean.split(" - ");
    },

    save: () => {
        if (!el.audio.src || el.audio.paused) return;
        localStorage.setItem(CONFIG.SAVE_KEY, JSON.stringify({
            src: el.audio.src,
            time: el.audio.currentTime,
            title: el.track.innerText,
            artist: el.artist.innerText,
            lastAnn: state.lastAnnouncer
        }));
    },

    sendNotification: (title, body) => {
        if (state.notificationsEnabled && Notification.permission === "granted") {
            new Notification(title, {
                body: body,
                icon: CONFIG.LOGO_URL,
                silent: true 
            });
        }
    },

    updateMediaSession: (title, artist) => {
        if ('mediaSession' in navigator) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: title,
                artist: artist,
                album: '4MFM RADIO',
                artwork: [{ src: CONFIG.LOGO_URL, sizes: '512x512', type: 'image/png' }]
            });
        }
    }
};

/** * LÓGICA DE MÍDIA (VÍDEO/IMAGEM) */
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

/** * LÓGICA DE ÁUDIO */
async function fetchPlaylist() {
    try {
        const [mRes, aRes] = await Promise.all([
            fetch(CONFIG.MUSIC_API).then(r => r.json()),
            fetch(CONFIG.ANN_API).then(r => r.json())
        ]);
        
        state.musicList = utils.shuffle(mRes.assets.filter(v => v.name.endsWith('.mp3')));
        state.announcerList = utils.shuffle(aRes.assets.filter(v => v.name.endsWith('.mp3')));
    } catch (err) {
        el.track.innerText = "Erro ao carregar playlist";
        console.error(err);
    }
}

async function playNext() {
    if (state.musicList.length === 0) await fetchPlaylist();

    const now = Date.now();
    const shouldAnnounce = (now - state.lastAnnouncer) > CONFIG.ANNOUNCER_INTERVAL && Math.random() < 0.3;

    let currentItem;
    let trackTitle, artistName;

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
    el.audio.load();
    
    try {
        await el.audio.play();
        utils.updateMediaSession(trackTitle, artistName);
        utils.sendNotification("4MFM RADIO", `${trackTitle} - ${artistName}`);
    } catch (err) {
        console.error("Erro no play:", err);
    }
}

el.audio.onended = playNext;

/** * INICIALIZAÇÃO */
el.startBtn.onclick = async () => {
    if (state.isStarted) return;
    
    // DESBLOQUEIO IPHONE: Play imediato em silêncio antes de qualquer await
    el.audio.src = CONFIG.SILENCE_SRC;
    el.audio.play().catch(() => {});

    // Solicita permissão de notificação
    if ("Notification" in window) {
        const permission = await Notification.requestPermission();
        state.notificationsEnabled = (permission === "granted");
    }

    state.isStarted = true;
    el.startBtn.disabled = true;
    el.startBtn.innerText = "Sintonizando...";
    el.notice.classList.add("hidden");

    await fetchPlaylist();
    
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
            utils.updateMediaSession(d.title, d.artist);
        } catch (e) {
            playNext();
        }
    } else {
        playNext();
    }

    updateVisuals();
    el.startBtn.innerText = "Tocando Agora";
    
    setInterval(() => utils.save(), 5000);
};
