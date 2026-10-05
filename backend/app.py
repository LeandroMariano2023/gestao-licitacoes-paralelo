import os
from dotenv import load_dotenv

# =====================================================================
# CARREGA AS CONFIGURAÇÕES DO ARQUIVO .ENV (OBRIGATÓRIO SER A 1ª COISA!)
# =====================================================================
load_dotenv()

from flask import Flask
from flask_cors import CORS
from database import init_db, close_connection

# Importando nossas gavetas de rotas (Blueprints)
from rotas.auth_routes import auth_bp
from rotas.processos_routes import processos_bp
from rotas.fornecedores_routes import fornecedores_bp
from rotas.pagamentos_routes import pagamentos_bp
from rotas.usuarios_routes import usuarios_bp
from rotas.dashboard_routes import dashboard_bp

app = Flask(__name__)
CORS(app)

# Busca a chave do .env; se não achar, usa uma padrão de segurança para o dev local
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY') or 'sua_chave_secreta_super_segura'

# Liga a função de fechar o banco de dados quando terminar a conexão
app.teardown_appcontext(close_connection)

# Inicia as tabelas do banco de dados (Passamos o app para ele saber as configurações)
init_db(app)

# Registrando os Blueprints (Colocando as gavetas no armário principal)
app.register_blueprint(auth_bp)
app.register_blueprint(processos_bp)
app.register_blueprint(fornecedores_bp)
app.register_blueprint(pagamentos_bp)
app.register_blueprint(usuarios_bp)
app.register_blueprint(dashboard_bp)

if __name__ == '__main__':
    app.run(debug=True, port=5000)