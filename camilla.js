const CamillaSystem = (() => {
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
            extra: ["Extra/dilema.mp3", "Extra/escritorio.mp3", "Extra/flashback.mp3"],
            piadas: [],
            // 📅 NOVAS CATEGORIAS: Dias da Semana
            domingo: ["Dias/Domingo/domingo_manha.mp3", "Dias/Domingo/domingo_tarde.mp3"],
            segunda: ["Dias/Segunda/segunda_motiva.mp3"],
            terca: ["Dias/Terça/terca_foco.mp3"],
            quarta: ["Dias/Quarta/quarta_respiro.mp3"],
            quinta: ["Dias/Quinta/quinta_previsao.mp3"],
            sexta: ["Dias/Sexta/fds_sextou.mp3", "Dias/Sexta/sexta_liberdade.mp3"],
            sabado: ["Dias/Sabado/sabado_manha.mp3", "Dias/Sabado/sabado_noite.mp3"]
        },
        mensagensDisplay: [
            "🎙️ Camilla na Área!", "✨ Camilla invadindo a rádio!",
            "🗣️ Só um recadinho da Camilla...", "🎧 Aumenta o som, a Camilla chegou!",
            "🚀 Dando aquele pause com a Camilla!", "📻 Troca de ideia com a Camilla!"
        ],
        // Inicializando as filas do dia da semana também
        filasReproducao: { 
            chamadas: [], descontraida: [], extra: [], piadas: [],
            domingo: [], segunda: [], terca: [], quarta: [], quinta: [], sexta: [], sabado: []
        }
    };

    const estado = {
        contadorMusicas: 0,
        frequenciaAnuncio: 2, 
        estaFalando: false,
        ultimaHoraAnunciada: new Date().getHours(),
        vibeAtual: "neutra",
        historicoDecisoes: []
    };

    const DOM = {
        track: document.getElementById('track'),
        artist: document.getElementById('artist'),
        albumArt: document.getElementById('albumArt')
    };

    // ==========================================
    // ⚙️ INTELIGÊNCIA COGNITIVA (TOMADA DE DECISÃO)
    // ==========================================
    const analisarContexto = () => {
        const agora = new Date();
        const hora = agora.getHours();
        const diaSemana = agora.getDay(); 
        
        // Mapeamento do número (0 a 6) para a string exata da nossa configuração
        const nomesDias = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
        const diaAtual = nomesDias[diaSemana];

        if (hora >= 0 && hora < 6) estado.vibeAtual = "madrugada_calma";
        else if (hora >= 6 && hora < 12) estado.vibeAtual = "manha_energica";
        else if (hora >= 18 || diaSemana === 0 || diaSemana === 6) estado.vibeAtual = "descontraida_alta";
        else estado.vibeAtual = "comercial_focada";

        if (estado.contadorMusicas >= estado.frequenciaAnuncio && CONFIG.categorias.extra.length > 0) {
            return "extra";
        }

        const pesos = { chamadas: 15, descontraida: 40, piadas: 20 };
        
        // 📅 Injeta a chance da Camilla falar algo específico sobre o dia de hoje
        pesos[diaAtual] = 30; // Peso razoável para ela comentar do dia

        if (estado.vibeAtual === "madrugada_calma") {
            pesos.descontraida += 30;
            pesos.piadas = 0; 
        } else if (estado.vibeAtual === "manha_energica") {
            pesos.chamadas += 20;
            pesos.piadas += 10;
            if (diaAtual === "segunda") pesos[diaAtual] += 20; // Segunda de manhã ela reclama mais!
        } else if (estado.vibeAtual === "descontraida_alta") {
            if (diaAtual === "sexta") pesos[diaAtual] += 30; // Aumenta chance de gritar SEXTOU de noite
        }

        const ultimaDecisao = estado.historicoDecisoes[estado.historicoDecisoes.length - 1];
        if (ultimaDecisao && pesos[ultimaDecisao]) {
            pesos[ultimaDecisao] = Math.max(0, pesos[ultimaDecisao] - 25);
        }

        const categoriasValidas = Object.keys(pesos).filter(cat => 
            CONFIG.categorias[cat] && CONFIG.categorias[cat].length > 0
        );

        if (categoriasValidas.length === 0) return null;

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
            for (let i = novaFila.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [novaFila[i], novaFila[j]] = [novaFila[j], novaFila[i]];
            }
            CONFIG.filasReproducao[categoria] = novaFila;
        }
        return CONFIG.filasReproducao[categoria].pop();
    };

    // ==========================================
    // 🎧 CONTROLE GERENCIAL DE ÁUDIO & UI ORGÂNICA
    // ==========================================
    const transicaoSuave = (elemento, novoValor, isImage = false, tempoFade = 500) => {
        if (!elemento) return;
        
        elemento.style.transition = `opacity ${tempoFade}ms ease-in-out`;
        elemento.style.opacity = 0; 
        
        setTimeout(() => {
            if (isImage) {
                if (!elemento.src.includes(novoValor)) {
                    elemento.src = novoValor;
                }
            } else {
                elemento.textContent = novoValor;
            }
            elemento.style.opacity = 1; 
        }, tempoFade); 
    };

    const atualizarInterface = (titulo, artista, cover) => {
        transicaoSuave(DOM.track, titulo, false, 500);
        transicaoSuave(DOM.artist, artista, false, 500);
        transicaoSuave(DOM.albumArt, cover || "icon/logo-4mfm.png", true, 500);
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
                
                camillaAudio.pause();
                camillaAudio.src = "";
                camillaAudio.load();

                if (callback) callback();
            }
        };

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
                    if (window.showNotification && !options.isHoraCerta) {
                        window.showNotification("🎙️ No Ar: Camilla", "Intervenção e locução ao vivo.", "info");
                    }
                })
                .catch(e => {
                    console.warn("⚠️ Autoplay de voz impedido pelo navegador.", e);
                    finalizarLocucaoCompleta();
                });
        };

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

        atualizarInterface(`Hora Certa: ${horaFormatada}:00 ⏰`, "Ao Vivo - 4MFM", "icon/logo-4mfm.png");
        if (window.showNotification) window.showNotification("⏰ Hora Certa", `${horaFormatada}:00h`, "info");

        tocarAudioVoz(caminhoCompleto, () => {
            restaurarInterfaceOriginal();
        }, { isHoraCerta: true });
    };

    const iniciarMonitorDeHoraCerta = () => {
        setInterval(() => {
            const agora = new Date();
            const hora = agora.getHours();
            const minuto = agora.getMinutes();
            
            const playerAtivo = window.currentAudio;
            const radioTocando = playerAtivo && !playerAtivo.paused;

            if (minuto === 0 && estado.ultimaHoraAnunciada !== hora && radioTocando) {
                const emCrossfade = window.appState ? window.appState.isCrossfading : false;

                if (!estado.estaFalando && !emCrossfade) {
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
        
        atualizarInterface(mensagemSorteada, "🔴 No Ar: Camilla", "icon/logo-4mfm.png");
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
                if (categoriaEscolhida === "extra") estado.contadorMusicas = 0;
                return executarAcaoDeIntervencao(categoriaEscolhida, callback);
            }
        }
        
        callback(); 
    };

    iniciarMonitorDeHoraCerta();
    console.log("🧠 [4MFM Camilla AI] Processamento cognitivo sincronizado com UI fluida.");

    return {
        verificar: verificarIntervencao,
        dev: {
            forcarAudio: (categoria, cb) => executarAcaoDeIntervencao(categoria, cb || (() => {})),
            forcarHora: (h) => anunciarHoraCertaAoVivo(h),
            pensar: analisarContexto
        }
    };
})();

window.verificarIntervencaoDaCamilla = CamillaSystem.verificar;