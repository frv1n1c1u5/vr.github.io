/* /js/script.js */
// VERSÃO DEFINITIVA E 100% COMPLETA - VERIFICADO

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
                if (targetTab) {
                    targetTab.classList.add("active");
                }
            });
        });
    }

    // --- LÓGICA DA PÁGINA 'CLIENTES': Simulador de Aposentadoria ---
    const retirementForm = document.getElementById('retirement-form');
    if (retirementForm) {
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
                                tooltip: { callbacks: { label: (c) => `Patrimônio: ${formatCurrency(c.parsed.y)}` } },
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
                
                updateView('nominal');
                document.getElementById('result-section').classList.remove('hidden');
                document.getElementById('download-pdf').classList.remove('hidden');
                if (results.analiseIA) {
                    document.getElementById('ai-text').innerHTML = results.analiseIA.replace(/\n/g, '<br>');
                    document.getElementById('ai-analysis').classList.remove('hidden');
                }
                if (results.retiradaMaxima) {
                    document.getElementById('suggestion-card').classList.remove('hidden');
                }
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
});
