window.colocarComoProximaNaFila = function(nomeDaMusica) {
    // Validação de segurança básica
    if (typeof playlist === 'undefined' || !nomeDaMusica) return false;
    
    // Normaliza a string de busca (tudo minúsculo e sem espaços extras nas pontas)
    const buscaNormalizada = nomeDaMusica.toLowerCase().trim();
    
    // Procura a música na playlist original com comparação flexível
    const index = playlist.findIndex(m => 
        `${m.artist} - ${m.title}`.toLowerCase() === buscaNormalizada
    );
    
    if (index !== -1) {
        // Se ela já estiver na fila, remove da posição atual (evita duplicatas)
        appState.filaReproducao = appState.filaReproducao.filter(i => i !== index);
        
        // Fura a fila: coloca a música no topo (posição 0) para tocar em seguida!
        appState.filaReproducao.unshift(index);
        
        console.log(`🎧 [Controle de Fila] Camilla adicionou "${playlist[index].title}" como a próxima da fila!`);
        
        // Dispara um Toast discreto (se o ToastSystem estiver carregado)
        if (window.showNotification) {
            window.showNotification("A pedido da Camilla 🎙️", `Próxima: ${playlist[index].title}`, "info");
        }

        return true; // Retorna sucesso caso o brain.js queira confirmar
    } else {
        console.warn(`⚠️ [Controle de Fila] Camilla pediu "${nomeDaMusica}", mas a música não foi encontrada no catálogo.`);
        return false; // Retorna falha caso a música não exista
    }
};