# api/indicadores.py
# VERSÃO FINAL: Código mais limpo e robusto.

from flask import Flask, jsonify
import httpx
import asyncio
import os

app = Flask(__name__)

BRAPI_BASE_URL = "https://brapi.dev/api"
BRAPI_TOKEN = os.environ.get('BRAPI_API_KEY')

async def fetch_brapi_data(client, endpoint, extra_params=None):
    """Função genérica para buscar dados na Brapi API, agora com o token."""
    try:
        # Prepara os parâmetros da URL
        params = {'token': BRAPI_TOKEN}
        if extra_params:
            params.update(extra_params)
        
        response = await client.get(f"{BRAPI_BASE_URL}/{endpoint}", params=params)
        response.raise_for_status()
        return response.json()
    except httpx.HTTPStatusError as e:
        print(f"Erro ao buscar {endpoint}: {e}")
        print(f"Response body: {e.response.text}")
        return None
    except Exception as e:
        print(f"Um erro inesperado ocorreu em fetch_brapi_data: {e}")
        return None

@app.route('/api/indicadores', methods=['GET'])
def get_all_indicators():
    if not BRAPI_TOKEN:
        return jsonify({"erro": "A chave da API da Brapi (BRAPI_API_KEY) não foi configurada no servidor."}), 500

    async def main():
        async with httpx.AsyncClient() as client:
            tasks = {
                "inflacao": fetch_brapi_data(client, "inflation"),
                "dolar": fetch_brapi_data(client, "v2/currency", extra_params={'currency': 'USD-BRL'}),
                "ibov": fetch_brapi_data(client, "quote/ibovespa", extra_params={'range': '1y'})
            }
            results = await asyncio.gather(*tasks.values())
            results_dict = dict(zip(tasks.keys(), results))

            final_data = {}
            
            inflacao_data = results_dict.get("inflacao", {}).get("inflation", []) if results_dict.get("inflacao") else []
            ipca = next((item for item in inflacao_data if item.get("name") == "IPCA"), {})
            igpm = next((item for item in inflacao_data if item.get("name") == "IGP-M"), {})
            selic = next((item for item in inflacao_data if item.get("name") == "Taxa Selic"), {})
            
            final_data["ipca"] = {"doze_meses": ipca.get("twelveMonths"), "ano": ipca.get("year")}
            final_data["igpm"] = {"doze_meses": igpm.get("twelveMonths"), "ano": igpm.get("year")}
            final_data["selic"] = {"doze_meses": selic.get("twelveMonths"), "ano": selic.get("year")}

            dolar_data = results_dict.get("dolar", {}).get("currency", [{}])[0] if results_dict.get("dolar") else {}
            final_data["dolar"] = {"cotacao": dolar_data.get("askPrice"), "variacao_dia": dolar_data.get("changePercent")}

            ibov_data = results_dict.get("ibov", {}).get("results", [{}])[0] if results_dict.get("ibov") else {}
            final_data["ibovespa"] = {
                "pontos": ibov_data.get("regularMarketPrice"),
                "variacao_dia": ibov_data.get("regularMarketChangePercent"),
                "variacao_ano": ibov_data.get("fiftyTwoWeekHighChangePercent"),
                "variacao_12m": ibov_data.get("fiftyTwoWeekHighChangePercent")
            }
            final_data["dolar"]["min_max_12m"] = f"{ibov_data.get('fiftyTwoWeekLow', 'N/A')} / {ibov_data.get('fiftyTwoWeekHigh', 'N/A')}"

            response = jsonify(final_data)
            response.headers['Cache-Control'] = 'public, s-maxage=3600'
            return response

    return asyncio.run(main())
