// Sala do Futuro Auto-Solver com Gemini AI
// Versão: 1.0
// Autor: Adaptado para Sala do Futuro

let salaFuturoBot = {
    isRunning: false,
    geminiApiKey: null,
    questionsAnswered: 0,
    
    // Configurações
    config: {
        delay: 2000, // Delay entre ações em ms
        maxRetries: 3,
        toastDuration: 3000
    },

    // Inicialização
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
        
        this.setupEventListeners();
        this.startBot();
        
        this.showToast("🚀 Sala do Futuro Bot iniciado!", "success");
    },

    // Mostrar splash screen
    async showSplashScreen() {
        const splash = document.createElement('div');
        splash.id = 'sala-futuro-splash';
        splash.innerHTML = `
            <div style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                font-family: Arial, sans-serif;
                color: white;
                text-align: center;
                opacity: 0;
                transition: opacity 0.5s ease;
            ">
                <div>
                    <h1 style="font-size: 3rem; margin: 0; text-shadow: 2px 2px 4px rgba(0,0,0,0.3);">
                        🤖 SALA DO FUTURO
                    </h1>
                    <p style="font-size: 1.2rem; margin: 10px 0;">
                        Auto-Solver com Gemini AI
                    </p>
                    <div style="margin-top: 20px;">
                        <div class="loader" style="
                            border: 4px solid rgba(255,255,255,0.3);
                            border-top: 4px solid white;
                            border-radius: 50%;
                            width: 40px;
                            height: 40px;
                            animation: spin 1s linear infinite;
                            margin: 0 auto;
                        "></div>
                    </div>
                </div>
            </div>
            <style>
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            </style>
        `;
        
        document.body.appendChild(splash);
        setTimeout(() => splash.style.opacity = '1', 100);
    },

    // Esconder splash screen
    async hideSplashScreen() {
        const splash = document.getElementById('sala-futuro-splash');
        if (splash) {
            splash.style.opacity = '0';
            setTimeout(() => splash.remove(), 500);
        }
    },

    // Carregar dependências
    async loadDependencies() {
        // Carregar Toastify para notificações
        if (!window.Toastify) {
            await this.loadScript('https://cdn.jsdelivr.net/npm/toastify-js');
            await this.loadCSS('https://cdn.jsdelivr.net/npm/toastify-js/src/toastify.min.css');
        }
    },

    // Configurar API do Gemini
    async setupGeminiAPI() {
        // Verificar se já tem a chave salva
        this.geminiApiKey = localStorage.getItem('gemini_api_key');
        
        if (!this.geminiApiKey) {
            this.geminiApiKey = prompt("🔑 Digite sua chave da API do Gemini:\n\n(Obtenha em: https://makersuite.google.com/app/apikey)");
            
            if (!this.geminiApiKey) {
                throw new Error("Chave da API é obrigatória!");
            }
            
            // Salvar a chave
            localStorage.setItem('gemini_api_key', this.geminiApiKey);
        }

        this.showToast("🔑 API do Gemini configurada!", "info");
    },

    // Iniciar o bot
    startBot() {
        this.isRunning = true;
        this.questionsAnswered = 0;
        
        // Criar painel de controle
        this.createControlPanel();
        
        // Iniciar loop principal
        this.mainLoop();
    },

    // Criar painel de controle
    createControlPanel() {
        const panel = document.createElement('div');
        panel.id = 'sala-futuro-panel';
        panel.innerHTML = `
            <div style="
                position: fixed;
                top: 20px;
                right: 20px;
                background: rgba(0,0,0,0.9);
                color: white;
                padding: 15px;
                border-radius: 10px;
                z-index: 9999;
                font-family: Arial, sans-serif;
                font-size: 14px;
                min-width: 200px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            ">
                <div style="display: flex; align-items: center; margin-bottom: 10px;">
                    <span style="font-size: 16px; font-weight: bold;">🤖 Bot Status</span>
                    <button id="sf-toggle-btn" style="
                        margin-left: auto;
                        background: #ff4444;
                        color: white;
                        border: none;
                        padding: 5px 10px;
                        border-radius: 5px;
                        cursor: pointer;
                        font-size: 12px;
                    ">PARAR</button>
                </div>
                <div>📊 Questões: <span id="sf-questions-count">0</span></div>
                <div>🎯 Status: <span id="sf-status">Aguardando...</span></div>
                <div style="margin-top: 10px;">
                    <button id="sf-reset-key" style="
                        background: #4444ff;
                        color: white;
                        border: none;
                        padding: 5px 10px;
                        border-radius: 5px;
                        cursor: pointer;
                        font-size: 11px;
                        width: 100%;
                    ">Resetar Chave API</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(panel);
        
        // Event listeners do painel
        document.getElementById('sf-toggle-btn').onclick = () => this.toggleBot();
        document.getElementById('sf-reset-key').onclick = () => this.resetApiKey();
    },

    // Loop principal do bot
    async mainLoop() {
        while (this.isRunning) {
            try {
                this.updateStatus("🔍 Procurando questão...");
                
                // Verificar se há uma questão na tela
                const question = await this.extractQuestion();
                
                if (question) {
                    this.updateStatus("🤖 Processando questão...");
                    
                    // Obter alternativas
                    const alternatives = await this.extractAlternatives();
                    
                    if (alternatives.length > 0) {
                        // Consultar Gemini
                        const answer = await this.queryGemini(question, alternatives);
                        
                        if (answer) {
                            this.updateStatus("✅ Selecionando resposta...");
                            
                            // Selecionar resposta
                            await this.selectAnswer(answer);
                            
                            // Confirmar resposta
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

    // Extrair texto da questão
    async extractQuestion() {
        const selectors = [
            '.questao-texto',
            '.pergunta',
            '[class*="questao"]',
            '[class*="pergunta"]',
            'p:contains("Considerando")',
            'div:contains("questão")'
        ];
        
        for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element && element.textContent.trim().length > 20) {
                return element.textContent.trim();
            }
        }
        
        // Fallback: procurar por texto longo
        const allElements = document.querySelectorAll('p, div, span');
        for (const element of allElements) {
            const text = element.textContent.trim();
            if (text.length > 50 && (text.includes('?') || text.includes('Considerando'))) {
                return text;
            }
        }
        
        return null;
    },

    // Extrair alternativas
    async extractAlternatives() {
        const alternatives = [];
        
        // Procurar por alternativas (A, B, C, D, E)
        const selectors = [
            'input[type="radio"]',
            '.alternativa',
            '[class*="alternativa"]',
            'label'
        ];
        
        for (const selector of selectors) {
            const elements = document.querySelectorAll(selector);
            for (const element of elements) {
                const text = element.textContent || element.value || '';
                if (/^[A-E]\)/.test(text.trim())) {
                    alternatives.push(text.trim());
                }
            }
        }
        
        // Se não encontrou, procurar por padrões de texto
        if (alternatives.length === 0) {
            const allText = document.body.textContent;
            const matches = allText.match(/[A-E]\)\s*[^\n\r]+/g);
            if (matches) {
                alternatives.push(...matches);
            }
        }
        
        return alternatives;
    },

    // Consultar Gemini AI
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
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }]
                })
            });
            
            if (!response.ok) {
                throw new Error(`Erro na API: ${response.status}`);
            }
            
            const data = await response.json();
            const answer = data.candidates[0].content.parts[0].text.trim().toUpperCase();
            
            // Extrair apenas a letra
            const match = answer.match(/[A-E]/);
            return match ? match[0] : null;
            
        } catch (error) {
            console.error("Erro ao consultar Gemini:", error);
            this.showToast("❌ Erro ao consultar Gemini AI", "error");
            return null;
        }
    },

    // Selecionar resposta
    async selectAnswer(letter) {
        // Tentar diferentes seletores para encontrar a alternativa
        const selectors = [
            `input[value*="${letter})"]`,
            `input[id*="${letter.toLowerCase()}"]`,
            `label:contains("${letter})")`,
            `[data-option="${letter}"]`,
            `[data-alternative="${letter}"]`
        ];
        
        for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element) {
                element.click();
                await this.delay(500);
                return true;
            }
        }
        
        // Fallback: procurar por texto
        const allElements = document.querySelectorAll('input, button, label');
        for (const element of allElements) {
            if (element.textContent.includes(`${letter})`)) {
                element.click();
                await this.delay(500);
                return true;
            }
        }
        
        return false;
    },

    // Confirmar resposta
    async confirmAnswer() {
        const confirmSelectors = [
            'button:contains("Confirmar")',
            'button:contains("Próxima")',
            'button:contains("Enviar")',
            'input[type="submit"]',
            '.btn-confirmar',
            '.botao-confirmar'
        ];
        
        for (const selector of confirmSelectors) {
            const element = document.querySelector(selector);
            if (element) {
                element.click();
                await this.delay(1000);
                return true;
            }
        }
        
        return false;
    },

    // Utilitários
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
            const colors = {
                success: "#28a745",
                error: "#dc3545",
                warning: "#ffc107",
                info: "#17a2b8"
            };
            
            Toastify({
                text: message,
                duration: this.config.toastDuration,
                gravity: "top",
                position: "center",
                backgroundColor: colors[type] || colors.info,
                stopOnFocus: true
            }).showToast();
        } else {
            console.log(message);
        }
    },

    updateStatus(status) {
        const statusElement = document.getElementById('sf-status');
        if (statusElement) {
            statusElement.textContent = status;
        }
    },

    updateQuestionCount() {
        const countElement = document.getElementById('sf-questions-count');
        if (countElement) {
            countElement.textContent = this.questionsAnswered;
        }
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

    // Parar bot completamente
    stop() {
        this.isRunning = false;
        const panel = document.getElementById('sala-futuro-panel');
        if (panel) panel.remove();
        this.showToast("🛑 Bot parado!", "error");
    }
};

// Verificar se estamos no Sala do Futuro
if (window.location.hostname.includes('salafuturo') || window.location.hostname.includes('educacao.sp.gov.br')) {
    salaFuturoBot.init().catch(console.error);
} else {
    alert("❌ Este script funciona apenas no Sala do Futuro!\n\nRedirecionando...");
    window.location.href = "https://salafuturo.educacao.sp.gov.br/";
}

// Adicionar função global para parar o bot
window.stopSalaFuturoBot = () => salaFuturoBot.stop();
