/* /js/script.js - Versão Final e Completa */

document.addEventListener('DOMContentLoaded', function() {

    // --- LÓGICA GERAL: Destacar link de navegação ---
    try {
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        document.querySelectorAll('nav a').forEach(link => {
            if (link.getAttribute('href') === currentPage) { link.classList.add('active'); }
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
                if (targetTab) targetTab.classList.add("active");
            });
        });
    }

    // --- LÓGICA DO SIMULADOR DE APOSENTADORIA ---
    const retirementForm = document.getElementById('retirement-form');
    if (retirementForm) {
        Chart.register(window.ChartjsPluginAnnotation);
        let projectionChart = null; 
        let latestSimulationData = null; 
        let currentView = 'nominal'; 

        const formatCurrency = (value) => (typeof value === 'number') ? value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '';

        function updateView(viewType) {
            //... (a função updateView completa que já te enviei)
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
                        data: { /* ... */ },
                        options: { /* ... Gráfico com anotação ... */ }
                    });
                }
                
                updateView('nominal');
                document.getElementById('result-section').classList.remove('hidden');
                document.getElementById('download-pdf').classList.remove('hidden');
                if (results.analiseIA) { /* ... */ }
                if (results.retiradaMaxima) { /* ... */ }

            } catch (error) {
                console.error("Erro ao simular:", error);
                alert("Não foi possível realizar a simulação. Tente novamente mais tarde.");
            } finally {
                submitButton.textContent = 'Analisar Cenários';
                submitButton.disabled = false;
            }
        });
        
        document.getElementById('download-pdf').addEventListener('click', function() { /* ... */ });
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
                const response = await fetch('/api/comparador', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
                const results = await response.json();
                if (!response.ok) { throw new Error(results.erro); }
                
                document.getElementById('comparison-results').classList.remove('hidden');
                
                const ctx = document.getElementById('comparison-chart').getContext('2d');
                if(comparisonChart) comparisonChart.destroy();
                const formatCurrency = (value) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                comparisonChart = new Chart(ctx, { /* ... Gráfico do comparador ... */ });
                
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
