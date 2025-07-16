/* /js/script.js */

// --- Lógica para destacar o link de navegação da página atual ---
document.addEventListener('DOMContentLoaded', function() {
    // Pega o nome do arquivo da URL atual. Ex: 'index.html', 'sobre.html'
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const navLinks = document.querySelectorAll('nav a');

    navLinks.forEach(link => {
        // Pega o nome do arquivo do atributo href do link
        const linkPage = link.getAttribute('href');

        // Remove a classe 'active' de todos os links que não são botões
        if (!link.parentElement.classList.contains('menu-button')) {
             link.classList.remove('active');
        }

        // Adiciona a classe 'active' se o href do link for igual à página atual
        if (linkPage === currentPage) {
            link.classList.add('active');
        }
    });

    // --- Lógica da Calculadora de Aposentadoria (apenas na página de clientes) ---
    const retirementForm = document.getElementById('retirement-form');
    if (retirementForm) {
        retirementForm.addEventListener('submit', function(event) {
            event.preventDefault(); // Impede o envio do formulário e recarregamento da página

            // 1. Obter os valores dos inputs
            const currentAge = parseInt(document.getElementById('current-age').value);
            const retirementAge = parseInt(document.getElementById('retirement-age').value);
            const currentPatrimony = parseFloat(document.getElementById('current-patrimony').value);
            const monthlyContribution = parseFloat(document.getElementById('monthly-contribution').value);
            const annualReturn = parseFloat(document.getElementById('annual-return').value) / 100;
            const annualInflation = parseFloat(document.getElementById('annual-inflation').value) / 100;

            // 2. Validações simples
            if (retirementAge <= currentAge) {
                alert("A idade de aposentadoria deve ser maior que a idade atual.");
                return;
            }

            // 3. Calcular os parâmetros
            const yearsToInvest = retirementAge - currentAge;
            const monthsToInvest = yearsToInvest * 12;
            const monthlyReturn = Math.pow(1 + annualReturn, 1 / 12) - 1;

            // 4. Calcular o valor futuro do patrimônio atual
            const futureValueOfCurrentPatrimony = currentPatrimony * Math.pow(1 + monthlyReturn, monthsToInvest);

            // 5. Calcular o valor futuro dos aportes mensais
            const futureValueOfContributions = monthlyContribution * ((Math.pow(1 + monthlyReturn, monthsToInvest) - 1) / monthlyReturn);

            // 6. Calcular o patrimônio bruto total
            const totalFutureValue = futureValueOfCurrentPatrimony + futureValueOfContributions;
            
            // 7. Ajustar o valor pela inflação para encontrar o poder de compra real
            const adjustedFutureValue = totalFutureValue / Math.pow(1 + annualInflation, yearsToInvest);

            // 8. Exibir os resultados
            document.getElementById('result-age').textContent = retirementAge;
            
            const formatCurrency = (value) => {
                return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            };

            document.getElementById('future-value').textContent = formatCurrency(totalFutureValue);
            document.getElementById('future-value-adjusted').textContent = formatCurrency(adjustedFutureValue);

            // Tornar a seção de resultado visível
            document.getElementById('result-section').classList.remove('hidden');
        });
    }

    // --- Lógica para o Download do PDF (apenas na página de clientes) ---
    const downloadButton = document.getElementById('download-pdf');
    if (downloadButton) {
        downloadButton.addEventListener('click', function() {
            const resultContent = document.getElementById('result-content');
            
            const options = {
                margin:       1,
                filename:     'planejamento_aposentadoria_vinicius_rocha.pdf',
                image:        { type: 'jpeg', quality: 0.98 },
                html2canvas:  { scale: 2 },
                jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
            };

            // Gera o PDF a partir do elemento #result-content
            html2pdf().set(options).from(resultContent).save();
        });
    }
});