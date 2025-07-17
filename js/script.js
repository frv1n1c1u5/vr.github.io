/* /js/script.js */
// VERSÃO COMPLETA E FINAL COM TODAS AS FUNCIONALIDADES - VERIFICADO

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

    // --- LÓGICA DA PÁGINA 'CLIENTES': Simulador com Gráfico e Anotação ---
    const retirementForm = document.getElementById('retirement-form');
    if (retirementForm) {
        // Registra os plugins do Chart.js que vamos usar
        Chart.register(window.ChartjsPluginAnnotation);

        let projectionChart = null; 
        let latestSimulationData = null; 
        let currentView = 'nominal'; 

        const formatCurrency = (value) => (typeof value === 'number') ? value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '';

        function updateView(viewType) {
            if (!latestSimulationData) return;
            currentView = viewType;
            const data = latestSimulationData;
            const inflationRate = parseFloat(document.getElementById('annual-inflation').value) / 100;
            
            document.getElementById('btn-nominal').classList.toggle('active', viewType === 'nominal');
            document.getElementById('btn-real').classList.toggle('active', viewType === 'real');

            let valPessimista = data.pessimista, valMediano = data.mediano, valOtimista = data.otimista, valHeranca = data.patrimonioFinalMediano;
            const anosAcumulando = parseInt(document.getElementById('retirement-age').value) - parseInt(document.getElementById('current-age').value);

            if (viewType === 'real') {
                valPessimista /= Math.pow(1 + inflationRate, anosAcumulando);
                valMediano /= Math.pow(1 + inflationRate, anosAcumulando);
                valOtimista /= Math.pow(1 + inflationRate, anosAcumulando);
                const totalAnos = parseInt(document.getElementById('life-expectancy').value) - parseInt(document.getElementById('current-age').value);
                valHeranca /= Math.pow(1 + inflationRate, totalAnos);
            }

            document.getElementById('pessimista-value').textContent = formatCurrency(valPessimista);
            document.getElementById('mediano-value').textContent = formatCurrency(valMediano);
            document.getElementById('otimista-value').textContent = formatCurrency(valOtimista);
            document.getElementById('heranca-value').textContent = formatCurrency(valHeranca);
            document.getElementById('sugestao-preservacao').textContent = formatCurrency(data.retiradaPreservacao);
            document.getElementById('sugestao-maxima').textContent = formatCurrency(data.retiradaMaxima);

            const chartData = {
                pessimista: viewType === 'real' ? data.graficoPessimista.map((v, i) => v / Math.pow(1 + inflationRate, i)) : data.graficoPessimista,
                mediano: viewType === 'real' ? data.graficoMediano.map((v, i) => v / Math.pow(1 + inflationRate, i)) : data.graficoMediano,
                otimista: viewType === 'real' ? data.graficoOtimista.map((v, i) => v / Math.pow(1 + inflationRate, i)) : data.graficoOtimista,
            };
            
            projectionChart.data.datasets[0].data = chartData.otimista;
            projectionChart.data.datasets[1].data = chartData.mediano;
            projectionChart.data.datasets[2].data = chartData.pessimista;
            projectionChart.options.plugins.annotation.annotations.retirementLine.xMin = String(data.anoAposentadoria);
            projectionChart.options.plugins.annotation.annotations.retirementLine.xMax = String(data.anoAposentadoria);
            projectionChart.options.plugins.tooltip.callbacks.label = (c) => `Patrimônio (${viewType}): ${formatCurrency(c.parsed.y)}`;
            projectionChart.update();
        }

        document.getElementById('btn-nominal').addEventListener('click', () => updateView('nominal'));
        document.getElementById('btn-real').addEventListener('click', () => updateView('real'));

        retirementForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            const formData = {
                idadeAtual: document.getElementById('current-age').value,
                idadeAposentadoria: document.getElementById('retirement-age').value,
                patrimonioAtual: document.getElementById('current-patrimony').value,
                aporteMensal: document.getElementById('monthly-contribution').value,
                rentabilidadeAnual: document.getElementById('annual-return').value,
                inflacaoAnual: document.getElementById('annual-inflation').value,
                custoVida: document.getElementById('post-retirement-cost').value,
                expectativaVida: document.getElementById('life-expectancy').value
            };
            const submitButton = retirementForm.querySelector('button[type="submit"]');
            submitButton.textContent = 'Analisando Cenários...';
            submitButton.disabled = true;

            try {
                const response = await fetch('/api/aposentadoria', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
                const results = await response.json();
                if (!response.ok) { throw new Error(results.erro || 'Erro no servidor'); }
                latestSimulationData = results; 

                if (!projectionChart) {
                    const ctx = document.getElementById('projection-chart').getContext('2d');
                    projectionChart = new Chart(ctx, {
                        type: 'line',
                        data: {
                            labels: results.graficoLabels,
                            datasets: [
                                { label: 'Cenário Otimista (90%)', data: [], borderColor: 'rgba(40, 167, 69, 0.3)', pointRadius: 0, borderWidth: 1 },
                                { label: 'Projeção Mediana (50%)', data: [], borderColor: 'rgb(10, 66, 117)', backgroundColor: 'rgba(10, 66, 117, 0.1)', fill: '-1', tension: 0.2, pointRadius: 1, borderWidth: 2 },
                                { label: 'Cenário Pessimista (10%)', data: [], borderColor: 'rgba(220, 53, 69, 0.3)', backgroundColor: 'rgba(10, 66, 117, 0.1)', fill: '-1', pointRadius: 0, borderWidth: 1 }
                            ]
                        },
                        options: {
                            responsive: true, maintainAspectRatio: false,
                            scales: {
                                x: { type: 'time', time: { unit: 'year', parser: 'yyyy', displayFormats: { year: 'yyyy' } } },
                                y: { ticks: { callback: (v) => formatCurrency(v).replace(/\s/g, '') } }
                            },
                            plugins: {
                                annotation: {
                                    annotations: {
                                        retirementLine: {
                                            type: 'line',
                                            xMin: "1900", xMax: "1900", // Valor inicial, será atualizado
                                            borderColor: 'rgba(220, 53, 69, 0.7)',
                                            borderWidth: 2,
                                            borderDash: [6, 6],
                                            label: { content: 'Aposentadoria', display: true, position: 'start', backgroundColor: 'rgba(220, 53, 69, 0.7)', font: { size: 10 } }
                                        }
                                    }
                                }
                            }
                        }
                    });
                }
                
                document.getElementById('result-section').classList.remove('hidden');
                document.getElementById('download-pdf').classList.remove('hidden');
                if (results.analiseIA) {
                    document.getElementById('ai-text').innerHTML = results.analiseIA.replace(/\n/g, '<br>');
                    document.getElementById('ai-analysis').classList.remove('hidden');
                }
                if (results.retiradaMaxima) {
                    document.getElementById('suggestion-card').classList.remove('hidden');
                }
                
                updateView('nominal');

            } catch (error) {
                console.error("Erro ao simular:", error);
                alert("Não foi possível realizar a simulação. Tente novamente mais tarde.");
            } finally {
                submitButton.textContent = 'Analisar Cenários';
                submitButton.disabled = false;
            }
        });
        
        document.getElementById('download-pdf').addEventListener('click', function() {
            const reportElement = document.getElementById('report-container');
            const titleElement = reportElement.querySelector('h3');
            const originalTitle = titleElement.textContent;
            titleElement.textContent = `Análise de Cenários (${currentView === 'nominal' ? 'Valores Nominais' : 'Poder de Compra Real'})`;
            const options = { margin: [0.5, 0.5, 0.5, 0.5], filename: `relatorio_aposentadoria_${currentView}.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2, useCORS: true, logging: false }, jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' } };
            html2pdf().set(options).from(reportElement).save().then(() => {
                titleElement.textContent = originalTitle;
            });
        });
    }

    // --- LÓGICA DA PÁGINA 'INDICADORES' ---
    if (document.getElementById('indicators-container')) {
        const ALPHA_VANTAGE_KEY = 'SUA_CHAVE_API_DA_ALPHA_VANTAGE_AQUI'; // Lembre-se de colocar sua chave aqui
        
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
        
        // Chamadas de histórico foram removidas da carga inicial para performance
        // Podem ser adicionadas a um botão "Ver detalhes" no futuro
        updateText('dolar-min-max-12m', '-');
        updateText('ibov-ano', '-');
        updateText('ibov-12m', '-');

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
                const response = await fetch('/api/tradutor', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ termo: termo }), });
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
