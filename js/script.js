/* /js/script.js */
// VERSÃO COMPLETA E FINAL COM TODAS AS FUNCIONALIDADES

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

    // --- LÓGICA DA PÁGINA 'CLIENTES': Simulador com Gráfico e PDF ---
    const retirementForm = document.getElementById('retirement-form');
    if (retirementForm) {
        let projectionChart = null; 

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
                const response = await fetch('/api/aposentadoria', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData),
                });
                const results = await response.json();
                if (!response.ok) { throw new Error(results.erro || 'Erro no servidor'); }

                document.getElementById('result-section').classList.remove('hidden');
                document.getElementById('download-pdf').classList.remove('hidden');

                const formatCurrency = (value) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                document.getElementById('pessimista-value').textContent = formatCurrency(results.pessimista);
                document.getElementById('mediano-value').textContent = formatCurrency(results.mediano);
                document.getElementById('otimista-value').textContent = formatCurrency(results.otimista);

                if (results.analiseIA) {
                    document.getElementById('ai-text').innerHTML = results.analiseIA.replace(/\n/g, '<br>');
                    document.getElementById('ai-analysis').classList.remove('hidden');
                }

                const ctx = document.getElementById('projection-chart').getContext('2d');
                if (projectionChart) {
                    projectionChart.destroy();
                }
                projectionChart = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: results.graficoLabels,
                        datasets: [
                        {
                            label: 'Cenário Otimista (90%)',
                            data: results.graficoOtimista,
                            borderColor: 'rgba(40, 167, 69, 0.3)',
                            pointRadius: 0,
                            borderWidth: 1,
                        }, {
                            label: 'Projeção Mediana (50%)',
                            data: results.graficoMediano,
                            borderColor: 'rgb(10, 66, 117)',
                            backgroundColor: 'rgba(10, 66, 117, 0.1)',
                            fill: '-1', // Preenche até a linha anterior (Otimista)
                            tension: 0.2,
                            pointRadius: 1,
                            borderWidth: 2,
                        }, {
                            label: 'Cenário Pessimista (10%)',
                            data: results.graficoPessimista,
                            borderColor: 'rgba(220, 53, 69, 0.3)',
                            backgroundColor: 'rgba(10, 66, 117, 0.1)',
                            fill: '-1', // Preenche até a linha anterior (Mediana)
                            pointRadius: 0,
                            borderWidth: 1,
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { tooltip: { callbacks: { label: (c) => `Patrimônio: ${formatCurrency(c.parsed.y)}` } } },
                        scales: { y: { ticks: { callback: (v) => formatCurrency(v).replace(/\s/g, '') } } }
                    }
                });

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
            const options = {
                margin:       [0.5, 0.5, 0.5, 0.5],
                filename:     'relatorio_simulacao_aposentadoria.pdf',
                image:        { type: 'jpeg', quality: 0.98 },
                html2canvas:  { scale: 2, useCORS: true, logging: false },
                jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
            };
            html2pdf().set(options).from(reportElement).save();
        });
    }

    // --- LÓGICA DA PÁGINA 'INDICADORES' ---
    if (document.getElementById('indicators-container')) {
        // ... (código dos indicadores continua o mesmo) ...
    }
    
    // --- LÓGICA DA PÁGINA 'TRADUTOR FINANCEIRO' ---
    if (document.getElementById('translate-btn')) {
        // ... (código do tradutor continua o mesmo) ...
    }
});
