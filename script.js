const ASSETS = {
    images: Array.from({length: 56}, (_, i) => `./imgs/Img${String(i + 1).padStart(3, '0')}.png`),
    videos: Array.from({length: 6}, (_, i) => `./vids/video${i + 1}.mp4`)
};

const API_MUSICA = "https://api.github.com/repos/BRAAR-ORG/4mfm-radio/releases/tags/sertanejo";
const API_LOCUTORA = "https://api.github.com/repos/BRAAR-ORG/4mfm-radio/releases/tags/locutoura";
const FORM_LINK = "https://forms.gle/QjCpUrdZRgqE81mA6";

const app = {
    audio: document.getElementById("audio"),
    playlist: [],
    locutores: [],
    history: JSON.parse(localStorage.getItem('4mfm_history')) || [],
    currentBgLayer: 1,
    songCounter: parseInt(localStorage.getItem('4mfm_counter')) || 0,
    nextLocutorAt: Math.floor(Math.random() * 3) + 2, // A cada 2 a 4 músicas

    async init() {
        const statusEl = document.getElementById("status");
        statusEl.innerText = "Sintonizando Sinal...";

        try {
            const [resM, resL] = await Promise.all([
                fetch(API_MUSICA).then(r => r.json()),
                fetch(API_LOCUTORA).then(r => r.json())
            ]);

            this.playlist = resM.assets.filter(a => a.name.endsWith(".mp3")).sort(() => Math.random() - 0.5);
            this.locutores = resL.assets.filter(a => a.name.endsWith(".mp3"));

            this.showScreen("player");
            this.renderHistory();
            this.startBackground();
            
            // Tenta retomar última sessão ou inicia nova
            const lastSrc = localStorage.getItem('4mfm_last_src');
            if(lastSrc) {
                this.audio.src = lastSrc;
                this.audio.currentTime = parseFloat(localStorage.getItem('4mfm_position') || 0);
                document.getElementById("title").innerText = localStorage.getItem('4mfm_last_title');
            } else {
                this.playNext();
            }

            this.audio.play().catch(() => statusEl.innerText = "Toque para Iniciar");
            this.setupEvents();

        } catch (e) {
            statusEl.innerText = "Erro de Conexão";
            console.error("Erro no Init:", e);
        }
    },

    setupEvents() {
        this.audio.onplay = () => document.getElementById("visualizer").classList.add("playing");
        this.audio.onpause = () => document.getElementById("visualizer").classList.remove("playing");
        this.audio.onended = () => this.playNext();
        this.audio.onerror = () => this.playNext();

        // Salva estado a cada 3 segundos
        setInterval(() => {
            if(!this.audio.paused) {
                localStorage.setItem('4mfm_position', this.audio.currentTime);
                localStorage.setItem('4mfm_last_src', this.audio.src);
                localStorage.setItem('4mfm_last_title', document.getElementById("title").innerText);
                localStorage.setItem('4mfm_counter', this.songCounter);
            }
        }, 3000);
    },

    startBackground() {
        this.changeBackground();
        // Muda o fundo a cada 30 segundos se for imagem
        setInterval(() => {
            if(!document.querySelector('.bg-layer video')) this.changeBackground();
        }, 30000);
    },

    async changeBackground() {
        const layerId = `bg-layer-${this.currentBgLayer}`;
        const layer = document.getElementById(layerId);
        const otherLayer = document.getElementById(`bg-layer-${this.currentBgLayer === 1 ? 2 : 1}`);
        
        const isVideo = Math.random() > 0.3 && ASSETS.videos.length > 0;
        const file = isVideo ? 
            ASSETS.videos[Math.floor(Math.random() * ASSETS.videos.length)] : 
            ASSETS.images[Math.floor(Math.random() * ASSETS.images.length)];

        if(isVideo) {
            layer.innerHTML = `<video src="${file}" autoplay muted playsinline class="w-full h-full object-cover"></video>`;
            const v = layer.querySelector('video');
            v.oncanplay = () => {
                layer.classList.add('bg-active');
                otherLayer.classList.remove('bg-active');
            };
            v.onended = () => this.changeBackground();
        } else {
            const img = new Image();
            img.src = file;
            img.onload = () => {
                layer.innerHTML = `<img src="${file}" class="w-full h-full object-cover">`;
                layer.classList.add('bg-active');
                otherLayer.classList.remove('bg-active');
            };
        }
        this.currentBgLayer = this.currentBgLayer === 1 ? 2 : 1;
    },

    playNext() {
        if (this.songCounter >= this.nextLocutorAt && this.locutores.length > 0) {
            this.executePlay(this.locutores, "KIARA");
            this.songCounter = 0;
            this.nextLocutorAt = Math.floor(Math.random() * 3) + 2;
        } else {
            this.executePlay(this.playlist, "MUSICA");
            this.songCounter++;
        }
    },

    executePlay(list, type) {
        const item = list[Math.floor(Math.random() * list.length)];
        const cleanName = item.name.replace(".mp3","").replace(/_/g, " ").replace(/\./g, " ");
        
        this.audio.src = item.browser_download_url;
        this.audio.play().then(() => {
            const isKiara = type === "KIARA";
            document.getElementById("title").innerText = isKiara ? "Kiara no AR!" : cleanName;
            
            const badge = document.getElementById('badge-live');
            badge.style.backgroundColor = isKiara ? "#9333ea" : "#dc2626";
            document.getElementById('badge-text').innerText = isKiara ? "KIARA AO VIVO" : "NO AR";

            if(!isKiara) {
                this.addHistory(cleanName);
                if (Notification.permission === "granted") {
                    new Notification("4MFM", { body: "Tocando agora: " + cleanName, icon: "icon/logo-4mfm.png" });
                }
            }
        }).catch(() => this.playNext());
    },

    addHistory(name) {
        const time = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        this.history.unshift({ name, time });
        if(this.history.length > 10) this.history.pop();
        localStorage.setItem('4mfm_history', JSON.stringify(this.history));
        this.renderHistory();
    },

    renderHistory() {
        const container = document.getElementById("history-container");
        container.innerHTML = this.history.map(m => `
            <div class="history-item glass p-4 rounded-2xl border border-white/5">
                <p class="font-black text-xs uppercase truncate">${m.name}</p>
                <div class="flex justify-between items-center opacity-40 mt-1">
                    <span class="text-[8px] font-bold">4MFM TRACK</span>
                    <span class="text-[9px] font-mono">${m.time}</span>
                </div>
            </div>
        `).join("");
    },

    showScreen(s) {
        document.querySelectorAll(".screen").forEach(e => {
            e.classList.remove("active-screen");
            e.classList.add("hidden-screen");
        });
        document.getElementById("screen-"+s).classList.add("active-screen");
        document.getElementById("screen-"+s).classList.remove("hidden-screen");
    },

    requestSong() { window.open(FORM_LINK, '_blank'); }
};

// Relógio Real-time
setInterval(() => {
    const el = document.getElementById("clock");
    if(el) el.innerText = new Date().toLocaleTimeString('pt-BR');
}, 1000);
