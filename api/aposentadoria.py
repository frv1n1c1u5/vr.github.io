# Arquivo: /api/aposentadoria.py
# VERSÃO FINAL COM CÁLCULO DE CUSTO DE VIDA SUSTENTÁVEL

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
        
        # Parâmetros de entrada
        idade_atual = int(dados['idadeAtual'])
        idade_aposentadoria = int(dados['idadeAposentadoria'])
        expectativa_vida = int(dados['expectativaVida'])
        patrimonio_inicial = float(dados['patrimonioAtual'])
        aporte_mensal = float(dados['aporteMensal'])
        custo_vida_mensal_hoje = float(dados['custoVida'])
        retorno_medio_anual = float(dados['rentabilidadeAnual']) / 100
        inflacao_media_anual = float(dados['inflacaoAnual']) / 100
        
        # Parâmetros da simulação
        volatilidade_anual = 0.15
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
        
        # Fase de Gastos (Drawdown) com custo de vida corrigido
        for i in range(num_simulacoes):
            patrimonio_aposentadoria = trajetorias[i, anos_acumulando]
            for ano_g in range(anos_gastando):
                retorno = np.random.normal(retorno_medio_anual / 2, volatilidade_anual / 2) # Retorno mais conservador
                patrimonio_anterior = trajetorias[i, anos_acumulando + ano_g]
                custo_vida_anual_corrigido = (custo_vida_mensal_hoje * 12) * ((1 + inflacao_media_anual) ** (anos_acumulando + ano_g))
                patrimonio_com_juros = patrimonio_anterior * (1 + retorno)
                patrimonio_apos_saque = patrimonio_com_juros - custo_vida_anual_corrigido
                trajetorias[i, anos_acumulando + ano_g + 1] = max(0, patrimonio_apos_saque)
        
        patrimonio_na_aposentadoria = trajetorias[:, anos_acumulando]
        cenario_mediano = np.percentile(patrimonio_na_aposentadoria, 50)
        
        # --- CÁLCULOS DAS DUAS SUGESTÕES ---
        retorno_real_conservador = ((1 + (retorno_medio_anual / 2)) / (1 + inflacao_media_anual)) - 1
        
        # 1. Sugestão para PRESERVAR o capital
        retirada_preservacao_mensal = (cenario_mediano * retorno_real_conservador) / 12 if retorno_real_conservador > 0 else 0

        # 2. Sugestão para ZERAR o capital ao final (retirada máxima)
        retirada_maxima_mensal = 0
        if retorno_real_conservador > 0 and anos_gastando > 0:
            fator_anuidade = (retorno_real_conservador * (1 + retorno_real_conservador) ** anos_gastando) / (((1 + retorno_real_conservador) ** anos_gastando) - 1)
            retirada_maxima_anual = cenario_mediano * fator_anuidade
            retirada_maxima_mensal = retirada_maxima_anual / 12
        elif anos_gastando > 0:
            retirada_maxima_mensal = cenario_mediano / (anos_gastando * 12)
        
        # --- PARTE DA IA PARA GERAR A ANÁLISE ---
        analise_ia = "Análise da IA não disponível. Verifique a chave de API no painel da Vercel."
        # ... (código da IA continua o mesmo) ...

        ano_corrente = datetime.now().year
        ano_da_aposentadoria = ano_corrente + anos_acumulando

        return jsonify({
            'pessimista': np.percentile(patrimonio_na_aposentadoria, 10),
            'mediano': cenario_mediano,
            'otimista': np.percentile(patrimonio_na_aposentadoria, 90),
            'patrimonioFinalMediano': np.percentile(trajetorias[:, -1], 50),
            'retiradaPreservacao': retirada_preservacao_mensal,
            'retiradaMaxima': retirada_maxima_mensal,
            'anoAposentadoria': ano_da_aposentadoria,
            'graficoLabels': [str(ano_corrente + i) for i in range(total_anos + 1)],
            'graficoPessimista': list(np.percentile(trajetorias, 10, axis=0)),
            'graficoMediano': list(np.percentile(trajetorias, 50, axis=0)),
            'graficoOtimista': list(np.percentile(trajetorias, 90, axis=0)),
            'analiseIA': analise_ia
        })

    except Exception as e:
        return jsonify({'erro': f'Ocorreu um erro interno no servidor: {e}'}), 500
