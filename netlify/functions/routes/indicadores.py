# /netlify/functions/routes/indicadores.py
# VERSÃO FINAL: Adaptado para a estrutura de Blueprints.

from flask import Blueprint, jsonify
import httpx
import asyncio
import yfinance as yf
import pandas as pd
from datetime import datetime, timedelta
import pytz # Para lidar com fusos horários corretamente

# 1. Cria o Blueprint em vez de um App Flask
indicadores_bp = Blueprint('indicadores_bp', __name__)

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
        data = {}
        # Itera sobre os tickers para garantir que os dados sejam buscados individualmente
        for ticker_symbol in tickers.tickers:
            ticker_obj = tickers.tickers[ticker_symbol]
            hist = ticker_obj.history(period='1y', auto_adjust=True)
            
            if not hist.empty:
                last_price = hist['Close'].iloc[-1]
                prev_price = hist['Close'].iloc[-2] if len(hist['Close']) > 1 else last_price
                
                # Para YTD, encontra o primeiro dia de negociação do ano atual
                ytd_hist = hist[hist.index.year == datetime.now().year]
                ytd_price = ytd_hist['Close'].iloc[0] if not ytd_hist.empty else last_price

                data[ticker_symbol] = {
                    'pontos': last_price,
                    'variacao_dia': ((last_price / prev_price) - 1) * 100,
                    'variacao_ano': ((last_price / ytd_price) - 1) * 100,
                    'variacao_12m': ((last_price / hist['Close'].iloc[0]) - 1) * 100,
                }
        return data
    except Exception as e:
        print(f"Erro ao buscar dados do yfinance: {e}")
        return None

# --- Rota Principal da API ---
# 2. Usa o Blueprint para definir a rota
@indicadores_bp.route('/api/indicadores', methods=['GET'])
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
                # Converte a data e remove o fuso horário para comparação segura
                df['data'] = pd.to_datetime(df['data'], format='%d/%m/%Y').dt.tz_localize(None)
                
                # Acumulado 12 meses (soma dos últimos 12 valores mensais)
                twelve_months = df.tail(12)['valor'].sum()
                
                # Acumulado no ano
                ytd_df = df[df['data'] >= start_of_year.replace(tzinfo=None)]
                year_to_date = ytd_df['valor'].sum() if not ytd_df.empty else 0
                
                final_data[name] = {"doze_meses": twelve_months, "ano": year_to_date}

        # Processa dados de Mercado do yfinance
        def process_ticker_data(ticker_symbol):
            if not market_data: return {}
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
