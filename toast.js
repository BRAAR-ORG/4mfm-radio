const ToastSystem = (() => {
    let container = null;

    // Garante que o container dos toasts exista na tela de forma resiliente
    const ensureContainer = () => {
        if (!container || !document.body.contains(container)) {
            container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }
        return container;
    };

    /**
     * Exibe um alerta estilizado na tela de forma segura e performática.
     * @param {string} title - Título do alerta.
     * @param {string} message - Mensagem descritiva.
     * @param {string} type - Tipo: 'success', 'info', 'warning', 'error' ou 'default'.
     * @param {number} duration - Tempo de exibição em milissegundos (padrão: 4000).
     */
    const show = (title, message, type = 'default', duration = 4000) => {
        const toastContainer = ensureContainer();

        // 1. Cria a estrutura seguindo estritamente o padrão BEM
        const toast = document.createElement('div');
        toast.className = `toast ${type !== 'default' ? `toast--${type}` : ''}`;
        
        const iconMap = {
            success: '✓',
            info: '🎵',
            warning: '⚠️',
            error: '❌'
        };
        const icon = iconMap[type] || '📻';

        // Estrutura HTML esquelética fixa
        toast.innerHTML = `
            <div class="toast__header">
                <i>${icon}</i>
                <h4 class="toast__title"></h4>
            </div>
            <p class="toast__message"></p>
            <div class="toast__progress"></div>
        `;

        // 2. Blindagem Antivírus (XSS) usando textContent para os dados dinâmicos
        toast.querySelector('.toast__title').textContent = title;
        toast.querySelector('.toast__message').textContent = message;

        // 3. Injeta a duração na barra de progresso
        const progressBar = toast.querySelector('.toast__progress');
        if (progressBar) {
            progressBar.style.animationDuration = `${duration}ms`;
        }

        // 4. Adiciona ao container
        toastContainer.appendChild(toast);

        // 5. Força o reflow do layout (Garante que a animação CSS aconteça 100% das vezes)
        toast.offsetHeight; 
        toast.classList.add('is-visible');

        // 6. Ciclo de encerramento e remoção limpa
        setTimeout(() => {
            toast.classList.remove('is-visible');
            
            // { once: true } garante que o listener seja autodestruído no primeiro disparo
            toast.addEventListener('transitionend', function handleRemoval() {
                toast.remove();
                
                // Limpa o container se não houver mais notificações ativas na rádio
                if (toastContainer.childElementCount === 0) {
                    toastContainer.remove();
                    container = null;
                }
            }, { once: true });
        }, duration);
    };

    return { show };
})();

// Publica globalmente para o ecossistema 4MFM
window.ToastSystem = ToastSystem;