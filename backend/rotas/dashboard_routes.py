from flask import Blueprint, request, jsonify
import json
import datetime
from database import get_db
from auth import token_required

dashboard_bp = Blueprint('dashboard_bp', __name__)

@dashboard_bp.route('/api/dashboard/resumo', methods=['GET'])
@token_required
def get_resumo(usuario_logado):
    perfil = usuario_logado['perfil']
    id_usuario = usuario_logado['id_usuario']

    db = get_db()
    c = db.cursor()
    query = 'SELECT status_pca, data_vencimento, numero_contrato, numero_processo, nome_objeto, id_processo FROM processos'
    params = []

    if perfil == 'gestor':
        query += ' WHERE id_usuario_criador = ?'
        params.append(id_usuario)
    elif perfil == 'usuario':
        id_gestor = usuario_logado.get('id_gestor_associado')
        query += ' WHERE id_usuario_criador = ?'
        params.append(id_gestor if id_gestor else -1)

    c.execute(query, params)
    linhas = c.fetchall()

    hoje = datetime.date.today()
    alertas = []
    processos_pendentes = 0
    processos_concluidos = 0

    for linha in linhas:
        status = str(linha['status_pca'] or '').strip().lower()
        if status in ['aprovado', 'concluído', 'concluido']:
            processos_concluidos += 1
        elif status != 'rascunho':
            processos_pendentes += 1

        vencimento_str = linha['data_vencimento']
        if vencimento_str:
            try:
                venc_date = datetime.datetime.strptime(vencimento_str, '%Y-%m-%d').date()
                dias_restantes = (venc_date - hoje).days
                if 0 <= dias_restantes <= 190:
                    ref = linha['numero_contrato'] or linha['numero_processo'] or linha['nome_objeto'] or f"Proc. {linha['id_processo']}"
                    alertas.append({'dias': dias_restantes, 'titulo': ref})
            except Exception:
                pass

    alertas = sorted(alertas, key=lambda x: x['dias'])
    return jsonify({
        'contratos_vencer': len(alertas),
        'processos_concluidos': processos_concluidos,
        'processos_pendentes': processos_pendentes,
        'alertas': alertas
    })

@dashboard_bp.route('/api/lookup/efiscos-por-fornecedor', methods=['GET'])
@token_required
def lookup_efiscos_por_fornecedor(usuario_logado):
    fornecedor_id = request.args.get('fornecedor_id')
    if not fornecedor_id: return jsonify({'erro': 'ID do fornecedor é obrigatório'}), 400

    db = get_db()
    c = db.cursor()
    c.execute('SELECT * FROM processos')
    processos = c.fetchall()

    resultados = []
    for processo in processos:
        try:
            fornecedores_efisco_ids = json.loads(processo['fornecedores_efisco'] or '[]')
            for idx, id_forn in enumerate(fornecedores_efisco_ids):
                if str(id_forn) == str(fornecedor_id):
                    codigos_efisco = json.loads(processo['codigos_efisco'] or '[]')
                    itens_efisco = json.loads(processo['itens_efisco'] or '[]')
                    notas_empenho = json.loads(processo['notas_empenho_efisco'] or '[]')

                    resultados.append({
                        'codigo_efisco': codigos_efisco[idx] if len(codigos_efisco) > idx else '',
                        'item_efisco': itens_efisco[idx] if len(itens_efisco) > idx else '',
                        'nota_empenho': notas_empenho[idx] if len(notas_empenho) > idx else ''
                    })
        except (json.JSONDecodeError, IndexError):
            continue
    return jsonify(resultados)