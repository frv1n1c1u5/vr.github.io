# /netlify/functions/api.py

from flask import Flask
from routes.indicadores import indicadores_bp
from routes.aposentadoria import aposentadoria_bp

# Cria a aplicação principal
app = Flask(__name__)

# Registra os blueprints (nossos componentes) no app principal
app.register_blueprint(indicadores_bp)
app.register_blueprint(aposentadoria_bp)

# Handler que o Netlify usará
def handler(event, context):
    return app(event, context)