# Arquivo: /api/aposentadoria.py
# VERSÃO FINAL COM CÁLCULO DE CUSTO DE VIDA SUSTENTÁVEL

import os
from flask import Flask, request, jsonify
import numpy as np
import google.generativeai as genai
from datetime import datetime

app = Flask(__name__)

# ... (código de configuração da API Gemini - sem alterações) ...
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

        # Fase de Gastos (Drawdown) com custo de vida corrigido
        for i in range(num_simulacoes):
            for ano_idx, ano in enumerate(range(anos_acumulando + 1, total_anos + 1)):
                retorno = np.random.normal(retorno_medio_anual / 2, volatilidade_anual / 2)
                patrimonio_anterior = trajetorias[i, ano-1]
                custo_vida_anual_corrigido = (custo_vida_mensal_hoje * 12) * ((1 + inflacao_media_anual) ** (anos_acumulando + ano_idx))
                patrimonio_com_juros = patrimonio_anterior * (1 + retorno)
                patrimonio_apos_saque = patrimonio_com_juros - custo_vida_anual_corrigido
                trajetorias[i, ano] = max(0, patrimonio_apos_saque)

        # Calcula os cenários e projeções
        patrimonio_na_aposentadoria = trajetorias[:, anos_acumulando]
        patrimonio_final = trajetorias[:, -1]
        cenario_mediano = np.percentile(patrimonio_na_aposentadoria, 50)
        
        # --- NOVO CÁLCULO: CUSTO DE VIDA SUSTENTÁVEL ---
        # Usando a fórmula de anuidade para uma estimativa rápida
        retorno_real_conservador = (1 + (retorno_medio_anual / 2)) / (1 + inflacao_media_anual) - 1
        if retorno_real_conservador > 0:
            fator_anuidade = (retorno_real_conservador * (1 + retorno_real_conservador) ** anos_gastando) / ((1 + retorno_real_conservador) ** anos_gastando - 1)
            retirada_anual_sustentavel = cenario_mediano * fator_anuidade
            retirada_mensal_sustentavel = retirada_anual_sustentavel / 12
        else:
            retirada_mensal_sustentavel = cenario_mediano / (anos_gastando * 12)

        # --- PARTE DA IA PARA GERAR A ANÁLISE ---
        analise_ia = "Análise da IA não disponível. Verifique a chave de API no painel da Vercel."
        # ... (código da IA continua o mesmo, mas podemos adicionar o novo dado ao prompt no futuro) ...

        return jsonify({
            'pessimista': np.percentile(patrimonio_na_aposentadoria, 10),
            'mediano': cenario_mediano,
            'otimista': np.percentile(patrimonio_na_aposentadoria, 90),
            'patrimonioFinalMediano': np.percentile(patrimonio_final, 50),
            'retiradaSustentavel': retirada_mensal_sustentavel, # NOVO DADO
            'graficoLabels': [str(datetime.now().year + i) for i in range(total_anos + 1)],
            'graficoPessimista': list(np.percentile(trajetorias, 10, axis=0)),
            'graficoMediano': list(np.percentile(trajetorias, 50, axis=0)),
            'graficoOtimista': list(np.percentile(trajetorias, 90, axis=0)),
            'analiseIA': analise_ia
        })

    except Exception as e:
        return jsonify({'erro': f'Ocorreu um erro interno no servidor: {e}'}), 500
