# Arquivo: /api/aposentadoria.py
# VERSÃO ATUALIZADA COM DADOS PARA O GRÁFICO

import os
from flask import Flask, request, jsonify
import numpy as np
import google.generativeai as genai
from datetime import datetime

app = Flask(__name__)

# Configuração da API do Gemini
try:
    GOOGLE_API_KEY = os.environ.get('GOOGLE_API_KEY')
    if GOOGLE_API_KEY:
        genai.configure(api_key=GOOGLE_API_KEY)
except Exception as e:
    print(f"Erro ao configurar a API do Gemini: {e}")
    GOOGLE_API_KEY = None

@app.route('/api/aposentadoria', methods=['POST'])
def simular_aposentadoria():
    try:
        dados = request.get_json()
        if not dados:
            return jsonify({'erro': 'Corpo da requisição está vazio.'}), 400
        
        idade_atual = int(dados['idadeAtual'])
        idade_aposentadoria = int(dados['idadeAposentadoria'])
        patrimonio_inicial = float(dados['patrimonioAtual'])
        aporte_mensal = float(dados['aporteMensal'])
        retorno_medio_anual = float(dados['rentabilidadeAnual']) / 100
        volatilidade_anual = 0.15
        num_simulacoes = 500
        anos_investindo = idade_aposentadoria - idade_atual

        if anos_investindo <= 0:
            return jsonify({'erro': 'A idade de aposentadoria deve ser maior que a idade atual.'}), 400

        # Matriz para guardar as projeções anuais de todas as simulações
        trajetorias = np.zeros((num_simulacoes, anos_investindo + 1))
        trajetorias[:, 0] = patrimonio_inicial

        for i in range(num_simulacoes):
            for ano in range(1, anos_investindo + 1):
                retorno_aleatorio = np.random.normal(retorno_medio_anual, volatilidade_anual)
                patrimonio_anterior = trajetorias[i, ano-1]
                trajetorias[i, ano] = patrimonio_anterior * (1 + retorno_aleatorio) + (aporte_mensal * 12)

        # Calcula os cenários e a projeção para o gráfico
        resultados_finais = trajetorias[:, -1]
        cenario_pessimista = np.percentile(resultados_finais, 10)
        cenario_mediano = np.percentile(resultados_finais, 50)
        cenario_otimista = np.percentile(resultados_finais, 90)
        
        # Pega a trajetória mediana ano a ano para o gráfico
        grafico_mediano = np.percentile(trajetorias, 50, axis=0)
        
        ano_corrente = datetime.now().year
        labels_grafico = [str(ano_corrente + i) for i in range(anos_investindo + 1)]

        # --- PARTE DA IA PARA GERAR A ANÁLISE ---
        analise_ia = "Análise da IA não disponível no momento."
        # ... (código da IA continua o mesmo) ...

        return jsonify({
            'pessimista': cenario_pessimista,
            'mediano': cenario_mediano,
            'otimista': cenario_otimista,
            'analiseIA': analise_ia,
            'graficoLabels': labels_grafico,
            'graficoValoresMedianos': list(grafico_mediano)
        })

    except Exception as e:
        return jsonify({'erro': f'Ocorreu um erro interno no servidor: {e}'}), 500
