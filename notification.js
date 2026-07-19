const ToastSystem = (() => {
    let container = null;

    const ensureContainer = () => {
        container = document.getElementById('4mfm-toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = '4mfm-toast-container';
            container.className = 'toast-container';
            container.setAttribute('aria-live', 'polite'); // Acessibilidade para leitores de tela
            document.body.appendChild(container);
        }
        return container;
    };

    /**
     * Exibe uma notificação toast customizável na tela de forma assíncrona.
     * @param {string} title - O título em destaque na notificação
     * @param {string} message - O corpo explicativo do texto
     * @param {string} type - "default" | "success" | "info" | "warning" | "error"
     * @param {number} duration - Tempo de permanência em milissegundos
     */
    const show = (title, message, type = 'default', duration = 4000) => {
        const toastContainer = ensureContainer();
        const toast = document.createElement('div');
        
        // Aplica a classe base e a variação de tema (se houver)
        toast.className = `toast ${type !== 'default' ? `toast--${type}` : ''}`;
        toast.setAttribute('role', 'status');

        // Mapeamento semântico de ícones (FontAwesome)
        let iconClass = 'fas fa-bell';
        if (type === 'success') iconClass = 'fas fa-check-circle';
        if (type === 'info') iconClass = 'fas fa-music';
        if (type === 'warning') iconClass = 'fas fa-exclamation-triangle';
        if (type === 'error') iconClass = 'fas fa-times-circle';

        // ========================================================
        // CONSTRUÇÃO DO DOM (Padrão BEM, integrado ao style.css)
        // ========================================================
        
        // 1. Cabeçalho (Ícone + Título)
        const header = document.createElement('div');
        header.className = 'toast__header';
        
        const icon = document.createElement('i');
        icon.className = iconClass;
        icon.setAttribute('aria-hidden', 'true');
        
        const titleText = document.createElement('h4');
        titleText.className = 'toast__title';
        titleText.textContent = title;

        header.appendChild(icon);
        header.appendChild(titleText);

        // 2. Mensagem
        const bodyText = document.createElement('p');
        bodyText.className = 'toast__message';
        bodyText.textContent = message;

        // 3. Barra de Progresso
        const progress = document.createElement('div');
        progress.className = 'toast__progress';
        // Sincroniza a animação CSS dinamicamente com o tempo passado no JS
        progress.style.animationDuration = `${duration}ms`;

        // Monta o Toast
        toast.appendChild(header);
        toast.appendChild(bodyText);
        toast.appendChild(progress);

        // Insere no topo da pilha visual de notificações
        toastContainer.prepend(toast);

        // Dispara a animação de entrada de forma ultra suave forçando o reflow
        requestAnimationFrame(() => {
            toast.offsetHeight; // Força renderização síncrona de layout antes da transição
            toast.classList.add('is-visible');
        });

        // Agendamento cronometrado de encerramento e descarte
        setTimeout(() => {
            toast.classList.remove('is-visible');
            
            // Aguarda o término da transição de opacidade/transform para limpar a memória
            toast.addEventListener('transitionend', function handleTransition() {
                toast.removeEventListener('transitionend', handleTransition);
                toast.remove();
                
                // Coleta preventiva de lixo: Se o container esvaziou, limpa o DOM
                if (toastContainer.childElementCount === 0) {
                    toastContainer.remove();
                    container = null;
                }
            });
        }, duration);
    };

    return { show };
})();

// ============================================================
// 🚀 EXPOSIÇÃO DE APIS E ECOSSISTEMA DE PONTES (COMPATIBILIDADE)
// ============================================================

// Ponte 1: Atende ao motor principal e IA (window.ToastSystem.show)
window.ToastSystem = ToastSystem;

// Ponte 2: Atende a arquivos legados ou externos que disparam (window.showNotification)
window.showNotification = function(titulo, mensagem, tipo = "default") {
    // Redireciona a chamada antiga para o motor moderno aplicando uma média padrão saudável de 5000ms
    ToastSystem.show(titulo, mensagem, tipo, 5000);
};