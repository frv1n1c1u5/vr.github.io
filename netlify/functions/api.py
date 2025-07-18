# /netlify/functions/api.py
# VERSÃO CORRIGIDA com importações relativas.

from flask import Flask
# O ponto (.) antes de "routes" é a correção crucial.
from .routes.indicadores import indicadores_bp
from .routes.aposentadoria import aposentadoria_bp

# Cria a aplicação principal
app = Flask(__name__)

# Registra os blueprints (nossos componentes) no app principal
app.register_blueprint(indicadores_bp)
app.register_blueprint(aposentadoria_bp)
