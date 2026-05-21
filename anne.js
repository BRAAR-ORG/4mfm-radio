const AnneConfig = {
    baseFolder: "Anne/",  
    categorias: {
        anuncios: ["Anuncio_Anne_Curadoria_4M.mp3", "Anuncio_Anne_Estilo_Unico.mp3", "Anuncio_Anne_Refugio_Sonoro.mp3", "Anuncio_Anne_Elevando_O_Padrao.mp3",  "Anuncio_Anne_Brasil_Conectado.mp3",
            "Anuncio_Anne_Convite_Instagram.mp3", "Fala_Anne_Sugestao_Musical.mp3", "Fala_Anne_Comunidade_Nacional.mp3"],
        falas: ["Fala_Anne_Pausa_Necessaria.mp3", "Fala_Anne_Conexao_Visual.mp3", "Fala_Anne_Momento_Presente.mp3", "Fala_Anne_Sintonia_Fina.mp3", "Fala_Anne_Escolha_Consciente.mp3"],
        vinhetas: ["Vinheta_Anne_4MFM_Assinatura.mp3", "Vinheta_Anne_Minimalista.mp3", "Vinheta_Anne_Identidade_Visual.mp3", "Vinheta_Anne_Social_Media.mp3", "Vinheta_Anne_Brasil_4M.mp3"]
    },
    chanceIntervencao: 0.2, 
    contadorMusicas: 0,
    frequenciaAnuncio: 2,
    estaFalando: false 
};

/**
 * Verifica se é o momento da Anne intervir na programação
 * @param {Function} callback - Função para tocar a próxima música
 */
function verificarIntervencaoDaAnne(callback) {
    if (AnneConfig.estaFalando) return callback();

    AnneConfig.contadorMusicas++;
    const sorteio = Math.random();
    
    // Captura os elementos de texto da interface
    const trackEl = document.getElementById('track');
    const artistEl = document.getElementById('artist');
    const tituloOriginal = trackEl ? trackEl.textContent : "";
    const artistaOriginal = artistEl ? artistEl.textContent : "";

    // Função interna para limpar a tela e seguir a programação
    const finalizarIntervencao = () => {
        AnneConfig.estaFalando = false;
        if (trackEl) trackEl.textContent = tituloOriginal;
        if (artistEl) artistEl.textContent = artistaOriginal;
        callback(); 
    };

    // 1. Prioridade Máxima: Anúncios por frequência
    if (AnneConfig.frequenciaAnuncio > 0 && AnneConfig.contadorMusicas >= AnneConfig.frequenciaAnuncio) {
        if (AnneConfig.categorias.anuncios.length > 0) {
            AnneConfig.contadorMusicas = 0;
            return executarAudioIA("anuncios", finalizarIntervencao);
        }
    } 
    
    // 2. Chance aleatória de falas ou vinhetas
    if (sorteio <= AnneConfig.chanceIntervencao) {
        const temFalas = AnneConfig.categorias.falas.length > 0;
        const temVinhetas = AnneConfig.categorias.vinhetas.length > 0;

        if (temFalas || temVinhetas) {
            const tipo = Math.random() > 0.5 ? "falas" : "vinhetas";
            const tipoFinal = AnneConfig.categorias[tipo].length > 0 ? tipo : (tipo === "falas" ? "vinhetas" : "falas");
            
            return executarAudioIA(tipoFinal, finalizarIntervencao);
        }
    } 
    
    // Se nada foi sorteado, segue a música
    callback();
}

/**
 * Seleciona e prepara o áudio da IA
 */
function executarAudioIA(categoria, callback) {
    const lista = AnneConfig.categorias[categoria];
    if (!lista || lista.length === 0) return callback();

    const arquivoAleatorio = lista[Math.floor(Math.random() * lista.length)];
    const caminhoCompleto = AnneConfig.baseFolder + arquivoAleatorio;

    // Interface: Indica que a Anne está no ar
    const trackEl = document.getElementById('track');
    const artistEl = document.getElementById('artist');
    
    if (trackEl) trackEl.textContent = "Anne na Voz! 🎙️";
    if (artistEl) artistEl.textContent = "4MFM RADIO";

    tocarAudioFinal(caminhoCompleto, callback);
}

/**
 * Gerencia o objeto de áudio e eventos de finalização
 */
function tocarAudioFinal(src, callback) {
    if (!src || src === AnneConfig.baseFolder) return callback();

    AnneConfig.estaFalando = true;
    const audioIA = new Audio(src);
    audioIA.volume = 0.9; 

    if (window.showNotification) {
        window.showNotification("Anne no Ar", "Momento de interação na 4MFM...", "info");
    }

    // Função de segurança para garantir que o status resete
    const finalizarEChamarCallback = () => {
        AnneConfig.estaFalando = false;
        callback();
    }

    audioIA.onended = () => {
        setTimeout(finalizarEChamarCallback, 500); 
    };
    
    audioIA.onerror = (err) => {
        console.error("❌ Erro ao carregar voz da Anne:", src);
        finalizarEChamarCallback();
    };

    // Tenta dar o play (respeitando políticas de autoplay)
    audioIA.play().catch((e) => {
        console.warn("⚠️ Autoplay da Anne bloqueado pelo navegador.");
        finalizarEChamarCallback();
    });
}

// Expõe a função para o script principal
window.verificarIntervencaoDaAnne = verificarIntervencaoDaAnne;
