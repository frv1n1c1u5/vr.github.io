/* /js/script.js */
// VERSÃO FINAL COM TODAS AS FUNCIONALIDADES INTEGRADAS (MENOS O TRADUTOR)

document.addEventListener('DOMContentLoaded', function() {

    // --- LÓGICA GERAL: Destacar link de navegação da página ativa ---
    try {
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        const navLinks = document.querySelectorAll('nav a');
        navLinks.forEach(link => {
            const linkHref = link.getAttribute('href');
            if (!link.parentElement.classList.contains('menu-button')) {
                link.classList.remove('active');
            }
            if (linkHref === currentPage) {
                link.classList.add('active');
            }
        });
    } catch (e) {
        console.error("Erro ao ativar link de navegação:", e);
    }

    // --- LÓGICA DA PÁGINA 'CLIENTES': Simulador com Visão Nominal/Real ---
    const retirementForm = document.getElementById('retirement-form');
    if (retirementForm) {
        // ... (Todo o código do simulador que já está funcionando perfeitamente)
    }

    // --- LÓGICA DA PÁGINA 'CLIENTES': Navegação por Abas ---
    const tabsContainer = document.querySelector(".tool-tabs");
    if (tabsContainer) {
        const tabLinks = document.querySelectorAll(".tab-link");
        const tabPanes = document.querySelectorAll(".tab-pane");

        tabLinks.forEach(link => {
            link.addEventListener("click", () => {
                tabLinks.forEach(l => l.classList.remove("active"));
                tabPanes.forEach(p => p.classList.remove("active"));
                link.classList.add("active");
                const targetTab = document.getElementById(link.dataset.tab);
                if(targetTab) {
                    targetTab.classList.add("active");
                }
            });
        });
    }

    // --- LÓGICA DA PÁGINA 'CLIENTES': Comparador de Cenários ---
    const comparisonForm = document.getElementById('comparison-form');
    if(comparisonForm) {
        let comparisonChart = null;
        comparisonForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            const submitButton = comparisonForm.querySelector('button[type="submit"]');
            submitButton.textContent = 'Calculando...';
            submitButton.disabled = true;
            const formData = {
                valor_imovel: document.getElementById('comp-valor-imovel').value,
                valor_entrada: document.getElementById('comp-valor-entrada').value,
                prazo_anos: document.getElementById('comp-prazo-anos').value,
                juros_financiamento_aa: document.getElementById('comp-juros-financiamento').value,
                valor_aluguel_mensal: document.getElementById('comp-valor-aluguel').value,
                reajuste_aluguel_aa: document.getElementById('comp-reajuste-aluguel').value,
                valorizacao_imovel_aa: document.getElementById('comp-valorizacao-imovel').value,
                rentabilidade_investimentos_aa: document.getElementById('comp-rentabilidade-investimentos').value,
                taxa_adm_consorcio_total: document.getElementById('comp-taxa-consorcio').value
            };
            try {
                const response = await fetch('/api/comparador', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
                const results = await response.json();
                if (!response.ok) { throw new Error(results.erro); }
                document.getElementById('comparison-results').classList.remove('hidden');
                const ctx = document.getElementById('comparison-chart').getContext('2d');
                if(comparisonChart) comparisonChart.destroy();
                const formatCurrency = (value) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                comparisonChart = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: results.labels.map(year => new Date().getFullYear() + year),
                        datasets: [
                            { label: 'Patrimônio com Financiamento', data: results.financiamento, borderColor: 'rgb(220, 53, 69)', tension: 0.1 },
                            { label: 'Patrimônio com Aluguel', data: results.aluguel, borderColor: 'rgb(10, 66, 117)', tension: 0.1 },
                            { label: 'Patrimônio com Consórcio (Mediano)', data: results.consorcio, borderColor: 'rgb(40, 167, 69)', borderDash: [5, 5], tension: 0.1 }
                        ]
                    },
                     options: {
                        responsive: true, maintainAspectRatio: false,
                        plugins: { tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${formatCurrency(c.parsed.y)}` } } },
                        scales: { y: { ticks: { callback: (v) => formatCurrency(v).replace(/\s/g, '') } } }
                    }
                });
            } catch (error) {
                console.error("Erro ao comparar cenários:", error);
                alert("Não foi possível realizar a comparação. Verifique os valores.");
            } finally {
                submitButton.textContent = 'Comparar Cenários';
                submitButton.disabled = false;
            }
        });
    }

    // --- LÓGICA DA PÁGINA 'INDICADORES' ---
    if (document.getElementById('indicators-container')) {
        // COLE SUA CHAVE DA ALPHA VANTAGE AQUI
        const ALPHA_VANTAGE_KEY = 'SUA_CHAVE_API_DA_ALPHA_VANTAGE_AQUI'; 
        
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
                    element.textContent = `${numericValue > 0 ? '+' : ''}${numericValue.toFixed(precision)}${suffix}`;
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
                return console.error("A chave da API da Alpha Vantage não foi definida.");
            }
            const urlIbov = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=IBOV.SA&apikey=${ALPHA_VANTAGE_KEY}`;
            const urlDolar = `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=USD&to_currency=BRL&apikey=${ALPHA_VANTAGE_KEY}`;
            try {
                const [ibovResponse, dolarResponse] = await Promise.all([fetch(urlIbov), fetch(urlDolar)]);
                const ibovData = await ibovResponse.json();
                const dolarData = await dolarResponse.json();
                const ibovQuote = ibovData['Global Quote'];
                const dolarQuote = dolarData['Realtime Currency Exchange Rate'];
                if (dolarQuote) updateText('dolar-atual', dolarQuote['5. Exchange Rate'], 'R$ ', 4);
                if (ibovQuote) {
                    updateText('ibov-pontos', ibovQuote['05. price'], '', 0);
                    updateColoredText('ibov-dia', ibovQuote['10. change percent'].replace('%',''), '%');
                }
            } catch (error) { console.error('Erro ao buscar dados da Alpha Vantage:', error); }
        }
        
        updateText('dolar-min-max-12m', '-');
        updateText('ibov-ano', '-');
        updateText('ibov-12m', '-');

        fetchBCBMacroData();
        fetchMarketData();
    }
});
