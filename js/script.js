/* /js/script.js - v4 com Motor de Simulação Monte Carlo no Frontend */

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

    // --- LÓGICA DO SIMULADOR DE APOSENTADORIA ---
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

            // Adiciona um pequeno delay para o navegador atualizar a tela antes do cálculo pesado
            await new Promise(resolve => setTimeout(resolve, 50));

            try {
                // Coleta os dados do formulário
                const inputs = {
                    idadeAtual: parseInt(document.getElementById('current-age').value),
                    idadeAposentadoria: parseInt(document.getElementById('retirement-age').value),
                    patrimonioAtual: parseFloat(document.getElementById('current-patrimony').value),
                    aporteMensal: parseFloat(document.getElementById('monthly-contribution').value),
                    rentabilidadeAnual: parseFloat(document.getElementById('annual-return').value) / 100,
                    inflacaoAnual: parseFloat(document.getElementById('annual-inflation').value) / 100,
                    custoVidaMensal: parseFloat(document.getElementById('post-retirement-cost').value),
                    expectativaVida: parseInt(document.getElementById('life-expectancy').value)
                };

                // Executa a simulação de Monte Carlo
                const results = runMonteCarloSimulation(inputs);
                
                // ---- Exibe os resultados ----

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
                resultsContainer.classList.remove('hidden');

                // Preenche os cards com os valores
                document.getElementById('pessimista-value').textContent = formatCurrency(results.pessimista);
                document.getElementById('mediano-value').textContent = formatCurrency(results.mediano);
                document.getElementById('otimista-value').textContent = formatCurrency(results.otimista);
                document.getElementById('heranca-value').textContent = formatCurrency(results.patrimonioFinalMediano);
                
                // Preenche e exibe o card de sugestão de retirada
                document.getElementById('sugestao-preservacao').textContent = formatCurrency(results.sugestaoPreservacao);
                // O segundo card de sugestão pode ser calculado e preenchido aqui se desejar
                document.getElementById('sugestao-maxima').textContent = "N/A"; // Exemplo
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
                                fill: '-1' // Preenche a área entre esta linha e a linha otimista
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
                                        value: results.anoAposentadoria,
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
                console.error("Erro na simulação:", error);
                resultsContainer.innerHTML = `<p style="color:red; text-align:center; padding: 2rem 0;">Ocorreu um erro durante a simulação. Verifique os valores e tente novamente.</p>`;
                resultsContainer.classList.remove('hidden');
            } finally {
                submitButton.textContent = 'Analisar Cenários';
                submitButton.disabled = false;
            }
        });
    }

    /**
     * =================================================================
     * MOTOR DE SIMULAÇÃO MONTE CARLO
     * =================================================================
     * Esta função faz todos os cálculos e retorna os resultados.
     */
    function runMonteCarloSimulation(inputs) {
        const NUM_SIMULATIONS = 1000;
        const PESSIMISTIC_PERCENTILE = 0.10; // 10%
        const OPTIMISTIC_PERCENTILE = 0.90; // 90%
        
        // Assume um desvio padrão para a rentabilidade (volatilidade)
        const RENTABILIDADE_DESVIO_PADRAO = 0.08; 

        let allSimulations = [];

        for (let i = 0; i < NUM_SIMULATIONS; i++) {
            let patrimonioAnual = [inputs.patrimonioAtual];
            let patrimonioAtualSimulacao = inputs.patrimonioAtual;

            for (let idade = inputs.idadeAtual + 1; idade <= inputs.expectativaVida; idade++) {
                // Gera uma rentabilidade aleatória para o ano usando uma distribuição normal
                // (Aproximação simples: média de 2 números aleatórios)
                const randomFactor = (Math.random() + Math.random()) - 1; // Média 0, entre -1 e 1
                const rentabilidadeDoAno = inputs.rentabilidadeAnual + (randomFactor * RENTABILIDADE_DESVIO_PADRAO);
                
                patrimonioAtualSimulacao *= (1 + rentabilidadeDoAno);

                if (idade <= inputs.idadeAposentadoria) {
                    // Fase de acumulação: adiciona aportes
                    patrimonioAtualSimulacao += inputs.aporteMensal * 12;
                } else {
                    // Fase de retirada: subtrai custo de vida (corrigido pela inflação)
                    const custoVidaAnualCorrigido = (inputs.custoVidaMensal * 12) * Math.pow(1 + inputs.inflacaoAnual, idade - inputs.idadeAposentadoria);
                    patrimonioAtualSimulacao -= custoVidaAnualCorrigido;
                }
                
                if (patrimonioAtualSimulacao < 0) patrimonioAtualSimulacao = 0;
                
                patrimonioAnual.push(patrimonioAtualSimulacao);
            }
            allSimulations.push(patrimonioAnual);
        }

        // --- Processa os resultados das simulações ---
        let graficoLabels = [];
        let graficoPessimista = [];
        let graficoMediano = [];
        let graficoOtimista = [];

        const anosTotais = inputs.expectativaVida - inputs.idadeAtual;
        for (let j = 0; j <= anosTotais; j++) {
            let valoresDoAno = allSimulations.map(sim => sim[j]).sort((a, b) => a - b);
            
            graficoLabels.push(new Date().getFullYear() + j);
            graficoPessimista.push(valoresDoAno[Math.floor(NUM_SIMULATIONS * PESSIMISTIC_PERCENTILE)]);
            graficoMediano.push(valoresDoAno[Math.floor(NUM_SIMULATIONS * 0.50)]);
            graficoOtimista.push(valoresDoAno[Math.floor(NUM_SIMULATIONS * OPTIMISTIC_PERCENTILE)]);
        }

        // --- Calcula os valores para os cards ---
        const indiceAposentadoria = inputs.idadeAposentadoria - inputs.idadeAtual;
        const valoresNaAposentadoria = allSimulations.map(sim => sim[indiceAposentadoria]).sort((a, b) => a - b);
        
        const pessimista = valoresNaAposentadoria[Math.floor(NUM_SIMULATIONS * PESSIMISTIC_PERCENTILE)];
        const mediano = valoresNaAposentadoria[Math.floor(NUM_SIMULATIONS * 0.50)];
        const otimista = valoresNaAposentadoria[Math.floor(NUM_SIMULATIONS * OPTIMISTIC_PERCENTILE)];
        const patrimonioFinalMediano = graficoMediano[graficoMediano.length - 1];

        // Cálculo da retirada mensal para preservar o capital
        const rentabilidadeReal = ((1 + inputs.rentabilidadeAnual) / (1 + inputs.inflacaoAnual)) - 1;
        const sugestaoPreservacao = (mediano * rentabilidadeReal) / 12;

        return {
            graficoLabels,
            graficoPessimista,
            graficoMediano,
            graficoOtimista,
            pessimista,
            mediano,
            otimista,
            patrimonioFinalMediano,
            anoAposentadoria: new Date().getFullYear() + indiceAposentadoria,
            sugestaoPreservacao
        };
    }
});
