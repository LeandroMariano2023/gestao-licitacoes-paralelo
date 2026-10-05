import os
import smtplib
from email.message import EmailMessage
from flask import Blueprint, request, jsonify
import json
import datetime
from database import get_db
from auth import token_required

processos_bp = Blueprint('processos_bp', __name__)

# =====================================================================
# FUNÇÃO AUXILIAR PARA ENVIO DE RELATÓRIO POR E-MAIL
# =====================================================================
def enviar_email_notificacao(destinatario, nome_processo, acao, dados=None):
    if not destinatario:
        print("--> DIAGNÓSTICO: Campo 'Disparo de e-mail de aviso' veio vazio do front-end. Nenhum e-mail será enviado.")
        return False, "Campo de e-mail vazio"

    usuario_email = os.environ.get('EMAIL_USER')
    senha_email = os.environ.get('EMAIL_PASS')

    if not usuario_email or not senha_email:
        print("--> ERRO CRÍTICO: As credenciais EMAIL_USER e EMAIL_PASS não foram encontradas no arquivo .env!")
        return False, "Credenciais ausentes no .env"

    try:
        # Se os dados foram passados, montamos o resumo para o relatório
        dados = dados or {}
        gestor = dados.get('nome_gestor', 'Não informado') or 'Não informado'
        tipo = dados.get('tipo_setor', 'Não informado') or 'Não informado'
        estimativa = dados.get('estimativa_financeira', '0.00') or '0.00'
        justificativa = dados.get('justificativa', 'Nenhuma justificativa informada.') or 'Nenhuma justificativa informada.'
        status = dados.get('status_pca', 'Em Andamento') or 'Em Andamento'
        
        # Pega a lista de itens do E-Fisco se existirem e formata de forma limpa
        itens_efisco = dados.get('itens_efisco', [])
        codigos_efisco = dados.get('codigos_efisco', [])
        texto_efisco = ""
        
        if itens_efisco and isinstance(itens_efisco, list) and len(itens_efisco) > 0:
            for i in range(len(itens_efisco)):
                cod = codigos_efisco[i] if (isinstance(codigos_efisco, list) and i < len(codigos_efisco)) else ""
                item_nome = itens_efisco[i]
                texto_efisco += f"\n  * [{cod}] - {item_nome}"
        else:
            texto_efisco = "\n  * Nenhum item cadastrado no E-fisco."

        msg = EmailMessage()
        msg['Subject'] = f'[PROCAPE - RELATÓRIO] Processo "{nome_processo}" ({acao})'
        msg['From'] = usuario_email
        
        # Aceita vários e-mails separados por vírgula no campo do front-end (Ex: "leo@email.com, teste@email.com")
        destinatarios_lista = [email.strip() for email in destinatario.split(',') if email.strip()]
        msg['To'] = ", ".join(destinatarios_lista)

        # Corpo do e-mail formatado como um Relatório Institucional
        msg.set_content(f"""=========================================================
        RELATÓRIO DE REGISTRO DE PROCESSO - PROCAPE
=========================================================

O processo abaixo foi {acao} no sistema e este é o resumo dos dados registrados:

📋 DADOS GERAIS
---------------------------------------------------------
• Objeto: {nome_processo}
• Status Atual: {status}
• Gestor Responsável: {gestor}
• Tipo / Setor: {tipo}
• Estimativa Financeira: R$ {estimativa}

📝 JUSTIFICATIVA
---------------------------------------------------------
{justificativa}

📦 ITENS DO E-FISCO VINCULADOS
---------------------------------------------------------{texto_efisco}

=========================================================
Este é um relatório automático gerado pelo Sistema PROCAPE.
Por favor, não responda a este e-mail.
=========================================================
""")

        print(f"--> DIAGNÓSTICO: Conectando aos servidores do Gmail (smtp.gmail.com:465) para disparar o relatório...")
        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as smtp:
            smtp.login(usuario_email, senha_email)
            smtp.send_message(msg)
            print(f"--> SUCESSO ABSOLUTO! Relatório enviado com sucesso para: {msg['To']}")
            return True, "Relatório enviado com sucesso"

    except smtplib.SMTPAuthenticationError:
        print("--> ERRO DE AUTENTICAÇÃO: O Gmail recusou a senha! Você precisa usar uma 'Senha de App' de 16 caracteres no .env, e não sua senha normal.")
        return False, "Erro de autenticação com o Gmail (use Senha de App)"
    except Exception as e:
        print(f"--> ERRO NO DISPARO DO E-MAIL: {str(e)}")
        return False, str(e)


# =====================================================================
# ROTAS DA API DE PROCESSOS
# =====================================================================

@processos_bp.route('/api/processos', methods=['GET'])
@token_required
def get_processos(usuario_logado):
    perfil = usuario_logado['perfil']
    id_usuario = usuario_logado['id_usuario']
    db = get_db()
    c = db.cursor()
    query = 'SELECT * FROM processos'
    params = []

    if perfil == 'gestor':
        query += ' WHERE id_usuario_criador = ?'
        params.append(id_usuario)
    elif perfil == 'usuario':
        id_gestor = usuario_logado.get('id_gestor_associado')
        if id_gestor:
            query += ' WHERE id_usuario_criador = ?'
            params.append(id_gestor)
        else:
            return jsonify([])

    query += ' ORDER BY id_processo DESC'
    c.execute(query, params)
    linhas = c.fetchall()
    
    processos = [dict(linha) for linha in linhas]
    for p in processos:
        for key in ['codigos_efisco', 'renovacoes_ano', 'renovacoes_data', 'itens_efisco', 'fornecedores_efisco', 'notas_empenho_efisco']:
            p[key] = json.loads(p[key] or '[]')

    return jsonify(processos)


@processos_bp.route('/api/processos/<int:id_processo>', methods=['GET'])
@token_required
def get_processo(id_processo, usuario_logado):
    db = get_db()
    c = db.cursor()
    c.execute('SELECT * FROM processos WHERE id_processo = ?', (id_processo,))
    linha = c.fetchone()

    if linha is None:
        return jsonify({'erro': 'Processo não encontrado'}), 404
    
    processo = dict(linha)
    perfil = usuario_logado['perfil']

    if perfil == 'gestor' and processo['id_usuario_criador'] != usuario_logado['id_usuario']:
        return jsonify({'erro': 'Acesso negado'}), 403
    if perfil == 'usuario' and processo['id_usuario_criador'] != usuario_logado['id_gestor_associado']:
        return jsonify({'erro': 'Acesso negado'}), 403

    for key in ['codigos_efisco', 'renovacoes_ano', 'renovacoes_data', 'itens_efisco', 'fornecedores_efisco', 'notas_empenho_efisco']:
        processo[key] = json.loads(processo[key] or '[]')

    return jsonify(processo)


@processos_bp.route('/api/processos', methods=['POST'])
@token_required
def criar_processo(usuario_logado):
    perfil = usuario_logado['perfil']
    if perfil not in ['admin', 'gestor']:
        return jsonify({'erro': 'Acesso negado. Perfil não autorizado para criação.'}), 403

    dados = request.get_json()
    if not dados:
        return jsonify({'erro': 'Nenhum dado recebido'}), 400
    
    id_usuario_criador = usuario_logado['id_usuario']
    status = dados.get('status_pca', 'Em Andamento')
    codigos_efisco = json.dumps(dados.get('codigos_efisco', []))
    itens_efisco = json.dumps(dados.get('itens_efisco', []))
    fornecedores_efisco = json.dumps(dados.get('fornecedores_efisco', []))
    notas_empenho_efisco = json.dumps(dados.get('notas_empenho_efisco', []))
    renovacoes_ano = json.dumps(dados.get('renovacoes_ano', []))
    renovacoes_data = json.dumps(dados.get('renovacoes_data', []))
    
    nome_objeto = dados.get('nome_objeto', 'Processo Sem Nome') or 'Processo Sem Nome'
    data_pca = dados.get('data_pca', datetime.datetime.now().strftime("%d/%m/%Y")) or datetime.datetime.now().strftime("%d/%m/%Y")
    tipo_setor = dados.get('tipo_setor', 'Não Informado') or 'Não Informado'
    
    db = get_db()
    c = db.cursor()
    c.execute('''
        INSERT INTO processos (
            nome_objeto, nome_gestor, justificativa, tipo_setor, codigo_sei, numero_processo_ci,
            codigo_dfd, codigo_pca, ano_execucao, numero_processo_pei, status_pca, numero_processo,
            data_pca, estimativa_financeira, processo_licitatorio, id_fornecedor, numero_contrato,
            situacao_contrato, ano_inicio, data_vencimento, disparo_email_aviso, codigos_efisco,
            renovacoes_ano, renovacoes_data, itens_efisco, fornecedores_efisco, notas_empenho_efisco,
            id_usuario_criador
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        nome_objeto, dados.get('nome_gestor'), dados.get('justificativa'), tipo_setor, dados.get('codigo_sei'),
        dados.get('numero_processo_ci'), dados.get('codigo_dfd'), dados.get('codigo_pca'), dados.get('ano_execucao'),
        dados.get('numero_processo_pei'), status, dados.get('numero_processo'), data_pca, dados.get('estimativa_financeira'),
        dados.get('processo_licitatorio'), dados.get('id_fornecedor'), dados.get('numero_contrato'),
        dados.get('situacao_contrato'), dados.get('ano_inicio'), dados.get('data_vencimento'), dados.get('disparo_email_aviso'),
        codigos_efisco, renovacoes_ano, renovacoes_data, itens_efisco, fornecedores_efisco, notas_empenho_efisco, id_usuario_criador
    ))
    processo_id = c.lastrowid
    db.commit()

    # --- DISPARO DO RELATÓRIO APÓS SALVAR NO BANCO ---
    enviar_email_notificacao(
        destinatario=dados.get('disparo_email_aviso'),
        nome_processo=nome_objeto,
        acao='CADASTRADO',
        dados=dados
    )
    # -------------------------------------------------

    return jsonify({'mensagem': 'Processo salvo com sucesso!', 'id_processo': processo_id}), 201


@processos_bp.route('/api/processos/<int:id_processo>', methods=['PUT'])
@token_required
def atualizar_processo(id_processo, usuario_logado):
    perfil = usuario_logado['perfil']
    if perfil not in ['admin', 'gestor']:
        return jsonify({'erro': 'Acesso negado. Perfil não autorizado para edição.'}), 403

    dados = request.get_json()
    if not dados:
        return jsonify({'erro': 'Nenhum dado recebido'}), 400

    db = get_db()
    c = db.cursor()

    if perfil == 'gestor':
        c.execute('SELECT id_usuario_criador FROM processos WHERE id_processo = ?', (id_processo,))
        dono_processo = c.fetchone()
        if not dono_processo or dono_processo[0] != usuario_logado['id_usuario']:
            return jsonify({'erro': 'Acesso negado. Você não é o criador deste processo.'}), 403

    status = dados.get('status_pca', 'Em Andamento')
    nome_objeto = dados.get('nome_objeto', 'Processo Sem Nome') or 'Processo Sem Nome'
    data_pca = dados.get('data_pca', datetime.datetime.now().strftime("%d/%m/%Y")) or datetime.datetime.now().strftime("%d/%m/%Y")
    tipo_setor = dados.get('tipo_setor', 'Não Informado') or 'Não Informado'

    c.execute('''
        UPDATE processos SET
            nome_objeto = ?, nome_gestor = ?, justificativa = ?, tipo_setor = ?, codigo_sei = ?,
            numero_processo_ci = ?, codigo_dfd = ?, codigo_pca = ?, ano_execucao = ?, numero_processo_pei = ?,
            status_pca = ?, numero_processo = ?, data_pca = ?, estimativa_financeira = ?, processo_licitatorio = ?,
            id_fornecedor = ?, numero_contrato = ?, situacao_contrato = ?, ano_inicio = ?, data_vencimento = ?,
            disparo_email_aviso = ?, codigos_efisco = ?, renovacoes_ano = ?, renovacoes_data = ?, itens_efisco = ?,
            fornecedores_efisco = ?, notas_empenho_efisco = ?
        WHERE id_processo = ?
    ''', (
        nome_objeto, dados.get('nome_gestor'), dados.get('justificativa'), tipo_setor, dados.get('codigo_sei'),
        dados.get('numero_processo_ci'), dados.get('codigo_dfd'), dados.get('codigo_pca'), dados.get('ano_execucao'),
        dados.get('numero_processo_pei'), status, dados.get('numero_processo'), data_pca, dados.get('estimativa_financeira'),
        dados.get('processo_licitatorio'), dados.get('id_fornecedor'), dados.get('numero_contrato'),
        dados.get('situacao_contrato'), dados.get('ano_inicio'), dados.get('data_vencimento'), dados.get('disparo_email_aviso'),
        json.dumps(dados.get('codigos_efisco', [])), json.dumps(dados.get('renovacoes_ano', [])),
        json.dumps(dados.get('renovacoes_data', [])), json.dumps(dados.get('itens_efisco', [])),
        json.dumps(dados.get('fornecedores_efisco', [])), json.dumps(dados.get('notas_empenho_efisco', [])), id_processo
    ))

    if c.rowcount == 0:
        return jsonify({'erro': 'Processo não encontrado'}), 404

    db.commit()

    # --- DISPARO DO RELATÓRIO APÓS ATUALIZAR / SALVAR RASCUNHO ---
    enviar_email_notificacao(
        destinatario=dados.get('disparo_email_aviso'),
        nome_processo=nome_objeto,
        acao='ATUALIZADO',
        dados=dados
    )
    # -------------------------------------------------------------

    return jsonify({'mensagem': 'Processo atualizado com sucesso!'}), 200