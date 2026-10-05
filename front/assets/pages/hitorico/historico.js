// Variável global para armazenar os dados do banco
let historicoData = [];
let historicoFiltrado = []; // Armazena os processos após a aplicação de filtros

// ---- Variáveis de Paginação ----
let currentPage = 1;
const itemsPerPage = 10; // Itens por página

// Função para carregar o filtro de gestor (APENAS PARA ADMIN)
async function carregarFiltroGestor() {
  const usuario = JSON.parse(localStorage.getItem("usuario"));
  if (usuario && usuario.perfil === "admin") {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        "http://localhost:5000/api/usuarios/gestores",
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!response.ok) return;

      const gestores = await response.json();
      const container = document.getElementById("filtro-gestor-container");
      container.innerHTML = `
        <label for="filtroGestor" class="form-label">Filtrar por Gestor</label>
        <select id="filtroGestor" class="form-select">
          <option value="Selecione" selected>Todos</option>
          ${gestores.map((g) => `<option value="${g.id_usuario}">${g.nome}</option>`).join("")}
        </select>`;
    } catch (e) {
      console.error("Erro ao carregar filtro de gestores", e);
    }
  }
}

// Função para buscar dados da API em Python
async function carregarDadosDaApi() {
  try {
    const token = localStorage.getItem("token");
    const response = await fetch("http://localhost:5000/api/processos", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      historicoData = await response.json();
      historicoFiltrado = [...historicoData];
      await carregarFiltroGestor(); // Carrega o filtro de gestor se for admin
      currentPage = 1;
      renderizarTabela(historicoFiltrado);
    } else {
      console.error("Erro ao buscar histórico de processos da API.");
    }
  } catch (error) {
    console.error("Erro de conexão com a API:", error);
  }
}

function renderizarTabela(dados) {
  const tbody = document.getElementById("tabelaHistoricoBody");
  const paginacaoContainer = document.getElementById("paginacaoContainer");
  tbody.innerHTML = "";

  if (!dados || dados.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center text-muted py-4 fw-semibold">
          Nenhum processo encontrado.
        </td>
      </tr>`;
    if (paginacaoContainer) paginacaoContainer.innerHTML = "";
    return;
  }

  // Fatiar o array para mostrar apenas os itens da página atual
  const start = (currentPage - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  const dadosPagina = dados.slice(start, end);

  const usuario = JSON.parse(localStorage.getItem("usuario"));
  const podeEditar =
    usuario && (usuario.perfil === "admin" || usuario.perfil === "gestor");

  dadosPagina.forEach((processo) => {
    const isDraft =
      String(processo.status_pca || "")
        .trim()
        .toLowerCase() === "rascunho";
    const tr = document.createElement("tr");

    const identificador =
      processo.numero_contrato ||
      processo.numero_processo ||
      processo.id_processo;

    tr.innerHTML = `
            <td class="text-secondary">${identificador || "-"}</td>
            <td class="text-primary-dark">${processo.nome_objeto || "-"}</td>
            <td>${processo.nome_gestor || "-"}</td>
            <td>${processo.data_pca || "-"}</td>
            <td>${processo.situacao_contrato || "-"}</td>
            <td>${processo.data_vencimento || "-"}</td>
            <td class="text-secondary">${processo.status_pca || "-"}</td>
            <td class="text-nowrap">
                <button class="btn btn-sm btn-action-view me-1" onclick="abrirModal('${processo.id_processo}')" title="Visualizar">
                    <i class="bi bi-eye"></i>
                </button>
                ${
                  isDraft && podeEditar
                    ? `<button class="btn btn-sm btn-outline-primary me-1" style="padding: 0.15rem 0.3rem; font-size: 0.75rem;" onclick="editarProcesso('${processo.id_processo}')" title="Continuar edição">
                    <i class="bi bi-pencil"></i>
                </button>`
                    : ""
                }
                ${
                  podeEditar
                    ? `<button class="btn btn-sm btn-action-delete" style="padding: 0.15rem 0.3rem; font-size: 0.75rem;" onclick="excluirProcessoDoFront('${processo.id_processo}')" title="Excluir">
                    <i class="bi bi-trash"></i>
                </button>`
                    : ""
                }
            </td>
        `;
    tbody.appendChild(tr);
  });

  renderPaginacao(dados.length);
}

function renderPaginacao(totalItems) {
  const paginacaoContainer = document.getElementById("paginacaoContainer");
  if (!paginacaoContainer) return;

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  // Oculta paginação se só houver 1 página
  if (totalPages <= 1) {
    paginacaoContainer.innerHTML = "";
    return;
  }

  let html = `<ul class="pagination shadow-sm">`;

  // Botão Anterior
  html += `<li class="page-item ${currentPage === 1 ? "disabled" : ""}">
            <button class="page-link" onclick="mudarPagina(${currentPage - 1})">Anterior</button>
           </li>`;

  // Números das páginas
  for (let i = 1; i <= totalPages; i++) {
    html += `<li class="page-item ${currentPage === i ? "active" : ""}">
              <button class="page-link" onclick="mudarPagina(${i})">${i}</button>
             </li>`;
  }

  // Botão Próximo
  html += `<li class="page-item ${currentPage === totalPages ? "disabled" : ""}">
            <button class="page-link" onclick="mudarPagina(${currentPage + 1})">Próximo</button>
           </li>`;

  html += `</ul>`;
  paginacaoContainer.innerHTML = html;
}

function mudarPagina(novaPagina) {
  const totalPages = Math.ceil(historicoFiltrado.length / itemsPerPage);
  if (novaPagina < 1 || novaPagina > totalPages) return;

  currentPage = novaPagina;
  renderizarTabela(historicoFiltrado);
}

function abrirModal(id) {
  const processo = historicoData.find(
    (p) => String(p.id_processo) === String(id),
  );

  if (processo) {
    document.getElementById("modalId").value =
      processo.numero_contrato ||
      processo.numero_processo ||
      processo.id_processo;
    document.getElementById("modalObjeto").value = processo.nome_objeto;
    document.getElementById("modalData").value = processo.data_pca;
    document.getElementById("modalTipo").value = processo.tipo_setor;
    document.getElementById("modalStatus").value = processo.status_pca;
    document.getElementById("modalGestor").value = processo.nome_gestor || "-";
    document.getElementById("modalJustificativa").value =
      processo.justificativa || "";
    document.getElementById("modalCodigoSei").value = processo.codigo_sei || "";
    document.getElementById("modalNumeroProcessoCi").value =
      processo.numero_processo_ci || "";
    document.getElementById("modalCodigoDfd").value = processo.codigo_dfd || "";
    document.getElementById("modalCodigoPca").value = processo.codigo_pca || "";
    document.getElementById("modalAnoExecucao").value =
      processo.ano_execucao || "";
    document.getElementById("modalNumeroProcessoPei").value =
      processo.numero_processo_pei || "";
    document.getElementById("modalNumeroProcesso").value =
      processo.numero_processo || "";
    document.getElementById("modalEstimativaFinanceira").value =
      processo.estimativa_financeira || "";
    document.getElementById("modalProcessoLicitatorio").value =
      processo.processo_licitatorio || "";
    document.getElementById("modalFornecedor").value =
      processo.id_fornecedor || "";
    document.getElementById("modalNumeroContrato").value =
      processo.numero_contrato || "";
    document.getElementById("modalSituacaoContrato").value =
      processo.situacao_contrato || "";
    document.getElementById("modalAnoInicio").value = processo.ano_inicio || "";
    document.getElementById("modalDataVencimento").value =
      processo.data_vencimento || "";
    document.getElementById("modalDisparoEmailAviso").value =
      processo.disparo_email_aviso || "";

    // === TRECHO CORRIGIDO: LENDO AS DUAS LISTAS PARALELAS ===
    const codigosEfisco = processo.codigos_efisco || [];
    const itensEfisco = processo.itens_efisco || [];

    document.getElementById("modalCodigosEfisco").textContent =
      codigosEfisco.length > 0
        ? codigosEfisco
            .map((codigo, index) => {
              const nome = itensEfisco[index] ? itensEfisco[index].trim() : "";
              return nome ? `${codigo} - ${nome}` : codigo;
            })
            .join("\n")
        : "-";
    // =========================================================

    const renovacoes = (processo.renovacoes_ano || []).map((ano, index) => {
      const data = (processo.renovacoes_data || [])[index] || "";
      return `Renovação ${index + 1}: ${ano || "-"} / ${data || "-"}`;
    });
    document.getElementById("modalRenovacoes").textContent =
      renovacoes.length > 0 ? renovacoes.join("\n") : "-";

    const viewModal = new bootstrap.Modal(document.getElementById("viewModal"));
    viewModal.show();
  }
}

function editarProcesso(id) {
  window.location.href = `../criar_processos/criar_processo.html?id=${id}`;
}

// Função para "excluir" um processo apenas da visualização do frontend
function excluirProcessoDoFront(id) {
  // Pede uma confirmação ao usuário para evitar exclusões acidentais
  const confirmou = confirm(
    "Tem certeza que deseja remover este processo da lista? A remoção é apenas visual e será desfeita ao recarregar a página.",
  );

  if (confirmou) {
    // Filtra o array de dados principal, removendo o processo com o ID correspondente
    historicoData = historicoData.filter((p) => String(p.id_processo) !== id);
    // Re-aplica os filtros para renderizar a tabela com os dados atualizados
    aplicarFiltros();
  }
}

// Função para aplicar os filtros na tabela
function aplicarFiltros() {
  const codigo = document.getElementById("filtroCodigo").value.toLowerCase();
  const status = document.getElementById("filtroStatus").value;
  const ano = document.getElementById("filtroAno").value;
  // Pega o valor do novo filtro de gestor (se ele existir)
  const gestorSelect = document.getElementById("filtroGestor");
  const gestorId = gestorSelect ? gestorSelect.value : "Selecione";

  historicoFiltrado = historicoData.filter((processo) => {
    const matchCodigo =
      String(processo.numero_contrato || "")
        .toLowerCase()
        .includes(codigo) ||
      String(processo.numero_processo || "")
        .toLowerCase()
        .includes(codigo) ||
      String(processo.id_processo || "")
        .toLowerCase()
        .includes(codigo);
    const matchStatus =
      status === "Selecione" || processo.status_pca === status;
    // Simulando que o ano possa ser buscado dentro da data (ex: "12/04/2024")
    const matchAno =
      ano === "Selecione" || String(processo.data_pca || "").includes(ano);
    // Adiciona a condição do filtro de gestor
    const matchGestor =
      gestorId === "Selecione" ||
      String(processo.id_usuario_criador) === gestorId;

    return matchCodigo && matchStatus && matchAno && matchGestor;
  });

  currentPage = 1; // Zera a página para a 1 ao aplicar o filtro
  renderizarTabela(historicoFiltrado);
}

// Função para limpar os filtros e retornar todos os processos
function limparFiltros() {
  document.getElementById("filtroCodigo").value = "";
  document.getElementById("filtroStatus").value = "Selecione";
  document.getElementById("filtroAno").value = "Selecione";
  // Limpa também o filtro de gestor, se ele existir
  const gestorSelect = document.getElementById("filtroGestor");
  if (gestorSelect) {
    gestorSelect.value = "Selecione";
  }

  historicoFiltrado = [...historicoData];
  currentPage = 1; // Zera a página para a 1 ao limpar o filtro
  renderizarTabela(historicoFiltrado);
}

document.addEventListener("DOMContentLoaded", () => {
  carregarDadosDaApi();

  // ============================================================
  // LÓGICA PARA OCULTAR BOTÃO DE CRIAR PROCESSO PARA PERFIS NÃO AUTORIZADOS
  // ============================================================
  try {
    const usuario = JSON.parse(localStorage.getItem("usuario"));

    // Busca o botão de criar processo dinamicamente pelo atributo onclick (deve existir no HTML)
    const btnCriarProcesso = document.querySelector(
      'button[onclick*="criar_processo.html"]',
    );

    if (usuario && btnCriarProcesso) {
      // Captura o perfil do usuário logado
      const perfil = String(usuario.perfil || "")
        .toLowerCase()
        .trim();

      // Oculta o botão se o perfil NÃO for 'admin' ou 'gestor' (correspondente aos perfis 1 e 3)
      if (perfil !== "admin" && perfil !== "gestor") {
        btnCriarProcesso.style.display = "none";
      }
    }
  } catch (error) {
    console.error("Erro ao aplicar regras de visualização do botão:", error);
  }
});