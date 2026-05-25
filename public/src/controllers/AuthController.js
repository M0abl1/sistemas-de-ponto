// src/controllers/AuthController.js

const AuthController = {
  // Gera ou recupera a identidade única do celular/navegador
  obterIdDispositivo() {
    let deviceId = localStorage.getItem('ponto_device_id');
    if (!deviceId) {
      deviceId = 'dev_' + Math.random().toString(36).substr(2, 9) + Date.now();
      localStorage.setItem('ponto_device_id', deviceId);
    }
    return deviceId;
  },

  // Gerencia o fluxo de login de forma híbrida (CPF para funcionários e E-mail para Admin)
  async processarLogin(identificador, senha) {
    if (!senha || senha.trim() === "") {
      LoginView.exibirErro("A senha é obrigatória.");
      return;
    }

    let emailFinal = "";
    let ehAdmin = false;
    let cpfCru = "";

    if (identificador.includes('@')) {
      emailFinal = identificador;
      ehAdmin = true;
    } else {
      cpfCru = identificador.replace(/\D/g, '');
      if (cpfCru.length !== 11) {
        LoginView.exibirErro("CPF incompleto ou inválido.");
        return;
      }
      emailFinal = `${cpfCru}@ponto.local`;
    }

    const deviceId = this.obterIdDispositivo();

    try {
      if (!ehAdmin) {
        const bloqueado = await PontoModel.verificarDispositivoUsadoHoje(deviceId, cpfCru);
        if (bloqueado) {
          LoginView.exibirErro("Acesso Negado: Aparelho já utilizado por outro funcionário hoje.");
          return;
        }
      }

      const credencial = await firebase.auth().signInWithEmailAndPassword(emailFinal, senha);
      let perfil = null;
      
      if (ehAdmin) {
        perfil = await PontoModel.buscarPerfilPorUid(credencial.user.uid);
      } else {
        perfil = await PontoModel.buscarPerfil(cpfCru);
      }

      if (!perfil) {
        LoginView.exibirErro("Perfil não localizado no sistema.");
        return;
      }

      if (perfil.tipo_usuario === 'administrador') {
        window.location.href = 'dashboard.html';
      } else {
        await PontoModel.registrarUsoDispositivo(deviceId, cpfCru);
        window.location.href = 'ponto.html';
      }

    } catch (erro) {
      console.error("Erro no fluxo de autenticação:", erro);
      LoginView.exibirErro("Credenciais incorretas ou inválidas.");
    }
  },

  // =========================================================================
  // LOGOUT DO SISTEMA
  // =========================================================================
  async efetuarLogout() {
    try {
      await firebase.auth().signOut();
      console.log("Sessão encerrada com sucesso.");
      window.location.href = 'index.html';
    } catch (erro) {
      console.error("Erro ao tentar deslogar:", erro);
      alert("Erro ao sair do sistema. Tente novamente.");
    }
  },

  // =========================================================================
  // FILTRO DE SEGURANÇA ANTIGO (DESATIVADO)
  // =========================================================================
  async verificarSegurancaAdmin() {
    console.log("AuthController: Trava antiga ignorada com sucesso.");
  }
};