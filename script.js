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
    nextLocutorAt: Math.floor(Math.random() * 3) + 3, 

    async init() {
        const statusEl = document.getElementById("status");
        statusEl.innerText = "Conectando ao Fluxo...";

        try {
            // Desbloqueia o áudio para Mobile
            this.audio.play().catch(() => {});
            this.audio.pause();

            const [resM, resL] = await Promise.all([
                fetch(API_MUSICA).then(r => r.json()),
                fetch(API_LOCUTORA).then(r => r.json())
            ]);

            this.playlist = resM.assets.filter(a => a.name.endsWith(".mp3")).sort(() => Math.random() - 0.5);
            this.locutores = resL.assets.filter(a => a.name.endsWith(".mp3"));

            this.showScreen("player");
            this.renderHistory();
            this.startBackground();
            
            // Retoma estado anterior se houver
            const lastSrc = localStorage.getItem('4mfm_last_src');
            if(lastSrc && lastSrc !== "null") {
                this.audio.src = lastSrc;
                this.audio.currentTime = parseFloat(localStorage.getItem('4mfm_position') || 0);
                document.getElementById("title").innerText = localStorage.getItem('4mfm_last_title') || "Retomando...";
            } else {
                this.playNext();
            }

            this.audio.play().catch(() => {
                statusEl.innerText = "Toque para liberar o som";
                document.body.addEventListener('click', () => this.audio.play(), { once: true });
            });

            this.setupEvents();

        } catch (e) {
            statusEl.innerText = "Erro: Sem conexão";
            console.error(e);
        }
    },

    setupEvents() {
        this.audio.onplay = () => document.getElementById("visualizer").classList.add("playing");
        this.audio.onpause = () => document.getElementById("visualizer").classList.remove("playing");
        this.audio.onended = () => this.playNext();
        
        // Se houver erro no arquivo, espera 2s antes de tentar o próximo (evita pular infinitamente)
        this.audio.onerror = () => {
            console.log("Erro no arquivo de áudio. Tentando próximo...");
            setTimeout(() => this.playNext(), 2000);
        };

        // Salva progresso
        setInterval(() => {
            if(this.audio.src && !this.audio.paused) {
                localStorage.setItem('4mfm_position', this.audio.currentTime);
                localStorage.setItem('4mfm_last_src', this.audio.src);
                localStorage.setItem('4mfm_last_title', document.getElementById("title").innerText);
                localStorage.setItem('4mfm_counter', this.songCounter);
            }
        }, 4000);
    },

    startBackground() {
        this.changeBackground();
        setInterval(() => {
            if(!document.querySelector('.bg-layer video')) this.changeBackground();
        }, 35000);
    },

    async changeBackground() {
        const layer = document.getElementById(`bg-layer-${this.currentBgLayer}`);
        const otherLayer = document.getElementById(`bg-layer-${this.currentBgLayer === 1 ? 2 : 1}`);
        
        const isVideo = Math.random() > 0.4 && ASSETS.videos.length > 0;
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
        // Lógica da Kiara
        if (this.songCounter >= this.nextLocutorAt && this.locutores.length > 0) {
            this.executePlay(this.locutores, "KIARA");
            this.songCounter = 0;
            this.nextLocutorAt = Math.floor(Math.random() * 3) + 3;
        } else {
            this.executePlay(this.playlist, "MUSICA");
            this.songCounter++;
        }
    },

    executePlay(list, type) {
        if(!list || list.length === 0) return;
        
        const item = list[Math.floor(Math.random() * list.length)];
        const cleanName = item.name.replace(".mp3","").replace(/_/g, " ").replace(/\./g, " ");
        
        this.audio.src = item.browser_download_url;
        this.audio.load(); // Importante para Mobile

        this.audio.play().then(() => {
            const isKiara = type === "KIARA";
            document.getElementById("title").innerText = isKiara ? "Kiara no AR!" : cleanName;
            
            const badge = document.getElementById('badge-live');
            badge.style.backgroundColor = isKiara ? "#9333ea" : "#dc2626";
            document.getElementById('badge-text').innerText = isKiara ? "KIARA AO VIVO" : "NO AR";

            if(!isKiara) {
                this.addHistory(cleanName);
                if ("Notification" in window && Notification.permission === "granted") {
                    new Notification("4MFM Rádio", { body: "Tocando agora: " + cleanName, icon: "icon/logo-4mfm.png" });
                }
            }
        }).catch(e => {
            console.log("Play bloqueado pelo navegador. Aguardando interação.");
            document.getElementById("title").innerText = "Toque para ouvir!";
        });
    },

    addHistory(name) {
        const time = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        this.history.unshift({ name, time });
        if(this.history.length > 12) this.history.pop();
        localStorage.setItem('4mfm_history', JSON.stringify(this.history));
        this.renderHistory();
    },

    renderHistory() {
        const container = document.getElementById("history-container");
        if(!container) return;
        container.innerHTML = this.history.map(m => `
            <div class="history-item p-4 border border-white/5">
                <p class="font-black text-[11px] uppercase truncate text-white/90">${m.name}</p>
                <div class="flex justify-between items-center opacity-40 mt-1">
                    <span class="text-[8px] font-bold tracking-widest">4MFM TRACK</span>
                    <span class="text-[9px] font-mono">${m.time}</span>
                </div>
            </div>
        `).join("");
    },

    showScreen(s) {
        document.querySelectorAll(".screen").forEach(e => {
            e.classList.add("hidden-screen");
            e.classList.remove("active-screen");
        });
        const target = document.getElementById("screen-"+s);
        target.classList.remove("hidden-screen");
        target.classList.add("active-screen");
    },

    requestSong() { window.open(FORM_LINK, '_blank'); }
};

// Relógio
setInterval(() => {
    const el = document.getElementById("clock");
    if(el) el.innerText = new Date().toLocaleTimeString('pt-BR');
}, 1000);
