const CamillaSystem = (() => {
    // ==========================================
    // 🧠 CONFIGURAÇÕES E MEMÓRIA DE ESTADO
    // ==========================================
    const CONFIG = {
        baseFolder: "Camilla/",
        categorias: {
            chamadas: ["Chamada/pedidos.mp3", "Chamada/redes.mp3"],
            descontraida: [
                "Descontraida/aleatoria.mp3", "Descontraida/carro.mp3",
                "Descontraida/foco.mp3", "Descontraida/fome.mp3",
                "Descontraida/nostalgia.mp3", "Descontraida/playlist.mp3",
                "Descontraida/segredo.mp3", "Descontraida/tempo.mp3",
                "Descontraida/Esquece_boletos.mp3", "Descontraida/Fita_cassete.mp3",
                "Descontraida/vicio.mp3"
            ],
            anuncios: [],
            piadas: []
        },
        mensagensDisplay: [
            "🎙️ Camilla na Área!", "✨ Camilla invadindo a rádio!",
            "🗣️ Só um recadinho da Camilla...", "🎧 Aumenta o som, a Camilla chegou!",
            "🚀 Dando aquele pause com a Camilla!", "📻 Troca de ideia com a Camilla!"
        ],
        filasReproducao: { chamadas: [], descontraida: [], anuncios: [], piadas: [] }
    };

    const estado = {
        contadorMusicas: 0,
        frequenciaAnuncio: 4, // Ajustado para uma média padrão saudável de rádio
        estaFalando: false,
        ultimaHoraAnunciada: new Date().getHours(),
        vibeAtual: "neutra",
        historicoDecisoes: []
    };

    const DOM = {
        trackTitle: document.getElementById('trackTitle'),
        trackArtist: document.getElementById('trackArtist'),
        albumArt: document.getElementById('albumArt')
    };

    // ==========================================
    // ⚙️ INTELIGÊNCIA COGNITIVA (TOMADA DE DECISÃO)
    // ==========================================
    const analisarContexto = () => {
        const agora = new Date();
        const hora = agora.getHours();
        const diaSemana = agora.getDay(); // 0 = Domingo, 6 = Sábado

        // Determinação dinâmica da Vibe da Rádio
        if (hora >= 0 && hora < 6) estado.vibeAtual = "madrugada_calma";
        else if (hora >= 6 && hora < 12) estado.vibeAtual = "manha_energica";
        else if (hora >= 18 || diaSemana === 0 || diaSemana === 6) estado.vibeAtual = "descontraida_alta";
        else estado.vibeAtual = "comercial_focada";

        // Força anúncios se houver mídia disponível e a meta for batida
        if (estado.contadorMusicas >= estado.frequenciaAnuncio && CONFIG.categorias.anuncios.length > 0) {
            return "anuncios";
        }

        // Sistema de Pesos Base para Roleta
        const pesos = { chamadas: 15, descontraida: 40, piadas: 20 };

        if (estado.vibeAtual === "madrugada_calma") {
            pesos.descontraida += 30;
            pesos.piadas = 0; 
        } else if (estado.vibeAtual === "manha_energica") {
            pesos.chamadas += 20;
            pesos.piadas += 10;
        }

        // Penalização de Repetição Coletiva
        const ultimaDecisao = estado.historicoDecisoes[estado.historicoDecisoes.length - 1];
        if (ultimaDecisao && pesos[ultimaDecisao]) {
            pesos[ultimaDecisao] = Math.max(0, pesos[ultimaDecisao] - 25);
        }

        // FILTRO SINALIZADOR CRÍTICO: Filtra apenas categorias que REALMENTE possuem arquivos cadastrados
        const categoriasValidas = Object.keys(pesos).filter(cat => 
            CONFIG.categorias[cat] && CONFIG.categorias[cat].length > 0
        );

        if (categoriasValidas.length === 0) return null;

        // Execução da Roleta Viciada Segura
        const somaPesos = categoriasValidas.reduce((soma, cat) => soma + pesos[cat], 0);
        const sorteio = Math.random() * somaPesos;
        let acumulado = 0;

        for (const cat of categoriasValidas) {
            acumulado += pesos[cat];
            if (sorteio <= acumulado) {
                registrarDecisao(cat);
                return cat;
            }
        }
        return categoriasValidas[0];
    };

    const registrarDecisao = (categoria) => {
        estado.historicoDecisoes.push(categoria);
        if (estado.historicoDecisoes.length > 5) estado.historicoDecisoes.shift();
    };

    const obterAudioAleatorio = (categoria) => {
        if (!CONFIG.filasReproducao[categoria] || CONFIG.filasReproducao[categoria].length === 0) {
            const novaFila = [...CONFIG.categorias[categoria]];
            // Embaralhamento Fisher-Yates
            for (let i = novaFila.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [novaFila[i], novaFila[j]] = [novaFila[j], novaFila[i]];
            }
            CONFIG.filasReproducao[categoria] = novaFila;
        }
        return CONFIG.filasReproducao[categoria].pop();
    };

    // ==========================================
    // 🎧 CONTROLE GERENCIAL DE ÁUDIO & UI
    // ==========================================
    const atualizarInterface = (titulo, artista, cover) => {
        if (DOM.trackTitle) DOM.trackTitle.textContent = titulo;
        if (DOM.trackArtist) DOM.trackArtist.textContent = artista;
        if (DOM.albumArt) DOM.albumArt.src = cover || "icon/logo-4mfm.png";
    };

    const restaurarInterfaceOriginal = () => {
        if (typeof playlist === 'undefined') return;
        const currentIndex = localStorage.getItem('4mfm_last_index');
        
        if (currentIndex !== null && playlist[currentIndex]) {
            const track = playlist[currentIndex];
            atualizarInterface(track.title, track.artist, track.cover);
        }
    };

    const tocarAudioVoz = (src, callback, options = { isHoraCerta: false }) => {
        if (!src || src === CONFIG.baseFolder) return callback();

        estado.estaFalando = true;
        const camillaAudio = new Audio(src);
        camillaAudio.volume = 1.0;
        
        const musicaPrincipal = window.currentAudio;
        let watchdogTimeout;

        const finalizarLocucaoCompleta = () => {
            if (estado.estaFalando) {
                estado.estaFalando = false;
                clearTimeout(watchdogTimeout);
                
                // Desvincula eventos para evitar vazamento de memória
                camillaAudio.pause();
                camillaAudio.src = "";
                camillaAudio.load();

                if (callback) callback();
            }
        };

        // Watchdog Preventivo Atualizado (Evita travamentos em buffers corrompidos)
        camillaAudio.addEventListener('loadedmetadata', () => {
            const tempoSeguro = (camillaAudio.duration * 1000) + 3000;
            watchdogTimeout = setTimeout(() => {
                console.warn("🚨 [Watchdog] Camilla travou em buffer. Forçando restauração da programação.");
                finalizarLocucaoCompleta();
            }, tempoSeguro);
        });

        camillaAudio.addEventListener('error', () => {
            console.error("❌ Módulo Camilla: Falha ao carregar arquivo de voz ->", src);
            finalizarLocucaoCompleta();
        });

        const dispararFluxoDeVoz = () => {
            camillaAudio.play()
                .then(() => {
                    if (window.ToastSystem && !options.isHoraCerta) {
                        window.ToastSystem.show("🎙️ No Ar: Camilla", "Intervenção e locução ao vivo.", "info", 4000);
                    }
                })
                .catch(e => {
                    console.warn("⚠️ Autoplay de voz impedido pelo navegador.", e);
                    finalizarLocucaoCompleta();
                });
        };

        // Integração suave com a música de fundo usando o fadeAudio do motor principal
        if (musicaPrincipal && !musicaPrincipal.paused) {
            if (window.fadeAudio) window.fadeAudio(musicaPrincipal, 0.0, 600);
            else musicaPrincipal.volume = 0;
            
            setTimeout(() => {
                try { musicaPrincipal.pause(); } catch(err) {}
                dispararFluxoDeVoz();
            }, 610);
        } else {
            dispararFluxoDeVoz();
        }

        camillaAudio.addEventListener('ended', () => {
            if (options.isHoraCerta && musicaPrincipal) {
                musicaPrincipal.play()
                    .then(() => {
                        if (window.fadeAudio) window.fadeAudio(musicaPrincipal, 1.0, 1500);
                        else musicaPrincipal.volume = 1;
                    })
                    .catch(() => {});
            }
            finalizarLocucaoCompleta();
        });
    };

    // ==========================================
    // ⏱️ GATILHOS TEMPORAIS (HORA CERTA)
    // ==========================================
    const anunciarHoraCertaAoVivo = (hora) => {
        const horaFormatada = String(hora).padStart(2, '0');
        const caminhoCompleto = `${CONFIG.baseFolder}Horas/${horaFormatada}_horas.mp3`;

        atualizarInterface(`Hora Certa: ${horaFormatada}:00 ⏰`, "A Hora é Agora!", "icon/logo-4mfm.png");
        if (window.ToastSystem) window.ToastSystem.show("⏰ Hora Certa", `${horaFormatada}:00h`, "default");

        tocarAudioVoz(caminhoCompleto, () => {
            restaurarInterfaceOriginal();
        }, { isHoraCerta: true });
    };

    const iniciarMonitorDeHoraCerta = () => {
        // Intervalo inteligente rodando a cada 10 segundos (reduz overhead de CPU do cliente)
        setInterval(() => {
            const agora = new Date();
            const hora = agora.getHours();
            const minuto = agora.getMinutes();
            
            const playerAtivo = window.currentAudio;
            const radioTocando = playerAtivo && !playerAtivo.paused;

            if (minuto === 0 && estado.ultimaHoraAnunciada !== hora && radioTocando) {
                if (!estado.estaFalando && !window.RadioApp?.state?.isCrossfading) {
                    estado.ultimaHoraAnunciada = hora;
                    estado.contadorMusicas = 0; 
                    anunciarHoraCertaAoVivo(hora);
                }
            }
        }, 10000); 
    };

    const executarAcaoDeIntervencao = (categoria, callbackOriginal) => {
        const arquivoSorteado = obterAudioAleatorio(categoria);
        if (!arquivoSorteado) return callbackOriginal();

        const caminhoCompleto = CONFIG.baseFolder + arquivoSorteado;
        const mensagemSorteada = CONFIG.mensagensDisplay[Math.floor(Math.random() * CONFIG.mensagensDisplay.length)];
        
        atualizarInterface(mensagemSorteada, "4MFM RADIO", "icon/logo-4mfm.png");
        tocarAudioVoz(caminhoCompleto, callbackOriginal, { isHoraCerta: false });
    };

    const verificarIntervencao = (callback) => {
        if (typeof callback !== 'function') return;
        if (estado.estaFalando) return callback();

        estado.contadorMusicas++;

        const chanceFalar = estado.vibeAtual === "madrugada_calma" ? 0.12 : 0.25;
        const deveIntervir = (estado.contadorMusicas >= estado.frequenciaAnuncio) || (Math.random() <= chanceFalar);

        if (deveIntervir) {
            const categoriaEscolhida = analisarContexto();
            
            if (categoriaEscolhida) {
                if (categoriaEscolhida === "anuncios") estado.contadorMusicas = 0;
                return executarAcaoDeIntervencao(categoriaEscolhida, callback);
            }
        }
        
        callback(); 
    };

    // Inicialização do fluxo assíncrono do relógio
    iniciarMonitorDeHoraCerta();
    console.log("🧠 [4MFM Camilla AI] Processamento cognitivo sincronizado.");

    // ==========================================
    // 🚀 EXPOSIÇÃO DA API E PONTE COMPATÍVEL
    // ==========================================
    return {
        verificar: verificarIntervencao,
        dev: {
            forcarAudio: (categoria, cb) => executarAcaoDeIntervencao(categoria, cb || (() => {})),
            forcarHora: (h) => anunciarHoraCertaAoVivo(h),
            pensar: analisarContexto
        }
    };
})();

// 🧲 PONTE DE CONEXÃO: Cria o link perfeito com a escuta de transição do script.js
window.verificarIntervencaoDaAnne = CamillaSystem.verificar;
