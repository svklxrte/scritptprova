// Sala do Futuro Auto-Solver com Gemini AI
// Versão: 2.1 5:34
// Autor: Adaptado para Sala do Futuro

// Função para carregar o script usando um proxy CORS
async function loadScriptFromProxy() {
    try {
        const proxyUrl = 'https://cors-anywhere.herokuapp.com/';
        const scriptUrl = 'https://raw.githubusercontent.com/svklxrte/scritptprova/refs/heads/main/script.js';
        const response = await fetch(proxyUrl + scriptUrl);
        const script = await response.text();
        eval(script);
    } catch (error) {
        console.error('Erro ao carregar script:', error);
        alert('Erro ao carregar o script. Por favor, copie e cole o código manualmente no console.');
    }
}

const salaFuturoBot = {
    isRunning: false,
    geminiApiKey: null,
    questionsAnswered: 0,

    // Configurações
    config: {
        delay: 2000,
        maxRetries: 3,
        toastDuration: 3000
    },

    async init() {
        if (this.isRunning) {
            this.showToast("🤖 Bot já está rodando!", "warning");
            return;
        }

        console.clear();
        await this.showSplashScreen();
        await this.loadDependencies();
        await this.setupGeminiAPI();
        await this.hideSplashScreen();

        // Call setupEventListeners directly
        this.setupEventListeners();
        this.startBot();

        this.showToast("🚀 Sala do Futuro Bot iniciado!", "success");
    },

    async showSplashScreen() {
        const splash = document.createElement('div');
        splash.id = 'sala-futuro-splash';
        splash.innerHTML = `
            <div style="
                position: fixed;
                top: 0; left: 0; width: 100%; height: 100%;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                display: flex; align-items: center; justify-content: center;
                z-index: 10000; font-family: Arial, sans-serif; color: white; text-align: center;
                opacity: 0; transition: opacity 0.5s ease;">
                <div>
                    <h1 style="font-size: 3rem; margin: 0; text-shadow: 2px 2px 4px rgba(0,0,0,0.3);">🤖 SALA DO FUTURO</h1>
                    <p style="font-size: 1.2rem; margin: 10px 0;">Auto-Solver com Gemini AI</p>
                    <div style="margin-top: 20px;">
                        <div class="loader" style="
                            border: 4px solid rgba(255,255,255,0.3);
                            border-top: 4px solid white;
                            border-radius: 50%;
                            width: 40px; height: 40px;
                            animation: spin 1s linear infinite;
                            margin: 0 auto;">
                        </div>
                    </div>
                </div>
            </div>
            <style>
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            </style>
        `;
        document.body.appendChild(splash);
        setTimeout(() => splash.style.opacity = '1', 100);
    },

    async hideSplashScreen() {
        const splash = document.getElementById('sala-futuro-splash');
        if (splash) {
            splash.style.opacity = '0';
            setTimeout(() => splash.remove(), 500);
        }
    },

    async loadDependencies() {
        if (!window.Toastify) {
            await this.loadScript('https://cdn.jsdelivr.net/npm/toastify-js');
            await this.loadCSS('https://cdn.jsdelivr.net/npm/toastify-js/src/toastify.min.css');
        }
    },

    async setupGeminiAPI() {
        this.geminiApiKey = localStorage.getItem('gemini_api_key');
        if (!this.geminiApiKey) {
            this.geminiApiKey = prompt("🔑 Digite sua chave da API do Gemini:\n\n(Obtenha em: https://makersuite.google.com/app/apikey)");
            if (!this.geminiApiKey) throw new Error("Chave da API é obrigatória!");
            localStorage.setItem('gemini_api_key', this.geminiApiKey);
        }
        this.showToast("🔑 API do Gemini configurada!", "info");
    },

    setupEventListeners() {
        // Adiciona listeners para eventos importantes
        window.addEventListener('beforeunload', () => {
            if (this.isRunning) {
                this.stop();
            }
        });

        // Listener para tecla de atalho (Ctrl + Shift + S)
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'S') {
                e.preventDefault();
                this.toggleBot();
            }
        });
    },

    startBot() {
        this.isRunning = true;
        this.questionsAnswered = 0;
        this.createControlPanel();
        this.mainLoop();
    },

    createControlPanel() {
        const panel = document.createElement('div');
        panel.id = 'sala-futuro-panel';
        panel.innerHTML = `
            <div style="position: fixed; top: 20px; right: 20px; background: rgba(0,0,0,0.9); color: white; padding: 15px; border-radius: 10px; z-index: 9999; font-family: Arial, sans-serif; font-size: 14px; min-width: 200px; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
                <div style="display: flex; align-items: center; margin-bottom: 10px;">
                    <span style="font-size: 16px; font-weight: bold;">🤖 Bot Status</span>
                    <button id="sf-toggle-btn" style="margin-left: auto; background: #ff4444; color: white; border: none; padding: 5px 10px; border-radius: 5px; cursor: pointer; font-size: 12px;">PARAR</button>
                </div>
                <div>📊 Questões: <span id="sf-questions-count">0</span></div>
                <div>🎯 Status: <span id="sf-status">Aguardando...</span></div>
                <div style="margin-top: 10px;">
                    <button id="sf-reset-key" style="background: #4444ff; color: white; border: none; padding: 5px 10px; border-radius: 5px; cursor: pointer; font-size: 11px; width: 100%;">Resetar Chave API</button>
                </div>
            </div>
        `;
        document.body.appendChild(panel);
        document.getElementById('sf-toggle-btn').onclick = () => this.toggleBot();
        document.getElementById('sf-reset-key').onclick = () => this.resetApiKey();
    },

    async mainLoop() {
        while (this.isRunning) {
            try {
                this.updateStatus("🔍 Procurando questão...");
                const question = await this.extractQuestion();

                if (question) {
                    this.updateStatus("🤖 Processando questão...");
                    const alternatives = await this.extractAlternatives();

                    if (alternatives.length > 0) {
                        const answer = await this.queryGemini(question, alternatives);

                        if (answer) {
                            this.updateStatus("✅ Selecionando resposta...");
                            await this.selectAnswer(answer);
                            await this.confirmAnswer();

                            this.questionsAnswered++;
                            this.updateQuestionCount();
                            this.showToast(`✅ Questão ${this.questionsAnswered} respondida: ${answer}`, "success");
                        }
                    }
                }

                this.updateStatus("⏳ Aguardando próxima questão...");
                await this.delay(this.config.delay);

            } catch (error) {
                console.error("Erro no loop principal:", error);
                this.updateStatus("❌ Erro detectado");
                await this.delay(this.config.delay);
            }
        }
    },

    async extractQuestion() {
        const possibleElements = document.querySelectorAll('p, div, span');
        for (const el of possibleElements) {
            const text = el.textContent.trim();
            if (text.length > 50 && (text.includes('?') || text.includes('Considerando'))) {
                return text;
            }
        }
        return null;
    },

    async extractAlternatives() {
        const alternatives = [];
        const labels = document.querySelectorAll('label');

        labels.forEach(label => {
            const text = label.textContent.trim();
            if (/^[A-E]\)/.test(text)) {
                alternatives.push(text);
            }
        });

        if (alternatives.length === 0) {
            const allText = document.body.textContent;
            const matches = allText.match(/[A-E]\)\s*[^\n\r]+/g);
            if (matches) alternatives.push(...matches);
        }

        return alternatives;
    },

    async queryGemini(question, alternatives) {
        try {
            const prompt = `
Analise a seguinte questão de múltipla escolha e responda APENAS com a letra da alternativa correta (A, B, C, D ou E).

QUESTÃO:
${question}

ALTERNATIVAS:
${alternatives.join('\n')}

Resposta (apenas a letra):
            `.trim();

            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${this.geminiApiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            });

            if (!response.ok) throw new Error(`Erro na API: ${response.status}`);

            const data = await response.json();
            const answer = data.candidates[0].content.parts[0].text.trim().toUpperCase();
            const match = answer.match(/[A-E]/);
            return match ? match[0] : null;

        } catch (error) {
            console.error("Erro ao consultar Gemini:", error);
            this.showToast("❌ Erro ao consultar Gemini AI", "error");
            return null;
        }
    },

    async selectAnswer(letter) {
        const labels = Array.from(document.querySelectorAll('label'));

        for (const label of labels) {
            if (label.textContent.trim().startsWith(`${letter})`)) {
                const input = label.querySelector('input') || document.querySelector(`#${label.getAttribute('for')}`);
                if (input) input.click();
                await this.delay(500);
                return true;
            }
        }

        return false;
    },

    async confirmAnswer() {
        const buttons = Array.from(document.querySelectorAll('button, input[type="submit"]'));
        const keywords = ["Confirmar", "Próxima", "Enviar"];

        for (const button of buttons) {
            if (keywords.some(k => button.textContent.includes(k) || button.value.includes(k))) {
                button.click();
                await this.delay(1000);
                return true;
            }
        }

        return false;
    },

    async loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    },

    async loadCSS(href) {
        return new Promise((resolve) => {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = href;
            link.onload = resolve;
            document.head.appendChild(link);
        });
    },

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    showToast(message, type = "info") {
        if (window.Toastify) {
            const colors = { success: "#28a745", error: "#dc3545", warning: "#ffc107", info: "#17a2b8" };
            Toastify({
                text: message,
                duration: this.config.toastDuration,
                gravity: "top",
                position: "center",
                style: {
                    background: colors[type] || colors.info
                },
                stopOnFocus: true
            }).showToast();
        } else {
            console.log(message);
        }
    },

    updateStatus(status) {
        const statusElement = document.getElementById('sf-status');
        if (statusElement) statusElement.textContent = status;
    },

    updateQuestionCount() {
        const countElement = document.getElementById('sf-questions-count');
        if (countElement) countElement.textContent = this.questionsAnswered;
    },

    toggleBot() {
        this.isRunning = !this.isRunning;
        const button = document.getElementById('sf-toggle-btn');

        if (this.isRunning) {
            button.textContent = 'PARAR';
            button.style.background = '#ff4444';
            this.mainLoop();
            this.showToast("▶️ Bot retomado!", "success");
        } else {
            button.textContent = 'INICIAR';
            button.style.background = '#28a745';
            this.showToast("⏸️ Bot pausado!", "warning");
        }
    },

    resetApiKey() {
        localStorage.removeItem('gemini_api_key');
        this.geminiApiKey = null;
        this.showToast("🔑 Chave API resetada!", "info");
        this.setupGeminiAPI();
    },

    stop() {
        this.isRunning = false;
        const panel = document.getElementById('sala-futuro-panel');
        if (panel) panel.remove();
        this.showToast("🛑 Bot parado!", "error");
    }
};

// Verificar ambiente
if (window.location.hostname.includes('salafuturo') || window.location.hostname.includes('educacao.sp.gov.br')) {
    salaFuturoBot.init().catch(console.error);
} else {
    alert("❌ Este script funciona apenas no Sala do Futuro!\n\nRedirecionando...");
    window.location.href = "https://salafuturo.educacao.sp.gov.br/";
}

window.stopSalaFuturoBot = () => salaFuturoBot.stop();
