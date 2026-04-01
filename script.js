const CONFIG = {
    MUSIC_API: "https://api.github.com/repos/BRAAR-ORG/4mfm-radio/releases/tags/sertanejo",
    ANN_API: "https://api.github.com/repos/BRAAR-ORG/4mfm-radio/releases/tags/locutoura",
    VIDEOS: Array.from({length: 6}, (_, i) => `vids/video${i + 1}.mp4`),
    IMAGES: Array.from({length: 56}, (_, i) => `imgs/img${String(i + 1).padStart(3, '0')}.png`),
    SAVE_KEY: "4mfm_radio_state",
    CACHE_KEY: "4mfm_playlist_cache",
    CACHE_TIME: 15 * 60 * 1000,
    ANNOUNCER_INTERVAL: 6 * 60 * 1000,
    IMAGE_DURATION: 7000,
    LOGO_URL: "icon/logo-4mfm.png",
    BASE_LISTENERS: 120,
    CROSSFADE_DURATION: 2000
};

/** ESTADO GLOBAL */
const state = {
    mode: "video",
    videoIdx: 0,
    imageIdx: 0,
    musicList: [],
    announcerList: [],
    lastAnnouncer: 0,
    isStarted: false,
    notificationsEnabled: false,
    currentListeners: CONFIG.BASE_LISTENERS,
    engaged: false,
    sessionStart: Date.now()
};

/** ELEMENTOS */
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

/** ================================
 * UTILITÁRIOS
================================= */

const utils = {

    shuffle(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    },

    formatName(name) {
        let clean = name.replace(".mp3", "").replace(/[._]+/g, " ").trim();
        return clean.split(" - ");
    },

    save() {
        if (!el.audio.src || el.audio.paused) return;
        localStorage.setItem(CONFIG.SAVE_KEY, JSON.stringify({
            src: el.audio.src,
            time: el.audio.currentTime,
            title: el.track.innerText,
            artist: el.artist.innerText,
            lastAnn: state.lastAnnouncer
        }));
    },

    async crossfade(newSrc) {
        const step = 0.05;
        const delay = CONFIG.CROSSFADE_DURATION * step;

        for (let v = 1; v >= 0; v -= step) {
            el.audio.volume = v;
            await new Promise(r => setTimeout(r, delay));
        }

        el.audio.src = newSrc;
        await el.audio.play();

        for (let v = 0; v <= 1; v += step) {
            el.audio.volume = v;
            await new Promise(r => setTimeout(r, delay));
        }
    },

    updateMediaSession(title, artist) {
        if ("mediaSession" in navigator) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title,
                artist,
                album: "4MFM RADIO",
                artwork: [{ src: CONFIG.LOGO_URL, sizes: "512x512", type: "image/png" }]
            });
        }
    },

    sendNotification(title, body) {
        if (Notification.permission === "granted") {
            new Notification(title, { body, icon: CONFIG.LOGO_URL });
        }
    },

    startClock() {
        setInterval(() => {
            const now = new Date();
            el.liveClock.innerText = now.toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit"
            });
        }, 1000);
    },

    simulateListeners() {
        el.listenerCount.innerText = state.currentListeners;
        setInterval(() => {
            state.currentListeners += Math.floor(Math.random() * 5) - 2;
            if (state.currentListeners < 50) state.currentListeners = 50;
            el.listenerCount.innerText = state.currentListeners;
        }, 8000);
    }
};

/** ================================
 * VISUAIS
================================= */

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

/** ================================
 * PLAYLIST BLINDADA
================================= */

async function fetchPlaylist() {

    const cached = localStorage.getItem(CONFIG.CACHE_KEY);

    if (cached) {
        const data = JSON.parse(cached);
        if (Date.now() - data.timestamp < CONFIG.CACHE_TIME) {
            state.musicList = data.music;
            state.announcerList = data.ann;
            return;
        }
    }

    try {
        const [mRes, aRes] = await Promise.all([
            fetch(CONFIG.MUSIC_API).then(r => r.json()),
            fetch(CONFIG.ANN_API).then(r => r.json())
        ]);

        const music = utils.shuffle(mRes.assets.filter(v => v.name.endsWith(".mp3")));
        const ann = utils.shuffle(aRes.assets.filter(v => v.name.endsWith(".mp3")));

        state.musicList = music;
        state.announcerList = ann;

        localStorage.setItem(CONFIG.CACHE_KEY, JSON.stringify({
            timestamp: Date.now(),
            music,
            ann
        }));

    } catch (err) {
        console.warn("Erro API. Usando cache se disponível.");
    }
}

/** ================================
 * PLAYER INTELIGENTE
================================= */

async function playNext() {

    if (state.musicList.length === 0) await fetchPlaylist();
    if (state.musicList.length === 0) return;

    const now = Date.now();
    const shouldAnnounce =
        (now - state.lastAnnouncer) > CONFIG.ANNOUNCER_INTERVAL &&
        Math.random() < 0.3;

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

    await utils.crossfade(currentItem.browser_download_url);

    utils.updateMediaSession(trackTitle, artistName);
    utils.sendNotification("4MFM RADIO", `Tocando agora: ${trackTitle}`);
}

el.audio.onended = playNext;

/** ================================
 * RETENÇÃO INTELIGENTE
================================= */

function retentionSystem() {
    setInterval(() => {
        const duration = Date.now() - state.sessionStart;

        if (duration > 120000 && !state.engaged) {
            state.engaged = true;
            el.shareBtn.classList.remove("hidden");
            utils.sendNotification("Gostando da 4MFM?", "Compartilhe com seus amigos!");
        }
    }, 10000);
}

document.addEventListener("visibilitychange", () => {
    if (document.hidden && Notification.permission === "granted") {
        utils.sendNotification("4MFM continua ao vivo!", "Volte para ouvir mais hits!");
    }
});

/** ================================
 * INICIALIZAÇÃO
================================= */

el.startBtn.onclick = async () => {

    if (state.isStarted) return;

    state.isStarted = true;

    if ("Notification" in window)
        await Notification.requestPermission();

    el.startBtn.classList.add("hidden");
    el.notice.classList.add("hidden");
    el.visualizer.classList.remove("hidden");

    utils.startClock();
    utils.simulateListeners();
    retentionSystem();

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
        } catch {
            playNext();
        }
    } else {
        playNext();
    }

    updateVisuals();
    setInterval(utils.save, 15000);
};

utils.startClock();
