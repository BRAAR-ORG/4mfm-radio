const CONFIG = {
    API_MUSIC: "https://api.github.com/repos/BRAAR-ORG/4mfm-radio/releases/tags/sertanejo",
    API_ANN: "https://api.github.com/repos/BRAAR-ORG/4mfm-radio/releases/tags/locutoura",
    IMAGES: Array.from({length: 56}, (_, i) => `./imgs/img${String(i + 1).padStart(3, '0')}.png`),
    AVG_TRACK_MS: 180000, // Cada música ou locução ocupa um bloco de 3 min na linha do tempo
    LOGO: "icon/logo-4mfm.png",
    FORM_URL: "https://forms.gle/QjCpUrdZRgqE81mA6"
};

const app = {
    audio: document.getElementById("audio"),
    playlist: [],
    locutores: [],
    history: JSON.parse(localStorage.getItem('4mfm_history')) || [],
    currentBgLayer: 1,
    // Trava para impedir que a mesma locução repita no mesmo bloco
    hasPlayedLocutionInThisBlock: false,
    lastBlockIndex: -1,

    async init() {
        document.getElementById("status").innerText = "Conectando ao fluxo global...";
        
        // Solicita permissão de notificação nativa
        if ("Notification" in window && Notification.permission !== "granted") {
            Notification.requestPermission();
        }

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
            document.getElementById("status").innerText = "Erro de conexão. Tente novamente.";
            console.error(e);
        }
    },

    async loadData() {
        const [resM, resL] = await Promise.all([
            fetch(CONFIG.API_MUSIC).then(r => r.json()),
            fetch(CONFIG.API_ANN).then(r => r.json())
        ]);
        
        // Garante ordem idêntica para todos os ouvintes no mundo
        this.playlist = resM.assets.filter(a => a.name.endsWith(".mp3")).sort((a,b) => a.name.localeCompare(b.name));
        this.locutores = resL.assets.filter(a => a.name.endsWith(".mp3")).sort((a,b) => a.name.localeCompare(b.name));
    },

    getGlobalLiveState() {
        const now = Date.now();
        const blockIndex = Math.floor(now / CONFIG.AVG_TRACK_MS);
        const offsetInSeconds = (now % CONFIG.AVG_TRACK_MS) / 1000;
        
        // Reseta a trava se mudarmos de bloco de tempo
        if (blockIndex !== this.lastBlockIndex) {
            this.hasPlayedLocutionInThisBlock = false;
            this.lastBlockIndex = blockIndex;
        }

        // Regra: A cada 5 blocos, entra a Kiara
        const isLocutionBlock = blockIndex % 5 === 0;
        
        // Se for bloco da Kiara e ainda não tocamos ela, toca a locutora. Caso contrário, música.
        const useLocution = isLocutionBlock && !this.hasPlayedLocutionInThisBlock;
        const currentList = useLocution ? this.locutores : this.playlist;
        const itemIndex = blockIndex % currentList.length;

        return {
            item: currentList[itemIndex],
            isKiara: useLocution,
            seekTime: offsetInSeconds
        };
    },

    async syncAndPlay() {
        const state = this.getGlobalLiveState();
        const item = state.item;
        
        const rawName = item.name.replace(".mp3", "").replace(/[._]+/g, " ");
        const [artist, track] = rawName.includes("-") ? rawName.split("-") : ["4MFM Hits", rawName];

        this.audio.src = item.browser_download_url;
        
        // Lógica de Sincronia: Não começa do zero ao atualizar/abrir
        this.audio.onloadedmetadata = () => {
            // A locutora sempre começa do zero ao entrar no bloco, músicas seguem o relógio global
            const startTime = state.isKiara ? 0 : state.seekTime % this.audio.duration;
            this.audio.currentTime = startTime;
        };

        try {
            await this.audio.play();
            this.updateUI(artist.trim(), track.trim(), state.isKiara);
            
            if (!state.isKiara) {
                this.addHistory(rawName);
                this.pushNotify(track.trim(), artist.trim());
            }
        } catch (e) {
            document.getElementById("title").innerText = "TOQUE PARA OUVIR";
        }
    },

    pushNotify(title, artist) {
        if ("Notification" in window && Notification.permission === "granted") {
            new Notification("4MFM RADIO 📻", {
                body: `Tocando agora: ${title} - ${artist}`,
                icon: CONFIG.LOGO,
                silent: true // Não interrompe com som de sistema
            });
        }
    },

    addHistory(name) {
        if(this.history[0]?.name === name) return;
        
        const now = new Date();
        const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        
        this.history.unshift({ name, time: timeStr });
        
        // Mantém apenas 10 músicas, limpando as antigas uma a uma
        while (this.history.length > 10) {
            this.history.pop();
        }
        
        localStorage.setItem('4mfm_history', JSON.stringify(this.history));
        this.renderHistory();
    },

    setupEvents() {
        this.audio.onended = () => {
            // Se o áudio que acabou foi a Kiara, travamos para não repetir no mesmo bloco
            if (this.getGlobalLiveState().isKiara) {
                this.hasPlayedLocutionInThisBlock = true;
            }
            this.syncAndPlay();
        };

        this.audio.onplay = () => {
            document.getElementById("visualizer").classList.add("playing");
            this.updateMediaSessionStatus("playing");
        };

        this.audio.onpause = () => {
            document.getElementById("visualizer").classList.remove("playing");
            this.updateMediaSessionStatus("paused");
        };

        this.audio.onerror = () => setTimeout(() => this.syncAndPlay(), 3000);
    },

    updateUI(artist, track, isKiara) {
        document.getElementById("artist-name").innerText = isKiara ? "KIARA • LOCUÇÃO" : artist;
        document.getElementById("title").innerText = isKiara ? "COMUNICADO DA REDE" : track;
        
        const badge = document.getElementById('badge-live');
        const text = document.getElementById('badge-text');
        
        if (isKiara) {
            badge.classList.replace("bg-red-600", "bg-purple-600");
            text.innerText = "KIARA NO AR";
        } else {
            badge.classList.replace("bg-purple-600", "bg-red-600");
            text.innerText = "AO VIVO";
        }

        // Atualiza MediaSession (Controle de tela de bloqueio)
        if ("mediaSession" in navigator) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: track,
                artist: artist,
                album: "4MFM RADIO",
                artwork: [{ src: CONFIG.LOGO, sizes: '512x512', type: 'image/png' }]
            });
        }
    },

    renderHistory() {
        const container = document.getElementById("history-container");
        container.innerHTML = this.history.map(item => `
            <div class="history-item flex flex-col gap-1">
                <p class="text-[11px] font-black uppercase truncate text-white/90 tracking-tight">${item.name}</p>
                <div class="flex justify-between items-center opacity-40">
                    <span class="text-[8px] font-bold tracking-widest uppercase text-green-500">4MFM Registros</span>
                    <span class="text-[9px] font-mono">${item.time}</span>
                </div>
            </div>
        `).join("");
    },

    startBackground() {
        const changeBg = () => {
            const l1 = document.getElementById(`bg-layer-1`);
            const l2 = document.getElementById(`bg-layer-2`);
            const currentLayer = this.currentBgLayer === 1 ? l1 : l2;
            const otherLayer = this.currentBgLayer === 1 ? l2 : l1;

            const randomImg = CONFIG.IMAGES[Math.floor(Math.random() * CONFIG.IMAGES.length)];
            currentLayer.innerHTML = `<img src="${randomImg}" class="w-full h-full object-cover">`;

            setTimeout(() => {
                currentLayer.classList.add('bg-active');
                otherLayer.classList.remove('bg-active');
                this.currentBgLayer = this.currentBgLayer === 1 ? 2 : 1;
            }, 100);
        };
        changeBg();
        setInterval(changeBg, 30000); // Troca a cada 30 segundos
    },

    startClock() {
        setInterval(() => {
            document.getElementById("clock").innerText = new Date().toLocaleTimeString('pt-BR');
        }, 1000);
    },

    simulateListeners() {
        const el = document.getElementById("listener-count");
        let count = 118;
        setInterval(() => {
            count += Math.floor(Math.random() * 7) - 3;
            el.innerText = Math.max(90, count);
        }, 6000);
    },

    updateMediaSessionStatus(state) {
        if ("mediaSession" in navigator) navigator.mediaSession.playbackState = state;
    },

    showScreen(s) {
        document.querySelectorAll(".screen").forEach(e => e.classList.replace("active-screen", "hidden-screen"));
        document.getElementById("screen-"+s).classList.replace("hidden-screen", "active-screen");
    },

    requestSong() { window.open(CONFIG.FORM_URL, '_blank'); }
};
