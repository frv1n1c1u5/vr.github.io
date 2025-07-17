# Arquivo: /api/aposentadoria.py
# VERSÃO FINAL COM FAIXAS DO GRÁFICO E FASE DE GASTOS

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
        
        # Parâmetros de entrada
        idade_atual = int(dados['idadeAtual'])
        idade_aposentadoria = int(dados['idadeAposentadoria'])
        expectativa_vida = int(dados['expectativaVida'])
        patrimonio_inicial = float(dados['patrimonioAtual'])
        aporte_mensal = float(dados['aporteMensal'])
        custo_vida_mensal = float(dados['custoVida'])
        retorno_medio_anual = float(dados['rentabilidadeAnual']) / 100
        
        volatilidade_anual = 0.15
        num_simulacoes = 500
        anos_acumulando = idade_aposentadoria - idade_atual
        anos_gastando = expectativa_vida - idade_aposentadoria
        total_anos = anos_acumulando + anos_gastando

        if anos_acumulando <= 0 or anos_gastando <= 0:
            return jsonify({'erro': 'As idades fornecidas são inválidas.'}), 400

        trajetorias = np.zeros((num_simulacoes, total_anos + 1))
        trajetorias[:, 0] = patrimonio_inicial

        # Fase de Acumulação
        for i in range(num_simulacoes):
            for ano in range(1, anos_acumulando + 1):
                retorno = np.random.normal(retorno_medio_anual, volatilidade_anual)
                patrimonio_anterior = trajetorias[i, ano-1]
                trajetorias[i, ano] = patrimonio_anterior * (1 + retorno) + (aporte_mensal * 12)

        # Fase de Gastos (Drawdown)
        for i in range(num_simulacoes):
            for ano in range(anos_acumulando + 1, total_anos + 1):
                retorno = np.random.normal(retorno_medio_anual / 2, volatilidade_anual / 2) # Retorno mais conservador na aposentadoria
                patrimonio_anterior = trajetorias[i, ano-1]
                patrimonio_com_juros = patrimonio_anterior * (1 + retorno)
                patrimonio_apos_saque = patrimonio_com_juros - (custo_vida_mensal * 12)
                trajetorias[i, ano] = max(0, patrimonio_apos_saque) # O patrimônio não pode ficar negativo

        # Calcula os cenários e as projeções para o gráfico
        resultados_finais = trajetorias[:, anos_acumulando] # O pico do patrimônio é na idade da aposentadoria
        cenario_pessimista = np.percentile(resultados_finais, 10)
        cenario_mediano = np.percentile(resultados_finais, 50)
        cenario_otimista = np.percentile(resultados_finais, 90)
        
        grafico_pessimista = np.percentile(trajetorias, 10, axis=0)
        grafico_mediano = np.percentile(trajetorias, 50, axis=0)
        grafico_otimista = np.percentile(trajetorias, 90, axis=0)
        
        ano_corrente = datetime.now().year
        labels_grafico = [str(ano_corrente + i) for i in range(total_anos + 1)]

        # --- PARTE DA IA PARA GERAR A ANÁLISE ---
        analise_ia = "Análise da IA não disponível. Verifique a chave de API no painel da Vercel."
        # ... (código da IA continua o mesmo) ...

        return jsonify({
            'pessimista': cenario_pessimista,
            'mediano': cenario_mediano,
            'otimista': cenario_otimista,
            'analiseIA': analise_ia,
            'graficoLabels': labels_grafico,
            'graficoPessimista': list(grafico_pessimista),
            'graficoMediano': list(grafico_mediano),
            'graficoOtimista': list(grafico_otimista)
        })

    except Exception as e:
        return jsonify({'erro': f'Ocorreu um erro interno no servidor: {e}'}), 500
