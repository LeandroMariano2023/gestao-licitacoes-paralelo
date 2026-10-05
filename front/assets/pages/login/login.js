// ============================================================
// LOADING + LOGIN
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
  // ============================================================
  // TRANSIÇÃO LOADING
  // ============================================================

  setTimeout(() => {
    const loadingScreen = document.getElementById("loading-screen");

    const loginScreen = document.getElementById("login-screen");

    loadingScreen.style.opacity = "0";

    setTimeout(() => {
      loadingScreen.style.display = "none";

      loginScreen.style.display = "block";

      document.body.style.overflow = "auto";
    }, 500);
  }, 2500);

  // ============================================================
  // APENAS NÚMEROS NO CPF
  // ============================================================

  const camposNumeros = document.querySelectorAll(".apenas-numeros");

  camposNumeros.forEach((campo) => {
    campo.addEventListener("input", (event) => {
      event.target.value = event.target.value.replace(/\D/g, "");
    });
  });

  // ============================================================
  // MOSTRAR/OCULTAR SENHA
  // ============================================================

  const btnToggleSenha = document.getElementById("btnToggleSenha");
  const inputSenha =
    document.getElementById("inputSenha") ||
    document.getElementById("inp-senha");
  const iconeSenha = document.getElementById("iconeSenha");

  if (btnToggleSenha && inputSenha && iconeSenha) {
    btnToggleSenha.addEventListener("click", () => {
      if (inputSenha.type === "password") {
        inputSenha.type = "text";
        iconeSenha.classList.remove("bi-eye");
        iconeSenha.classList.add("bi-eye-slash");
      } else {
        inputSenha.type = "password";
        iconeSenha.classList.remove("bi-eye-slash");
        iconeSenha.classList.add("bi-eye");
      }
    });
  }

  // ============================================================
  // FORMULÁRIO LOGIN
  // ============================================================

  const formulario = document.getElementById("form-acesso");

  formulario.addEventListener("submit", function (evento) {
    evento.preventDefault();

    // ============================================================
    // CAPTURA DADOS
    // ============================================================

    const emailInput =
      document.getElementById("inputEmail") ||
      document.getElementById("inp-cpf") ||
      document.getElementById("cpf") ||
      document.querySelector('input[type="text"]') ||
      document.querySelector('input[type="number"]');
    const email = emailInput ? emailInput.value.trim() : "";

    const senhaInput =
      document.getElementById("inputSenha") ||
      document.getElementById("inp-senha") ||
      document.getElementById("senha") ||
      document.querySelector('input[type="password"]');
    const senha = senhaInput ? senhaInput.value.trim() : "";

    // ============================================================
    // BOTÃO
    // ============================================================

    const botaoLogin = formulario.querySelector("button");

    botaoLogin.disabled = true;

    botaoLogin.innerText = "Entrando...";

    // ============================================================
    // CHAMA API DE LOGIN (BACKEND)
    // ============================================================

    // Garante que só vai enviar números para o back-end, ignorando pontos e traços
    const cpfLimpo = email.replace(/\D/g, "");

    const payload = {
      username: cpfLimpo,
      password: senha,
    };

    // Imprime no console (F12) para podermos ver o que está sendo enviado
    console.log("DADOS QUE O JS LEU:", payload);

    if (payload.username === "" || payload.password === "") {
      alert(
        `ERRO: O sistema leu vazio!\nCPF capturado: '${payload.username}'\nSenha capturada: '${payload.password}'\n\nVerifique se os IDs no arquivo HTML estão corretos.`,
      );
      botaoLogin.disabled = false;
      botaoLogin.innerText = "Acessar";
      return;
    }

    fetch("http://localhost:5000/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })
      .then(async (res) => {
        if (!res.ok) {
          let err = { erro: "Erro no login" };
          try {
            err = await res.json();
          } catch (e) {}
          alert(err.erro || "CPF ou senha inválidos!");
          return;
        }

        const data = await res.json();
        const token = data.token;
        const usuario = data.usuario;

        if (token && usuario) {
          localStorage.setItem("token", token);
          localStorage.setItem("usuario", JSON.stringify(usuario));

          alert("Login realizado com sucesso!");
          window.location.href = "assets/pages/dashboard/dashboard.html";
        } else {
          alert("Resposta inesperada do servidor.");
        }
      })
      .catch((err) => {
        console.error(err);
        alert("Erro de conexão com o servidor.");
      })
      .finally(() => {
        // ============================================================
        // REATIVA BOTÃO
        // ============================================================
        botaoLogin.disabled = false;
        botaoLogin.innerText = "Acessar";
      });
  });
});
