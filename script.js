// Sala do Futuro Auto-Solver com Gemini AI
// Versão: 2.4 6:07
// Autor: Adaptado para Sala do Futuro

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent';
const DEFAULT_API_KEY = 'AIzaSyAhBasXwnxaD8-rcIYbunbTDW_dtvnw61E';

const salaFuturoBot = {
    isRunning: false,
    geminiApiKey: null,
    questionsAnswered: 0,
    retryCount: 0,

    // Configurações
    config: {
        delay: 2000,
        maxRetries: 3,
        toastDuration: 3000,
        maxRetriesPerQuestion: 2
    },

    async init() {
        try {
            if (this.isRunning) {
                this.showToast("🤖 Bot já está em execução!", "warning");
                return;
            }

            console.clear();
            await this.showSplashScreen();
            await this.loadDependencies();
            await this.setupGeminiAPI();
            await this.hideSplashScreen();

            this.setupEventListeners();
            this.startBot();

            this.showToast("🚀 Sala do Futuro Bot iniciado com sucesso!", "success");
        } catch (error) {
            console.error("Erro ao iniciar bot:", error);
            this.showToast(`❌ Erro ao iniciar: ${error.message}`, "error");
            this.stop();
        }
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
                z-index: 10000; font-family: 'Segoe UI', Arial, sans-serif; color: white; text-align: center;
                opacity: 0; transition: opacity 0.5s ease;
            ">
                <div style="
                    background: rgba(255,255,255,0.1);
                    padding: 40px;
                    border-radius: 20px;
                    backdrop-filter: blur(10px);
                    border: 1px solid rgba(255,255,255,0.2);
                    box-shadow: 0 8px 32px rgba(0,0,0,0.2);
                ">
                    <h1 style="
                        font-size: 3rem;
                        margin: 0;
                        text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
                        background: linear-gradient(to right, #fff, #e0e0e0);
                        -webkit-background-clip: text;
                        -webkit-text-fill-color: transparent;
                    ">🤖 SALA DO FUTURO</h1>
                    <p style="
                        font-size: 1.2rem;
                        margin: 10px 0;
                        opacity: 0.9;
                    ">Auto-Solver com Gemini AI</p>
                    <div style="margin-top: 30px;">
                        <div class="loader" style="
                            border: 4px solid rgba(255,255,255,0.3);
                            border-top: 4px solid white;
                            border-radius: 50%;
                            width: 40px; height: 40px;
                            animation: spin 1s linear infinite;
                            margin: 0 auto;
                        "></div>
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
        let currentKey = null;
        try {
            currentKey = localStorage.getItem('gemini_api_key');
            if (!currentKey) {
                currentKey = prompt("🔑 Digite sua chave da API do Gemini (ou deixe em branco para usar a chave padrão):\n\n(Obtenha em: https://makersuite.google.com/app/apikey)");
                if (!currentKey) {
                    currentKey = DEFAULT_API_KEY;
                    this.showToast("🔑 Usando chave API padrão", "info");
                }
            }

            // Testa a chave da API
            const testResponse = await fetch(GEMINI_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'x-goog-api-key': currentKey // Use currentKey for testing
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: "Test"
                        }]
                    }]
                })
            });

            if (!testResponse.ok) {
                const errorData = await testResponse.json().catch(() => ({}));
                // Se a chave personalizada falhar, tenta a chave padrão
                if (currentKey !== DEFAULT_API_KEY) {
                    this.showToast("⚠️ Chave personalizada inválida, tentando chave padrão...", "warning");
                    localStorage.setItem('gemini_api_key', DEFAULT_API_KEY);
                    this.geminiApiKey = DEFAULT_API_KEY; // Set it here before re-calling
                    return this.setupGeminiAPI(); // Recurse with default key
                }
                throw new Error(`Chave da API inválida: ${errorData.error?.message || 'Erro desconhecido'}`);
            }

            localStorage.setItem('gemini_api_key', currentKey);
            this.geminiApiKey = currentKey; // Only set this.geminiApiKey after successful validation
            this.showToast("🔑 API do Gemini configurada com sucesso!", "info");
        } catch (error) {
            console.error("Erro ao configurar API:", error);
            this.showToast(`❌ ${error.message}`, "error");
            // Only reset if it's not already the default key, to avoid loop
            if (currentKey && currentKey !== DEFAULT_API_KEY) {
                this.resetApiKey();
            } else if (!currentKey) { // If no key was ever set, ensure it asks again
                localStorage.removeItem('gemini_api_key');
                this.geminiApiKey = null;
            }
            throw error; // Re-throw to propagate the error to init()
        }
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
            <div style="
                position: fixed;
                top: 20px;
                right: 20px;
                background: rgba(17, 24, 39, 0.95);
                color: white;
                padding: 20px;
                border-radius: 15px;
                z-index: 9999;
                font-family: 'Segoe UI', Arial, sans-serif;
                font-size: 14px;
                min-width: 280px;
                box-shadow: 0 8px 32px rgba(0,0,0,0.3);
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255,255,255,0.1);
                transition: all 0.3s ease;
            ">
                <div style="
                    display: flex;
                    align-items: center;
                    margin-bottom: 15px;
                    padding-bottom: 15px;
                    border-bottom: 1px solid rgba(255,255,255,0.1);
                ">
                    <div style="
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        width: 40px;
                        height: 40px;
                        border-radius: 10px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        margin-right: 12px;
                        font-size: 20px;
                    ">🤖</div>
                    <div>
                        <div style="font-size: 16px; font-weight: bold; margin-bottom: 2px;">Sala do Futuro Bot</div>
                        <div style="font-size: 12px; opacity: 0.7;">Auto-Solver com Gemini AI</div>
                    </div>
                    <button id="sf-toggle-btn" style="
                        margin-left: auto;
                        background: #ef4444;
                        color: white;
                        border: none;
                        padding: 8px 16px;
                        border-radius: 8px;
                        cursor: pointer;
                        font-size: 12px;
                        font-weight: bold;
                        transition: all 0.2s ease;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                    ">PARAR</button>
                </div>
                
                <div style="
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 10px;
                    margin-bottom: 15px;
                ">
                    <div style="
                        background: rgba(255,255,255,0.05);
                        padding: 10px;
                        border-radius: 8px;
                        text-align: center;
                    ">
                        <div style="font-size: 12px; opacity: 0.7; margin-bottom: 4px;">Questões</div>
                        <div id="sf-questions-count" style="font-size: 20px; font-weight: bold; color: #667eea;">0</div>
                    </div>
                    <div style="
                        background: rgba(255,255,255,0.05);
                        padding: 10px;
                        border-radius: 8px;
                        text-align: center;
                    ">
                        <div style="font-size: 12px; opacity: 0.7; margin-bottom: 4px;">Status</div>
                        <div id="sf-status" style="font-size: 14px; font-weight: bold; color: #667eea;">Aguardando...</div>
                    </div>
                </div>

                <div style="
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                ">
                    <button id="sf-reset-key" style="
                        background: #3b82f6;
                        color: white;
                        border: none;
                        padding: 10px;
                        border-radius: 8px;
                        cursor: pointer;
                        font-size: 12px;
                        font-weight: bold;
                        transition: all 0.2s ease;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 8px;
                    ">
                        <span>🔄</span> Resetar Chave API
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(panel);

        // Adiciona efeitos hover nos botões
        const buttons = panel.querySelectorAll('button');
        buttons.forEach(button => {
            button.addEventListener('mouseover', () => {
                button.style.transform = 'translateY(-2px)';
                button.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
            });
            button.addEventListener('mouseout', () => {
                button.style.transform = 'translateY(0)';
                button.style.boxShadow = 'none';
            });
        });

        document.getElementById('sf-toggle-btn').onclick = () => this.toggleBot();
        document.getElementById('sf-reset-key').onclick = () => this.resetApiKey();
    },

    async mainLoop() {
        while (this.isRunning) {
            try {
                this.updateStatus("🔍 Procurando questão...");
                const question = await this.extractQuestion();

                if (question.text) {
                    this.updateStatus("🤖 Processando questão...");
                    const alternativesInfo = await this.extractAlternatives();

                    if (alternativesInfo.texts.length > 0) {
                        let answer = null;
                        let retries = 0;

                        while (!answer && retries < this.config.maxRetriesPerQuestion) {
                            answer = await this.queryGemini(question, alternativesInfo);
                            if (!answer) {
                                retries++;
                                this.showToast(`⚠️ Tentativa ${retries} de ${this.config.maxRetriesPerQuestion}...`, "warning");
                                await this.delay(1000);
                            }
                        }

                        if (answer) {
                            this.updateStatus(`✅ Resposta obtida: ${answer}. Selecionando...`);
                            const selected = await this.selectAnswer(answer, alternativesInfo);
                            
                            if (selected) {
                                await this.confirmAnswer();
                                this.questionsAnswered++;
                                this.updateQuestionCount();
                                this.showToast(`✅ Questão ${this.questionsAnswered} respondida: ${answer}`, "success");
                                this.retryCount = 0;
                            } else {
                                this.showToast(`❌ Não foi possível selecionar a resposta "${answer}".`, "error");
                            }
                        } else {
                            this.showToast("❌ Não foi possível obter uma resposta válida da IA.", "error");
                        }
                    } else {
                        this.showToast("⚠️ Nenhuma alternativa ou opção de dropdown encontrada.", "warning");
                    }
                } else {
                    this.updateStatus("😴 Nenhuma questão detectada no momento.");
                }

                this.updateStatus("⏳ Aguardando próxima questão...");
                await this.delay(this.config.delay);

            } catch (error) {
                console.error("Erro no loop principal:", error);
                this.updateStatus("❌ Erro detectado no loop principal");
                this.retryCount++;

                if (this.retryCount >= this.config.maxRetries) {
                    this.showToast("❌ Muitas tentativas falhas, parando o bot para evitar loops infinitos.", "error");
                    this.retryCount = 0;
                    this.stop(); // Stop the bot on too many consecutive errors
                } else {
                    this.showToast(`⚠️ Tentando novamente após erro: ${error.message}`, "warning");
                    await this.delay(this.config.delay);
                }
            }
        }
    },

    async extractQuestion() {
        const possibleElements = document.querySelectorAll('p, div, span, img');
        let questionText = '';
        const questionImages = [];

        for (const el of possibleElements) {
            if (el.tagName === 'IMG') {
                const imgUrl = el.src;
                // Avoid processing data URIs that might already be base64 images
                if (imgUrl && !imgUrl.startsWith('data:image')) {
                    questionImages.push(imgUrl);
                }
            } else {
                const text = el.textContent.trim();
                // Improved question detection for fill-in-the-blank contexts
                if (text.length > 30 && (text.includes('?') || text.includes('preencha') || text.includes('sequência'))) {
                    questionText = text;
                }
            }
        }

        return { text: questionText, images: questionImages };
    },

    async extractAlternatives() {
        const alternatives = [];
        const interactiveElements = []; // Store elements to interact with later

        // 1. Extract from <label> elements (traditional A, B, C, D, E)
        const labels = document.querySelectorAll('label');
        labels.forEach(label => {
            const text = label.textContent.trim();
            if (/^[A-E]\)/.test(text)) {
                alternatives.push(text);
                interactiveElements.push({ type: 'label', text: text, element: label });
            }
        });

        // 2. Extract from <select> elements (dropdowns)
        const selects = document.querySelectorAll('select');
        selects.forEach(selectEl => {
            const options = Array.from(selectEl.options).map(opt => opt.textContent.trim());
            options.forEach(optionText => {
                if (!alternatives.includes(optionText)) { // Avoid duplicates if the same option text appears in multiple dropdowns
                    alternatives.push(optionText);
                }
            });
            interactiveElements.push({ type: 'select', element: selectEl, options: options });
        });

        // 3. Fallback for generic text (less reliable but can catch some cases)
        if (alternatives.length === 0) {
            const allText = document.body.textContent;
            const matches = allText.match(/[A-E]\)\s*[^\n\r]+/g);
            if (matches) {
                matches.forEach(match => {
                    alternatives.push(match);
                    // Cannot associate with a specific element here, so selection will be tricky
                });
            }
        }
        
        return { texts: alternatives, elements: interactiveElements };
    },

    async queryGemini(question, alternativesInfo) {
        try {
            if (!this.geminiApiKey) {
                throw new Error('Chave da API não configurada');
            }

            const { texts: alternatives, elements: interactiveElements } = alternativesInfo;

            let prompt = `
Analise a seguinte questão${question.images.length > 0 ? ' (com imagens)' : ''} e responda APENAS com a letra da alternativa correta (A, B, C, D ou E) SE APLICÁVEL, OU COM O TEXTO EXATO DA OPÇÃO SE FOR UM CAMPO DE PREENCHER OU DROPDOWN. NÃO adicione explicações.

QUESTÃO:
${question.text}
`;

            if (question.images && question.images.length > 0) {
                prompt += `\nIMAGENS DA QUESTÃO:\n`;
                for (const imgUrl of question.images) {
                    try {
                        const imgResponse = await fetch(imgUrl);
                        const imgBlob = await imgResponse.blob();
                        const base64 = await this.blobToBase64(imgBlob);
                        prompt += `[Imagem: ${base64}]\n`;
                    } catch (error) {
                        console.error("Erro ao processar imagem:", error);
                    }
                }
            }

            prompt += `
ALTERNATIVAS DISPONÍVEIS:
${alternatives.join('\n')}

Resposta (apenas a letra ou o texto exato da opção):
            `.trim();

            const response = await fetch(GEMINI_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'x-goog-api-key': this.geminiApiKey
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.1,
                        topK: 1,
                        topP: 1,
                        maxOutputTokens: 50
                    }
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('Resposta da API:', errorData);
                throw new Error(`Erro na API: ${response.status} - ${errorData.error?.message || 'Erro desconhecido'}`);
            }

            const data = await response.json();
            if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
                console.error('Resposta inválida:', data);
                throw new Error('Resposta inválida da API');
            }

            const answer = data.candidates[0].content.parts[0].text.trim();
            return answer;

        } catch (error) {
            console.error("Erro ao consultar Gemini:", error);
            this.showToast(`❌ Erro ao consultar Gemini AI: ${error.message}`, "error");

            if (error.message.includes('API') || error.message.includes('chave')) {
                this.resetApiKey();
            }

            return null;
        }
    },

    async selectAnswer(answer, alternativesInfo) {
        const { elements: interactiveElements } = alternativesInfo;

        // Try to match the answer to a label or a select option
        for (const item of interactiveElements) {
            if (item.type === 'label') {
                // For traditional A, B, C, D, E
                const labelText = item.text.toUpperCase();
                const cleanAnswer = answer.toUpperCase().replace(/\W/g, ''); // Remove non-alphanumeric for comparison
                const match = labelText.match(/([A-E])\)/);
                
                if (match && cleanAnswer.includes(match[1])) { // Check if Gemini's answer (e.g., "A" or "A)") matches the label
                    const input = item.element.querySelector('input') || document.querySelector(`#${item.element.getAttribute('for')}`);
                    if (input) {
                        input.click();
                        await this.delay(500);
                        return true;
                    }
                }
            } else if (item.type === 'select') {
                // For dropdowns
                const selectElement = item.element;
                const options = Array.from(selectElement.options);
                const normalizedAnswer = answer.toLowerCase();

                for (const option of options) {
                    if (option.textContent.trim().toLowerCase() === normalizedAnswer) {
                        selectElement.value = option.value;
                        // Trigger change event manually as setting value might not always fire it
                        const event = new Event('change', { bubbles: true });
                        selectElement.dispatchEvent(event);
                        await this.delay(500);
                        return true;
                    }
                }
            }
        }

        this.showToast(`❌ Não encontrei a resposta "${answer}" para selecionar.`, "error");
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
            const colors = {
                success: "linear-gradient(to right, #00b09b, #96c93d)",
                error: "linear-gradient(to right, #ff416c, #ff4b2b)",
                warning: "linear-gradient(to right, #f7971e, #ffd200)",
                info: "linear-gradient(to right, #2193b0, #6dd5ed)"
            };
            
            Toastify({
                text: message,
                duration: this.config.toastDuration,
                gravity: "top",
                position: "center",
                style: {
                    background: colors[type] || colors.info,
                    borderRadius: "8px",
                    padding: "12px 24px",
                    fontSize: "14px",
                    fontWeight: "500",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
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
        this.showToast("🔄 Chave API resetada! Configure uma nova chave.", "info");
        this.setupGeminiAPI().catch(console.error);
    },

    stop() {
        this.isRunning = false;
        const panel = document.getElementById('sala-futuro-panel');
        if (panel) panel.remove();
        this.showToast("🛑 Bot parado com sucesso!", "error");
    },

    // Function to convert Blob to Base64
    blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
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
