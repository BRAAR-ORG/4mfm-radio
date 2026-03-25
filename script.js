const ASSETS = {
    images: Array.from({length: 56}, (_, i) => `imgs/Img${String(i + 1).padStart(3, '0')}.png`),
    videos: Array.from({length: 6}, (_, i) => `vids/video${i + 1}.mp4`)
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
    nextLocutorAt: Math.floor(Math.random() * 4) + 2,
    bgTimer: null,

    async init(){
        const statusEl = document.getElementById("status");
        if(statusEl) statusEl.innerText = "CONECTANDO AO SERVIDOR...";
        
        if ("Notification" in window) Notification.requestPermission();

        try{
            const [resM, resL] = await Promise.all([fetch(API_MUSICA), fetch(API_LOCUTORA)]);
            const dataM = await resM.json();
            const dataL = await resL.json();

            this.playlist = dataM.assets.filter(a => a.name.endsWith(".mp3")).sort(() => Math.random() - 0.5);
            this.locutores = dataL.assets.filter(a => a.name.endsWith(".mp3"));
            
            this.renderHistory();
            this.showScreen("player");
            
            const savedSrc = localStorage.getItem('4mfm_last_src');
            if(savedSrc) {
                this.audio.src = savedSrc;
                this.audio.currentTime = parseFloat(localStorage.getItem('4mfm_position') || 0);
                document.getElementById("title").innerText = localStorage.getItem('4mfm_last_title') || "Retomando...";
            } else {
                this.playNext();
            }

            this.audio.play().catch(() => { if(statusEl) statusEl.innerText = "CLIQUE PARA OUVIR"; });
            this.startBackgroundRotation();
            this.saveStateTask();
            
            // Visualizer animation toggle
            this.audio.onplay = () => document.getElementById("visualizer").classList.add("playing");
            this.audio.onpause = () => document.getElementById("visualizer").classList.remove("playing");

        } catch(e) {
            if(statusEl) statusEl.innerText = "ERRO AO CARREGAR";
        }
    },

    saveStateTask() {
        setInterval(() => {
            if(this.audio.src && !this.audio.paused) {
                localStorage.setItem('4mfm_position', this.audio.currentTime);
                localStorage.setItem('4mfm_last_src', this.audio.src);
                localStorage.setItem('4mfm_last_title', document.getElementById("title").innerText);
                localStorage.setItem('4mfm_counter', this.songCounter);
            }
        }, 2000);
    },

    startBackgroundRotation() { this.changeBackground(); },

    changeBackground() {
        clearTimeout(this.bgTimer);
        const layer = document.getElementById(`bg-layer-${this.currentBgLayer}`);
        const otherLayer = document.getElementById(`bg-layer-${this.currentBgLayer === 1 ? 2 : 1}`);
        
        const isVideo = Math.random() > 0.4 && ASSETS.videos.length > 0;
        const file = isVideo ? ASSETS.videos[Math.floor(Math.random() * ASSETS.videos.length)] : ASSETS.images[Math.floor(Math.random() * ASSETS.images.length)];

        if(isVideo) {
            layer.innerHTML = `<video src="${file}" autoplay muted playsinline class="w-full h-full object-cover"></video>`;
            const v = layer.querySelector('video');
            v.oncanplay = () => { layer.classList.add('bg-active'); otherLayer.classList.remove('bg-active'); };
            v.onended = () => this.changeBackground();
        } else {
            const img = new Image();
            img.src = file;
            img.onload = () => {
                layer.innerHTML = `<img src="${file}" class="w-full h-full object-cover">`;
                layer.classList.add('bg-active'); otherLayer.classList.remove('bg-active');
                this.bgTimer = setTimeout(() => this.changeBackground(), 40000);
            };
        }
        this.currentBgLayer = this.currentBgLayer === 1 ? 2 : 1;
    },

    playNext() {
        if (this.songCounter >= this.nextLocutorAt && this.locutores.length > 0) {
            this.playAudioItem(this.locutores, "LOCUTORA");
            this.songCounter = 0;
            this.nextLocutorAt = Math.floor(Math.random() * 4) + 3;
        } else {
            this.playAudioItem(this.playlist, "MÚSICA");
            this.songCounter++;
        }
    },

    playAudioItem(list, type) {
        const item = list[Math.floor(Math.random() * list.length)];
        const name = item.name.replace(".mp3","").replace(/_/g, " ").replace(/\./g, " ");
        
        this.audio.src = item.browser_download_url;
        this.audio.play().then(() => {
            const isKiara = type === "LOCUTORA";
            const titleEl = document.getElementById("title");
            const badge = document.getElementById('badge-live');
            const bText = document.getElementById('badge-text');

            titleEl.innerText = isKiara ? "Kiara no AR!" : name;
            badge.style.backgroundColor = isKiara ? "#9333ea" : "#dc2626";
            bText.innerText = isKiara ? "KIARA AO VIVO" : "NO AR";
            
            if(!isKiara) {
                this.addHistory(name);
                this.sendNotify(name);
            }
        }).catch(() => this.playNext());
    },

    sendNotify(msg) {
        if (Notification.permission === "granted") {
            new Notification("4MFM Rádio", { body: "Tocando agora: " + msg, icon: "icon/logo-4mfm.png" });
        }
    },

    addHistory(name){
        const time = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        this.history.unshift({ name, time });
        if(this.history.length > 15) this.history.pop();
        localStorage.setItem('4mfm_history', JSON.stringify(this.history));
        this.renderHistory();
    },

    renderHistory() {
        const container = document.getElementById("history-container");
        if(!container) return;
        container.innerHTML = this.history.map(m => `
            <div class="glass p-4 md:p-5 rounded-2xl md:rounded-3xl border border-white/5 animate-slide-in">
                <p class="font-black text-xs md:text-sm uppercase leading-tight">${m.name}</p>
                <div class="flex justify-between items-center opacity-50 mt-1">
                    <span class="text-[8px] md:text-[10px] font-bold">4MFM TRACK</span>
                    <span class="text-[8px] md:text-[10px] font-mono">${m.time}</span>
                </div>
            </div>
        `).join("");
    },

    requestSong() { window.open(FORM_LINK, '_blank'); },

    showScreen(s){
        document.querySelectorAll(".screen").forEach(e=>e.classList.add("hidden-screen"));
        document.getElementById("screen-"+s).classList.remove("hidden-screen");
    }
};

// Eventos Globais
app.audio.onended = () => app.playNext();
app.audio.onerror = () => app.playNext();

setInterval(() => {
    const clockEl = document.getElementById("clock");
    if(clockEl) clockEl.innerText = new Date().toLocaleTimeString();
}, 1000);
