const styles = `
.toast-container {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 99999;
    display: flex;
    flex-direction: column;
    gap: 10px;
    pointer-events: none;
}

.toast {
    background: rgba(15, 15, 15, 0.95);
    color: #fff;
    padding: 15px 25px;
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-left: 4px solid #e10600;
    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    transform: translateX(120%);
    transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.4s;
    min-width: 250px;
    max-width: 350px;
    opacity: 0;
    pointer-events: auto;
}

.toast.show {
    transform: translateX(0);
    opacity: 1;
}

.toast h4 {
    font-size: 14px;
    margin-bottom: 4px;
    color: #e10600;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.toast p {
    font-size: 13px;
    opacity: 0.9;
    line-height: 1.4;
}

.toast.success { border-left-color: #00e676; }
.toast.success h4 { color: #00e676; }

.toast.info { border-left-color: #00b0ff; }
.toast.info h4 { color: #00b0ff; }

.toast.warning { border-left-color: #ffea00; }
.toast.warning h4 { color: #ffea00; }
`;

const styleSheet = document.createElement("style");
styleSheet.innerText = styles;
document.head.appendChild(styleSheet);

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
    
    toast.innerHTML = `
        <h4>${titulo}</h4>
        <p>${mensagem}</p>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('show');
    }, 100);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
        }, 400);
    }, 4500);
};

console.log("🔔 Sistema de notificações da rádio carregado com sucesso!");