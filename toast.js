// Garante que o ToastSystem só será declarado se ainda não existir na janela
if (typeof window.ToastSystem === 'undefined') {
    const ToastSystem = (() => {
        let container = null;

        const ensureContainer = () => {
            if (!container || !document.body.contains(container)) {
                container = document.createElement('div');
                container.className = 'toast-container';
                container.setAttribute('aria-live', 'polite');
                document.body.appendChild(container);
            }
            return container;
        };

        const show = (title, message, type = 'default', duration = 4000) => {
            const toastContainer = ensureContainer();
            const toast = document.createElement('div');
            toast.className = `toast ${type !== 'default' ? `toast--${type}` : ''}`;
            toast.setAttribute('role', 'status');
            
            const iconMap = {
                success: 'fas fa-check-circle',
                info: 'fas fa-music',
                warning: 'fas fa-exclamation-triangle',
                error: 'fas fa-times-circle'
            };
            const iconClass = iconMap[type] || 'fas fa-bell';

            toast.innerHTML = `
                <div class="toast__header">
                    <i class="${iconClass}" aria-hidden="true"></i>
                    <h4 class="toast__title"></h4>
                </div>
                <p class="toast__message"></p>
                <div class="toast__progress"></div>
            `;

            toast.querySelector('.toast__title').textContent = title;
            toast.querySelector('.toast__message').textContent = message;

            const progressBar = toast.querySelector('.toast__progress');
            if (progressBar) {
                progressBar.style.animationDuration = `${duration}ms`;
            }

            toastContainer.prepend(toast);
            toast.offsetHeight; 
            toast.classList.add('is-visible');

            setTimeout(() => {
                toast.classList.remove('is-visible');
                toast.addEventListener('transitionend', function handleRemoval() {
                    toast.remove();
                    if (toastContainer.childElementCount === 0) {
                        toastContainer.remove();
                        container = null;
                    }
                }, { once: true });
            }, duration);
        };

        return { show };
    })();

    // Exposições globais e pontes seguras
    window.ToastSystem = ToastSystem;
}

if (typeof window.showNotification === 'undefined') {
    window.showNotification = function(titulo, mensagem, tipo = "default") {
        if (window.ToastSystem) {
            window.ToastSystem.show(titulo, mensagem, tipo, 4500);
        }
    };
}