/* /js/script.js */
// VERSÃO COMPLETA E CORRIGIDA COM NOVAS APIs

document.addEventListener('DOMContentLoaded', function() {

    // --- LÓGICA GERAL: Destacar link de navegação da página ativa ---
    try {
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        const navLinks = document.querySelectorAll('nav a');
        navLinks.forEach(link => {
            const linkPage = link.getAttribute('href');
            if (!link.parentElement.classList.contains('menu-button')) {
                link.classList.remove('active');
            }
            if (linkPage === currentPage) {
                link.classList.add('active');
            }
        });
    } catch (e) {
        console.error("Erro ao ativar link de navegação:", e);
    }

    // --- LÓGICA DA PÁGINA 'CLIENTES': Calculadora de Aposentadoria ---
    const retirementForm = document.getElementById('retirement-form');
    if (retirementForm) {
        // ... (o código da calculadora continua o mesmo, não precisa ser alterado) ...
        retirementForm.addEventListener('submit', function(event) {
            event.preventDefault();
            const currentAge = parseInt(document.getElementById('current-age').value);
            const retirementAge = parseInt(document.getElementById('retirement-age').value);
            const currentPatrimony = parseFloat(document.getElementById('current-patrimony').value);
            const monthlyContribution = parseFloat(document.getElementById('monthly-contribution').value);
            const annualReturn = parseFloat(document.getElementById('annual-return').value) / 100;
            const annualInflation = parseFloat(document.getElementById('annual-inflation').value) / 100;

            if (retirementAge <= currentAge) {
                alert("A idade de aposentadoria deve ser maior que a idade atual.");
                return;
            }

            const yearsToInvest = retirementAge - currentAge;
            const monthsToInvest = yearsToInvest * 12;
            const monthlyReturn = Math.pow(1 + annualReturn, 1 / 12) - 1;
            const futureValueOfCurrentPatrimony = currentPatrimony * Math.pow(1 + monthlyReturn, monthsToInvest);
            const futureValueOfContributions = monthlyContribution * ((Math.pow(1 + monthlyReturn, monthsToInvest) - 1) / monthlyReturn);
            const totalFutureValue = futureValueOfCurrentPatrimony + futureValueOfContributions;
            const adjustedFutureValue = totalFutureValue / Math.pow(1 + annualInflation, yearsToInvest);
            
            document.getElementById('result-age').textContent = retirementAge;
            const formatCurrency = (value) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            document.getElementById('future-value').textContent = formatCurrency(totalFutureValue);
            document.getElementById('future-value-adjusted').textContent = formatCurrency(adjustedFutureValue);
            document.getElementById('result-section').classList.remove('hidden');
        });

        const downloadButton = document.getElementById('download-pdf');
        if(downloadButton) {
            downloadButton.addEventListener('click', function() {
                const resultContent = document.getElementById('result-content');
                const options = { margin: 1, filename: 'planejamento_aposentadoria.pdf', image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' } };
                html2pdf().set(options).from(resultContent).save();
            });
        }
    }

    // --- LÓGICA DA PÁGINA 'INDICADORES': Buscar dados macroeconômicos ---
    if (document.getElementById('indicators-container')) {
        
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
                    element.textContent = `${numericValue.toFixed(precision)}${suffix}`;
                    element.classList.remove('positive', 'negative');
                    if(numericValue > 0) element.classList.add('positive');
                    if(numericValue < 0) element.classList.add('negative');
                } else {
                    element.textContent = value || 'N/A';
                }
            }
        };

        // CORREÇÃO: IDs das séries do BCB atualizados
        async function fetchBCBMacroData() {
            const seriesIds = {
                'ipca-ano': 433,      // IPCA - Acumulado no ano
                'ipca-12m': 13522,    // IPCA - Acumulado nos últimos 12 meses
                'selic-ano': 11,       // Taxa de juros SELIC - Acumulada no ano
                'selic-12m': 4189,     // Taxa de juros SELIC - Acumulada 12 meses
                'igpm-ano': 189,       // IGP-M - Acumulado no ano
                'igpm-12m': 190,       // IGP-M - Acumulado 12 meses
                'dolar-atual': 1       // Dólar (PTAX)
            };
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
                updateText('dolar-atual', data.find(d => d.codigoSerie == seriesIds['dolar-atual']).valor, 'R$ ', 4);
            } catch (error) { console.error('Erro BCB Macro:', error); }
        }
        
        async function fetchDollarHistory() {
            const today = new Date();
            const oneYearAgo = new Date(new Date().setFullYear(today.getFullYear() - 1));
            const formatDate = (d) => `${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}`;
            const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.1/dados?formato=json&dataInicial=${formatDate(oneYearAgo)}&dataFinal=${formatDate(today)}`;
            try {
                const response = await fetch(url);
                 if (!response.ok) throw new Error('Falha na resposta da API de histórico do BCB');
                const data = await response.json();
                const values = data.map(item => parseFloat(item.valor));
                document.getElementById('dolar-min-max-12m').textContent = `R$ ${Math.min(...values).toFixed(4)} / R$ ${Math.max(...values).toFixed(4)}`;
            } catch (error) { console.error('Erro Histórico Dólar:', error); }
        }

        // CORREÇÃO: Adicionado o token na chamada da API Brapi
        async function fetchBrapiData() {
            // COLE SEU TOKEN DA BRAPI AQUI
            const BRAPI_TOKEN = 'h4j95YrdT59wnxbf8BnYq8';

            const tickers = 'IBOV,USDBRL';
            const url = `https://brapi.dev/api/quote/${tickers}?range=1y&interval=1d&token=${BRAPI_TOKEN}`;
            
            try {
                const response = await fetch(url);
                if (!response.ok) throw new Error('Falha na resposta da API Brapi');
                const data = await response.json();
                if(!data.results) throw new Error('A resposta da Brapi não contém "results"');
                
                const [ibov, dolar] = data.results;

                updateColoredText('dolar-dia', dolar.regularMarketChangePercent, '%');
                updateText('ibov-pontos', ibov.regularMarketPrice, '', 0);
                updateColoredText('ibov-dia', ibov.regularMarketChangePercent, '%');
                
                const ytdPrice = ibov.historicalDataPrice.find(p => new Date(p.date * 1000).getFullYear() === new Date().getFullYear());
                const ytdVariation = ytdPrice ? ((ibov.regularMarketPrice / ytdPrice.open) - 1) * 100 : 0;
                updateColoredText('ibov-ano', ytdVariation, '%');
                
                const last12mPrice = ibov.historicalDataPrice[ibov.historicalDataPrice.length-1];
                if(last12mPrice) {
                    const variation12m = ((ibov.regularMarketPrice / last12mPrice.open) - 1) * 100;
                    updateColoredText('ibov-12m', variation12m, '%');
                } else {
                    document.getElementById('ibov-12m').textContent = 'N/A';
                }
            } catch (error) { console.error('Erro Brapi:', error); }
        }

        fetchBCBMacroData();
        fetchDollarHistory();
        fetchBrapiData();
    }
});
