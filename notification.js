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
    font-size: 14px;
    margin-bottom: 4px;
    color: #ff3333;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 1px;
    display: flex;
    align-items: center;
    gap: 8px;
}

.toast p {
    font-size: 13px;
    opacity: 0.85;
    line-height: 1.5;
    font-weight: 400;
}

/* Variações de Cores */
.toast.success { border-left-color: #00e676; }
.toast.success h4 { color: #00e676; }
.toast.info { border-left-color: #00b0ff; }
.toast.info h4 { color: #00b0ff; }
.toast.warning { border-left-color: #ffea00; }
.toast.warning h4 { color: #ffea00; }

.toast::after {
    content: "";
    position: absolute;
    bottom: 0;
    left: 0;
    height: 3px;
    width: 100%;
    background: rgba(255,255,255,0.1);
}
`;

// Injetar Estilos
const styleSheet = document.createElement("style");
styleSheet.innerText = styles;
document.head.appendChild(styleSheet);

/**
 * Exibe uma notificação na tela
 */
window.showNotification = function(titulo, mensagem, tipo = "default") {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${tipo}`;
    
    let icon = "🔔";
    if (tipo === 'success') icon = "✅";
    if (tipo === 'info') icon = "🎵";
    if (tipo === 'warning') icon = "⚠️";

    toast.innerHTML = `
        <h4>${icon} ${titulo}</h4>
        <p>${mensagem}</p>
    `;

    container.prepend(toast);

    requestAnimationFrame(() => {
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);
    });

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
            // Evitamos remover o container para não quebrar referências
            // caso novas notificações entrem exatamente neste momento.
        }, 500);
    }, 5000);
};

console.log("🚀 Sistema de Notificações Glassmorphism pronto!");
