const CONFIG = {
    ENDPOINTS: {
        MUSIC: "https://api.github.com/repos/BRAAR-ORG/4mfm-radio/releases/tags/sertanejo",
        LOCUTION: "https://api.github.com/repos/BRAAR-ORG/4mfm-radio/releases/tags/locutoura"
    },
    // A locutora entrará a cada 8 blocos (7 músicas + 1 locutora)
    LOCUTION_INTERVAL: 8, 
    BG_INTERVAL: 30000
};

class RadioApp {
    constructor() {
        this.nodes = {
            audio: document.getElementById("main-audio"),
            status: document.getElementById("status-label"),
            title: document.getElementById("track-title"),
            artist: document.getElementById("track-artist"),
            history: document.getElementById("history-list"),
            visualizer: document.getElementById("visualizer-bars"),
            btnStart: document.getElementById("btn-start")
        };

        this.state = {
            playlist: [],
            locutions: [],
            history: JSON.parse(localStorage.getItem('4mfm_history')) || [],
            currentLayer: 1,
            isLocutionMode: false,
            forcedMusicMode: false // Trava para não repetir locutora
        };

        this.init();
    }

    init() {
        this.nodes.btnStart.onclick = () => this.boot();
        document.getElementById('btn-request').onclick = () => window.open("https://forms.gle/QjCpUrdZRgqE81mA6", '_blank');
        
        // Quando a música ou locutora acaba
        this.nodes.audio.onended = () => {
            if (this.state.isLocutionMode) {
                // Se era a locutora, agora obrigamos a voltar para a música
                this.state.forcedMusicMode = true;
                console.log("Locutora finalizada. Voltando para as músicas...");
            }
            this.syncStream();
        };

        this.nodes.audio.onerror = () => setTimeout(() => this.syncStream(), 2000);
    }

    async boot() {
        this.nodes.status.innerText = "Sincronizando com o satélite...";
        try {
            await this.loadAssets();
            this.buildVisualizer();
            this.showScreen("player");
            this.startClock();
            this.startBackgrounds();
            this.syncStream();
        } catch (e) {
            this.nodes.status.innerText = "Erro de conexão.";
        }
    }

    async loadAssets() {
        const [m, l] = await Promise.all([
            fetch(CONFIG.ENDPOINTS.MUSIC).then(r => r.json()),
            fetch(CONFIG.ENDPOINTS.LOCUTION).then(r => r.json())
        ]);
        this.state.playlist = m.assets.filter(a => a.name.endsWith(".mp3")).sort((a,b) => a.name.localeCompare(b.name));
        this.state.locutions = l.assets.filter(a => a.name.endsWith(".mp3")).sort((a,b) => a.name.localeCompare(b.name));
    }

    syncStream() {
        const now = Date.now();
        // Usamos um tempo de bloco menor (ex: 2 min) para rotatividade
        const blockTime = 120000; 
        let blockIndex = Math.floor(now / blockTime);
        
        // Decisão: É hora da locutora? 
        // Se o bloco for divisível pelo intervalo E não acabamos de tocar uma locutora
        let isKiara = (blockIndex % CONFIG.LOCUTION_INTERVAL === 0) && !this.state.forcedMusicMode;
        
        this.state.isLocutionMode = isKiara;

        let track;
        if (isKiara) {
            // Pega a locutora (pode ser a ID1 ou sequencial)
            track = this.state.locutions[blockIndex % this.state.locutions.length];
        } else {
            // Pega música
            track = this.state.playlist[blockIndex % this.state.playlist.length];
            this.state.forcedMusicMode = false; // Reseta a trava ao tocar música
        }

        const rawName = track.name.replace(".mp3", "").replace(/[._]+/g, " ");
        const [artist, title] = rawName.includes("-") ? rawName.split("-") : ["4MFM Hits", rawName];

        this.nodes.audio.src = track.browser_download_url;
        this.nodes.audio.load();
        
        this.nodes.audio.onloadedmetadata = () => {
            // Sincronia de tempo: Locutora sempre começa do zero (ID1)
            // Música começa de onde o relógio global estiver
            if (isKiara) {
                this.nodes.audio.currentTime = 0;
            } else {
                const seekTime = Math.floor((now % blockTime) / 1000) % Math.floor(this.nodes.audio.duration);
                this.nodes.audio.currentTime = seekTime;
            }
            
            this.nodes.audio.play().catch(() => {
                this.nodes.title.innerText = "CLIQUE PARA OUVIR";
            });

            this.updateUI(artist.trim(), title.trim(), isKiara);
            if (!isKiara) this.addToHistory(rawName);
        };
    }

    updateUI(artist, title, isKiara) {
        this.nodes.artist.innerText = isKiara ? "KIARA • LOCUÇÃO" : artist;
        this.nodes.title.innerText = isKiara ? "COMUNICADO DA REDE" : title;
        
        const badge = document.getElementById('badge-live');
        badge.className = isKiara ? "badge badge-purple" : "badge badge-red";
        document.getElementById('badge-text').innerText = isKiara ? "KIARA NO AR" : "AO VIVO";
        document.querySelector('.player-art-container').classList.add('playing');
    }

    addToHistory(name) {
        if (this.state.history[0]?.name === name) return;
        const time = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        this.state.history.unshift({ name, time });
        this.state.history = this.state.history.slice(0, 10);
        localStorage.setItem('4mfm_history', JSON.stringify(this.state.history));
        this.renderHistory();
    }

    renderHistory() {
        this.nodes.history.innerHTML = this.state.history.map(item => `
            <div class="history-item">
                <p class="text-[11px] font-black uppercase truncate text-white/90">${item.name}</p>
                <div class="flex justify-between items-center opacity-40 text-[9px] mt-1">
                    <span class="text-green-500 font-bold">4MFM LOG</span>
                    <span>${item.time}</span>
                </div>
            </div>
        `).join('');
    }

    buildVisualizer() {
        this.nodes.visualizer.innerHTML = Array(12).fill('<div class="bar"></div>').join('');
    }

    startBackgrounds() {
        const layers = [document.getElementById('bg-layer-1'), document.getElementById('bg-layer-2')];
        const update = () => {
            const imgIdx = Math.floor(Math.random() * 56) + 1;
            const nextLayer = layers[this.state.currentLayer % 2];
            const prevLayer = layers[(this.state.currentLayer + 1) % 2];
            nextLayer.style.backgroundImage = `url('./imgs/img${String(imgIdx).padStart(3, '0')}.png')`;
            nextLayer.classList.add('active');
            prevLayer.classList.remove('active');
            this.state.currentLayer++;
        };
        update();
        setInterval(update, CONFIG.BG_INTERVAL);
    }

    startClock() {
        setInterval(() => {
            document.getElementById("digital-clock").innerText = new Date().toLocaleTimeString('pt-BR');
        }, 1000);
        setInterval(() => {
            const count = Math.floor(Math.random() * 20) + 130;
            document.getElementById("listener-count").innerText = count;
        }, 5000);
    }

    showScreen(id) {
        document.querySelectorAll('.screen').forEach(s => s.classList.replace('screen-active', 'screen-hidden'));
        document.getElementById(`screen-${id}`).classList.replace('screen-hidden', 'screen-active');
    }
}

window.onload = () => new RadioApp();
