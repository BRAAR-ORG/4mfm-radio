/* ============================================================
   SISTEMA DE NOTIFICAÇÕES 4MFM (TOASTS)
   ============================================================ */

const styles = `
.toast-container {
    position: fixed;
    top: 30px;
    right: 30px;
    z-index: 100000; /* Garantir que fique acima de tudo */
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
    
    /* Animação */
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
    color: #ff3333; /* Cor Accent da 4MFM */
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

/* Barra de progresso interna (detalhe visual) */
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
 * @param {string} titulo - Título em destaque
 * @param {string} mensagem - Texto descritivo
 * @param {string} tipo - 'success', 'info', 'warning' ou 'default'
 */
window.showNotification = function(titulo, mensagem, tipo = "default") {
    // Garantir que o container existe
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    // Criar o elemento do Toast
    const toast = document.createElement('div');
    toast.className = `toast ${tipo}`;
    
    // Adicionar ícones automáticos baseados no tipo
    let icon = "🔔";
    if (tipo === 'success') icon = "✅";
    if (tipo === 'info') icon = "🎵";
    if (tipo === 'warning') icon = "⚠️";

    toast.innerHTML = `
        <h4>${icon} ${titulo}</h4>
        <p>${mensagem}</p>
    `;

    // Adicionar ao topo do container (fila)
    container.prepend(toast);

    // Trigger da animação de entrada
    requestAnimationFrame(() => {
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);
    });

    // Auto-destruição após 5 segundos
    const duration = 5000;
    
    setTimeout(() => {
        toast.classList.remove('show');
        // Espera a animação de saída terminar antes de remover do DOM
        setTimeout(() => {
            toast.remove();
            // Se o container estiver vazio, removemos ele também
            if (container.childNodes.length === 0) {
                container.remove();
            }
        }, 500);
    }, duration);
};

console.log("🚀 Sistema de Notificações Glassmorphism pronto!");