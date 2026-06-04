(() => {
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

    /* Variações de Cores e Bordas */
    .toast.success { border-left-color: #00e676; }
    .toast.success h4 { color: #00e676; }
    .toast.info { border-left-color: #00b0ff; }
    .toast.info h4 { color: #00b0ff; }
    .toast.warning { border-left-color: #ffea00; }
    .toast.warning h4 { color: #ffea00; }

    /* Barra de tempo visual animada sincronizada */
    .toast::after {
        content: "";
        position: absolute;
        bottom: 0;
        left: 0;
        height: 3px;
        width: 100%;
        background: #ff3333; /* Cor default */
        transform-origin: left;
        animation: toastProgress 5s linear forwards;
    }

    /* Sincronização da cor da barra com o tipo de notificação */
    .toast.success::after { background: #00e676; }
    .toast.info::after { background: #00b0ff; }
    .toast.warning::after { background: #ffea00; }

    @keyframes toastProgress {
        100% { transform: scaleX(0); }
    }
    `;

    // Injetar Estilos Dinamicamente de forma limpa
    const styleSheet = document.createElement("style");
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);

    /**
     * Exibe uma notificação na tela de forma segura e performática
     * @param {string} titulo - O título da notificação
     * @param {string} mensagem - O corpo do texto
     * @param {string} tipo - "default", "success", "info" ou "warning"
     */
    window.showNotification = function(titulo, mensagem, tipo = "default") {
        let container = document.getElementById('toast-container');
        
        // Cria o container caso não exista
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'toast-container';
            container.setAttribute('aria-live', 'polite'); // Acessibilidade
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `toast ${tipo}`;
        toast.setAttribute('role', 'status'); // Acessibilidade
        
        // Definindo ícones baseados no FontAwesome de forma segura
        let iconClass = 'fas fa-bell';
        if (tipo === 'success') iconClass = 'fas fa-check-circle';
        if (tipo === 'info') iconClass = 'fas fa-music';
        if (tipo === 'warning') iconClass = 'fas fa-exclamation-triangle';

        // Construção segura dos elementos internos para evitar falhas de XSS
        const header = document.createElement('h4');
        header.innerHTML = `<i class="${iconClass}" aria-hidden="true"></i> `;
        
        const titleText = document.createTextNode(titulo);
        header.appendChild(titleText);

        const bodyText = document.createElement('p');
        bodyText.textContent = mensagem;

        toast.appendChild(header);
        toast.appendChild(bodyText);

        container.prepend(toast);

        // Entrada suave controlada pelo navegador (Garante o gatilho da transição CSS)
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                toast.classList.add('show');
            });
        });

        // Saída automática e remoção segura do DOM após 5 segundos
        setTimeout(() => {
            toast.classList.remove('show');
            
            // Aguarda o término da transição do CSS (500ms) para remover do DOM
            setTimeout(() => {
                toast.remove();
                
                // Limpeza opcional: Se não houver mais toasts, remove o container para poupar memória
                if (container && container.childElementCount === 0) {
                    container.remove();
                }
            }, 500); 
        }, 5000);
    };
})();
