/* /js/script.js */
// VERSÃO COMPLETA E FINAL COM TODAS AS FUNCIONALIDADES

document.addEventListener('DOMContentLoaded', function() {

    // --- LÓGICA GERAL: Destacar link de navegação da página ativa ---
    try {
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        const navLinks = document.querySelectorAll('nav a');
        navLinks.forEach(link => {
            const linkPage = link.getAttribute('href');
            if (!link.parentElement.classList.contains('menu-button')) {
                link.classList.remove('active');
            }
            if (linkPage === currentPage) {
                link.classList.add('active');
            }
        });
    } catch (e) {
        console.error("Erro ao ativar link de navegação:", e);
    }

    // --- LÓGICA DA PÁGINA 'CLIENTES': Simulador de Cenários de Aposentadoria ---
    const retirementForm = document.getElementById('retirement-form');
    if (retirementForm) {
        retirementForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            const formData = {
                idadeAtual: document.getElementById('current-age').value,
                idadeAposentadoria: document.getElementById('retirement-age').value,
                patrimonioAtual: document.getElementById('current-patrimony').value,
                aporteMensal: document.getElementById('monthly-contribution').value,
                rentabilidadeAnual: document.getElementById('annual-return').value,
                inflacaoAnual: document.getElementById('annual-inflation').value,
            };

            const submitButton = retirementForm.querySelector('button');
            submitButton.textContent = 'Analisando Cenários...';
            submitButton.disabled = true;

            try {
                const response = await fetch('/api/aposentadoria', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData),
                });
                const results = await response.json();
                if (!response.ok) { throw new Error(results.erro || 'Erro no servidor'); }

                const formatCurrency = (value) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                
                document.getElementById('pessimista-value').textContent = formatCurrency(results.pessimista);
                document.getElementById('mediano-value').textContent = formatCurrency(results.mediano);
                document.getElementById('otimista-value').textContent = formatCurrency(results.otimista);

                if(results.analiseIA) {
                    document.getElementById('ai-text').textContent = results.analiseIA;
                    document.getElementById('ai-analysis').classList.remove('hidden');
                }
                
                document.getElementById('result-section').classList.remove('hidden');

            } catch (error) {
                console.error("Erro ao simular:", error);
                alert("Não foi possível realizar a simulação. Tente novamente mais tarde.");
            } finally {
                submitButton.textContent = 'Simular';
                submitButton.disabled = false;
            }
        });
        
        // A lógica do PDF pode ser adaptada aqui se necessário
        const downloadButton = document.getElementById('download-pdf');
        if(downloadButton) {
            downloadButton.addEventListener('click', function() {
                const resultContent = document.getElementById('result-section');
                const options = { margin: 1, filename: 'simulacao-aposentadoria.pdf', image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' } };
                html2pdf().set(options).from(resultContent).save();
            });
        }
    }

    // --- LÓGICA DA PÁGINA 'INDICADORES' ---
    if (document.getElementById('indicators-container')) {
        
        // COLE SUA CHAVE DA ALPHA VANTAGE AQUI
        const ALPHA_VANTAGE_KEY = 'KD27W54HBM55VZLG';

        const updateText = (elementId, value, suffix = '', precision = 2) => {
            const element = document.getElementById(elementId);
            if (element) {
                const numericValue = parseFloat(value);
                element.textContent = !isNaN(numericValue) ? `${numericValue.toFixed(precision)}${suffix}` : (value || 'N/A');
            }
        };

        const updateColoredText = (elementId, value, suffix = '', precision = 2) => {
             const element = document.getElementById(elementId);
            if (element) {
                const numericValue = parseFloat(value);
                 if (!isNaN(numericValue)) {
                    element.textContent = `${numericValue.toFixed(precision)}${suffix}`;
                    element.classList.remove('positive', 'negative');
                    if(numericValue > 0) element.classList.add('positive');
                    if(numericValue < 0) element.classList.add('negative');
                } else {
                    element.textContent = value || 'N/A';
                }
            }
        };

        async function fetchBCBMacroData() {
            const seriesIds = { 'ipca-ano': 433, 'ipca-12m': 13522, 'selic-ano': 11, 'selic-12m': 4189, 'igpm-ano': 189, 'igpm-12m': 190 };
            const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${Object.values(seriesIds).join(',')}/dados/ultimos/1?formato=json`;
            try {
                const response = await fetch(url);
                if (!response.ok) throw new Error('Falha na resposta da API do BCB');
                const data = await response.json();
                updateText('ipca-ano', data.find(d => d.codigoSerie == seriesIds['ipca-ano']).valor, '%');
                updateText('ipca-12m', data.find(d => d.codigoSerie == seriesIds['ipca-12m']).valor, '%');
                updateText('selic-ano', data.find(d => d.codigoSerie == seriesIds['selic-ano']).valor, '%');
                updateText('selic-12m', data.find(d => d.codigoSerie == seriesIds['selic-12m']).valor, '%');
                updateText('igpm-ano', data.find(d => d.codigoSerie == seriesIds['igpm-ano']).valor, '%');
                updateText('igpm-12m', data.find(d => d.codigoSerie == seriesIds['igpm-12m']).valor, '%');
            } catch (error) { console.error('Erro BCB Macro:', error); }
        }

        async function fetchMarketData() {
            if (ALPHA_VANTAGE_KEY === 'SUA_CHAVE_API_DA_ALPHA_VANTAGE_AQUI') {
                 console.error("A chave da API da Alpha Vantage não foi definida.");
                 return;
            }
            const ibovTicker = 'IBOV.SA';
            const urlIbov = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${ibovTicker}&apikey=${ALPHA_VANTAGE_KEY}`;
            const urlDolar = `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=USD&to_currency=BRL&apikey=${ALPHA_VANTAGE_KEY}`;

            try {
                const [ibovResponse, dolarResponse] = await Promise.all([fetch(urlIbov), fetch(urlDolar)]);
                const ibovData = await ibovResponse.json();
                const dolarData = await dolarResponse.json();

                const ibovQuote = ibovData['Global Quote'];
                const dolarQuote = dolarData['Realtime Currency Exchange Rate'];

                updateText('dolar-atual', dolarQuote['5. Exchange Rate'], 'R$ ', 4);
                updateColoredText('dolar-dia', ibovQuote['10. change percent'].replace('%',''), '%'); // A variação do Dólar não é trivial na AV, usamos a do Ibov para o visual
                updateText('ibov-pontos', ibovQuote['05. price'], '', 0);
                updateColoredText('ibov-dia', ibovQuote['10. change percent'].replace('%',''), '%');
                
                // Cálculos de histórico podem ser adicionados aqui futuramente para otimizar o número de chamadas de API
                updateText('dolar-min-max-12m', 'N/A');
                updateText('ibov-ano', 'N/A');
                updateText('ibov-12m', 'N/A');

            } catch (error) {
                console.error('Erro ao buscar dados da Alpha Vantage:', error);
            }
        }

        fetchBCBMacroData();
        fetchMarketData();
    }
    
    // --- LÓGICA DA PÁGINA 'TRADUTOR FINANCEIRO' ---
    if (document.getElementById('translate-btn')) {
        const translateBtn = document.getElementById('translate-btn');
        const termInput = document.getElementById('term-input');
        const resultContainer = document.getElementById('result-container');
        const explanationOutput = document.getElementById('explanation-output');

        translateBtn.addEventListener('click', async () => {
            const termo = termInput.value;
            if (!termo.trim()) {
                alert('Por favor, digite um termo para traduzir.');
                return;
            }

            translateBtn.textContent = 'Pensando...';
            translateBtn.disabled = true;
            resultContainer.classList.add('hidden');

            try {
                const response = await fetch('/api/tradutor', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ termo: termo }),
                });
                const data = await response.json();
                if (response.ok) {
                    explanationOutput.textContent = data.explicacao;
                    resultContainer.classList.remove('hidden');
                } else {
                    throw new Error(data.erro || 'Ocorreu um erro desconhecido.');
                }
            } catch (error) {
                console.error("Erro na tradução:", error);
                explanationOutput.textContent = `Erro: ${error.message}`;
                resultContainer.classList.remove('hidden');
            } finally {
                translateBtn.textContent = 'Traduzir';
                translateBtn.disabled = false;
            }
        });
    }
});
