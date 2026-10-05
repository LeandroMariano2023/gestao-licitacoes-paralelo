document.addEventListener("DOMContentLoaded", () => {
  // Busca o arquivo nav.html
  fetch("../nav_bar/nav.html")
    .then((response) => {
      if (!response.ok) throw new Error("Erro ao carregar a navbar.");
      return response.text();
    })
    .then((html) => {
      // Insere o HTML da navbar na div reservada
      document.getElementById("nav-placeholder").innerHTML = html;

      // Lógica para marcar o link da página atual como "active"
      const currentPage = window.location.pathname.split("/").pop();
      const navLinks = document.querySelectorAll(".nav-menu .nav-link");

      navLinks.forEach((link) => {
        link.classList.remove("active"); // Limpa os ativos
        const href = link.getAttribute("href");

        if (href && href.includes(currentPage) && currentPage !== "") {
          link.classList.add("active");
        }
      });

      try {
        const usuario = JSON.parse(localStorage.getItem("usuario"));
        const perfil =
          usuario && usuario.perfil ? usuario.perfil.toLowerCase() : "usuario";
        
        // Oculta a aba de Processos se não for admin ou gestor
        if (perfil !== "admin" && perfil !== "gestor") {
          const processLink = document.querySelector(
            '.nav-menu .nav-link[href="../criar_processos/criar_processo.html"]',
          );
          if (processLink) {
            processLink.closest(".nav-item").classList.add("d-none");
          }
        }

        // --- NOVO: Exibe o nome do usuário logado na Navbar ---
        const elementoNome = document.getElementById("navbar-user-name");
        if (elementoNome && usuario && usuario.nome) {
          const partesNome = usuario.nome.trim().split(" ");
          // Mostra apenas o 1º e 2º nome para não quebrar o layout
          const nomeExibicao = partesNome.length > 1
            ? `${partesNome[0]} ${partesNome[1]}`
            : partesNome[0];
          
          elementoNome.innerHTML = `<i class="fa-regular fa-user me-2"></i>Olá, ${nomeExibicao}`;
        }
        // ------------------------------------------------------

      } catch (error) {
        console.error("Erro ao ler dados do usuário para a navbar:", error);
      }

      // Lógica de logout (Sair)
      const btnSair = document.querySelector(".nav-link-sair");
      if (btnSair) {
        btnSair.addEventListener("click", (e) => {
          e.preventDefault(); // Interrompe o clique padrão
          localStorage.removeItem("token"); // Remove o token de acesso
          localStorage.removeItem("usuario"); // Remove os dados do usuário
          window.location.href = "../../../index.html"; // Volta até a raiz
        });
      }
    })
    .catch((error) => console.error(error));
});