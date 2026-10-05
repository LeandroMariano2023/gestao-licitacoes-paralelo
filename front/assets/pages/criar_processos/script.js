// Script extraído de teste.html — navegação do stepper e helpers
let passoAtual = 1;
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
  const btnFinalizar = document.getElementById("btnFinalizar");

  // esconder botão voltar no primeiro passo visível
  btnVoltar.style.visibility =
    passoAtual === visibleSteps[0] ? "hidden" : "visible";

  // mostrar finalizar apenas no último passo visível
  if (passoAtual === visibleSteps[visibleSteps.length - 1]) {
    btnProximo.classList.add("d-none");
    btnFinalizar.classList.remove("d-none");
  } else {
    btnProximo.classList.remove("d-none");
    btnFinalizar.classList.add("d-none");
  }
}

function adicionarEfisco() {
  const input = document.getElementById("inputEfisco");
  const valor = input.value.trim();
  if (valor !== "") {
    const lista = document.getElementById("listaEfiscos");
    const li = document.createElement("li");
    li.className =
      "list-group-item d-flex justify-content-between align-items-center mt-2 border border-danger rounded";
    li.innerHTML = `
            <span style="color: #0a1f44; font-weight: bold;">${valor}</span> 
            <button type="button" class="btn btn-sm btn-outline-danger" onclick="this.parentElement.remove()">X</button>
            <input type="hidden" name="codigos_efisco[]" value="${valor}">
        `;
    lista.appendChild(li);
    input.value = "";
  }
}

let contRenovacao = 0;
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

// Inicializa o passo
mudarPasso(1);

// ================= INTEGRAÇÃO COM A API (SALVAR PROCESSO) =================
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("formCadastroProcesso");

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault(); // Evita o recarregamento padrão da página

      const btnFinalizar = document.getElementById("btnFinalizar");
      btnFinalizar.disabled = true;
      btnFinalizar.innerHTML =
        "SALVANDO... <i class='fa-solid fa-spinner fa-spin ms-2'></i>";

      // Coleta todos os dados do formulário
      const formData = new FormData(form);
      const data = Object.fromEntries(formData.entries());

      // Tratamento manual para campos do tipo Array (listas dinâmicas)
      data.codigos_efisco = formData.getAll("codigos_efisco[]");
      data.renovacoes_ano = formData.getAll("renovacao_ano_inicio[]");
      data.renovacoes_data = formData.getAll("renovacao_data[]");

      try {
        const token = localStorage.getItem("token");
        const response = await fetch("http://localhost:5000/api/processos", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(data),
        });

        if (response.ok) {
          alert("Processo cadastrado com sucesso!");
          window.location.replace("../dashboard/dashboard.html");
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

    // ================= LÓGICA DO BOTÃO SALVAR RASCUNHO =================
    const btnRascunho = document.getElementById("btnRascunho");
    if (btnRascunho) {
      btnRascunho.addEventListener("click", async (e) => {
        e.preventDefault(); // Evita que a página recarregue antes de salvar
        btnRascunho.disabled = true;
        btnRascunho.innerHTML = "SALVANDO... <i class='fa-solid fa-spinner fa-spin ms-2'></i>";

        // Coleta os dados que já foram preenchidos no formulário (mesmo incompletos)
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        data.codigos_efisco = formData.getAll("codigos_efisco[]");
        data.renovacoes_ano = formData.getAll("renovacao_ano_inicio[]");
        data.renovacoes_data = formData.getAll("renovacao_data[]");

        // Injeta a flag de rascunho para o back-end
        data.status = "Rascunho";

        try {
          const token = localStorage.getItem("token");
          const response = await fetch("http://localhost:5000/api/processos", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(data),
          });

          if (response.ok) {
            alert("Rascunho salvo com sucesso!");
            window.location.replace("../dashboard/dashboard.html");
          } else {
            const errorData = await response.json();
            alert("Erro ao salvar rascunho: " + (errorData.erro || "Verifique os dados enviados."));
          }
        } catch (error) {
          console.error("Erro na requisição:", error);
          alert("Erro de conexão com o servidor. O back-end está rodando?");
        } finally {
          btnRascunho.disabled = false;
          btnRascunho.innerHTML = "SALVAR RASCUNHO <i class='fa-regular fa-circle ms-2'></i>";
        }
      });
    }
  }
});
