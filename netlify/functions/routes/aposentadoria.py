# /netlify/functions/routes/aposentadoria.py
# VERSÃO FINAL: Adaptado para a estrutura de Blueprints.

from flask import Blueprint, request, jsonify
import numpy as np
import google.generativeai as genai
from datetime import datetime
import os

# 1. Cria o Blueprint em vez de um App Flask
aposentadoria_bp = Blueprint('aposentadoria_bp', __name__)

# --- O resto do seu código permanece o mesmo ---

# Configuração da API Gemini
try:
    GOOGLE_API_KEY = os.environ.get('GOOGLE_API_KEY')
    if GOOGLE_API_KEY:
        genai.configure(api_key=GOOGLE_API_KEY)
except Exception as e:
    print(f"Erro ao configurar a API do Gemini: {e}")
    GOOGLE_API_KEY = None

def get_ai_analysis(dados_reais, parametros):
    """Gera a análise da IA com base nos resultados reais."""
    if not GOOGLE_API_KEY:
        return "Análise da IA não disponível (chave de API não configurada)."
    
    try:
        patrimonio_mediano_fmt = f"R$ {dados_reais['mediano']:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
        retirada_preservacao_fmt = f"R$ {dados_reais['sugestaoPreservacao']:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
        custo_vida_fmt = f"R$ {float(parametros['custoVida']):,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")

        prompt = f"""
        Você é um planejador financeiro experiente e didático. Analise os seguintes dados de uma simulação de aposentadoria, cujos valores estão em "dinheiro de hoje" (valores reais):

        - Objetivo de custo de vida mensal na aposentadoria: {custo_vida_fmt}
        - Patrimônio mediano acumulado no início da aposentadoria: {patrimonio_mediano_fmt}
        - Sugestão de retirada mensal para PRESERVAR o patrimônio (viver da rentabilidade real): {retirada_preservacao_fmt}
        
        Com base nestes dados:
        1. Escreva uma análise em 2 parágrafos. O tom deve ser encorajador, mas realista.
        2. Compare a "retirada de preservação" com o "custo de vida desejado". O plano atual é suficiente?
        3. Ofereça uma ou duas sugestões práticas e claras sobre como o usuário pode melhorar seu cenário.
        
        Seja direto e use uma linguagem que um leigo em finanças possa entender.
        """
        
        model = genai.GenerativeModel('gemini-pro')
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        print(f"Erro na chamada da API Gemini: {e}")
        return "Não foi possível gerar a análise da IA no momento. Ocorreu um erro de comunicação."

# 2. Usa o Blueprint para definir a rota
@aposentadoria_bp.route('/api/aposentadoria', methods=['POST'])
def simular_aposentadoria():
    try:
        dados = request.get_json()
        
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

        if anos_acumulando < 0 or anos_gastando < 0:
            return jsonify({'erro': 'As idades fornecidas são inválidas.'}), 400

        trajetorias_nominais = np.zeros((num_simulacoes, total_anos + 1))
        trajetorias_reais = np.zeros((num_simulacoes, total_anos + 1))
        trajetorias_nominais[:, 0] = patrimonio_inicial
        trajetorias_reais[:, 0] = patrimonio_inicial

        aportes_totais_nominais = np.zeros(num_simulacoes)
        aportes_totais_reais = np.zeros(num_simulacoes)
        saques_totais_nominais = np.zeros(num_simulacoes)
        saques_totais_reais = np.zeros(num_simulacoes)

        for i in range(num_simulacoes):
            patrimonio_nominal_ano = patrimonio_inicial
            total_aportado_nominal_sim = 0
            total_aportado_real_sim = 0
            total_sacado_nominal_sim = 0
            total_sacado_real_sim = 0

            for ano_a in range(anos_acumulando):
                retorno = np.random.normal(retorno_medio_anual, volatilidade_anual)
                aporte_anual_corrigido_nominal = (aporte_mensal * 12) * ((1 + inflacao_media_anual) ** ano_a)
                total_aportado_nominal_sim += aporte_anual_corrigido_nominal
                total_aportado_real_sim += aporte_anual_corrigido_nominal / ((1 + inflacao_media_anual) ** (ano_a + 1))
                patrimonio_nominal_ano = patrimonio_nominal_ano * (1 + retorno) + aporte_anual_corrigido_nominal
                trajetorias_nominais[i, ano_a + 1] = patrimonio_nominal_ano
                trajetorias_reais[i, ano_a + 1] = patrimonio_nominal_ano / ((1 + inflacao_media_anual) ** (ano_a + 1))
            
            aportes_totais_nominais[i] = total_aportado_nominal_sim
            aportes_totais_reais[i] = total_aportado_real_sim

            patrimonio_aposentadoria_nominal = patrimonio_nominal_ano
            for ano_g in range(anos_gastando):
                retorno = np.random.normal(retorno_medio_anual, volatilidade_anual)
                ano_total = anos_acumulando + ano_g
                custo_vida_anual_corrigido_nominal = (custo_vida_mensal_hoje * 12) * ((1 + inflacao_media_anual) ** ano_total)
                saque_efetivo = min(custo_vida_anual_corrigido_nominal, patrimonio_aposentadoria_nominal * (1 + retorno))
                total_sacado_nominal_sim += saque_efetivo
                total_sacado_real_sim += saque_efetivo / ((1 + inflacao_media_anual) ** (ano_total + 1))
                patrimonio_aposentadoria_nominal = patrimonio_aposentadoria_nominal * (1 + retorno) - custo_vida_anual_corrigido_nominal
                patrimonio_aposentadoria_nominal = max(0, patrimonio_aposentadoria_nominal)
                trajetorias_nominais[i, ano_total + 1] = patrimonio_aposentadoria_nominal
                trajetorias_reais[i, ano_total + 1] = patrimonio_aposentadoria_nominal / ((1 + inflacao_media_anual) ** (ano_total + 1))
            
            saques_totais_nominais[i] = total_sacado_nominal_sim
            saques_totais_reais[i] = total_sacado_real_sim

        patrimonio_nominal_aposentadoria = trajetorias_nominais[:, anos_acumulando]
        nominal_pfinal = np.percentile(trajetorias_nominais[:, -1], 50)
        nominal_total_aportado = np.percentile(aportes_totais_nominais, 50)
        nominal_total_sacado = np.percentile(saques_totais_nominais, 50)
        nominal_results = {
            'pessimista': np.percentile(patrimonio_nominal_aposentadoria, 10),
            'mediano': np.percentile(patrimonio_nominal_aposentadoria, 50),
            'otimista': np.percentile(patrimonio_nominal_aposentadoria, 90),
            'patrimonioFinalMediano': nominal_pfinal,
            'totalAportado': nominal_total_aportado,
            'totalSacado': nominal_total_sacado,
            'totalRendimentos': (nominal_pfinal + nominal_total_sacado) - (patrimonio_inicial + nominal_total_aportado)
        }

        patrimonio_real_aposentadoria = trajetorias_reais[:, anos_acumulando]
        mediano_real = np.percentile(patrimonio_real_aposentadoria, 50)
        real_pfinal = np.percentile(trajetorias_reais[:, -1], 50)
        real_total_aportado = np.percentile(aportes_totais_reais, 50)
        real_total_sacado = np.percentile(saques_totais_reais, 50)
        retorno_real = ((1 + retorno_medio_anual) / (1 + inflacao_media_anual)) - 1
        retirada_preservacao_mensal_real = (mediano_real * retorno_real) / 12
        real_results = {
            'pessimista': np.percentile(patrimonio_real_aposentadoria, 10),
            'mediano': mediano_real,
            'otimista': np.percentile(patrimonio_real_aposentadoria, 90),
            'patrimonioFinalMediano': real_pfinal,
            'sugestaoPreservacao': retirada_preservacao_mensal_real,
            'totalAportado': real_total_aportado,
            'totalSacado': real_total_sacado,
            'totalRendimentos': (real_pfinal + real_total_sacado) - (patrimonio_inicial + real_total_aportado)
        }

        analise_ia = get_ai_analysis(real_results, dados)

        return jsonify({
            'nominal': {**nominal_results, 'graficoLabels': [str(datetime.now().year + i) for i in range(total_anos + 1)], 'graficoPessimista': list(np.percentile(trajetorias_nominais, 10, axis=0)), 'graficoMediano': list(np.percentile(trajetorias_nominais, 50, axis=0)), 'graficoOtimista': list(np.percentile(trajetorias_nominais, 90, axis=0))},
            'real': {**real_results, 'graficoLabels': [str(datetime.now().year + i) for i in range(total_anos + 1)], 'graficoPessimista': list(np.percentile(trajetorias_reais, 10, axis=0)), 'graficoMediano': list(np.percentile(trajetorias_reais, 50, axis=0)), 'graficoOtimista': list(np.percentile(trajetorias_reais, 90, axis=0))},
            'anoAposentadoria': str(datetime.now().year + anos_acumulando),
            'analiseIA': analise_ia
        })

    except Exception as e:
        # É uma boa prática imprimir o erro no log do servidor para depuração
        print(f"Erro na simulação de aposentadoria: {str(e)}")
        return jsonify({'erro': f'Ocorreu um erro interno no servidor: {str(e)}'}), 500
