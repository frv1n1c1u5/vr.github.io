/* /js/script.js - Versão Final e Completa com Todas as Ferramentas */

document.addEventListener('DOMContentLoaded', function() {

    // --- LÓGICA GERAL: Destacar link de navegação ---
    try {
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        document.querySelectorAll('nav a:not(.menu-button a)').forEach(link => {
            if (link.getAttribute('href') === currentPage) {
                link.classList.add('active');
            }
        });
    } catch(e) { console.error("Erro na navegação", e); }

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

    // --- LÓGICA DO SIMULADOR DE APOSENTADORIA ---
    const retirementForm = document.getElementById('retirement-form');
    if (retirementForm) {
        let retirementChart = null; // Renomeado para evitar conflito
        const resultsContainer = document.getElementById('retirement-results');

        retirementForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            const submitButton = retirementForm.querySelector('button[type="submit"]');
            submitButton.textContent = 'Calculando...';
            submitButton.disabled = true;
            resultsContainer.innerHTML = '<p style="text-align:center;">Analisando cenários, por favor aguarde...</p>';
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

                resultsContainer.innerHTML = `
                    <h3>Análise de Cenários</h3>
                    <div class="chart-container"><canvas id="retirement-chart-canvas"></canvas></div>
                    <div class="scenarios-grid">
                        <div class="scenario-card"><h4>Cenário Pessimista</h4><p>Patrimônio ao se aposentar:</p><strong id="pessimista-value" class="result-value negative"></strong></div>
                        <div class="scenario-card"><h4>Cenário Mediano</h4><p>Patrimônio ao se aposentar:</p><strong id="mediano-value" class="result-value"></strong></div>
                        <div class="scenario-card"><h4>Cenário Otimista</h4><p>Patrimônio ao se aposentar:</p><strong id="otimista-value" class="result-value positive"></strong></div>
                        <div class="scenario-card"><h4>Patrimônio Final (Herança)</h4><p>Estimativa mediana no fim da vida:</p><strong id="heranca-value" class="result-value"></strong></div>
                    </div>
                `;
                
                const formatCurrency = (value) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                document.getElementById('pessimista-value').textContent = formatCurrency(results.pessimista);
                document.getElementById('mediano-value').textContent = formatCurrency(results.mediano);
                document.getElementById('otimista-value').textContent = formatCurrency(results.otimista);
                document.getElementById('heranca-value').textContent = formatCurrency(results.patrimonioFinalMediano);
                
                const ctx = document.getElementById('retirement-chart-canvas').getContext('2d');
                if(retirementChart) retirementChart.destroy();
                retirementChart = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: results.graficoLabels,
                        datasets: [
                            { label: 'Projeção Mediana', data: results.graficoMediano, borderColor: 'rgb(10, 66, 117)', tension: 0.1, fill: true, backgroundColor: 'rgba(10, 66, 117, 0.1)' }
                        ]
                    },
                    options: { responsive: true, scales: { y: { ticks: { callback: (value) => formatCurrency(value) } } } }
                });
            } catch (error) {
                resultsContainer.innerHTML = `<p style="color:red; text-align:center;">Erro: ${error.message}</p>`;
            } finally {
                submitButton.textContent = 'Analisar Cenários';
                submitButton.disabled = false;
            }
        });
    }

    // --- LÓGICA DO COMPARADOR DE CENÁRIOS ---
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
                const response = await fetch('/api/comparador', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });
                const results = await response.json();
                if (!response.ok) { throw new Error(results.erro || 'Erro desconhecido'); }
                
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

                const summaryContainer = document.getElementById('comparison-summary');
                const resumo = results.resumo;
                summaryContainer.innerHTML = `
                    <div class="scenario-card"><h4>Financiamento</h4><p>Patrimônio Final:</p><strong class="result-value">${formatCurrency(resumo.financiamento)}</strong></div>
                    <div class="scenario-card"><h4>Aluguel</h4><p>Patrimônio Final:</p><strong class="result-value positive">${formatCurrency(resumo.aluguel)}</strong></div>
                    <div class="scenario-card"><h4>Consórcio</h4><p>Patrimônio Final:</p><strong class="result-value">${formatCurrency(resumo.consorcio)}</strong></div>
                `;
                summaryContainer.classList.remove('hidden');

            } catch (error) {
                alert("Erro ao comparar cenários: " + error.message);
            } finally {
                submitButton.textContent = 'Comparar Cenários';
                submitButton.disabled = false;
            }
        });
    }
});
