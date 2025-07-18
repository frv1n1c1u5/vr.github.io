# api/indicadores.py
# VERSÃO 2.0: Usa fontes diretas (Banco Central e yfinance) para máxima precisão.

from flask import Flask, jsonify
import httpx
import asyncio
import yfinance as yf
import pandas as pd
from datetime import datetime, timedelta
import pytz # Para lidar com fusos horários corretamente

app = Flask(__name__)

# --- Funções para buscar dados do Banco Central (SGS) ---
BCB_API_URL = "https://api.bcb.gov.br/dados/serie/bcdata.sgs.{codigo}/dados?formato=json"

async def fetch_bcb_series(client, codigo, dias=380):
    """Busca uma série temporal do Banco Central."""
    try:
        url = BCB_API_URL.format(codigo=codigo) + f"&dataInicial={ (datetime.now() - timedelta(days=dias)).strftime('%d/%m/%Y') }"
        response = await client.get(url)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"Erro ao buscar série {codigo} do BCB: {e}")
        return []

# --- Função para buscar dados de Mercado com yfinance ---
def fetch_market_data():
    """Busca dados de múltiplos tickers usando yfinance."""
    try:
        tickers = yf.Tickers('^BVSP BRL=X ^GSPC ^IXIC')
        # Usamos period='1y' para ter dados para calcular variação de 12 meses
        hist = tickers.history(period='1y', auto_adjust=True)
        
        data = {}
        for ticker in tickers.tickers:
            last_price = hist['Close'][ticker].iloc[-1]
            prev_price = hist['Close'][ticker].iloc[-2]
            ytd_price = hist['Close'][ticker].loc[hist.index.year == datetime.now().year].iloc[0]

            data[ticker] = {
                'pontos': last_price,
                'variacao_dia': ((last_price / prev_price) - 1) * 100,
                'variacao_ano': ((last_price / ytd_price) - 1) * 100,
                'variacao_12m': ((last_price / hist['Close'][ticker].iloc[0]) - 1) * 100,
            }
        return data
    except Exception as e:
        print(f"Erro ao buscar dados do yfinance: {e}")
        return None

# --- Rota Principal da API ---
@app.route('/api/indicadores', methods=['GET'])
def get_all_indicators():
    
    async def main():
        # Tarefa 1: Rodar o yfinance (síncrono) em uma thread separada
        market_task = asyncio.to_thread(fetch_market_data)

        # Tarefa 2: Buscar dados do BCB (assíncrono)
        async with httpx.AsyncClient() as client:
            # Códigos SGS: 433=IPCA, 189=IGP-M, 432=Selic Meta
            bcb_tasks = {
                "ipca": fetch_bcb_series(client, 433),
                "igpm": fetch_bcb_series(client, 189),
                "selic": fetch_bcb_series(client, 432),
            }
            # Executa as tarefas do BCB e a tarefa do yfinance ao mesmo tempo
            results = await asyncio.gather(market_task, *bcb_tasks.values())
            
            market_data = results[0]
            bcb_results = dict(zip(bcb_tasks.keys(), results[1:]))

        # --- Processamento dos Dados ---
        final_data = {}
        
        # Processa dados do BCB
        br_tz = pytz.timezone('America/Sao_Paulo')
        start_of_year = datetime.now(br_tz).replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)

        for name, series_data in bcb_results.items():
            if series_data:
                df = pd.DataFrame(series_data)
                df['valor'] = pd.to_numeric(df['valor'])
                df['data'] = pd.to_datetime(df['data'], format='%d/%m/%Y')
                
                # Acumulado 12 meses (soma dos últimos 12 valores mensais)
                twelve_months = df.tail(12)['valor'].sum()
                
                # Acumulado no ano
                ytd_df = df[df['data'] >= start_of_year]
                year_to_date = ytd_df['valor'].sum() if not ytd_df.empty else 0
                
                final_data[name] = {"doze_meses": twelve_months, "ano": year_to_date}

        # Processa dados de Mercado do yfinance
        def process_ticker_data(ticker_symbol):
            data = market_data.get(ticker_symbol, {})
            return {
                "pontos": data.get('pontos'),
                "variacao_dia": data.get('variacao_dia'),
                "variacao_ano": data.get('variacao_ano'),
                "variacao_12m": data.get('variacao_12m')
            }
        
        final_data['ibovespa'] = process_ticker_data('^BVSP')
        # Dólar tem um nome diferente para "pontos"
        dolar_data = process_ticker_data('BRL=X')
        dolar_data['cotacao'] = dolar_data.pop('pontos', None)
        final_data['dolar'] = dolar_data

        final_data['sp500'] = process_ticker_data('^GSPC')
        final_data['nasdaq'] = process_ticker_data('^IXIC')

        response = jsonify(final_data)
        response.headers['Cache-Control'] = 'public, s-maxage=3600' # Cache de 1 hora
        return response

    return asyncio.run(main())
