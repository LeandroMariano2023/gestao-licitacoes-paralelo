# Relatório Técnico do Projeto de Gestão de Processos

## 1. Visão Geral

Este documento descreve a arquitetura e o funcionamento do sistema de Gestão de Processos. A aplicação foi desenvolvida para centralizar e otimizar o acompanhamento de processos administrativos, licitatórios e de contratos, oferecendo uma interface intuitiva para o usuário e um backend robusto para o gerenciamento dos dados.

O sistema é dividido em duas partes principais:

- **Backend (API)**: Uma aplicação em Python utilizando o micro-framework Flask.
- **Frontend**: Uma aplicação web construída com HTML, CSS e JavaScript puro, que consome a API do backend.

---

## 2. Arquitetura da Solução

A aplicação segue o modelo cliente-servidor.

### 2.1. Backend (Servidor)

- **Framework**: Flask (Python).
- **Banco de Dados**: SQLite, um banco de dados relacional leve baseado em arquivo (`banco_dados.db`). A inicialização e a criação da tabela `processos` são feitas automaticamente na primeira execução do servidor.
- **API**: Exposição de endpoints RESTful para operações de CRUD (Criar, Ler, Atualizar, Deletar) sobre os processos.
- **Autenticação**: Utiliza JSON Web Tokens (JWT) para proteger os endpoints. O cliente deve obter um token através da rota de login e enviá-lo no cabeçalho `Authorization` de cada requisição subsequente.
- **CORS**: A aplicação está configurada para aceitar requisições de origens diferentes (Cross-Origin Resource Sharing), permitindo que o frontend (servido, por exemplo, pelo Live Server do VS Code) se comunique com o backend.

### 2.2. Frontend (Cliente)

- **Tecnologias**: HTML5, CSS3 e JavaScript (ES6+).
- **Framework CSS**: Bootstrap 5 para componentização e responsividade da interface.
- **Comunicação**: Utiliza a `Fetch API` do JavaScript para realizar chamadas assíncronas (AJAX) aos endpoints do backend.
- **Estrutura**: É uma aplicação de múltiplas páginas (MPA - Multi-Page Application), onde cada funcionalidade principal (Login, Dashboard, Histórico, Criar Processo) possui seu próprio conjunto de arquivos HTML, CSS e JS. Componentes reutilizáveis, como a barra de navegação, são carregados dinamicamente via JavaScript.

---

## 3. Estrutura de Arquivos

A estrutura do projeto está organizada da seguinte forma:

```
projeto4/
├── app.py                  # Arquivo principal do backend Flask (API)
├── banco_dados.db          # Arquivo do banco de dados SQLite
├── front/
│   ├── assets/
│   │   ├── image/          # Imagens (logos, backgrounds)
│   │   └── pages/
│   │       ├── criar_processos/
│   │       │   ├── criar_processo.html
│   │       │   ├── criar_processo.js
│   │       │   └── criar_processo.css
│   │       ├── dashboard/
│   │       │   ├── dashboard.html
│   │       │   ├── dashboard.js
│   │       │   └── dashboard.css
│   │       ├── hitorico/
│   │       │   ├── historico.html
│   │       │   ├── historico.js
│   │       │   └── historico.css
│   │       ├── login/
│   │       │   ├── login.html
│   │       │   ├── login.js
│   │       │   └── login.css
│   │       └── nav_bar/
│   │           ├── nav.html
│   │           ├── nav.js
│   │           └── nav.css
│   └── index.html          # Página inicial, redireciona para o login
└── relatorio.md            # Este relatório
```

---

## 4. Detalhamento do Backend (`app.py`)

O servidor Flask é o cérebro da aplicação.

### 4.1. Banco de Dados

A função `init_db()` é responsável por:

1. Conectar-se ou criar o arquivo `banco_dados.db`.
2. Criar a tabela `processos` se ela não existir.
3. **Migração Ad-hoc**: Verificar e adicionar colunas que possam estar faltando em um banco de dados já existente, garantindo retrocompatibilidade.
4. Inserir dados de exemplo se a tabela estiver vazia, para facilitar os testes iniciais.

### 4.2. Autenticação

O decorator `@token_required` é um _middleware_ que intercepta as requisições para rotas protegidas. Ele verifica a presença e a validade do token JWT no cabeçalho `Authorization: Bearer <token>`.

A rota `/api/auth/login` (método `POST`) recebe um `username` e `password`. Atualmente, ela usa credenciais fixas (`12345678900` / `123456`) para fins de demonstração e retorna um token JWT com validade de 24 horas em caso de sucesso.

### 4.3. Endpoints da API

Todos os endpoints abaixo, exceto o de login, requerem autenticação.

- `GET /api/processos`: Retorna uma lista de todos os processos cadastrados, ordenados do mais recente para o mais antigo.
- `POST /api/processos`: Cria um novo processo. Recebe os dados em formato JSON. Trata campos dinâmicos (como `codigos_efisco`) que são enviados como arrays e os armazena como strings JSON no banco.
- `GET /api/processos/<int:id_processo>`: Retorna os detalhes de um único processo.
- `PUT /api/processos/<int:id_processo>`: Atualiza um processo existente.
- `GET /api/dashboard/resumo`: Endpoint otimizado para o dashboard. Ele processa todos os dados no servidor e retorna um resumo contendo:
  - Total de contratos a vencer (nos próximos 180 dias).
  - Total de processos concluídos.
  - Total de processos pendentes.
  - Uma lista de alertas detalhados sobre os contratos a vencer.

---

## 5. Detalhamento do Frontend

O frontend é responsável por toda a interação com o usuário.

### 5.1. `login.js`

- Controla a transição da tela de _loading_ para a tela de login.
- Captura os dados do formulário de login, envia para a API (`/api/auth/login`) e, em caso de sucesso, armazena o token recebido no `localStorage` do navegador.
- Após o login bem-sucedido, redireciona o usuário para a página do dashboard.

### 5.2. `nav.js`

- Carrega dinamicamente o conteúdo de `nav.html` em todas as páginas que possuem o placeholder `<div id="nav-placeholder"></div>`.
- Marca o link da página atual como "ativo" para feedback visual.
- Implementa a funcionalidade de "Sair" (logout), que remove o token e os dados do usuário do `localStorage` e redireciona para a página de login.

### 5.3. `dashboard.js`

- Realiza duas chamadas à API ao carregar:
  1. Para `/api/dashboard/resumo`, a fim de popular os cards de indicadores (KPIs) e os banners de alerta.
  2. Para `/api/processos`, para obter a lista dos 5 processos mais recentes e exibi-los na tabela "Últimas Atualizações".
- Implementa a função `abrirModal()` para exibir os detalhes completos de um processo em uma janela modal do Bootstrap.
- O botão "Continuar edição" em um processo com status "Rascunho" redireciona para a página de criação, passando o ID do processo como parâmetro na URL (`.../criar_processo.html?id=X`), permitindo que a tela de edição carregue os dados existentes.

### 5.4. `historico.js`

- Carrega a lista completa de todos os processos da API e os renderiza na tabela.
- Implementa as funções `aplicarFiltros()` e `limparFiltros()` que manipulam os dados em memória (no array `historicoData`) para filtrar a tabela por código, status e ano, sem a necessidade de novas chamadas à API para cada filtro.

### 5.5. `criar_processo.js` (ou `script.js`)

- Gerencia a navegação do formulário multi-etapas (stepper), mostrando e ocultando os painéis de acordo com o passo atual.
- Controla a adição e remoção dinâmica de campos, como "Códigos E-fisco" e "Renovações".
- **Criação**: Ao clicar em "CONCLUIR CADASTRO", o script serializa todos os dados do formulário, incluindo os campos dinâmicos, e os envia via `POST` para `/api/processos`.
- **Rascunho**: O botão "SALVAR RASCUNHO" executa uma lógica similar, mas injeta o campo `status: "Rascunho"` no payload antes de enviá-lo para a API.
- **Edição**: O script está preparado para, futuramente, verificar se há um ID na URL. Se houver, ele fará uma chamada `GET` para `/api/processos/<id>`, preencherá o formulário com os dados retornados e, ao salvar, fará uma chamada `PUT` em vez de `POST`. (Esta funcionalidade é iniciada no `dashboard.js` mas a lógica de carregamento precisa ser implementada aqui).

---

## 6. Como Executar o Projeto

1.  **Backend**:
    - Navegue até a pasta raiz do projeto.
    - Instale as dependências: `pip install Flask Flask-Cors PyJWT`.
    - Execute o servidor: `python backend/app.py`.
    - O servidor estará rodando em `http://localhost:5000`.

2.  **Frontend**:
    - Navegue até a pasta `front/`.
    - Se estiver usando o Visual Studio Code, instale a extensão "Live Server".
    - Clique com o botão direito no arquivo `index.html` (ou `login.html`) e selecione "Open with Live Server".
    - O navegador abrirá, e a aplicação estará pronta para uso.

---
