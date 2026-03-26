const CONFIG = {
    // A infraestrutura do GitHub opera silenciosamente no backend
    API_MUSIC: "https://api.github.com/repos/BRAAR-ORG/4mfm-radio/releases/tags/sertanejo",
    API_ANN: "https://api.github.com/repos/BRAAR-ORG/4mfm-radio/releases/tags/locutoura",
    ASSETS: {
        images: Array.from({length: 56}, (_, i) => `./imgs/img${String(i + 1).padStart(3, '0')}.png`),
        videos: Array.from({length: 6}, (_, i) => `./vids/video${i + 1}.mp4`)
    },
    CACHE_TIME: 15 * 60 * 1000,
    CROSSFADE_TIME: 1500,
    AVG_TRACK_MS: 180000, // Tempo médio estimado de uma música (3 minutos) para cálculos globais
    LOGO: "icon/logo-4mfm.png",
    FORM_URL: "https://forms.gle/QjCpUrdZRgqE81mA6"
};

const app = {
    audio: document.getElementById("audio"),
    playlist: [],
    locutores: [],
    history: JSON.parse(localStorage.getItem('4mfm_history')) || [],
    currentBgLayer: 1,
    isTransitioning: false,

    async init() {
        const statusEl = document.getElementById("status");
        statusEl.innerText = "Sintonizando fluxo global...";

        try {
            await this.loadData();
            this.showScreen("player");
            this.renderHistory();
            this.startBackground();
            this.startClock();
            this.simulateListeners();
            
            this.syncAndPlay(); 
            this.setupEvents();
        } catch (e) {
            statusEl.innerText = "Falha na conexão do fluxo";
            console.error(e);
        }
    },

    async loadData() {
        const cached = localStorage.getItem('4mfm_cache');
        if (cached) {
            const data = JSON.parse(cached);
            if (Date.now() - data.time < CONFIG.CACHE_TIME) {
                this.playlist = data.playlist;
                this.locutores = data.locutores;
                return;
            }
        }

        const [resM, resL] = await Promise.all([
            fetch(CONFIG.API_MUSIC).then(r => r.json()),
            fetch(CONFIG.API_ANN).then(r => r.json())
        ]);

        this.playlist = resM.assets.filter(a => a.name.endsWith(".mp3")).sort((a,b) => a.name.localeCompare(b.name));
        this.locutores = resL.assets.filter(a => a.name.endsWith(".mp3")).sort((a,b) => a.name.localeCompare(b.name));

        localStorage.setItem('4mfm_cache', JSON.stringify({
            time: Date.now(),
            playlist: this.playlist,
            locutores: this.locutores
        }));
    },

    getGlobalLiveState() {
        const now = Date.now();
        const totalBlocksElapsed = Math.floor(now / CONFIG.AVG_TRACK_MS);
        const currentSecondOffset = (now % CONFIG.AVG_TRACK_MS) / 1000;
        const isLocution = totalBlocksElapsed % 5 === 0;
        const list = isLocution && this.locutores.length > 0 ? this.locutores : this.playlist;
        const itemIndex = totalBlocksElapsed % list.length;

        return {
            item: list[itemIndex],
            isLocution: isLocution,
            startAtSecond: currentSecondOffset
        };
    },

    async syncAndPlay() {
        if (this.isTransitioning) return;
        this.isTransitioning = true;

        const liveState = this.getGlobalLiveState();
        const item = liveState.item;
        
        const fullName = item.name.replace(".mp3", "").replace(/[._]+/g, " ");
        const [artist, track] = fullName.includes("-") ? fullName.split("-") : ["4MFM Hits", fullName];

        const step = 0.1;
        const interval = CONFIG.CROSSFADE_TIME / 10;

        // FADE OUT
        if (!this.audio.paused && this.audio.currentTime > 0) {
            for (let v = this.audio.volume; v > 0; v -= step) {
                this.audio.volume = Math.max(0, v);
                await new Promise(r => setTimeout(r, interval));
            }
        }

        this.audio.src = item.browser_download_url;
        this.audio.volume = 0; 
        
        // Aguarda metadados
        await new Promise((resolve) => {
            this.audio.onloadedmetadata = resolve;
            this.audio.load();
            setTimeout(resolve, 2000); 
        });
        
        try {
            if (this.audio.duration && liveState.startAtSecond < this.audio.duration) {
                this.audio.currentTime = liveState.startAtSecond;
            } else {
                this.audio.currentTime = 0;
            }

            await this.audio.play();
            
            this.updateUI(artist.trim(), track.trim(), liveState.isLocution);
            
            if (!liveState.isLocution) {
                this.addHistory(fullName);
            }

            // FADE IN
            for (let v = 0; v <= 1; v += step) {
                this.audio.volume = Math.min(1, v);
                await new Promise(r => setTimeout(r, interval));
            }
        } catch (e) {
            console.log("Navegador bloqueou autoplay. Aguardando toque.");
            this.audio.currentTime = 0;
            this.audio.volume = 1;
            document.getElementById("title").innerText = "TOQUE PARA OUVIR";
        } finally {
            this.isTransitioning = false;
        }
    },

    updateUI(artist, track, isKiara) {
        document.getElementById("artist-name").innerText = isKiara ? "KIARA NO AR" : artist;
        document.getElementById("title").innerText = isKiara ? "COMUNICADO DA REDE" : track;
        
        const badge = document.getElementById('badge-live');
        // Volta as cores originais (Vermelho e Roxo para Kiara)
        badge.style.backgroundColor = isKiara ? "#9333ea" : "#dc2626";
        badge.style.color = "#fff";
        document.getElementById('badge-text').innerText = isKiara ? "KIARA AO VIVO" : "NO AR";

        if ("mediaSession" in navigator) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: track,
                artist: artist,
                album: "4MFM Rádio",
                artwork: [{ src: CONFIG.LOGO, sizes: '512x512', type: 'image/png' }]
            });
            navigator.mediaSession.setActionHandler('nexttrack', null);
            navigator.mediaSession.setActionHandler('previoustrack', null);
            navigator.mediaSession.setActionHandler('seekto', null);
        }
    },

    setupEvents() {
        this.audio.onended = () => this.syncAndPlay();
        this.audio.onplay = () => document.getElementById("visualizer").classList.add("playing");
        this.audio.onpause = () => document.getElementById("visualizer").classList.remove("playing");
        this.audio.onerror = () => setTimeout(() => this.syncAndPlay(), 3000);
    },

    startBackground() {
        const change = () => {
            const layer = document.getElementById(`bg-layer-${this.currentBgLayer}`);
            const other = document.getElementById(`bg-layer-${this.currentBgLayer === 1 ? 2 : 1}`);
            const isVid = Math.random() > 0.4;
            const src = isVid ? 
                CONFIG.ASSETS.videos[Math.floor(Math.random() * CONFIG.ASSETS.videos.length)] :
                CONFIG.ASSETS.images[Math.floor(Math.random() * CONFIG.ASSETS.images.length)];

            layer.innerHTML = isVid ? 
                `<video src="${src}" autoplay muted playsinline class="w-full h-full object-cover"></video>` :
                `<img src="${src}" class="w-full h-full object-cover">`;

            setTimeout(() => {
                layer.classList.add('bg-active');
                other.classList.remove('bg-active');
                this.currentBgLayer = this.currentBgLayer === 1 ? 2 : 1;
            }, 100);
        };
        change();
        setInterval(change, 40000);
    },

    addHistory(name) {
        const time = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        if(this.history.length > 0 && this.history[0].name === name) return; 

        this.history.unshift({ name, time });
        if (this.history.length > 10) this.history.pop();
        localStorage.setItem('4mfm_history', JSON.stringify(this.history));
        this.renderHistory();
    },

    renderHistory() {
        const container = document.getElementById("history-container");
        container.innerHTML = this.history.map(m => `
            <div class="history-item p-4 border border-white/5 mb-3">
                <p class="font-black text-[11px] uppercase truncate text-white/90">${m.name}</p>
                <div class="flex justify-between items-center opacity-40 mt-1">
                    <span class="text-[8px] font-bold tracking-widest text-white">4MFM LOG</span>
                    <span class="text-[9px] font-mono">${m.time}</span>
                </div>
            </div>
        `).join("");
    },

    simulateListeners() {
        const el = document.getElementById("listener-count");
        let count = 120;
        setInterval(() => {
            count += Math.floor(Math.random() * 9) - 4; 
            el.innerText = Math.max(85, count);
        }, 6000);
    },

    startClock() {
        setInterval(() => {
            document.getElementById("clock").innerText = new Date().toLocaleTimeString('pt-BR');
        }, 1000);
    },

    showScreen(s) {
        document.querySelectorAll(".screen").forEach(e => e.classList.replace("active-screen", "hidden-screen"));
        document.getElementById("screen-"+s).classList.replace("hidden-screen", "active-screen");
    },

    requestSong() { window.open(CONFIG.FORM_URL, '_blank'); }
};
