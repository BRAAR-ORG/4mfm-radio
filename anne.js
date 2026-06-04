(() => {
    const AnneConfig = {
        baseFolder: "Anne/",  
        categorias: {
            anuncios: [
                "Anuncio/Anuncio_Anne_Curadoria_4M.mp3", 
                "Anuncio/Anuncio_Anne_Estilo_Unico.mp3", 
                "Anuncio/Anuncio_Anne_Refugio_Sonoro.mp3", 
                "Anuncio/Anuncio_Anne_Elevando_O_Padrao.mp3", 
                "Anuncio/Anuncio_Anne_Brasil_Conectado.mp3",
                "Anuncio/Anuncio_Anne_Convite_Instagram.mp3", 
                "Fala/Fala_Anne_Sugestao_Musical.mp3", 
                "Fala/Fala_Anne_Comunidade_Nacional.mp3"
            ],
            falas: [
                "Fala/Fala_Anne_Pausa_Necessaria.mp3", 
                "Fala/Fala_Anne_Conexao_Visual.mp3", 
                "Fala/Fala_Anne_Momento_Presente.mp3", 
                "Fala/Fala_Anne_Sintonia_Fina.mp3", 
                "Fala/Fala_Anne_Escolha_Consciente.mp3"
            ],
            vinhetas: [
                "Vinheta/Vinheta_Anne_4MFM_Assinatura.mp3", 
                "Vinheta/Vinheta_Anne_Minimalista.mp3", 
                "Vinheta/Vinheta_Anne_Identidade_Visual.mp3", 
                "Vinheta/Vinheta_Anne_Social_Media.mp3", 
                "Vinheta/Vinheta_Anne_Brasil_4M.mp3"
            ]
        },
        
        // NOVO: Filas de reprodução que garantem zero repetições até zerar o ciclo
        filasReproducao: {
            anuncios: [],
            falas: [],
            vinhetas: []
        },

        chanceIntervencao: 0.3, 
        contadorMusicas: 0,
        frequenciaAnuncio: 3,
        estaFalando: false,
        ultimaHoraAnunciada: new Date().getHours() 
    };

    // Cache interno de elementos do DOM
    const DOM = {
        track: document.getElementById('track'),
        artist: document.getElementById('artist'),
        albumArt: document.getElementById('albumArt')
    };

    /**
     * Motor de Fade de alta performance
     */
    function executarFadeSeguro(audioElement, volumeAlvo, duracao = 1000) {
        if (!audioElement) return;
        
        if (typeof window.fadeAudio === 'function') {
            window.fadeAudio(audioElement, volumeAlvo, duracao);
            return;
        }

        const startVolume = audioElement.volume;
        const change = volumeAlvo - startVolume;
        const startTime = performance.now();

        function animateFade(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duracao, 1);
            
            audioElement.volume = startVolume + (change * progress);

            if (progress < 1) {
                requestAnimationFrame(animateFade);
            } else {
                audioElement.volume = volumeAlvo;
            }
        }
        requestAnimationFrame(animateFade);
    }

    /**
     * Restaura dinamicamente a interface para a música atual
     */
    function restaurarInterfaceOriginal() {
        if (typeof playlist === 'undefined') return;
        
        const currentIndex = localStorage.getItem('4mfm_last_index');
        if (currentIndex !== null && playlist[currentIndex]) {
            const track = playlist[currentIndex];
            if (DOM.track) DOM.track.textContent = track.title;
            if (DOM.artist) DOM.artist.textContent = track.artist;
            if (DOM.albumArt) DOM.albumArt.src = track.cover || "icon/logo-4mfm.png";
        }
    }

    /**
     * Dispara a Hora Certa (Acontece no meio de uma música)
     */
    function executarHoraCertaAoVivo(hora) {
        const horaFormatada = String(hora).padStart(2, '0');
        const caminhoCompleto = `${AnneConfig.baseFolder}Horas/Hora_Anne_${horaFormatada}h.mp3`;

        // Troca o visual para a Anne
        if (DOM.track) DOM.track.textContent = `Hora Certa: ${horaFormatada}:00 ⏰`;
        if (DOM.artist) DOM.artist.textContent = "Anne Locutora IA";
        if (DOM.albumArt) DOM.albumArt.src = "icon/logo-4mfm.png"; 

        console.log(`⏰ [Ao Vivo] Interrompendo a rádio para a Hora Certa: ${horaFormatada}h`);

        // O "true" no final avisa a função que, ao terminar, a música que pausamos DEVE voltar a tocar
        tocarAudioFinal(caminhoCompleto, () => {
            restaurarInterfaceOriginal();
        }, true);
    }

    // =======================================================================
    // RELÓGIO DE ESTÚDIO (Checa virada de hora)
    // =======================================================================
    setInterval(() => {
        const agora = new Date();
        const hora = agora.getHours();
        const minuto = agora.getMinutes();

        // Evita que a hora certa dispare se a rádio estiver parada/mutada pelo usuário
        const radioTocando = window.currentAudio && !window.currentAudio.paused;

        if (minuto === 0 && AnneConfig.ultimaHoraAnunciada !== hora && radioTocando) {
            if (!AnneConfig.estaFalando) {
                AnneConfig.ultimaHoraAnunciada = hora; 
                AnneConfig.contadorMusicas = 0; 
                executarHoraCertaAoVivo(hora);
            }
        }
    }, 1000);

    /**
     * Ponto de entrada de eventos: Decide se a Anne fala entre as faixas
     */
    window.verificarIntervencaoDaAnne = function(callback) {
        if (typeof callback !== 'function') return;

        if (AnneConfig.estaFalando) return callback();

        AnneConfig.contadorMusicas++;
        
        // 1. Anúncios
        if (AnneConfig.frequenciaAnuncio > 0 && AnneConfig.contadorMusicas >= AnneConfig.frequenciaAnuncio) {
            if (AnneConfig.categorias.anuncios.length > 0) {
                AnneConfig.contadorMusicas = 0; 
                return executarAudioIA("anuncios", callback);
            }
        } 
        
        // 2. Vinhetas e Falas
        if (Math.random() <= AnneConfig.chanceIntervencao) {
            const temFalas = AnneConfig.categorias.falas.length > 0;
            const temVinhetas = AnneConfig.categorias.vinhetas.length > 0;

            if (temFalas || temVinhetas) {
                let tipo = Math.random() > 0.5 ? "falas" : "vinhetas";
                if (AnneConfig.categorias[tipo].length === 0) {
                    tipo = tipo === "falas" ? "vinhetas" : "falas";
                }
                return executarAudioIA(tipo, callback);
            }
        } 
        
        callback(); // Segue sem intervenção
    };

    /**
     * NOVO MOTOR DE SORTEIO: Garante que os áudios nunca se repitam antes de esgotar a lista
     */
    function obterProximoAudioSemRepetir(categoria) {
        const listaOriginal = AnneConfig.categorias[categoria];
        
        // Se a fila atual dessa categoria estiver vazia, cria uma nova fila embaralhada
        if (AnneConfig.filasReproducao[categoria].length === 0) {
            // Cria uma cópia da lista original
            let novaFila = [...listaOriginal];
            
            // Algoritmo de Fisher-Yates para um embaralhamento perfeito
            for (let i = novaFila.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [novaFila[i], novaFila[j]] = [novaFila[j], novaFila[i]];
            }
            
            AnneConfig.filasReproducao[categoria] = novaFila;
        }
        
        // Retira e devolve o último item da fila embaralhada (garantindo a não-repetição)
        return AnneConfig.filasReproducao[categoria].pop();
    }

    /**
     * Escolhe e executa áudio de intervalo de faixas
     */
    function executarAudioIA(categoria, callback) {
        if (!AnneConfig.categorias[categoria] || AnneConfig.categorias[categoria].length === 0) {
            return callback();
        }

        const arquivoSorteado = obterProximoAudioSemRepetir(categoria);
        const caminhoCompleto = AnneConfig.baseFolder + arquivoSorteado;

        if (DOM.track) DOM.track.textContent = "Anne na Voz! 🎙️";
        if (DOM.artist) DOM.artist.textContent = "4MFM RADIO";
        if (DOM.albumArt) DOM.albumArt.src = "icon/logo-4mfm.png"; 

        // O "false" no final indica que, ao terminar, chamaremos a PRÓXIMA música (não retoma a antiga)
        tocarAudioFinal(caminhoCompleto, callback, false);
    }

    /**
     * 🛑 GERENCIADOR FÍSICO COM PAUSA ABSOLUTA DA MÚSICA 
     */
    function tocarAudioFinal(src, callback, isHoraCerta = false) {
        if (!src || src === AnneConfig.baseFolder) return callback();

        AnneConfig.estaFalando = true;
        
        const anneAudio = new Audio(src);
        anneAudio.volume = 1.0; 

        const musicaPrincipal = window.currentAudio || document.getElementById('audio'); 

        // 🛡️ NOVO: Interceptador de Erro 404 (Arquivo faltando)
        anneAudio.onerror = () => {
            console.error(`❌ Erro 404: O arquivo de áudio da Anne não foi encontrado: ${src}`);
            AnneConfig.estaFalando = false;
            
            // Devolve a música (se for hora certa) ou pula pra próxima
            if (isHoraCerta && musicaPrincipal) {
                musicaPrincipal.play().then(() => executarFadeSeguro(musicaPrincipal, 1.0, 300));
            }
            if (callback) callback();
        };
        
        // Função interna que dá o play na Anne
        const iniciarVozAnne = () => {
            // Só tenta dar o play se não deu erro no carregamento
            if (anneAudio.error) return; 

            anneAudio.play().catch(e => {
                console.warn("⚠️ Navegador bloqueou o áudio da Anne.", e);
                AnneConfig.estaFalando = false;
                
                if (musicaPrincipal && isHoraCerta) {
                    musicaPrincipal.play();
                    executarFadeSeguro(musicaPrincipal, 1.0, 300);
                }
                if (callback) callback();
            });
        };

        // LÓGICA DE PAUSA DA MÚSICA
        if (musicaPrincipal && !musicaPrincipal.paused) {
            executarFadeSeguro(musicaPrincipal, 0.0, 500); 
            
            setTimeout(() => {
                musicaPrincipal.pause(); 
                iniciarVozAnne();
            }, 510);
        } else {
            iniciarVozAnne(); 
        }

        // QUANDO A ANNE TERMINA DE FALAR:
        anneAudio.onended = () => {
            AnneConfig.estaFalando = false; 

            if (isHoraCerta) {
                const musicaRetorno = window.currentAudio || document.getElementById('audio');
                if (musicaRetorno) {
                    musicaRetorno.play().then(() => {
                        executarFadeSeguro(musicaRetorno, 1.0, 1000); 
                    }).catch(e => console.warn("⚠️ Navegador bloqueou retorno da música.", e));
                }
            }

            setTimeout(() => {
                anneAudio.onended = null; 
                if (callback) callback(); 
            }, 300); 
        };
    }

    window.getContextoHorario = function() {
        const hora = new Date().getHours();
        if (hora >= 5 && hora < 12) return "bomDia";
        if (hora >= 12 && hora < 18) return "boaTarde";
        return "boaNoite";
    };

// Cole isto logo antes do último });() do script da Anne
    window.devAnneBridge = {
        config: AnneConfig,
        forcarAudio: (categoria, cb) => executarAudioIA(categoria, cb || (() => {})),
        forcarHora: (h) => executarHoraCertaAoVivo(h)
    };

})();
