// src/views/loginView.js

const LoginView = {
  // Inicializa os ouvintes de eventos da tela
  configurarEventos() {
    const identInput = document.getElementById('identificador');
    const form = document.getElementById('formLoginMvc');
    const passwordInput = document.getElementById('password');
    const btnAlternarSenha = document.getElementById('btnAlternarSenha');

    if (!identInput || !form) return;

    // Alternar visibilidade da senha
    if (btnAlternarSenha && passwordInput) {
      btnAlternarSenha.addEventListener('click', () => {
        if (passwordInput.type === 'password') {
          passwordInput.type = 'text';
          btnAlternarSenha.innerText = 'Ocultar';
        } else {
          passwordInput.type = 'password';
          btnAlternarSenha.innerText = 'Mostrar';
        }
      });
    }

    // Máscara inteligente: Só aplica se for estritamente numérico (CPF)
    identInput.addEventListener('input', (e) => {
      let val = e.target.value;
      
      // Se não contiver letras e tiver arroba ou formato de email, não aplica máscara de CPF
      if (/[a-zA-Z]/.test(val) || val.includes('@')) {
        identInput.classList.remove('font-mono'); // Remove fonte de CPF
        return; 
      }

      // Aplica a máscara tradicional de CPF se for apenas números
      identInput.classList.add('font-mono');
      let value = val.replace(/\D/g, '');
      if (value.length <= 11) {
        value = value.replace(/(\d{3})(\d)/, '$1.$2');
        value = value.replace(/(\d{3})(\d)/, '$1.$2');
        value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
      }
      e.target.value = value;
    });

    // Envio do formulário
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const identificadorBruto = identInput.value.trim();
      const senha = passwordInput.value;
      
      this.limparErro();
      AuthController.processarLogin(identificadorBruto, senha);
    });
  },

  // Exibe a caixinha vermelha de erro na tela
  exibirErro(mensagem) {
    const container = document.getElementById('mensagemErro');
    if (container) {
      container.innerText = mensagem;
      container.classList.remove('hidden');
    }
  },

  limparErro() {
    const container = document.getElementById('mensagemErro');
    if (container) {
      container.classList.add('hidden');
    }
  }
};

// Executa a configuração assim que o script é carregado na tela de login
document.addEventListener('DOMContentLoaded', () => LoginView.configurarEventos());