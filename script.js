/** * CONFIGURAÇÕES E CONSTANTES */
const CONFIG = {
    MUSIC_API: "https://api.github.com/repos/BRAAR-ORG/4mfm-radio/releases/tags/sertanejo",
    ANN_API: "https://api.github.com/repos/BRAAR-ORG/4mfm-radio/releases/tags/locutoura",
    VIDEOS: Array.from({length: 6}, (_, i) => `vids/video${i + 1}.mp4`),
    IMAGES: Array.from({length: 56}, (_, i) => `imgs/img${String(i + 1).padStart(3, '0')}.png`),
    SAVE_KEY: "4mfm_radio_state",
    ANNOUNCER_INTERVAL: 6 * 60 * 1000, 
    IMAGE_DURATION: 7000,
    LOGO_URL: "icon/logo-4mfm.png",
    BASE_LISTENERS: 120 
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
    notificationsEnabled: false,
    currentListeners: CONFIG.BASE_LISTENERS
};

/** * ELEMENTOS DOM */
const el = {
    video: document.getElementById("bgVideo"),
    image: document.getElementById("bgImage"),
    audio: document.getElementById("audio"),
    track: document.getElementById("track"),
    artist: document.getElementById("artist"),
    startBtn: document.getElementById("startBtn"),
    notice: document.getElementById("notice"),
    liveClock: document.getElementById("liveClock"),
    listenerCount: document.getElementById("listenerCount"),
    visualizer: document.getElementById("visualizer"),
    shareBtn: document.getElementById("shareBtn")
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

    updateMediaSession: (title, artist) => {
        if ('mediaSession' in navigator) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: title,
                artist: artist,
                album: '4MFM RADIO',
                artwork: [{ src: CONFIG.LOGO_URL, sizes: '512x512', type: 'image/png' }]
            });
            navigator.mediaSession.setActionHandler('play', () => el.audio.play());
        }
    },

    sendNotification: (title, body) => {
        if (state.notificationsEnabled && Notification.permission === "granted") {
            try {
                new Notification(title, { body: body, icon: CONFIG.LOGO_URL, silent: true });
            } catch (e) { console.warn("Erro notificação mobile."); }
        }
    },

    startClock: () => {
        setInterval(() => {
            const now = new Date();
            el.liveClock.innerText = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        }, 1000);
    },

    simulateListeners: () => {
        el.listenerCount.innerText = state.currentListeners;
        setInterval(() => {
            state.currentListeners += Math.floor(Math.random() * 5) - 2;
            if(state.currentListeners < 50) state.currentListeners = 50;
            el.listenerCount.innerText = state.currentListeners;
        }, 8000);
    }
};

/** * VISUAIS */
function updateVisuals() {
    if (state.mode === "video") {
        el.image.style.display = "none";
        el.video.style.display = "block";
        el.video.src = CONFIG.VIDEOS[state.videoIdx];
        el.video.play().catch(() => nextVisual());
    } else {
        el.video.style.display = "none";
        el.image.style.display = "block";
        el.image.src = CONFIG.IMAGES[state.imageIdx];
        setTimeout(nextVisual, CONFIG.IMAGE_DURATION);
    }
}

function nextVisual() {
    if (state.mode === "video") {
        state.videoIdx++;
        if (state.videoIdx >= CONFIG.VIDEOS.length) { state.mode = "image"; state.imageIdx = 0; }
    } else {
        state.imageIdx++;
        if (state.imageIdx >= CONFIG.IMAGES.length) { state.mode = "video"; state.videoIdx = 0; }
    }
    updateVisuals();
}
el.video.onended = nextVisual;

/** * PLAYLIST */
async function fetchPlaylist() {
    try {
        const [mRes, aRes] = await Promise.all([
            fetch(CONFIG.MUSIC_API).then(r => r.json()),
            fetch(CONFIG.ANN_API).then(r => r.json())
        ]);
        state.musicList = utils.shuffle(mRes.assets.filter(v => v.name.endsWith('.mp3')));
        state.announcerList = utils.shuffle(aRes.assets.filter(v => v.name.endsWith('.mp3')));
    } catch (err) { el.track.innerText = "Erro na Playlist"; }
}

async function playNext() {
    if (state.musicList.length === 0) await fetchPlaylist();
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
        utils.updateMediaSession(trackTitle, artistName);
        utils.sendNotification("4MFM RADIO", `Tocando agora: ${trackTitle}`);
    } catch (e) {}
}
el.audio.onended = playNext;

/** * COMPARTILHAMENTO */
el.shareBtn.onclick = async () => {
    const shareData = {
        title: '4MFM RADIO • AO VIVO',
        text: 'Estou ouvindo a 4MFM Rádio Ao Vivo!',
        url: window.location.href
    };
    if (navigator.share) {
        try { await navigator.share(shareData); } catch (e) {}
    } else {
        navigator.clipboard.writeText(window.location.href);
        const old = el.shareBtn.innerText;
        el.shareBtn.innerText = "Link Copiado!";
        setTimeout(() => el.shareBtn.innerText = old, 3000);
    }
};

/** * INICIALIZAÇÃO */
el.startBtn.onclick = async () => {
    if (state.isStarted) return;
    el.audio.play().catch(() => {});
    el.audio.pause();

    if ("Notification" in window) await Notification.requestPermission();

    state.isStarted = true;
    el.startBtn.classList.add("hidden");
    el.notice.classList.add("hidden");
    el.visualizer.classList.remove("hidden");

    setTimeout(() => el.shareBtn.classList.remove("hidden"), 15000);

    utils.startClock();
    utils.simulateListeners();
    await fetchPlaylist();
    
    const saved = localStorage.getItem(CONFIG.SAVE_KEY);
    if (saved) {
        try {
            const d = JSON.parse(saved);
            el.audio.src = d.src;
            el.audio.currentTime = d.time;
            el.track.innerText = d.title;
            el.artist.innerText = d.artist;
            await el.audio.play();
        } catch (e) { playNext(); }
    } else { playNext(); }

    updateVisuals();
    setInterval(() => utils.save(), 5000);
};

utils.startClock();
