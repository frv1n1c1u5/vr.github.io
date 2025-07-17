/* /js/script.js - v5 Final com Chamada para API Backend */

document.addEventListener('DOMContentLoaded', function() {

    const formatCurrency = (value) => {
        if (typeof value !== 'number') return '';
        return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    // --- LÓGICA GERAL: Navegação ---
    try {
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        document.querySelectorAll('nav a:not(.menu-button a)').forEach(link => {
            if (link.getAttribute('href') === currentPage) {
                link.classList.add('active');
            }
        });
    } catch (e) { console.error("Erro na navegação", e); }

    // --- LÓGICA DAS ABAS (clientes.html) ---
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

    // --- LÓGICA DO SIMULADOR DE APOSENTADORIA (com Fetch) ---
    const retirementForm = document.getElementById('retirement-form');
    if (retirementForm) {
        let retirementChart = null;

        retirementForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            const submitButton = retirementForm.querySelector('button[type="submit"]');
            const resultsContainer = document.getElementById('retirement-results');
            const suggestionCard = document.getElementById('suggestion-card');

            submitButton.textContent = 'Calculando...';
            submitButton.disabled = true;
            resultsContainer.classList.add('hidden');
            suggestionCard.classList.add('hidden');
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

                // Remonta a estrutura HTML dos resultados
                resultsContainer.innerHTML = `
                    <h3>Análise de Cenários</h3>
                    <div class="chart-container"><canvas id="retirement-chart-canvas"></canvas></div>
                    <div class="scenarios-grid">
                        <div class="scenario-card"><h4>Cenário Pessimista (10%)</h4><p>Patrimônio ao se aposentar:</p><strong id="pessimista-value" class="result-value negative"></strong></div>
                        <div class="scenario-card"><h4>Cenário Mediano (50%)</h4><p>Patrimônio ao se aposentar:</p><strong id="mediano-value" class="result-value"></strong></div>
                        <div class="scenario-card"><h4>Cenário Otimista (90%)</h4><p>Patrimônio ao se aposentar:</p><strong id="otimista-value" class="result-value positive"></strong></div>
                        <div class="scenario-card"><h4>Patrimônio Final (Herança)</h4><p>Estimativa mediana no fim da vida:</p><strong id="heranca-value" class="result-value"></strong></div>
                    </div>
                `;
                
                // Preenche os cards com os valores
                document.getElementById('pessimista-value').textContent = formatCurrency(results.pessimista);
                document.getElementById('mediano-value').textContent = formatCurrency(results.mediano);
                document.getElementById('otimista-value').textContent = formatCurrency(results.otimista);
                document.getElementById('heranca-value').textContent = formatCurrency(results.patrimonioFinalMediano);
                
                // Preenche e exibe o card de sugestão de retirada
                document.getElementById('sugestao-preservacao').textContent = formatCurrency(results.sugestaoPreservacao);
                suggestionCard.classList.remove('hidden');

                // ---- Lógica do Gráfico Avançado ----
                const ctx = document.getElementById('retirement-chart-canvas').getContext('2d');
                if (retirementChart) retirementChart.destroy();
                
                retirementChart = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: results.graficoLabels,
                        datasets: [
                            {
                                label: 'Cenário Otimista',
                                data: results.graficoOtimista,
                                borderColor: 'rgba(40, 167, 69, 0.4)',
                                borderWidth: 1,
                                pointRadius: 0,
                            },
                            {
                                label: 'Cenário Pessimista',
                                data: results.graficoPessimista,
                                borderColor: 'rgba(220, 53, 69, 0.4)',
                                backgroundColor: 'rgba(10, 66, 117, 0.1)',
                                borderWidth: 1,
                                pointRadius: 0,
                                fill: '-1'
                            },
                            {
                                label: 'Projeção Mediana',
                                data: results.graficoMediano,
                                borderColor: 'rgb(10, 66, 117)',
                                borderWidth: 2,
                                pointRadius: 0,
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: { y: { ticks: { callback: (value) => formatCurrency(value) } } },
                        plugins: {
                            legend: { display: false },
                            tooltip: { mode: 'index', intersect: false },
                            annotation: {
                                annotations: {
                                    retirementLine: {
                                        type: 'line',
                                        scaleID: 'x',
                                        value: results.anoAposentadoria, // Chave vinda da API
                                        borderColor: '#0a4275',
                                        borderWidth: 2,
                                        borderDash: [6, 6],
                                        label: {
                                            content: 'Aposentadoria',
                                            enabled: true,
                                            position: 'start',
                                            backgroundColor: '#0a4275',
                                            font: { weight: 'bold' }
                                        }
                                    }
                                }
                            }
                        }
                    }
                });

            } catch (error) {
                console.error("Erro na comunicação com a API:", error);
                resultsContainer.innerHTML = `<p style="color:red; text-align:center; padding: 2rem 0;">${error.message}</p>`;
            } finally {
                submitButton.textContent = 'Analisar Cenários';
                submitButton.disabled = false;
            }
        });
    }

    // Código do comparador e outras lógicas continuam aqui...
});
