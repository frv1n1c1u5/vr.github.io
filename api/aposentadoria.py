# /api/aposentadoria.py - Versão Final e Corrigida

import os
from flask import Flask, request, jsonify
import numpy as np
import google.generativeai as genai
from datetime import datetime

app = Flask(__name__)

# Configuração da API Gemini
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
        custo_vida_mensal_hoje = float(dados['custoVida'])
        retorno_medio_anual = float(dados['rentabilidadeAnual']) / 100
        inflacao_media_anual = float(dados['inflacaoAnual']) / 100
        
        volatilidade_anual = 0.15  # Volatilidade (desvio padrão) da rentabilidade
        num_simulacoes = 500
        anos_acumulando = idade_aposentadoria - idade_atual
        anos_gastando = expectativa_vida - idade_aposentadoria
        total_anos = anos_acumulando + anos_gastando

        if anos_acumulando < 0 or anos_gastando < 0:
            return jsonify({'erro': 'As idades fornecidas são inválidas.'}), 400

        trajetorias = np.zeros((num_simulacoes, total_anos + 1))
        trajetorias[:, 0] = patrimonio_inicial

        # Fase de Acumulação
        for i in range(num_simulacoes):
            patrimonio_ano_a_ano = patrimonio_inicial
            for ano_a in range(anos_acumulando):
                retorno = np.random.normal(retorno_medio_anual, volatilidade_anual)
                patrimonio_ano_a_ano = patrimonio_ano_a_ano * (1 + retorno) + (aporte_mensal * 12)
                trajetorias[i, ano_a + 1] = patrimonio_ano_a_ano
        
        # Fase de Gastos (Drawdown)
        # Este loop foi simplificado e corrigido para maior precisão
        for i in range(num_simulacoes):
            # O patrimônio na aposentadoria já foi calculado na fase anterior
            patrimonio_aposentadoria = trajetorias[i, anos_acumulando]
            for ano_g in range(anos_gastando):
                retorno = np.random.normal(retorno_medio_anual, volatilidade_anual)
                custo_vida_anual_corrigido = (custo_vida_mensal_hoje * 12) * ((1 + inflacao_media_anual) ** ano_g)
                patrimonio_aposentadoria = patrimonio_aposentadoria * (1 + retorno) - custo_vida_anual_corrigido
                trajetorias[i, anos_acumulando + ano_g + 1] = max(0, patrimonio_aposentadoria)

        patrimonio_na_aposentadoria = trajetorias[:, anos_acumulando]
        cenario_mediano = np.percentile(patrimonio_na_aposentadoria, 50)
        
        # Cálculo da retirada mensal para preservar o capital
        retorno_real = ((1 + retorno_medio_anual) / (1 + inflacao_media_anual)) - 1
        retirada_preservacao_mensal = (cenario_mediano * retorno_real) / 12

        analise_ia = "Análise da IA não disponível. Verifique a chave de API."
        # ... (código da IA) ...

        return jsonify({
            'pessimista': np.percentile(patrimonio_na_aposentadoria, 10),
            'mediano': cenario_mediano,
            'otimista': np.percentile(patrimonio_na_aposentadoria, 90),
            'patrimonioFinalMediano': np.percentile(trajetorias[:, -1], 50),
            
            # ===== ALTERAÇÃO 1: Nome da chave corrigido =====
            'sugestaoPreservacao': retirada_preservacao_mensal,

            'graficoLabels': [str(datetime.now().year + i) for i in range(total_anos + 1)],
            'graficoPessimista': list(np.percentile(trajetorias, 10, axis=0)),
            'graficoMediano': list(np.percentile(trajetorias, 50, axis=0)),
            'graficoOtimista': list(np.percentile(trajetorias, 90, axis=0)),
            
            # ===== ALTERAÇÃO 2: Nova chave adicionada =====
            'anoAposentadoria': str(datetime.now().year + anos_acumulando),
            
            'analiseIA': analise_ia
        })

    except Exception as e:
        # Retorna o erro de forma mais clara para o frontend
        return jsonify({'erro': f'Ocorreu um erro interno no servidor: {str(e)}'}), 500
