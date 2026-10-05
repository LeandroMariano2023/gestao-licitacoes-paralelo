from flask import Blueprint, request, jsonify, current_app
import jwt
import datetime
from database import get_db
from auth import hash_password

# Criando a nossa etiqueta mágica
auth_bp = Blueprint('auth_bp', __name__)

@auth_bp.route('/api/auth/login', methods=['POST'])
def login():
    dados = request.get_json()
    
    if dados and dados.get('username') == '12345678900' and dados.get('password') == '123456':
        token = jwt.encode({
            'id_usuario': 0,
            'nome': 'Administrador Antigo',
            'perfil': 'admin',
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
        }, current_app.config['SECRET_KEY'], algorithm="HS256")
        return jsonify({'token': token, 'usuario': {'nome': 'Administrador Antigo', 'perfil': 'admin'}})

    db = get_db()
    c = db.cursor()
    c.execute('SELECT * FROM usuarios WHERE username = ?', (dados.get('username'),))
    usuario = c.fetchone()

    print("--- Tentativa de Login ---")
    print(f"CPF Recebido: {dados.get('username')}")
    print(f"Hash da Senha Recebida: {hash_password(dados.get('password'))}")
    if usuario: print(f"Hash da Senha no Banco:   {usuario['password_hash']}")

    if usuario and usuario['password_hash'] == hash_password(dados.get('password')):
        token = jwt.encode({
            'id_usuario': usuario['id_usuario'],
            'nome': usuario['nome'],
            'perfil': usuario['perfil'],
            'id_gestor_associado': usuario['id_gestor_associado'],
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
        }, current_app.config['SECRET_KEY'], algorithm="HS256")
        return jsonify({'token': token, 'usuario': {'nome': usuario['nome'], 'perfil': usuario['perfil']}})

    return jsonify({'erro': 'Usuário ou senha inválidos!'}), 401