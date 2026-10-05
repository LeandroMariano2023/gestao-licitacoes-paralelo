// Variável global para armazenar os dados vindos do banco
let processosData = [];

// Função para buscar dados das estatísticas/alertas do Dashboard
async function carregarResumoDashboard() {
  try {
    const token = localStorage.getItem("token");
    const response = await fetch("http://localhost:5000/api/dashboard/resumo", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      const resumo = await response.json();

      // Atualiza os contadores
      document.getElementById("qtdContratosVencer").innerText =
        resumo.contratos_vencer || 0;
      document.getElementById("qtdProcessosConcluidos").innerText =
        resumo.processos_concluidos || 0;
      document.getElementById("qtdProcessosPendentes").innerText =
        resumo.processos_pendentes || 0;

      // Lógica para injetar os banners de alerta detalhados (identificando os processos)
      const containerBanners = document.getElementById(
        "containerBannersUrgentes",
      );
      containerBanners.innerHTML = "";

      if (resumo.alertas && resumo.alertas.length > 0) {
        resumo.alertas.forEach((alerta) => {
          // Define a cor baseada na urgência: até 99 dias = vermelho, 100-190 dias = amarelo
          const classeCor =
            alerta.dias <= 99
              ? "banner-vermelho"
              : alerta.dias <= 190
                ? "banner-amarelo"
                : "banner-amarelo";

          const referencia =
            alerta.codigo_contrato ||
            alerta.referencia ||
            alerta.titulo ||
            "Processo";

          const div = document.createElement("div");
          div.className = `banner-urgente ${classeCor} mb-3 shadow-sm`;
          div.innerHTML = `
            <div class="d-flex align-items-center">
                <i class="bi bi-exclamation-circle-fill me-2 fs-5"></i>
                <span class="fw-bold">URGENTE: ${referencia}</span>
            </div>
            <div class="text-end lh-1">
                <span class="fw-bold fs-5">${alerta.dias} dias</span><br>
                <span class="small-txt">Para término</span>
            </div>
          `;
          containerBanners.appendChild(div);
        });
      }
    } else {
      console.error("Erro ao buscar resumo do dashboard.");
    }
  } catch (error) {
    console.error("Erro de conexão ao buscar resumo:", error);
  }
}

// Função para buscar dados da API em Python
async function carregarDadosDaApi() {
  try {
    const token = localStorage.getItem("token"); // Pega o token salvo no login
    const response = await fetch("http://localhost:5000/api/processos", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      processosData = await response.json();
      renderizarTabela();
    } else {
      console.error("Erro ao buscar processos da API.");
    }
  } catch (error) {
    console.error("Erro de conexão com a API:", error);
  }
}

// Função para renderizar a tabela na tela
function renderizarTabela() {
  const tbody = document.getElementById("tabelaProcessosBody");
  tbody.innerHTML = ""; // Limpa a tabela

  const usuario = JSON.parse(localStorage.getItem("usuario"));
  // Adaptado para manter a segurança das ações da tabela
  const podeEditar =
    usuario && (usuario.perfil === "admin" || usuario.perfil === "gestor");

  // Renderiza no dashboard apenas os 5 processos mais recentes
  processosData.slice(0, 5).forEach((processo) => {
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
}

// Função para abrir o Modal e preencher os dados do formulário
function abrirModal(id) {
  // Busca o processo no array pelo ID passado
  const processo = processosData.find(
    (p) => String(p.id_processo) === String(id),
  );

  if (processo) {
    // Preenche os campos do formulário do Modal
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

    // === Lógica para juntar Código e Nome do E-fisco ===
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
    // ====================================================

    const renovacoes = (processo.renovacoes_ano || []).map((ano, index) => {
      const data = (processo.renovacoes_data || [])[index] || "";
      return `Renovação ${index + 1}: ${ano || "-"} / ${data || "-"}`;
    });
    document.getElementById("modalRenovacoes").textContent =
      renovacoes.length > 0 ? renovacoes.join("\n") : "-";

    // Instancia e abre o Modal do Bootstrap
    const viewModal = new bootstrap.Modal(document.getElementById("viewModal"));
    viewModal.show();
  }
}

function editarProcesso(id) {
  window.location.href = `../criar_processos/criar_processo.html?id=${id}`;
}

// Função para "excluir" um processo apenas da visualização do frontend
function excluirProcessoDoFront(id) {
  const confirmou = confirm(
    "Tem certeza que deseja remover este processo da lista? A remoção é apenas visual e será desfeita ao recarregar a página.",
  );

  if (confirmou) {
    processosData = processosData.filter((p) => String(p.id_processo) !== id);
    renderizarTabela();
  }
}

// Inicia a renderização da tabela assim que o documento carregar
document.addEventListener("DOMContentLoaded", () => {
  carregarResumoDashboard();
  carregarDadosDaApi();

  // ============================================================
  // LÓGICA PARA OCULTAR BOTÃO DE CRIAR PROCESSO PARA PERFIS NÃO AUTORIZADOS
  // ============================================================
  try {
    const usuario = JSON.parse(localStorage.getItem("usuario"));

    // Busca o botão de criar processo dinamicamente pelo atributo onclick
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