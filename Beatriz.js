const BeatrizConfig = {
    baseFolder: "Beatriz/", 
    categorias: {
        anuncios: [""],
        falas: ["A_Marca_no_Ar.mp3", "Comunidade_4MFM.mp3", "Máquina_do_Tempo.mp3"],
        vinhetas: ["Bia_no_Feed.mp3", "Sua_Musica_na_Virine.mp3"]
    },
    chanceIntervencao: 0.3, 
    contadorMusicas: 12,
    frequenciaAnuncio: 5    
};

function verificarIntervencaoDaBeatriz(callback) {
    BeatrizConfig.contadorMusicas++;
    const sorteio = Math.random();
    
    // Captura o que está escrito agora para poder restaurar depois
    const tituloOriginal = document.getElementById('track').textContent;
    const artistaOriginal = document.getElementById('artist').textContent;

    const restaurarTela = () => {
        document.getElementById('track').textContent = tituloOriginal;
        document.getElementById('artist').textContent = artistaOriginal;
        callback(); // Volta a tocar a música
    };

    if (BeatrizConfig.contadorMusicas >= BeatrizConfig.frequenciaAnuncio) {
        BeatrizConfig.contadorMusicas = 0;
        return executarAudioIA("anuncios", restaurarTela);
    } 
    
    if (sorteio <= BeatrizConfig.chanceIntervencao) {
        const tipo = Math.random() > 0.5 ? "falas" : "vinhetas";
        return executarAudioIA(tipo, restaurarTela);
    } 
    
    callback();
}

function executarAudioIA(categoria, callback) {
    const lista = BeatrizConfig.categorias[categoria];
    if (!lista || lista.length === 0) return callback();

    const arquivoAleatorio = lista[Math.floor(Math.random() * lista.length)];
    const caminhoCompleto = BeatrizConfig.baseFolder + arquivoAleatorio;

    // Muda o texto na tela ANTES de começar o áudio
    document.getElementById('track').textContent = "Bia na Voz! 🎙️";
    document.getElementById('artist').textContent = "4MFM RADIO";

    tocarAudioFinal(caminhoCompleto, callback);
}

function tocarAudioFinal(src, callback) {
    if (src === BeatrizConfig.baseFolder || !src) return callback();

    const audio = new Audio(src);
    
    // Notificação visual (opcional, já que agora aparece no player)
    if (window.showNotification) {
        window.showNotification("Bia na Voz! 🎙️", "Sintonizada na 4MFM...", "info");
    }

    audio.onended = () => callback();
    
    audio.onerror = () => {
        console.error("❌ Erro no áudio da Bia:", src);
        setTimeout(callback, 500); 
    };

    audio.play().catch((e) => {
        console.warn("⚠️ Autoplay bloqueado!");
        setTimeout(callback, 1000);
    });
}

window.verificarIntervencaoDaBeatriz = verificarIntervencaoDaBeatriz;