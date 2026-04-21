/* ============================================================
   SISTEMA DE LOCUÇÃO IA - Anne
   ============================================================ */

const AnneConfig = {
    baseFolder: "Anne/",  
    categorias: {
        anuncios: [], // Removido string vazia para evitar erros
        falas: [
            "anne_fala_bastidores.mp3", "anne_fala_conexao_insta.mp3", 
            "anne_fala_curadoria.mp3", "anne_fala_escolha.mp3", 
            "anne_fala_tempo_clima.mp3", "anne_papo_conselho.mp3", 
            "anne_papo_nostalgia.mp3"
        ],
        vinhetas: [
            "anne_publico_pedido.mp3", "anne_vinheta_assinatura.mp3", 
            "anne_vinheta_essencial.mp3", "anne_vinheta_presenca.mp3", 
            "anne_vingeta_slogab.mp3"
        ]
    },
    chanceIntervencao: 0.1, 
    contadorMusicas: 0, // Zerei aqui para a contagem ficar certinha
    frequenciaAnuncio: 0,
    estaFalando: false // CORRIGIDO: Agora ela começa calada, esperando a vez dela!
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
    if (AnneConfig.contadorMusicas >= AnneConfig.frequenciaAnuncio) {
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
            // Validação caso uma categoria esteja vazia
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
    audioIA.volume = 0.9; // Levemente mais baixo que a música para soar natural

    if (window.showNotification) {
        window.showNotification("Anne no Ar", "Momento de interação na 4MFM...", "info");
    }

    audioIA.onended = () => {
        setTimeout(finalizarEChamarCallback, 500); 
    };
    
    audioIA.onerror = (err) => {
        console.error("❌ Erro ao carregar voz da Anne:", src);
        finalizarEChamarCallback();
    };

    // Função de segurança para garantir que o status resete
    const finalizarEChamarCallback = () => {
        AnneConfig.estaFalando = false;
        callback();
    }

    // Tenta dar o play (respeitando políticas de autoplay)
    audioIA.play().catch((e) => {
        console.warn("⚠️ Autoplay da Anne bloqueado pelo navegador.");
        finalizarEChamarCallback();
    });
}

// Expõe a função para o script principal
window.verificarIntervencaoDaAnne = verificarIntervencaoDaAnne;