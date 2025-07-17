# Arquivo: /api/aposentadoria.py

import os
from flask import Flask, request, jsonify
import numpy as np
import google.generativeai as genai
from datetime import datetime

app = Flask(__name__)

# Configuração da API do Gemini - Pega a chave que você configurou na Vercel
GOOGLE_API_KEY = os.environ.get('GOOGLE_API_KEY')
if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)

# A rota /api/aposentadoria é definida pelo nome do arquivo
@app.route('/api/aposentadoria', methods=['POST'])
def simular_aposentadoria():
    try:
        dados = request.get_json()
        
        # Parâmetros de entrada vindos do formulário do site
        idade_atual = int(dados['idadeAtual'])
        idade_aposentadoria = int(dados['idadeAposentadoria'])
        patrimonio_inicial = float(dados['patrimonioAtual'])
        aporte_mensal = float(dados['aporteMensal'])
        retorno_medio_anual = float(dados['rentabilidadeAnual']) / 100
        inflacao_anual = float(dados['inflacaoAnual']) / 100
        
        # Parâmetros da simulação
        volatilidade_anual = 0.15  # Volatilidade de 15% a.a. (padrão de mercado de ações)
        num_simulacoes = 500      # Número de cenários a simular

        anos_investindo = idade_aposentadoria - idade_atual
        if anos_investindo <= 0:
            return jsonify({'erro': 'A idade de aposentadoria deve ser maior que a idade atual.'}), 400

        # Array para guardar os resultados de todas as simulações
        resultados_finais = np.zeros(num_simulacoes)

        # Loop da Simulação de Monte Carlo
        for i in range(num_simulacoes):
            patrimonio_anual = patrimonio_inicial
            for _ in range(anos_investindo):
                retorno_aleatorio = np.random.normal(retorno_medio_anual, volatilidade_anual)
                patrimonio_anual = patrimonio_anual * (1 + retorno_aleatorio) + (aporte_mensal * 12)
            resultados_finais[i] = patrimonio_anual
        
        # Calcula os percentis para definir os cenários
        cenario_pessimista = np.percentile(resultados_finais, 10)
        cenario_mediano = np.percentile(resultados_finais, 50)
        cenario_otimista = np.percentile(resultados_finais, 90)

        # --- PARTE DA IA PARA GERAR A ANÁLISE ---
        analise_ia = "Análise da IA não disponível no momento."
        if GOOGLE_API_KEY and genai:
            prompt = f"""Aja como um planejador financeiro. Uma simulação de Monte Carlo para aposentadoria resultou nos seguintes valores de patrimônio bruto:
            - Pior cenário (10% de chance de ser menor que): R$ {cenario_pessimista:,.2f}
            - Cenário mediano (valor mais provável): R$ {cenario_mediano:,.2f}
            - Melhor cenário (10% de chance de ser maior que): R$ {cenario_otimista:,.2f}
            Escreva um parágrafo curto e com tom profissional, explicando o que esses resultados significam para o plano de aposentadoria do cliente, destacando a importância da disciplina e consistência nos aportes para atingir os cenários mais otimistas."""
            
            model = genai.GenerativeModel('gemini-1.5-flash')
            response = model.generate_content(prompt)
            analise_ia = response.text

        # Retorna todos os dados para o site
        return jsonify({
            'pessimista': cenario_pessimista,
            'mediano': cenario_mediano,
            'otimista': cenario_otimista,
            'analiseIA': analise_ia
        })

    except Exception as e:
        # Em caso de erro, retorna uma mensagem clara
        return jsonify({'erro': str(e)}), 500