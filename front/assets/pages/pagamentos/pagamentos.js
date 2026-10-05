//----- Conexão com a API -----

let pagamentos = []; // Armazena todos os pagamentos vindos da API
let dadosFiltrados = []; // Armazena os pagamentos após a aplicação de filtros

// ---- Variáveis de Paginação ----
let currentPage = 1;
const itemsPerPage = 10; // Quantidade de itens por página

// ---- Helpers ----

function badgeClass(status) {
  if (status === "Pago") return "badge-pago";
  if (status === "Pendente") return "badge-pendente";
  return "badge-atrasado";
}

function extrairAno(vencimento) {
  if (!vencimento) return null;
  return vencimento.split("/")[2];
}

// ---- Renderização e Paginação ----

function renderTabela(dados) {
  const tbody = document.getElementById("tabelaPagamentosBody");
  const paginacaoContainer = document.getElementById("paginacaoContainer");

  if (!dados.length) {
    tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center text-muted py-4 fw-semibold">
                    Nenhum pagamento encontrado.
                </td>
            </tr>`;
    if (paginacaoContainer) paginacaoContainer.innerHTML = '';
    return;
  }

  // Fatiar o array para mostrar apenas os itens da página atual
  const start = (currentPage - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  const dadosPagina = dados.slice(start, end);

  tbody.innerHTML = dadosPagina
    .map(
      (p) => `
        <tr>
            <td class="fw-bold text-primary-dark">${p.id}</td>
            <td class="text-secondary fw-semibold">${p.empenho}</td>
            <td>${p.fornecedor}</td>
            <td class="text-start">
                ${p.descricao}<br>
                <small class="text-muted">Cód E-fisco: ${p.efisco}</small><br>
                <small class="text-muted text-primary">Nota Fiscal: ${p.nota_fiscal || "-"}</small>
            </td>
            <td>${p.vencimento}</td>
            <td class="fw-bold">${p.valor}</td>
            <td>
                <span class="badge-status ${badgeClass(p.status)}">${p.status}</span>
            </td>
            <td>
                <div class="d-flex flex-column gap-2 align-items-center">
                    <button class="btn-action-print" onclick="imprimirPagamento('${p.id}')">
                        <i class="bi bi-printer"></i> Imprimir
                    </button>
                    <button class="btn-action-excel" onclick="exportarExcelEspecifico('${p.id}')">
                        <i class="bi bi-file-earmark-excel"></i> Excel
                    </button>
                </div>
            </td>
        </tr>
    `,
    )
    .join("");

  // Chama a função para desenhar os botões de paginação
  renderPaginacao(dados.length);
}

function renderPaginacao(totalItems) {
  const paginacaoContainer = document.getElementById("paginacaoContainer");
  if (!paginacaoContainer) return;

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  if (totalPages <= 1) {
    paginacaoContainer.innerHTML = "";
    return;
  }

  let html = `<ul class="pagination shadow-sm">`;

  html += `<li class="page-item ${currentPage === 1 ? "disabled" : ""}">
            <button class="page-link" onclick="mudarPagina(${currentPage - 1})">Anterior</button>
           </li>`;

  for (let i = 1; i <= totalPages; i++) {
    html += `<li class="page-item ${currentPage === i ? "active" : ""}">
              <button class="page-link" onclick="mudarPagina(${i})">${i}</button>
             </li>`;
  }

  html += `<li class="page-item ${currentPage === totalPages ? "disabled" : ""}">
            <button class="page-link" onclick="mudarPagina(${currentPage + 1})">Próximo</button>
           </li>`;

  html += `</ul>`;
  paginacaoContainer.innerHTML = html;
}

function mudarPagina(novaPagina) {
  const totalPages = Math.ceil(dadosFiltrados.length / itemsPerPage);
  if (novaPagina < 1 || novaPagina > totalPages) return;
  
  currentPage = novaPagina;
  renderTabela(dadosFiltrados);
}

// ---- EXPORTAÇÃO PARA EXCEL ----

function prepararDadosParaExcel(arrayDePagamentos) {
    return arrayDePagamentos.map(p => ({
        "Nº Pagamento": p.id,
        "Nº Empenho": p.empenho,
        "Código E-fisco": p.efisco,
        "Fornecedor": p.fornecedor,
        "Descrição": p.descricao,
        "Nota Fiscal": p.nota_fiscal || "-",
        "Vencimento": p.vencimento,
        "Valor": p.valor,
        "Status": p.status
    }));
}

function exportarExcelGeral() {
    if (dadosFiltrados.length === 0) {
        alert("Não há dados na tabela para exportar.");
        return;
    }
    
    const dadosExcel = prepararDadosParaExcel(dadosFiltrados);
    const worksheet = XLSX.utils.json_to_sheet(dadosExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Pagamentos_Geral");
    XLSX.writeFile(workbook, "Relatorio_Pagamentos.xlsx");
}

function exportarExcelEspecifico(id) {
    const pagamento = pagamentos.find(p => p.id === id);
    if (!pagamento) {
        alert("Erro ao encontrar o pagamento.");
        return;
    }

    const dadosExcel = prepararDadosParaExcel([pagamento]);
    const worksheet = XLSX.utils.json_to_sheet(dadosExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Pagamento_" + id);
    XLSX.writeFile(workbook, `Pagamento_${id}.xlsx`);
}

// ---- Novo Cadastro de Pagamento ----

async function salvarNovoPagamento() {
  const fornecedorSelect = document.getElementById("novoFornecedor");
  const fornecedorNome =
    fornecedorSelect.options[fornecedorSelect.selectedIndex].text;

  const empenho = document.getElementById("novoEmpenho").value.trim();
  const efisco = document.getElementById("novoEfisco").value.trim();
  const descricao = document.getElementById("novoDescricao").value.trim();
  const vencimentoRaw = document.getElementById("novoVencimento").value;
  const valor = document.getElementById("novoValor").value.trim();
  const status = document.getElementById("novoStatus").value;
  const notaFiscal = document.getElementById("novoNotaFiscal").value.trim(); // Campo Novo

  if (
    !empenho ||
    !efisco ||
    !fornecedorNome ||
    !descricao ||
    !vencimentoRaw ||
    !valor
  ) {
    alert("Por favor, preencha todos os campos obrigatórios.");
    return;
  }

  const partesData = vencimentoRaw.split("-");
  const vencimentoFormatado = `${partesData[2]}/${partesData[1]}/${partesData[0]}`;
  const valorFormatado = valor.includes("R$") ? valor : `R$ ${valor}`;

  const novoPagamento = {
    empenho: empenho,
    efisco: efisco,
    fornecedor: fornecedorNome,
    descricao: descricao,
    vencimento: vencimentoFormatado,
    valor: valorFormatado,
    status: status,
    nota_fiscal: notaFiscal // Enviando para a API
  };

  try {
    const token = localStorage.getItem("token");
    const response = await fetch("http://localhost:5000/api/pagamentos", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(novoPagamento),
    });

    if (response.ok) {
      alert("Lançamento salvo com sucesso!");
      await carregarPagamentos();

      const modalElement = document.getElementById("modalNovoPagamento");
      const modalInstance = bootstrap.Modal.getInstance(modalElement);
      if (modalInstance) {
        modalInstance.hide();
      }

      document.getElementById("formNovoPagamento").reset();
    } else {
      const errorData = await response.json();
      alert("Erro ao salvar: " + (errorData.erro || "Verifique os dados enviados."));
    }
  } catch (error) {
    console.error("Erro na requisição:", error);
    alert("Erro de conexão com o servidor. O back-end está rodando?");
  }
}

// ---- Carrega a lista de fornecedores no modal ----
async function carregarFornecedores() {
  try {
    const token = localStorage.getItem("token");
    const response = await fetch("http://localhost:5000/api/fornecedores", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return;

    const fornecedores = await response.json();
    const selectFornecedor = document.getElementById("novoFornecedor");
    selectFornecedor.innerHTML =
      '<option value="">Selecione um fornecedor...</option>';
    fornecedores.forEach((f) => {
      const cnpjFormatado = f.cnpj
        ? f.cnpj.replace(
            /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
            "$1.$2.$3/$4-$5",
          )
        : "";
      const textoOpcao = f.cnpj ? `${f.nome} (${cnpjFormatado})` : f.nome;
      selectFornecedor.innerHTML += `<option value="${f.id}">${textoOpcao}</option>`;
    });
  } catch (error) {
    console.error("Erro ao carregar fornecedores:", error);
  }
}

// ---- Busca de E-fiscos por Fornecedor ----

async function buscarEfiscosPorFornecedor() {
  const fornecedorId = document.getElementById("novoFornecedor").value;
  const containerSelect = document.getElementById("container-select-efisco");
  const selectEfisco = document.getElementById("selectEfisco");
  const containerDetalhes = document.getElementById("container-detalhes-item");

  if (!fornecedorId) {
    containerSelect.style.display = "none";
    containerDetalhes.style.display = "none";
    selectEfisco.innerHTML = "";
    return;
  }
  containerDetalhes.style.display = "none";

  try {
    const token = localStorage.getItem("token");
    const response = await fetch(
      `http://localhost:5000/api/lookup/efiscos-por-fornecedor?fornecedor_id=${fornecedorId}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );

    if (response.ok) {
      const efiscos = await response.json();

      if (efiscos.length > 0) {
        containerSelect.style.display = "block";
        selectEfisco.innerHTML = `<option value="">Selecione um item...</option>`;
        efiscos.forEach((item) => {
          const option = document.createElement("option");
          option.value = item.codigo_efisco;
          option.textContent = `${item.codigo_efisco} - ${item.item_efisco}`;
          option.dataset.empenho = item.nota_empenho;
          option.dataset.descricao = item.item_efisco;
          selectEfisco.appendChild(option);
        });
      } else {
        containerSelect.style.display = "none";
        selectEfisco.innerHTML = "";
      }
    }
  } catch (error) {
    console.error("Erro ao buscar E-Fiscos por fornecedor:", error);
  }
}

function preencherCamposComEfisco() {
  const selectEfisco = document.getElementById("selectEfisco");
  const selectedOption = selectEfisco.options[selectEfisco.selectedIndex];
  const containerDetalhes = document.getElementById("container-detalhes-item");

  if (!selectedOption || !selectedOption.value) {
    containerDetalhes.style.display = "none";
    return;
  }

  containerDetalhes.style.display = "block";

  document.getElementById("novoEfisco").value = selectedOption.value;
  document.getElementById("novoEmpenho").value =
    selectedOption.dataset.empenho || "";
  document.getElementById("novoDescricao").value =
    selectedOption.dataset.descricao || "";
  document.getElementById("novoDescricao").readOnly = true;
}

// ---- Busca Automática de Dados ----

async function buscarInfoPagamento(campo) {
  const empenhoInput = document.getElementById("novoEmpenho");
  const efiscoInput = document.getElementById("novoEfisco");

  let query = "";
  if (campo === "empenho" && empenhoInput.value.trim()) {
    query = `?empenho=${encodeURIComponent(empenhoInput.value.trim())}`;
  } else if (campo === "efisco" && efiscoInput.value.trim()) {
    query = `?efisco=${encodeURIComponent(efiscoInput.value.trim())}`;
  } else {
    return;
  }

  try {
    const token = localStorage.getItem("token");
    const response = await fetch(
      `http://localhost:5000/api/lookup/pagamento-info${query}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );

    if (response.ok) {
      const data = await response.json();
      if (data.empenho) empenhoInput.value = data.empenho;
      if (data.efisco) efiscoInput.value = data.efisco;
      if (data.descricao)
        document.getElementById("novoDescricao").value = data.descricao;
      if (data.fornecedor)
        document.getElementById("novoFornecedor").value = data.fornecedor;
    } else if (response.status === 404) {
      console.log("Nenhum dado encontrado para preenchimento automático.");
    } else {
      const errorData = await response.json();
      console.error("Erro ao buscar informações:", errorData.erro);
    }
  } catch (error) {
    console.error("Erro de conexão ao buscar informações de pagamento:", error);
  }
}

// ---- Filtros ----

function atualizarFiltroAnos() {
    const selectAno = document.getElementById("filtroAno");
    const anosExtraidos = pagamentos
      .map(p => extrairAno(p.vencimento))
      .filter(ano => ano); 
  
    const anosUnicos = [...new Set(anosExtraidos)];
    anosUnicos.sort((a, b) => b - a);
  
    selectAno.innerHTML = '<option value="">Selecione</option>';
    anosUnicos.forEach(ano => {
      selectAno.innerHTML += `<option value="${ano}">${ano}</option>`;
    });
}

function aplicarFiltros() {
  const empenho = document
    .getElementById("filtroEmpenho")
    .value.toLowerCase()
    .trim();
  const fornecedor = document
    .getElementById("filtroFornecedor")
    .value.toLowerCase()
    .trim();
  const status = document.getElementById("filtroStatus").value;
  const ano = document.getElementById("filtroAno").value;

  dadosFiltrados = pagamentos.filter((p) => {
    const matchEmpenho = !empenho || p.empenho.toLowerCase().includes(empenho);
    const matchFornecedor =
      !fornecedor || p.fornecedor.toLowerCase().includes(fornecedor);
    const matchStatus = !status || p.status === status;
    const matchAno = !ano || extrairAno(p.vencimento) === ano;

    return matchEmpenho && matchFornecedor && matchStatus && matchAno;
  });

  currentPage = 1;
  renderTabela(dadosFiltrados);
}

function limparFiltros() {
  document.getElementById("filtroEmpenho").value = "";
  document.getElementById("filtroFornecedor").value = "";
  document.getElementById("filtroStatus").value = "";
  document.getElementById("filtroAno").value = "";

  dadosFiltrados = [...pagamentos];
  currentPage = 1;
  renderTabela(dadosFiltrados);
}

// ---- Impressão ----

function imprimirPagamento(id) {
  const p = pagamentos.find((x) => x.id === id);
  if (!p) return;

  const janela = window.open("", "_blank", "width=620,height=520");
  janela.document.write(`
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <title>Pagamento ${p.id}</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
                h2   { color: #0b2253; margin-bottom: 4px; }
                p.sub { color: #666; font-size: 13px; margin-top: 0; }
                hr   { border: none; border-top: 1px solid #ddd; margin: 20px 0; }
                table { width: 100%; border-collapse: collapse; }
                td   { padding: 10px 12px; border-bottom: 1px solid #eee; font-size: 14px; }
                td:first-child { font-weight: bold; color: #555; width: 40%; }
            </style>
        </head>
        <body onload="window.print(); window.close()">
            <h2>PROCAPE</h2>
            <p class="sub">Comprovante de Pagamento</p>
            <hr>
            <table>
                <tr><td>Nº Pagamento</td><td>${p.id}</td></tr>
                <tr><td>Nota de Empenho</td><td>${p.empenho}</td></tr>
                <tr><td>Código E-fisco</td><td>${p.efisco}</td></tr>
                <tr><td>Nota Fiscal</td><td>${p.nota_fiscal || "Não Informada"}</td></tr>
                <tr><td>Fornecedor</td><td>${p.fornecedor}</td></tr>
                <tr><td>Descrição</td><td>${p.descricao}</td></tr>
                <tr><td>Vencimento</td><td>${p.vencimento}</td></tr>
                <tr><td>Valor</td><td>${p.valor}</td></tr>
                <tr><td>Status</td><td>${p.status}</td></tr>
            </table>
        </body>
        </html>
    `);
  janela.document.close();
}

// ---- Carregamento Inicial ----

async function carregarPagamentos() {
  try {
    const token = localStorage.getItem("token");
    const response = await fetch("http://localhost:5000/api/pagamentos", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error("Erro ao buscar pagamentos");

    pagamentos = await response.json();
    dadosFiltrados = [...pagamentos];

    atualizarFiltroAnos(); 
    
    currentPage = 1;
    renderTabela(dadosFiltrados);

  } catch (error) {
    console.error("Erro ao carregar pagamentos da API:", error);
    const tbody = document.getElementById("tabelaPagamentosBody");
    tbody.innerHTML = `<tr><td colspan="8" class="text-center text-danger py-4">Falha ao carregar dados. Verifique a conexão com o servidor.</td></tr>`;
  }
}

// ---- Init ----

document.addEventListener("DOMContentLoaded", () => {
  carregarFornecedores(); 
  carregarPagamentos();

  document
    .getElementById("novoFornecedor")
    .addEventListener("change", buscarEfiscosPorFornecedor);

  document
    .getElementById("selectEfisco")
    .addEventListener("change", preencherCamposComEfisco);

  try {
    const usuario = JSON.parse(localStorage.getItem("usuario"));
    const btnNovoPagamento = document.querySelector(
      'button[data-bs-target="#modalNovoPagamento"]',
    );

    if (usuario && btnNovoPagamento) {
      const perfil = String(usuario.perfil || "").toLowerCase().trim();
      if (perfil !== "admin" && perfil !== "gestor") {
        btnNovoPagamento.style.display = "none";
      }
    }
  } catch (error) {
    console.error("Erro ao aplicar regras de visualização do botão:", error);
  }
});