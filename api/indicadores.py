# api/indicadores.py
# Este é o nosso "mordomo" que busca todos os dados.

from flask import Flask, jsonify, Response
import httpx  # Uma biblioteca moderna para fazer chamadas de API, funciona bem na Vercel
import asyncio # Para fazer várias chamadas ao mesmo tempo e acelerar a resposta

app = Flask(__name__)

# URL base da API que vamos usar
BRAPI_BASE_URL = "https://brapi.dev/api"

# Funções assíncronas para buscar cada tipo de dado em paralelo
async def fetch_brapi_data(client, endpoint):
    """Função genérica para buscar dados na Brapi API."""
    try:
        response = await client.get(f"{BRAPI_BASE_URL}/{endpoint}")
        response.raise_for_status()  # Lança um erro se a resposta não for 200 OK
        return response.json()
    except httpx.HTTPStatusError as e:
        print(f"Erro ao buscar {endpoint}: {e}")
        return None # Retorna None em caso de erro para não quebrar tudo

# Rota principal da nossa API
@app.route('/api/indicadores', methods=['GET'])
def get_all_indicators():
    async def main():
        # Usamos um cliente HTTP assíncrono para fazer chamadas simultâneas
        async with httpx.AsyncClient() as client:
            # Criamos uma lista de "tarefas" para o asyncio executar
            tasks = {
                "inflacao": fetch_brapi_data(client, "inflation"),
                "taxas": fetch_brapi_data(client, "v2/prime-rate"),
                "dolar": fetch_brapi_data(client, "v2/currency?currency=USD-BRL"),
                "ibov": fetch_brapi_data(client, "quote/ibovespa?range=1y")
            }
            
            # Executa todas as tarefas ao mesmo tempo
            results = await asyncio.gather(*tasks.values())
            
            # Mapeia os resultados de volta para os nomes das tarefas
            results_dict = dict(zip(tasks.keys(), results))

            # --- Processamento e Formatação dos Dados ---
            # Processa os dados recebidos para extrair apenas o que precisamos
            
            # IPCA e IGP-M
            inflacao_data = results_dict.get("inflacao", {}).get("inflation", [])
            ipca = next((item for item in inflacao_data if item.get("name") == "IPCA"), {})
            igpm = next((item for item in inflacao_data if item.get("name") == "IGP-M"), {})

            # SELIC
            selic_data = results_dict.get("taxas", {}).get("prime-rate", [])
            selic = next((item for item in selic_data if item.get("name") == "Selic"), {})

            # Dólar
            dolar_data = results_dict.get("dolar", {}).get("currency", [{}])[0]

            # Ibovespa
            ibov_data = results_dict.get("ibov", {}).get("results", [{}])[0]

            # Monta o objeto final que será enviado ao frontend
            final_data = {
                "ipca": {
                    "doze_meses": ipca.get("twelveMonths"),
                    "ano": ipca.get("year")
                },
                "selic": {
                    "doze_meses": selic.get("twelveMonths"),
                    "ano": selic.get("year")
                },
                "igpm": {
                    "doze_meses": igpm.get("twelveMonths"),
                    "ano": igpm.get("year")
                },
                "dolar": {
                    "cotacao": dolar_data.get("askPrice"),
                    "variacao_dia": dolar_data.get("change"),
                    "min_max_12m": f"{ibov_data.get('fiftyTwoWeekLow')} / {ibov_data.get('fiftyTwoWeekHigh')}" # Brapi não tem esse dado para dólar, usamos o do IBOV como exemplo - ideal seria ajustar
                },
                "ibovespa": {
                    "pontos": ibov_data.get("regularMarketPrice"),
                    "variacao_dia": ibov_data.get("regularMarketChangePercent"),
                    "variacao_ano": ibov_data.get("fiftyTwoWeekHighChangePercent"), # Usando uma aproximação
                    "variacao_12m": ibov_data.get("fiftyTwoWeekHighChangePercent") # O mesmo
                }
            }
            
            # --- Caching ---
            # Cria a resposta JSON
            response = jsonify(final_data)
            # Adiciona um header de cache para que a Vercel guarde o resultado por 1 hora (3600s)
            # Isso evita chamadas desnecessárias à API externa e deixa seu site muito mais rápido
            response.headers['Cache-Control'] = 'public, s-maxage=3600'
            return response

    # Executa a função principal assíncrona
    return asyncio.run(main())