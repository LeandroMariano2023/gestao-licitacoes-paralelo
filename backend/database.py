import sqlite3
from flask import g

DATABASE = 'banco_dados.db'

def get_db():
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = sqlite3.connect(DATABASE)
        db.row_factory = sqlite3.Row
    return db

def close_connection(exception):
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()

def init_db(app):
    # Passamos o 'app' para essa função para ela saber onde o sistema está rodando
    with app.app_context():
        import hashlib
        db = get_db()
        c = db.cursor()
        
        c.execute('''
            -- Tabela de Processos --
            CREATE TABLE IF NOT EXISTS processos (
                id_processo INTEGER PRIMARY KEY AUTOINCREMENT,
                nome_objeto TEXT,
                nome_gestor TEXT,
                justificativa TEXT,
                tipo_setor TEXT,
                codigo_sei TEXT,
                numero_processo_ci TEXT,
                codigo_dfd TEXT,
                codigo_pca TEXT,
                ano_execucao INTEGER,
                numero_processo_pei TEXT,
                status_pca TEXT,
                numero_processo TEXT,
                data_pca TEXT,
                estimativa_financeira TEXT,
                processo_licitatorio TEXT,
                id_fornecedor TEXT,
                numero_contrato TEXT,
                situacao_contrato TEXT,
                ano_inicio INTEGER,
                data_vencimento TEXT,
                disparo_email_aviso TEXT,
                codigos_efisco TEXT,
                renovacoes_ano TEXT,
                renovacoes_data TEXT,
                itens_efisco TEXT,
                fornecedores_efisco TEXT,
                notas_empenho_efisco TEXT
            )
        ''')

        # --- Tabela de Usuários ---
        c.execute('''
            CREATE TABLE IF NOT EXISTS usuarios (
                id_usuario INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                nome TEXT NOT NULL,
                perfil TEXT NOT NULL CHECK(perfil IN ('admin', 'diretor', 'gestor', 'usuario')),
                id_gestor_associado INTEGER
            )
        ''')

        c.execute('SELECT COUNT(*) FROM usuarios')
        if c.fetchone()[0] == 0:
            password_hash = hashlib.sha256('123456'.encode()).hexdigest()
            c.execute('''
                INSERT INTO usuarios (username, password_hash, nome, perfil, id_gestor_associado)
                VALUES
                ('11111111111', ?, 'Administrador do Sistema', 'admin', NULL),
                ('22222222222', ?, 'Diretor Geral', 'diretor', NULL),
                ('33333333333', ?, 'Gestor de Contratos 1', 'gestor', NULL),
                ('44444444444', ?, 'Usuário de Consulta 1', 'usuario', 3)
            ''', (password_hash, password_hash, password_hash, password_hash))

        columns = [row[1] for row in c.execute("PRAGMA table_info(processos)").fetchall()]
        extras = {
            'nome_gestor': 'TEXT', 'justificativa': 'TEXT', 'codigo_sei': 'TEXT',
            'numero_processo_ci': 'TEXT', 'codigo_dfd': 'TEXT', 'codigo_pca': 'TEXT',
            'ano_execucao': 'INTEGER', 'numero_processo_pei': 'TEXT', 'numero_processo': 'TEXT',
            'estimativa_financeira': 'TEXT', 'processo_licitatorio': 'TEXT', 'id_fornecedor': 'TEXT',
            'numero_contrato': 'TEXT', 'situacao_contrato': 'TEXT', 'ano_inicio': 'INTEGER',
            'data_vencimento': 'TEXT', 'disparo_email_aviso': 'TEXT', 'itens_efisco': 'TEXT',
            'fornecedores_efisco': 'TEXT', 'notas_empenho_efisco': 'TEXT', 'id_usuario_criador': 'INTEGER'
        }

        # --- Tabela de Fornecedores ---
        c.execute('''
            CREATE TABLE IF NOT EXISTS fornecedores (
                id_fornecedor INTEGER PRIMARY KEY AUTOINCREMENT,
                nome TEXT NOT NULL UNIQUE,
                cnpj TEXT UNIQUE
            )
        ''')

        c.execute('SELECT COUNT(*) FROM fornecedores')
        if c.fetchone()[0] == 0:
            c.execute('''
                INSERT INTO fornecedores (id_fornecedor, nome, cnpj) VALUES
                (1, 'Solivetti Comércio e Serviços', '11111111000111'),
                (2, 'Farmacêutica Norte', '22222222000122'),
                (3, 'Oxygen Care', '33333333000133')
            ''')

        # --- Tabela de Pagamentos ---
        c.execute('''
            CREATE TABLE IF NOT EXISTS pagamentos (
                id_pagamento INTEGER PRIMARY KEY AUTOINCREMENT,
                id_custom TEXT,
                empenho TEXT,
                efisco TEXT,
                fornecedor TEXT,
                descricao TEXT,
                vencimento TEXT,
                valor TEXT,
                status TEXT,
                nota_fiscal TEXT
            )
        ''')

        columns_pagamentos = [row[1] for row in c.execute("PRAGMA table_info(pagamentos)").fetchall()]
        if 'nota_fiscal' not in columns_pagamentos:
            c.execute("ALTER TABLE pagamentos ADD COLUMN nota_fiscal TEXT")

        c.execute('SELECT COUNT(*) FROM pagamentos')
        if c.fetchone()[0] == 0:
            c.execute('''
                INSERT INTO pagamentos (id_custom, empenho, efisco, fornecedor, descricao, vencimento, valor, status, nota_fiscal)
                VALUES 
                ('PAG-001', '2026NE001168', '599047-5', 'Solivetti Comércio e Serviços', 'Impressora Departamental Monocromática', '05/01/2026', 'R$ 15.000,00', 'Pago', 'NF-1001'),
                ('PAG-002', '2026NE001168', '607393-0', 'Solivetti Comércio e Serviços', 'Serviço de Terceirização de Impressão A3', '12/01/2026', 'R$ 3.614,00', 'Pendente', 'NF-1002'),
                ('PAG-003', '2025NE002044', '123456-7', 'Farmacêutica Norte', 'Medicamentos oncológicos', '20/01/2025', 'R$ 43.000,00', 'Pendente', 'NF-1003'),
                ('PAG-004', '2025NE001099', '987654-3', 'Oxygen Care', 'Fornecimento de gases medicinais', '28/01/2025', 'R$ 9.750,00', 'Atrasado', 'NF-1004')
            ''')

        for col, col_type in extras.items():
            if col not in columns:
                c.execute(f"ALTER TABLE processos ADD COLUMN {col} {col_type}")

        c.execute('SELECT COUNT(*) FROM processos')
        if c.fetchone()[0] == 0:
            c.execute('''
                INSERT INTO processos (nome_objeto, data_pca, tipo_setor, status_pca)
                VALUES 
                ('Aquisição de Equipamentos de TI', '12/04/2024', 'Tecnologia', 'Concluído'),
                ('Manutenção Predial', '15/05/2024', 'Infraestrutura', 'Pendente')
            ''')

        db.commit()