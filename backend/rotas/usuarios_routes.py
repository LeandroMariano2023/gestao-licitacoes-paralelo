from flask import Blueprint, jsonify, request
from database import get_db
from auth import token_required, hash_password
import sqlite3

usuarios_bp = Blueprint('usuarios_bp', __name__)

# --- LISTAR GESTORES ---
@usuarios_bp.route('/api/usuarios/gestores', methods=['GET'])
@token_required
def get_gestores(usuario_logado):
    if usuario_logado['perfil'] != 'admin':
        return jsonify({'erro': 'Acesso negado'}), 403

    db = get_db()
    c = db.cursor()
    c.execute("SELECT id_usuario, nome FROM usuarios WHERE perfil = 'gestor' ORDER BY nome")
    gestores = c.fetchall()
    return jsonify([dict(g) for g in gestores])


# --- ROTA: CADASTRO DE USUÁRIOS (APENAS ADMIN) ---
@usuarios_bp.route('/api/usuarios/cadastro', methods=['POST'])
@token_required
def cadastrar_usuario(usuario_logado):
    # 1. Verifica se quem está logado é realmente um Administrador
    if usuario_logado['perfil'] != 'admin':
        return jsonify({'erro': 'Acesso negado. Apenas administradores podem cadastrar novos usuários.'}), 403

    # 2. Pega as informações enviadas pelo Front-end
    dados = request.get_json()
    if not dados:
        return jsonify({'erro': 'Nenhum dado recebido'}), 400

    username = dados.get('username')
    password = dados.get('password')
    nome = dados.get('nome')
    perfil = dados.get('perfil')
    id_gestor_associado = dados.get('id_gestor_associado')

    # 3. Verifica se não esqueceram de preencher nenhum campo obrigatório
    if not all([username, password, nome, perfil]):
        return jsonify({'erro': 'Campos obrigatórios ausentes (username, password, nome, perfil)'}), 400

    # Garante que o perfil escolhido é um dos quatro permitidos no sistema
    if perfil not in ['admin', 'diretor', 'gestor', 'usuario']:
        return jsonify({'erro': 'Perfil inválido criado.'}), 400

    db = get_db()
    c = db.cursor()

    try:
        # 4. Criptografa a senha
        senha_criptografada = hash_password(password)

        # 5. SALVA NO BANCO
        c.execute('''
            INSERT INTO usuarios (username, password_hash, nome, perfil, id_gestor_associado)
            VALUES (?, ?, ?, ?, ?)
        ''', (username, senha_criptografada, nome, perfil, id_gestor_associado))
        
        db.commit()
        return jsonify({'mensagem': 'Usuário cadastrado com sucesso!'}), 201

    except sqlite3.IntegrityError:
        # Se o banco de dados reclamar que o CPF (username) já existe, nós avisamos o Front-end
        return jsonify({'erro': 'Este usuário (CPF) já está cadastrado no sistema.'}), 409