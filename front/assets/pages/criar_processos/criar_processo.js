let passoAtual = 1;
let contRenovacao = 0;
const visibleSteps = [1, 2, 4, 7]; // mapa de passos visíveis na interface

function hideAllPanes() {
  document
    .querySelectorAll(".step-pane")
    .forEach((p) => p.classList.add("d-none"));
  document
    .querySelectorAll(".step")
    .forEach((t) => t.classList.remove("active"));
}

function mudarPasso(passo) {
  hideAllPanes();
  const pane = document.getElementById(`step-${passo}`);
  if (pane) pane.classList.remove("d-none");
  const tab =
    document.querySelector(`.step[data-step='${passo}']`) ||
    document.getElementById(`tab-${passo}`);
  if (tab) tab.classList.add("active");
  passoAtual = passo;
  atualizarBotoes();
}

function proximoPasso() {
  const idx = visibleSteps.indexOf(passoAtual);
  if (idx >= 0 && idx < visibleSteps.length - 1)
    mudarPasso(visibleSteps[idx + 1]);
}

function passoAnterior() {
  const idx = visibleSteps.indexOf(passoAtual);
  if (idx > 0) mudarPasso(visibleSteps[idx - 1]);
}

function atualizarBotoes() {
  const btnVoltar = document.getElementById("btnVoltar");
  const btnProximo = document.getElementById("btnProximo");
  const containerBtnFinalizar = document.getElementById(
    "container-btn-finalizar",
  );
  if (passoAtual === visibleSteps[visibleSteps.length - 1]) {
    btnProximo.classList.add("d-none");
    containerBtnFinalizar.classList.remove("d-none");

    // Novo: Habilita/desabilita o botão de finalizar
    const btnFinalizar = document.getElementById("btnFinalizar");
    if (efiscoConfirmado) {
      btnFinalizar.disabled = false;
      containerBtnFinalizar.removeAttribute("data-bs-toggle"); // Remove tooltip
    } else {
      btnFinalizar.disabled = true;
      containerBtnFinalizar.setAttribute("data-bs-toggle", "tooltip"); // Adiciona tooltip
    }
  } else {
    btnProximo.classList.remove("d-none");
    containerBtnFinalizar.classList.add("d-none");
  }

  // esconder botão voltar no primeiro passo visível
  btnVoltar.style.visibility =
    passoAtual === visibleSteps[0] ? "hidden" : "visible";

  // mostrar finalizar apenas no último passo visível
}

// ================= FUNÇÃO DE BUSCA DE CNPJ =================
function buscarCNPJ() {
  // Pega o valor digitado e remove pontos, barras e traços (deixa só números)
  const inputCnpj = document
    .getElementById("busca-cnpj")
    .value.replace(/\D/g, "");
  const selectFornecedor = document.getElementById("fornecedor-efisco");
  let encontrado = false;

  if (inputCnpj === "") {
    alert("Por favor, digite um CNPJ para buscar.");
    return;
  }

  // Procura nas opções do select quem tem o data-cnpj correspondente
  Array.from(selectFornecedor.options).forEach((option) => {
    const cnpjOption = option.getAttribute("data-cnpj");

    if (cnpjOption === inputCnpj) {
      selectFornecedor.value = option.value;
      encontrado = true;
    }
  });

  if (encontrado) {
    // Feedback visual de sucesso
    document.getElementById("busca-cnpj").classList.add("is-valid");
    setTimeout(
      () => document.getElementById("busca-cnpj").classList.remove("is-valid"),
      2000,
    );
  } else {
    alert(
      "Fornecedor não encontrado! Você pode selecioná-lo na lista ou cadastrar um novo.",
    );
    selectFornecedor.value = ""; // Reseta o select
  }
}

function adicionarEfisco() {
  // Busca os elementos do DOM
  const inputCodigo = document.getElementById("inputEfisco");
  const inputItem = document.getElementById("item-efisco");
  const selectFornecedor = document.getElementById("fornecedor-efisco");
  const inputEmpenho = document.getElementById("empenho-efisco");
  const inputBuscaCnpj = document.getElementById("busca-cnpj");

  const codigo = inputCodigo.value.trim();
  // Validação básica para garantir que os campos essenciais estão preenchidos
  const item = inputItem.value.trim();
  const fornecedorId = selectFornecedor.value;
  const fornecedorNome =
    selectFornecedor.options[selectFornecedor.selectedIndex]?.text || "";
  const empenho = inputEmpenho.value.trim();

  // Validação básica
  if (codigo !== "" && item !== "" && fornecedorId !== "") {
    // Cria o elemento da lista
    const lista = document.getElementById("listaEfiscos");
    const li = document.createElement("li");
    li.className =
      "list-group-item d-flex justify-content-between align-items-center mt-2 border border-danger rounded";

    li.innerHTML = `
      <div class="d-flex flex-column">
          <span style="color:#0a1f44; font-weight:bold;">${codigo} - ${item}</span>
          <span style="font-size: 0.85em; color:#555;" class="fornecedor-info">
            <strong>Fornecedor:</strong> ${fornecedorNome} | <strong>Empenho:</strong> ${empenho || "Não informado"}
          </span>
      </div>
      <div>
          <button type="button" class="btn btn-sm btn-outline-primary me-1" onclick="editarEfisco(this)" title="Editar Item"><i class="fa-solid fa-pencil"></i></button>
          <button type="button" class="btn btn-sm btn-outline-danger" onclick="this.closest('li').remove()" title="Remover Item"><i class="fa-solid fa-trash"></i></button>
      </div>
      
      <input type="hidden" name="codigos_efisco[]" value="${codigo}">
      <input type="hidden" name="itens_efisco[]" value="${item}">
      <input type="hidden" name="fornecedores_efisco[]" value="${fornecedorId}">
      <input type="hidden" name="notas_empenho_efisco[]" value="${empenho}">
    `;

    lista.appendChild(li);

    // Limpa os campos após adicionar
    inputCodigo.value = "";
    inputItem.value = "";
    selectFornecedor.value = "";
    inputEmpenho.value = "";
    inputBuscaCnpj.value = "";
  } else {
    alert(
      "Por favor, preencha o Código E-fisco, a Descrição e selecione um Fornecedor.",
    );
  }
}

function editarEfisco(botao) {
  // Encontra o elemento <li> mais próximo do botão clicado
  const li = botao.closest("li");
  if (!li) return;

  // Pega os valores dos inputs escondidos dentro do <li>
  const codigo = li.querySelector('input[name="codigos_efisco[]"]').value;
  const item = li.querySelector('input[name="itens_efisco[]"]').value;
  const fornecedorId = li.querySelector(
    'input[name="fornecedores_efisco[]"]',
  ).value;
  const empenho = li.querySelector(
    'input[name="notas_empenho_efisco[]"]',
  ).value;

  // Preenche os campos do formulário com os valores do item
  document.getElementById("inputEfisco").value = codigo;
  document.getElementById("item-efisco").value = item;
  document.getElementById("fornecedor-efisco").value = fornecedorId;
  document.getElementById("empenho-efisco").value = empenho;

  // Remove o item da lista para que possa ser adicionado novamente após a edição
  li.remove();
}

function adicionarRenovacao() {
  if (contRenovacao >= 4) return alert("Limite de 4 renovações atingido.");
  contRenovacao++;
  const container = document.getElementById("containerRenovacoes");
  const div = document.createElement("div");
  div.className = "row mb-3 p-3 border rounded position-relative";
  div.style.borderColor = "#d32f2f !important";
  div.id = `renovacao-${contRenovacao}`;

  div.innerHTML = `
        <button type="button" class="btn btn-sm btn-danger position-absolute top-0 end-0 m-2" style="width:25px; height:25px; padding:0;" onclick="removerRenovacao('renovacao-${contRenovacao}')">X</button>
        <div class="col-md-6">
            <label class="form-label" style="color: #0a1f44;">Ano Início (${contRenovacao}ª Renovação)</label>
            <input type="number" class="form-control" name="renovacao_ano_inicio[]">
        </div>
        <div class="col-md-6 mt-3 mt-md-0">
            <label class="form-label" style="color: #0a1f44;">Data da Renovação</label>
            <input type="date" class="form-control" name="renovacao_data[]">
        </div>
    `;
  container.appendChild(div);
}

function removerRenovacao(idElemento) {
  const el = document.getElementById(idElemento);
  if (el) el.remove();
  contRenovacao--;
}

// Função para carregar dados de um processo existente para edição
async function carregarProcessoParaEdicao() {
  const urlParams = new URLSearchParams(window.location.search);
  // Pega o ID do processo da URL (ex: criar_processo.html?id=123)
  const processoId = urlParams.get("id");
  if (!processoId) return;

  try {
    const token = localStorage.getItem("token");
    const response = await fetch(
      `http://localhost:5000/api/processos/${processoId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      console.warn("Não foi possível carregar o processo para edição.");
      return;
    }

    const processo = await response.json();
    const form = document.getElementById("formCadastroProcesso");
    if (!form) return;

    // Preenche todos os campos do formulário com os dados do processo
    form.querySelector("#processoId").value = processo.id_processo || "";
    form.querySelector('[name="nome_objeto"]').value =
      processo.nome_objeto || "";
    form.querySelector('[name="tipo_setor"]').value = processo.tipo_setor || "";
    form.querySelector('[name="justificativa"]').value =
      processo.justificativa || "";
    form.querySelector('[name="codigo_sei"]').value = processo.codigo_sei || "";
    form.querySelector('[name="numero_processo_ci"]').value =
      processo.numero_processo_ci || "";
    form.querySelector('[name="codigo_dfd"]').value = processo.codigo_dfd || "";
    form.querySelector('[name="codigo_pca"]').value = processo.codigo_pca || "";
    form.querySelector('[name="ano_execucao"]').value =
      processo.ano_execucao || "";
    form.querySelector('[name="numero_processo_pei"]').value =
      processo.numero_processo_pei || "";
    form.querySelector('[name="status_pca"]').value = processo.status_pca || "";
    form.querySelector('[name="numero_processo"]').value =
      processo.numero_processo || "";
    form.querySelector('[name="data_pca"]').value = processo.data_pca || "";
    form.querySelector('[name="estimativa_financeira"]').value =
      processo.estimativa_financeira || "";
    form.querySelector('[name="processo_licitatorio"]').value =
      processo.processo_licitatorio || "";
    form.querySelector('[name="nome_gestor"]').value =
      processo.nome_gestor || "";
    form.querySelector('[name="numero_contrato"]').value =
      processo.numero_contrato || "";
    form.querySelector('[name="situacao_contrato"]').value =
      processo.situacao_contrato || "";
    form.querySelector('[name="ano_inicio"]').value = processo.ano_inicio || "";
    form.querySelector('[name="data_vencimento"]').value =
      processo.data_vencimento || "";
    form.querySelector('[name="disparo_email_aviso"]').value =
      processo.disparo_email_aviso || "";

    // Preenche a lista de itens do E-Fisco
    const lista = document.getElementById("listaEfiscos");
    lista.innerHTML = "";
    (processo.codigos_efisco || []).forEach((valor, index) => {
      const item = (processo.itens_efisco || [])[index] || "";
      const fornecedorId = (processo.fornecedores_efisco || [])[index] || "";
      const fornecedorSelect = document.getElementById("fornecedor-efisco");
      const option = fornecedorSelect.querySelector(
        `option[value="${fornecedorId}"]`,
      );
      const fornecedorNome = option
        ? option.text
        : `ID ${fornecedorId} não encontrado`;
      const empenho = (processo.notas_empenho_efisco || [])[index] || "";

      const li = document.createElement("li");
      // Monta o HTML do item na lista
      li.className =
        "list-group-item d-flex justify-content-between align-items-center mt-2 border border-danger rounded";
      li.innerHTML = `
        <div class="d-flex flex-column">
            <span style="color:#0a1f44; font-weight:bold;">${valor} - ${item}</span>
            <span style="font-size: 0.85em; color:#555;">
              <strong>Fornecedor:</strong> ${fornecedorNome} | <strong>Empenho:</strong> ${empenho || "Não informado"}
            </span>
        </div>
        <div>
            <button type="button" class="btn btn-sm btn-outline-primary me-1" onclick="editarEfisco(this)" title="Editar Item"><i class="fa-solid fa-pencil"></i></button>
            <button type="button" class="btn btn-sm btn-outline-danger" onclick="this.closest('li').remove()" title="Remover Item"><i class="fa-solid fa-trash"></i></button>
        </div>
        
        <input type="hidden" name="codigos_efisco[]" value="${valor}"> 
        <input type="hidden" name="itens_efisco[]" value="${item}">
        <input type="hidden" name="fornecedores_efisco[]" value="${fornecedorId}">
        <input type="hidden" name="notas_empenho_efisco[]" value="${empenho}">
      `;
      lista.appendChild(li);
    });

    // Preenche o histórico de renovações
    const container = document.getElementById("containerRenovacoes");
    container.innerHTML = "";
    contRenovacao = 0;
    (processo.renovacoes_ano || []).forEach((ano, index) => {
      const data = (processo.renovacoes_data || [])[index] || "";
      contRenovacao++;
      const div = document.createElement("div");
      div.className = "row mb-3 p-3 border rounded position-relative";
      div.style.borderColor = "#d32f2f !important";
      div.id = `renovacao-${contRenovacao}`;
      div.innerHTML = `
            <button type="button" class="btn btn-sm btn-danger position-absolute top-0 end-0 m-2" style="width:25px; height:25px; padding:0;" onclick="removerRenovacao('renovacao-${contRenovacao}')">X</button>
            <div class="col-md-6">
                <label class="form-label" style="color: #0a1f44;">Ano Início (${contRenovacao}ª Renovação)</label>
                <input type="number" class="form-control" name="renovacao_ano_inicio[]" value="${ano}">
            </div>
            <div class="col-md-6 mt-3 mt-md-0">
                <label class="form-label" style="color: #0a1f44;">Data da Renovação</label>
                <input type="date" class="form-control" name="renovacao_data[]" value="${data}">
            </div>
        `;
      container.appendChild(div);
    });
  } catch (error) {
    console.error("Erro ao carregar processo:", error);
  }
}

// Função para carregar a lista de fornecedores da API no select
async function carregarFornecedoresParaSelecao() {
  try {
    const token = localStorage.getItem("token");
    const response = await fetch("http://localhost:5000/api/fornecedores", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return;

    const fornecedores = await response.json();
    const selectFornecedor = document.getElementById("fornecedor-efisco");
    if (selectFornecedor) {
      selectFornecedor.innerHTML = '<option value="">Selecione um fornecedor...</option>';
      fornecedores.forEach(f => {
        selectFornecedor.innerHTML += `<option value="${f.id}" data-cnpj="${f.cnpj || ''}">${f.nome}</option>`;
      });
    }
  } catch (error) {
    console.error("Erro ao carregar fornecedores para seleção:", error);
  }
}

// Função para salvar um novo fornecedor
async function salvarNovoFornecedor() {
  const nomeFornecedor = document.getElementById("nomeNovoFornecedor").value.trim();
  const cnpjFornecedor = document.getElementById("cnpjNovoFornecedor").value.trim();
  if (!nomeFornecedor) {
    alert("Por favor, digite o nome do fornecedor.");
    return;
  }

  try {
    const token = localStorage.getItem("token");
    const response = await fetch("http://localhost:5000/api/fornecedores", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ nome: nomeFornecedor, cnpj: cnpjFornecedor }),
    });

    const resultado = await response.json();

    if (response.ok) {
      alert("Fornecedor cadastrado com sucesso!");
      // Fecha o modal
      const modal = bootstrap.Modal.getInstance(document.getElementById("modalNovoFornecedor"));
      modal.hide();
      document.getElementById("formNovoFornecedor").reset();

      // Atualiza a lista de fornecedores na tela e já seleciona o novo
      await carregarFornecedoresParaSelecao();
      document.getElementById("fornecedor-efisco").value = resultado.id_fornecedor;

    } else {
      alert("Erro ao salvar: " + (resultado.erro || "Erro desconhecido."));
    }
  } catch (error) {
    console.error("Erro na requisição para salvar fornecedor:", error);
    alert("Erro de conexão com o servidor.");
  }
}

// Função auxiliar para criar ou atualizar um processo
function criarOuAtualizarProcesso(data, metodo, caminho) {
  return fetch(caminho, {
    method: metodo,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
    body: JSON.stringify(data),
  });
}

// =================================================================================
// EVENTO PRINCIPAL - É EXECUTADO QUANDO A PÁGINA TERMINA DE CARREGAR
// =================================================================================
document.addEventListener("DOMContentLoaded", async () => {
  mudarPasso(1); // Garante que o formulário comece no primeiro passo
  // Tenta carregar um processo se um ID for passado na URL
  await carregarFornecedoresParaSelecao(); // Carrega os fornecedores do banco
  await carregarProcessoParaEdicao();

  // Inicializa os tooltips do Bootstrap (para o botão de finalizar desabilitado)
  const tooltipTriggerList = [].slice.call(
    document.querySelectorAll('[data-bs-toggle="tooltip"]'),
  );
  tooltipTriggerList.map(
    (tooltipTriggerEl) => new bootstrap.Tooltip(tooltipTriggerEl),
  );

  // --- LÓGICA PARA PREENCHER O GESTOR RESPONSÁVEL ---
  const urlParams = new URLSearchParams(window.location.search);
  const processoId = urlParams.get("id");

  // Se NÃO estiver editando um processo, preenche com o usuário logado
  if (!processoId) {
    try {
      const usuario = JSON.parse(localStorage.getItem("usuario"));
      if (usuario && usuario.nome) {
        const campoGestor = document.querySelector('[name="nome_gestor"]');
        if (campoGestor) campoGestor.value = usuario.nome;
      }
    } catch (e) {
      console.error(
        "Não foi possível ler os dados do usuário do localStorage.",
        e,
      );
    }
  }

  const form = document.getElementById("formCadastroProcesso");
  if (form) {
    const btnFinalizar = document.getElementById("btnFinalizar");
    if (btnFinalizar) {
      btnFinalizar.addEventListener("click", async (e) => {
        e.preventDefault();

        if (!form.nome_objeto.value.trim()) {
          // Validação básica para o campo mais importante
          alert("O 'Nome do objeto' (Passo 1) é obrigatório!");
          mudarPasso(1);
          return;
        }

        btnFinalizar.disabled = true;
        btnFinalizar.innerHTML =
          "SALVANDO... <i class='fa-solid fa-spinner fa-spin ms-2'></i>";

        // Coleta todos os dados do formulário, incluindo os campos dinâmicos
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        data.codigos_efisco = formData.getAll("codigos_efisco[]");
        data.itens_efisco = formData.getAll("itens_efisco[]");
        data.fornecedores_efisco = formData.getAll("fornecedores_efisco[]");
        data.notas_empenho_efisco = formData.getAll("notas_empenho_efisco[]");
        data.renovacoes_ano = formData.getAll("renovacao_ano_inicio[]");
        data.renovacoes_data = formData.getAll("renovacao_data[]");

        // Decide se a operação é de criação (POST) ou atualização (PUT)
        const processoId = formData.get("id_processo");
        const metodo = processoId ? "PUT" : "POST";
        const caminho = processoId
          ? `http://localhost:5000/api/processos/${processoId}`
          : "http://localhost:5000/api/processos";

        try {
          const response = await criarOuAtualizarProcesso(
            data,
            metodo,
            caminho,
          );

          if (response.ok) {
            window.location.href = "../dashboard/dashboard.html";
          } else {
            const errorData = await response.json();
            alert(
              "Erro ao salvar: " +
                (errorData.erro || "Verifique os dados enviados."),
            );
          }
        } catch (error) {
          console.error("Erro na requisição:", error);
          alert("Erro de conexão com o servidor. O back-end está rodando?");
        } finally {
          btnFinalizar.disabled = false;
          btnFinalizar.innerHTML = "CONCLUIR CADASTRO";
        }
      });
    }

    // Lógica para o botão "Salvar Rascunho"
    const btnRascunho = document.getElementById("btnRascunho");
    if (btnRascunho) {
      btnRascunho.addEventListener("click", async (e) => {
        e.preventDefault();
        btnRascunho.disabled = true;
        btnRascunho.innerHTML =
          "SALVANDO... <i class='fa-solid fa-spinner fa-spin ms-2'></i>";

        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        data.codigos_efisco = formData.getAll("codigos_efisco[]");
        data.itens_efisco = formData.getAll("itens_efisco[]");
        data.fornecedores_efisco = formData.getAll("fornecedores_efisco[]");
        data.notas_empenho_efisco = formData.getAll("notas_empenho_efisco[]");
        data.renovacoes_ano = formData.getAll("renovacao_ano_inicio[]");
        data.renovacoes_data = formData.getAll("renovacao_data[]");
        data.status_pca = "Rascunho"; // Define o status como Rascunho

        // Decide se a operação é de criação (POST) ou atualização (PUT)
        const processoId = formData.get("id_processo");
        const metodo = processoId ? "PUT" : "POST";
        const caminho = processoId
          ? `http://localhost:5000/api/processos/${processoId}`
          : "http://localhost:5000/api/processos";

        try {
          const response = await criarOuAtualizarProcesso(
            data,
            metodo,
            caminho,
          );

          if (response.ok) {
            window.location.href = "../dashboard/dashboard.html";
          } else {
            const errorData = await response.json();
            alert(
              "Erro ao salvar rascunho: " +
                (errorData.erro || "Verifique os dados enviados."),
            );
          }
        } catch (error) {
          console.error("Erro na requisição:", error);
          alert("Erro de conexão com o servidor. O back-end está rodando?");
        } finally {
          btnRascunho.disabled = false;
          btnRascunho.innerHTML =
            "SALVAR RASCUNHO <i class='fa-regular fa-circle ms-2'></i>";
        }
      });
    }
  }
});

let efiscoConfirmado = false; // Novo: controla se o E-Fisco foi confirmado

// Novo: Função para confirmar o E-Fisco
function confirmarEfisco() {
  const lista = document.getElementById("listaEfiscos");
  if (lista.children.length === 0) {
    alert("Adicione pelo menos um item ao E-Fisco antes de confirmar.");
    return;
  }

  efiscoConfirmado = true;

  // Feedback visual
  document.getElementById("container-btn-confirmar-efisco").innerHTML = `
        <span class="text-success fw-bold"><i class="fa-solid fa-check-circle"></i> Itens do E-Fisco Confirmados!</span>
    `;
  document
    .getElementById("aviso-efisco-nao-confirmado")
    .classList.add("d-none");
  alert(
    "Itens do E-Fisco confirmados com sucesso. Agora você pode finalizar o processo.",
  );

  // Reavalia os botões, pois a condição mudou
  atualizarBotoes();
}
