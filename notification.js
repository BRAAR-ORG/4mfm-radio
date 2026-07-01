const ToastSystem = (() => {
    let container = null;

    // Injeção limpa de estilos (Executada uma única vez no ecossistema)
    const injectStyles = () => {
        if (document.getElementById('4mfm-toast-styles')) return;

        const styles = `
        .toast-container {
            position: fixed;
            top: 30px;
            right: 30px;
            z-index: 100000;
            display: flex;
            flex-direction: column;
            gap: 15px;
            pointer-events: none;
        }

        .toast {
            background: rgba(20, 20, 20, 0.85);
            backdrop-filter: blur(15px);
            -webkit-backdrop-filter: blur(15px);
            color: #fff;
            padding: 18px 25px;
            border-radius: 16px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-left: 5px solid #ff3333;
            box-shadow: 0 15px 35px rgba(0,0,0,0.4);
            transform: translateX(130%);
            opacity: 0;
            transition: all 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
            min-width: 280px;
            max-width: 380px;
            pointer-events: auto;
            position: relative;
            overflow: hidden;
        }

        .toast.show {
            transform: translateX(0);
            opacity: 1;
        }

        .toast h4 {
            margin: 0 0 4px 0;
            font-size: 14px;
            color: #ff3333;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 1px;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .toast p {
            margin: 0;
            font-size: 13px;
            opacity: 0.85;
            line-height: 1.5;
            font-weight: 400;
        }

        /* Variações de Cores e Bordas Temáticas */
        .toast.success { border-left-color: #00e676; }
        .toast.success h4 { color: #00e676; }
        .toast.info { border-left-color: #00b0ff; }
        .toast.info h4 { color: #00b0ff; }
        .toast.warning { border-left-color: #ffea00; }
        .toast.warning h4 { color: #ffea00; }

        /* Barra de progresso reativa baseada em CSS Variables */
        .toast::after {
            content: "";
            position: absolute;
            bottom: 0;
            left: 0;
            height: 3px;
            width: 100%;
            background: #ff3333;
            transform-origin: left;
            animation: toastProgress var(--toast-duration, 4000ms) linear forwards;
        }

        .toast.success::after { background: #00e676; }
        .toast.info::after { background: #00b0ff; }
        .toast.warning::after { background: #ffea00; }

        @keyframes toastProgress {
            100% { transform: scaleX(0); }
        }
        `;

        const styleSheet = document.createElement("style");
        styleSheet.id = '4mfm-toast-styles';
        styleSheet.textContent = styles;
        document.head.appendChild(styleSheet);
    };

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
     * @param {string} type - "default" | "success" | "info" | "warning"
     * @param {number} duration - Tempo de permanência em milissegundos
     */
    const show = (title, message, type = 'default', duration = 4000) => {
        const toastContainer = ensureContainer();
        const toast = document.createElement('div');
        
        // Normaliza a classe padrão
        toast.className = `toast ${type !== 'default' ? type : ''}`;
        toast.setAttribute('role', 'status');

        // Passa o tempo exato recebido via JS para a animação do pseudo-elemento CSS
        toast.style.setProperty('--toast-duration', `${duration}ms`);

        // Mapeamento semântico de ícones (FontAwesome)
        let iconClass = 'fas fa-bell';
        if (type === 'success') iconClass = 'fas fa-check-circle';
        if (type === 'info') iconClass = 'fas fa-music';
        if (type === 'warning') iconClass = 'fas fa-exclamation-triangle';

        // Construção segura da árvore DOM para blindagem contra injeção de scripts (XSS)
        const header = document.createElement('h4');
        header.innerHTML = `<i class="${iconClass}" aria-hidden="true"></i> `;
        const titleText = document.createTextNode(title);
        header.appendChild(titleText);

        const bodyText = document.createElement('p');
        bodyText.textContent = message;

        toast.appendChild(header);
        toast.appendChild(bodyText);

        // Insere no topo da pilha visual de notificações
        toastContainer.prepend(toast);

        // Dispara a animação de entrada de forma ultra suave forçando o reflow
        requestAnimationFrame(() => {
            toast.offsetHeight; // Força renderização síncrona de layout antes da transição
            toast.classList.add('show');
        });

        // Agendamento cronometrado de encerramento e descarte
        setTimeout(() => {
            toast.classList.remove('show');
            
            // Aguarda o término da transição de opacidade/transform (500ms) para limpar a memória
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

    // Inicializa os estilos automaticamente na leitura do script
    injectStyles();

    return { show };
})();

// ============================================================
// 🚀 EXPOSIÇÃO DE APIS E ECOSSISTEMA DE PONTES (COMPATIBILIDADE)
// ============================================================

// Ponte 1: Atende ao motor principal e Camilla AI (window.ToastSystem.show)
window.ToastSystem = ToastSystem;

// Ponte 2: Atende a arquivos legados ou externos que disparam (window.showNotification)
window.showNotification = function(titulo, mensagem, tipo = "default") {
    // Redireciona a chamada antiga para o motor moderno aplicando uma média padrão saudável de 5000ms
    ToastSystem.show(titulo, mensagem, tipo, 5000);
};
