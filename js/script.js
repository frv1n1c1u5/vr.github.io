/* js/script.js - CÓDIGO COMPLETO E FINAL */

document.addEventListener('DOMContentLoaded', function() {

    const formatCurrency = (value) => {
        if (typeof value !== 'number') return '';
        return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    try {
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        document.querySelectorAll('nav a:not(.menu-button a)').forEach(link => {
            if (link.getAttribute('href') === currentPage) {
                link.classList.add('active');
            }
        });
    } catch (e) { console.error("Erro na navegação", e); }

    const tabsContainer = document.querySelector(".tool-tabs");
    if (tabsContainer) {
        const tabLinks = document.querySelectorAll(".tab-link");
        const tabPanes = document.querySelectorAll(".tab-pane");
        tabsContainer.addEventListener('click', function(event) {
            const clickedLink = event.target.closest('.tab-link');
            if (!clickedLink) return;
            tabLinks.forEach(l => l.classList.remove("active"));
            tabPanes.forEach(p => p.classList.remove("active"));
            clickedLink.classList.add("active");
            const targetTab = document.getElementById(clickedLink.dataset.tab);
            if (targetTab) {
                targetTab.classList.add("active");
            }
        });
    }

    const retirementForm = document.getElementById('retirement-form');
    if (retirementForm) {
        let retirementChart = null;
        let apiResults = null;
        let currentView = 'real';

        const resultsContainer = document.getElementById('retirement-results');
        const suggestionCard = document.getElementById('suggestion-card');
        const viewSelector = document.getElementById('view-selector');

        function updateDisplay() {
            if (!apiResults) return;
            const data = apiResults[currentView];

            document.getElementById('pessimista-value').textContent = formatCurrency(data.pessimista);
            document.getElementById('mediano-value').textContent = formatCurrency(data.mediano);
            document.getElementById('otimista-value').textContent = formatCurrency(data.otimista);
            document.getElementById('heranca-value').textContent = formatCurrency(data.patrimonioFinalMediano);
            document.getElementById('total-aportado-value').textContent = formatCurrency(data.totalAportado);
            document.getElementById('total-rendimentos-value').textContent = formatCurrency(data.totalRendimentos);
            
            if (currentView === 'real') {
                document.getElementById('sugestao-preservacao').textContent = formatCurrency(data.sugestaoPreservacao);
                suggestionCard.classList.remove('hidden');
            } else {
                suggestionCard.classList.add('hidden');
            }

            retirementChart.data.datasets[0].data = data.graficoOtimista;
            retirementChart.data.datasets[1].data = data.graficoPessimista;
            retirementChart.data.datasets[2].data = data.graficoMediano;
            retirementChart.update();
        }

        document.getElementById('view-real-btn').addEventListener('click', () => {
            currentView = 'real';
            document.getElementById('view-real-btn').classList.add('active');
            document.getElementById('view-nominal-btn').classList.remove('active');
            updateDisplay();
        });

        document.getElementById('view-nominal-btn').addEventListener('click', () => {
            currentView = 'nominal';
            document.getElementById('view-nominal-btn').classList.add('active');
            document.getElementById('view-real-btn').classList.remove('active');
            updateDisplay();
        });

        retirementForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            const submitButton = retirementForm.querySelector('button[type="submit"]');

            submitButton.textContent = 'Calculando...';
            submitButton.disabled = true;
            resultsContainer.classList.add('hidden');
            suggestionCard.classList.add('hidden');
            viewSelector.classList.add('hidden');
            resultsContainer.innerHTML = '<p style="text-align:center; padding: 2rem 0;">Analisando milhares de cenários, por favor aguarde...</p>';
            resultsContainer.classList.remove('hidden');

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

            try {
                const response = await fetch('/api/aposentadoria', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });
                const results = await response.json();
                if (!response.ok) { throw new Error(results.erro || 'Erro desconhecido no servidor'); }

                apiResults = results;

                resultsContainer.innerHTML = `
                    <h3>Análise de Cenários</h3>
                    <div class="chart-container"><canvas id="retirement-chart-canvas"></canvas></div>
                    <div class="scenarios-grid">
                        <div class="scenario-card"><h4>Cenário Mediano (50%)</h4><p>Patrimônio ao se aposentar:</p><strong id="mediano-value" class="result-value"></strong></div>
                        <div class="scenario-card"><h4>Cenário Otimista (90%)</h4><p>Patrimônio ao se aposentar:</p><strong id="otimista-value" class="result-value positive"></strong></div>
                        <div class="scenario-card"><h4>Cenário Pessimista (10%)</h4><p>Patrimônio ao se aposentar:</p><strong id="pessimista-value" class="result-value negative"></strong></div>
                        <div class="scenario-card"><h4>Total Aportado</h4><p>Soma de todas as contribuições:</p><strong id="total-aportado-value" class="result-value"></strong></div>
                        <div class="scenario-card"><h4>Total em Rendimentos</h4><p>Juros e valorização do período:</p><strong id="total-rendimentos-value" class="result-value positive"></strong></div>
                        <div class="scenario-card"><h4>Herança Mediana</h4><p>Estimativa de patrimônio final:</p><strong id="heranca-value" class="result-value"></strong></div>
                    </div>
                    <div id="ai-analysis-card" class="scenario-card" style="grid-column: 1 / -1; text-align: left; border-bottom-color: #6f42c1;">
                        <h4 style="color: #6f42c1; text-align:center;">Análise da Inteligência Artificial</h4>
                        <p id="ai-analysis-text" style="white-space: pre-wrap;"></p>
                    </div>
                `;
                
                document.getElementById('ai-analysis-text').textContent = apiResults.analiseIA;

                const ctx = document.getElementById('retirement-chart-canvas').getContext('2d');
                if (retirementChart) retirementChart.destroy();
                
                retirementChart = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: apiResults.real.graficoLabels,
                        datasets: [
                            { label: 'Cenário Otimista', data: [], borderColor: 'rgba(40, 167, 69, 0.4)', borderWidth: 1, pointRadius: 0 },
                            { label: 'Cenário Pessimista', data: [], borderColor: 'rgba(220, 53, 69, 0.4)', backgroundColor: 'rgba(10, 66, 117, 0.1)', borderWidth: 1, pointRadius: 0, fill: '-1' },
                            { label: 'Projeção Mediana', data: [], borderColor: 'rgb(10, 66, 117)', borderWidth: 2, pointRadius: 0 }
                        ]
                    },
                    options: {
                        responsive: true, maintainAspectRatio: false,
                        scales: { y: { ticks: { callback: (value) => formatCurrency(value) } } },
                        plugins: {
                            legend: { display: false },
                            tooltip: { mode: 'index', intersect: false },
                            annotation: {
                                annotations: {
                                    retirementLine: {
                                        type: 'line', scaleID: 'x', value: apiResults.anoAposentadoria,
                                        borderColor: '#0a4275', borderWidth: 2, borderDash: [6, 6],
                                        label: { content: 'Aposentadoria', enabled: true, position: 'start', backgroundColor: '#0a4275', font: { weight: 'bold' } }
                                    }
                                }
                            }
                        }
                    }
                });
                
                viewSelector.classList.remove('hidden');
                currentView = 'real';
                document.getElementById('view-real-btn').classList.add('active');
                document.getElementById('view-nominal-btn').classList.remove('active');
                updateDisplay(); 

            } catch (error) {
                console.error("Erro na comunicação com a API:", error);
                resultsContainer.innerHTML = `<p style="color:red; text-align:center; padding: 2rem 0;">${error.message}</p>`;
            } finally {
                submitButton.textContent = 'Analisar Cenários';
                submitButton.disabled = false;
            }
        });
    }
});
