from flask import Blueprint, request, jsonify
from database import get_db
from auth import token_required
import sqlite3

fornecedores_bp = Blueprint('fornecedores_bp', __name__)

@fornecedores_bp.route('/api/fornecedores', methods=['GET'])
@token_required
def get_fornecedores(usuario_logado):
    db = get_db()
    c = db.cursor()
    c.execute("SELECT id_fornecedor, nome, cnpj FROM fornecedores ORDER BY nome")
    fornecedores = c.fetchall()
    return jsonify([{'id': f['id_fornecedor'], 'nome': f['nome'], 'cnpj': f['cnpj']} for f in fornecedores])

@fornecedores_bp.route('/api/fornecedores', methods=['POST'])
@token_required
def criar_fornecedor(usuario_logado):
    dados = request.get_json()
    nome_fornecedor = dados.get('nome')
    cnpj_fornecedor = dados.get('cnpj', '').replace('.', '').replace('/', '').replace('-', '') 

    if not nome_fornecedor:
        return jsonify({'erro': 'O nome do fornecedor é obrigatório'}), 400

    db = get_db()
    c = db.cursor()

    try:
        c.execute("INSERT INTO fornecedores (nome, cnpj) VALUES (?, ?)", (nome_fornecedor, cnpj_fornecedor))
        novo_id = c.lastrowid
        db.commit()
        return jsonify({'mensagem': 'Fornecedor criado com sucesso!', 'id_fornecedor': novo_id, 'nome': nome_fornecedor, 'cnpj': cnpj_fornecedor}), 201
    except sqlite3.IntegrityError:
        return jsonify({'erro': 'Este fornecedor ou CNPJ já está cadastrado.'}), 409