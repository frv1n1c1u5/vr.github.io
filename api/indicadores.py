# api/indicadores.py
# VERSÃO CORRIGIDA: Agora inclui o token de autenticação da Brapi.

from flask import Flask, jsonify
import httpx
import asyncio
import os

app = Flask(__name__)

# URL base da API e token lido do ambiente da Vercel
BRAPI_BASE_URL = "https://brapi.dev/api"
BRAPI_TOKEN = os.environ.get('BRAPI_API_KEY')

async def fetch_brapi_data(client, endpoint):
    """Função genérica para buscar dados na Brapi API, agora com o token."""
    try:
        # Anexa o token como um parâmetro na URL
        # O URL final ficará assim: .../endpoint?token=SEUTOKEN
        url_with_token = f"{BRAPI_BASE_URL}/{endpoint}"
        params = {'token': BRAPI_TOKEN}
        
        # A ? ou & é adicionada automaticamente pelo httpx
        if '?' in url_with_token:
            url_base, query_string = url_with_token.split('?', 1)
            response = await client.get(url_base, params={**params, **dict(q.split('=') for q in query_string.split('&'))})
        else:
             response = await client.get(url_with_token, params=params)

        response.raise_for_status()
        return response.json()
    except httpx.HTTPStatusError as e:
        print(f"Erro ao buscar {endpoint}: {e}")
        # Imprime o corpo da resposta para mais detalhes, se houver
        print(f"Response body: {e.response.text}")
        return None
    except Exception as e:
        print(f"Um erro inesperado ocorreu em fetch_brapi_data: {e}")
        return None

# Rota principal da nossa API
@app.route('/api/indicadores', methods=['GET'])
def get_all_indicators():
    if not BRAPI_TOKEN:
        # Se o token não estiver configurado, retorna um erro claro.
        return jsonify({"erro": "A chave da API da Brapi não foi configurada no servidor."}), 500

    async def main():
        async with httpx.AsyncClient() as client:
            tasks = {
                "inflacao": fetch_brapi_data(client, "inflation"),
                "dolar": fetch_brapi_data(client, "v2/currency?currency=USD-BRL"),
                "ibov": fetch_brapi_data(client, "quote/ibovespa?range=1y")
            }
            results = await asyncio.gather(*tasks.values())
            results_dict = dict(zip(tasks.keys(), results))

            # --- Processamento e Formatação dos Dados ---
            # O código aqui é mais robusto para lidar com possíveis falhas individuais
            final_data = {}

            # IPCA e IGP-M
            inflacao_data = results_dict.get("inflacao", {}).get("inflation", []) if results_dict.get("inflacao") else []
            ipca = next((item for item in inflacao_data if item.get("name") == "IPCA"), {})
            igpm = next((item for item in inflacao_data if item.get("name") == "IGP-M"), {})
            final_data["ipca"] = {"doze_meses": ipca.get("twelveMonths"), "ano": ipca.get("year")}
            final_data["igpm"] = {"doze_meses": igpm.get("twelveMonths"), "ano": igpm.get("year")}
            
            # Para a SELIC, vamos usar o mesmo endpoint de inflação, pois a Brapi mudou a API
            selic = next((item for item in inflacao_data if item.get("name") == "Taxa Selic"), {})
            final_data["selic"] = {"doze_meses": selic.get("twelveMonths"), "ano": selic.get("year")}


            # Dólar
            dolar_data = results_dict.get("dolar", {}).get("currency", [{}])[0] if results_dict.get("dolar") else {}
            final_data["dolar"] = {
                "cotacao": dolar_data.get("askPrice"),
                "variacao_dia": dolar_data.get("changePercent") # Corrigido para pegar o percentual
            }

            # Ibovespa
            ibov_data = results_dict.get("ibov", {}).get("results", [{}])[0] if results_dict.get("ibov") else {}
            final_data["ibovespa"] = {
                "pontos": ibov_data.get("regularMarketPrice"),
                "variacao_dia": ibov_data.get("regularMarketChangePercent"),
                "variacao_ano": ibov_data.get("fiftyTwoWeekHighChangePercent"),
                "variacao_12m": ibov_data.get("fiftyTwoWeekHighChangePercent")
            }
            # Adicionando Min/Max do IBOV ao Dólar como fallback
            final_data["dolar"]["min_max_12m"] = f"{ibov_data.get('fiftyTwoWeekLow', 'N/A')} / {ibov_data.get('fiftyTwoWeekHigh', 'N/A')}"

            response = jsonify(final_data)
            response.headers['Cache-Control'] = 'public, s-maxage=3600' # Cache de 1 hora
            return response

    return asyncio.run(main())
