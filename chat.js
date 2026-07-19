let nomeDoUsuario = ""; 

const DOM_CHAT = {
    loginScreen: document.getElementById('loginScreen'),
    chatScreen: document.getElementById('chatScreen'),
    usernameInput: document.getElementById('usernameInput'),
    enterChatBtn: document.getElementById('enterChatBtn'),
    userInput: document.getElementById('userInput'),
    chatBtn: document.querySelector('.chat-btn') || document.getElementById('chatBtn'),
    chatMessages: document.getElementById('chatMessages'),
    activeUsersCount: document.getElementById('activeUsersCount')
};

window.handleLoginKeyPress = function(event) {
    if (event.key === 'Enter') window.entrarNoChat();
};

window.handleChatKeyPress = function(event) {
    if (event.key === 'Enter') window.sendMessage();
};

// ============================================================
// LÓGICA DE OPERAÇÃO DO CHAT
// ============================================================
window.entrarNoChat = function() {
    if (!DOM_CHAT.usernameInput) return;
    const userInput = DOM_CHAT.usernameInput.value.trim();
    
    if (userInput.length < 2) {
        if (window.showNotification) {
            window.showNotification("Aviso", "Digite um nome com pelo menos 2 letras.", "warning");
        } else {
            alert("Por favor, digite um nome válido.");
        }
        return;
    }

    nomeDoUsuario = userInput;
    
    if (DOM_CHAT.loginScreen) DOM_CHAT.loginScreen.style.display = "none";
    if (DOM_CHAT.chatScreen) DOM_CHAT.chatScreen.style.display = "flex";

    window.adicionarMensagemUI("Sistema ⚙️", `Bem-vindo à sala, ${nomeDoUsuario}!`, "tema-sistema", true);

    // 🚀 INICIA O MOTOR DOS BOTS COM O NOME DO USUÁRIO
    if (typeof cerebro !== 'undefined') {
        cerebro.iniciar(nomeDoUsuario);
    }
};

// ============================================================
// ENVIO DE MENSAGENS
// ============================================================
window.sendMessage = function() {
    if (!DOM_CHAT.userInput) return;
    const text = DOM_CHAT.userInput.value.trim();
    if (text === "") return;

    // 1. Exibe a mensagem do usuário no chat
    window.adicionarMensagemUI(nomeDoUsuario || "Você", text, "tema-user");
    
    // 2. Limpa o campo de texto
    DOM_CHAT.userInput.value = "";

    // 3. 🧠 ALIMENTA O CÉREBRO DA IA PARA OS BOTS REAGIREM!
    if (typeof cerebro !== 'undefined') {
        cerebro.processarMensagemUsuario(text);
    }
};

// ============================================================
// EXPORTAÇÃO GLOBAL DE INTERFACES (Front-end Renderer)
// ============================================================
window.adicionarMensagemUI = function(nome, texto, tema, isSystem = false) {
    if (!DOM_CHAT.chatMessages) return;

    const msgDiv = document.createElement('div');
    msgDiv.className = "chat-msg";

    const classeTema = tema ? tema : "tema-padrao";

    // Criação segura de nós DOM para o Autor
    const spanAuthor = document.createElement('span');
    spanAuthor.className = `author ${classeTema}`;
    spanAuthor.textContent = `${nome}: `;

    // Criação do nó de texto com sanitização de injeção HTML e suporte a Markdown básico
    const spanText = document.createElement('span');
    spanText.className = "text";
    
    if (isSystem) {
        spanText.style.fontStyle = "italic";
        spanText.style.opacity = "0.7";
    }

    // 🛡️ SANITIZAÇÃO (Anti-XSS) + PARSER DE NEGRITO
    let textoSeguro = texto
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
        
    // Converte **texto** para <strong>texto</strong> após sanitizar
    textoSeguro = textoSeguro.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    spanText.innerHTML = textoSeguro;

    // Monta o fragmento
    msgDiv.appendChild(spanAuthor);
    msgDiv.appendChild(spanText);
    
    DOM_CHAT.chatMessages.appendChild(msgDiv);
    
    // Scroll suave para a última mensagem
    DOM_CHAT.chatMessages.scrollTop = DOM_CHAT.chatMessages.scrollHeight;
};

window.atualizarContador = function(numeroAtivos) {
    if (DOM_CHAT.activeUsersCount) {
        DOM_CHAT.activeUsersCount.textContent = `${numeroAtivos} pessoas online na sala`;
    }
};

// ============================================================
// 🔌 CONEXÃO DOS BOTÕES DO HTML COM AS FUNÇÕES
// ============================================================
window.addEventListener('load', () => {
    // Liga o botão de entrar na tela de login
    if (DOM_CHAT.enterChatBtn) {
        DOM_CHAT.enterChatBtn.addEventListener('click', window.entrarNoChat);
    }
    
    // Liga o campo de digitar o nome à tecla ENTER
    if (DOM_CHAT.usernameInput) {
        DOM_CHAT.usernameInput.addEventListener('keypress', window.handleLoginKeyPress);
    }
    
    // Liga o botão de enviar no chat
    if (DOM_CHAT.chatBtn) {
        DOM_CHAT.chatBtn.addEventListener('click', window.sendMessage);
    }

    // Liga o campo de digitar mensagem à tecla ENTER
    if (DOM_CHAT.userInput) {
        DOM_CHAT.userInput.addEventListener('keypress', window.handleChatKeyPress);
    }
});