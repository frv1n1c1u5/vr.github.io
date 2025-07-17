# Arquivo: /api/comparador.py

from flask import Flask, request, jsonify
import numpy as np
import numpy_financial as npf

app = Flask(__name__)

@app.route('/api/comparador', methods=['POST'])
def comparar_cenarios():
    try:
        dados = request.get_json()

        # Parâmetros de Entrada
        valor_imovel = float(dados['valor_imovel'])
        valor_entrada = float(dados['valor_entrada'])
        prazo_anos = int(dados['prazo_anos'])
        juros_financiamento_aa = float(dados['juros_financiamento_aa']) / 100
        valor_aluguel_mensal = float(dados['valor_aluguel_mensal'])
        reajuste_aluguel_aa = float(dados['reajuste_aluguel_aa']) / 100
        valorizacao_imovel_aa = float(dados['valorizacao_imovel_aa']) / 100
        rentabilidade_investimentos_aa = float(dados['rentabilidade_investimentos_aa']) / 100
        taxa_adm_consorcio_total = float(dados['taxa_adm_consorcio_total']) / 100
        
        prazo_meses = prazo_anos * 12
        juros_financiamento_am = (1 + juros_financiamento_aa)**(1/12) - 1
        rentabilidade_investimentos_am = (1 + rentabilidade_investimentos_aa)**(1/12) - 1
        
        # --- Simulações ---
        anos = list(range(prazo_anos + 1))
        patrimonio_financiamento = []
        patrimonio_aluguel = []
        
        # 1. CENÁRIO FINANCIAMENTO
        valor_financiado = valor_imovel - valor_entrada
        parcela_financiamento = npf.pmt(juros_financiamento_am, prazo_meses, -valor_financiado)
        saldo_devedor = valor_financiado
        imovel_valorizado = valor_imovel
        
        patrimonio_financiamento.append(valor_entrada) # No ano 0, o patrimônio é a entrada
        for ano in range(1, prazo_anos + 1):
            for _ in range(12):
                juros_mes = saldo_devedor * juros_financiamento_am
                amortizacao = parcela_financiamento - juros_mes
                saldo_devedor -= amortizacao
            imovel_valorizado *= (1 + valorizacao_imovel_aa)
            patrimonio_financiamento.append(imovel_valorizado - saldo_devedor)

        # 2. CENÁRIO ALUGUEL
        investimento_aluguel = valor_entrada # Começa investindo a entrada
        aluguel_atual = valor_aluguel_mensal
        
        patrimonio_aluguel.append(investimento_aluguel)
        for ano in range(1, prazo_anos + 1):
            for mes in range(12):
                investimento_aluguel *= (1 + rentabilidade_investimentos_am)
                aporte_extra = parcela_financiamento - aluguel_atual
                if aporte_extra > 0:
                    investimento_aluguel += aporte_extra
            aluguel_atual *= (1 + reajuste_aluguel_aa)
            patrimonio_aluguel.append(investimento_aluguel)

        # 3. CENÁRIO CONSÓRCIO (Simplificado)
        parcela_consorcio = (valor_imovel * (1 + taxa_adm_consorcio_total)) / prazo_meses
        # Simulação para contemplação no meio do período
        patrimonio_consorcio_mediano = []
        investimento_consorcio = valor_entrada # Assumimos que a entrada fica investida
        contemplado = False
        ano_contemplacao = prazo_anos // 2
        imovel_valorizado_consorcio = 0
        
        patrimonio_consorcio_mediano.append(investimento_consorcio)
        for ano in range(1, prazo_anos + 1):
            if ano == ano_contemplacao:
                contemplado = True
                imovel_valorizado_consorcio = valor_imovel * ((1 + valorizacao_imovel_aa) ** ano)
                investimento_consorcio = 0 # Usou o dinheiro para o lance/complemento
            
            aluguel_pago_no_ano = 0
            for mes in range(12):
                investimento_consorcio *= (1 + rentabilidade_investimentos_am)
                if not contemplado:
                     aluguel_pago_no_ano += valor_aluguel_mensal * ((1+reajuste_aluguel_aa)**ano)

            if contemplado:
                imovel_valorizado_consorcio *= (1 + valorizacao_imovel_aa)
                patrimonio_consorcio_mediano.append(imovel_valorizado_consorcio)
            else:
                patrimonio_consorcio_mediano.append(investimento_consorcio)

        return jsonify({
            'labels': anos,
            'financiamento': patrimonio_financiamento,
            'aluguel': patrimonio_aluguel,
            'consorcio': patrimonio_consorcio_mediano
        })

    except Exception as e:
        return jsonify({'erro': f'Ocorreu um erro interno: {e}'}), 500