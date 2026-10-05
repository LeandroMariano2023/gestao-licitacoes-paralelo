from flask import Blueprint, request, jsonify
import json
from database import get_db
from auth import token_required

pagamentos_bp = Blueprint('pagamentos_bp', __name__)

@pagamentos_bp.route('/api/pagamentos', methods=['GET'])
@token_required
def get_pagamentos(usuario_logado):
    db = get_db()
    c = db.cursor()
    c.execute('SELECT * FROM pagamentos ORDER BY id_pagamento DESC')
    linhas = c.fetchall()
    
    pagamentos_list = []
    for linha in linhas:
        pagamentos_dict = dict(linha)
        pagamentos_list.append({
            'id': pagamentos_dict['id_custom'], 'empenho': pagamentos_dict['empenho'],
            'efisco': pagamentos_dict['efisco'], 'fornecedor': pagamentos_dict['fornecedor'],
            'descricao': pagamentos_dict['descricao'], 'vencimento': pagamentos_dict['vencimento'],
            'valor': pagamentos_dict['valor'], 'status': pagamentos_dict['status'],
            'nota_fiscal': pagamentos_dict.get('nota_fiscal', '')
        })
    return jsonify(pagamentos_list)

@pagamentos_bp.route('/api/pagamentos', methods=['POST'])
@token_required
def criar_pagamento(usuario_logado):
    dados = request.get_json()
    if not dados: return jsonify({'erro': 'Nenhum dado recebido'}), 400

    required_fields = ['empenho', 'efisco', 'fornecedor', 'descricao', 'vencimento', 'valor', 'status']
    if not all(field in dados for field in required_fields):
        return jsonify({'erro': 'Campos obrigatórios ausentes'}), 400

    db = get_db()
    c = db.cursor()
    c.execute('SELECT COUNT(*) FROM pagamentos')
    total_pagamentos = c.fetchone()[0]
    novo_id_custom = f"PAG-{str(total_pagamentos + 1).zfill(3)}"

    c.execute('''
        INSERT INTO pagamentos (id_custom, empenho, efisco, fornecedor, descricao, vencimento, valor, status, nota_fiscal)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (novo_id_custom, dados['empenho'], dados['efisco'], dados['fornecedor'], dados['descricao'],
          dados['vencimento'], dados['valor'], dados['status'], dados.get('nota_fiscal', '')))
    db.commit()
    return jsonify({'mensagem': 'Pagamento salvo com sucesso!'}), 201

@pagamentos_bp.route('/api/lookup/pagamento-info', methods=['GET'])
@token_required
def lookup_pagamento_info(usuario_logado):
    empenho = request.args.get('empenho')
    efisco = request.args.get('efisco')
    if not empenho and not efisco:
        return jsonify({'erro': 'É necessário fornecer um empenho ou efisco'}), 400

    db = get_db()
    c = db.cursor()
    c.execute('SELECT * FROM processos')
    processos = c.fetchall()

    for processo in processos:
        try:
            notas_empenho = json.loads(processo['notas_empenho_efisco'] or '[]')
            codigos_efisco = json.loads(processo['codigos_efisco'] or '[]')
            itens_efisco = json.loads(processo['itens_efisco'] or '[]')
            fornecedores_efisco_ids = json.loads(processo['fornecedores_efisco'] or '[]')

            idx = -1
            if empenho and empenho in notas_empenho: idx = notas_empenho.index(empenho)
            elif efisco and efisco in codigos_efisco: idx = codigos_efisco.index(efisco)

            if idx != -1:
                fornecedor_nome = "Não encontrado"
                if fornecedores_efisco_ids and len(fornecedores_efisco_ids) > idx:
                    id_forn = fornecedores_efisco_ids[idx]
                    c_forn = db.cursor()
                    c_forn.execute("SELECT nome FROM fornecedores WHERE id_fornecedor = ?", (id_forn,))
                    res_forn = c_forn.fetchone()
                    if res_forn: fornecedor_nome = res_forn['nome']

                return jsonify({
                    'empenho': notas_empenho[idx] if len(notas_empenho) > idx else '',
                    'efisco': codigos_efisco[idx] if len(codigos_efisco) > idx else '',
                    'descricao': itens_efisco[idx] if len(itens_efisco) > idx else '',
                    'fornecedor': fornecedor_nome
                })
        except (json.JSONDecodeError, IndexError, ValueError):
            continue
    return jsonify({'erro': 'Nenhuma informação encontrada'}), 404