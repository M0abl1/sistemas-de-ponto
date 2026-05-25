// src/controllers/FuncionarioController.js

const FuncionarioController = {
  // Coordenadas atualizadas milimetricamente
  EMPRESA_LAT: -12.444351207261171, 
  EMPRESA_LON: -39.26773189305429, 
  RAIO_MAXIMO_METROS: 200,

  // Ativa a busca de localização assim que o funcionário abre a tela
  inicializarVerificacaoGps() {
    if (!navigator.geolocation) {
      PontoView.atualizarStatusGps("erro", "Seu navegador não suporta GPS.");
      return;
    }

    // Configurações para buscar a melhor precisão possível no celular
    const opcoes = { 
      enableHighAccuracy: true, // Força o uso do chip de GPS integrado
      timeout: 10000,           // Tempo limite de 10 segundos
      maximumAge: 0             // Garante que a localização não venha do cache antigo
    };
    
    // Monitora a posição do usuário em tempo real enquanto ele estiver com a página aberta
    navigator.geolocation.watchPosition(
      (posicao) => this.validarPosicaoGps(posicao),
      (erro) => this.tratarErroGps(erro),
      opcoes
    );
  },

  validarPosicaoGps(posicao) {
    const uLat = posicao.coords.latitude;
    const uLon = posicao.coords.longitude;

    // Calcula a distância real usando a fórmula matemática de Haversine
    const distancia = this.calcularDistancia(uLat, uLon, this.EMPRESA_LAT, this.EMPRESA_LON);

    // Faz a nova validação baseada nos 200 metros configurados
    if (distancia <= this.RAIO_MAXIMO_METROS) {
      PontoView.atualizarStatusGps("sucesso", "Você está na empresa. Ponto liberado!");
      PontoView.liberarBotaoPonto(true);
    } else {
      PontoView.atualizarStatusGps("bloqueado", `Fora do raio permitido. Distância: ${Math.round(distancia)}m`);
      PontoView.liberarBotaoPonto(false);
    }
  },

  async registrarBatidaPonto() {
    const usuario = firebase.auth().getCurrentUser();
    if (!usuario) return;

    try {
      const dataHoraAtual = new Date().toISOString();
      
      // Envia as coordenadas salvas e dados da batida para o Model gravar no Firebase
      await PontoModel.salvarRegistroPonto({
        usuario_id: usuario.uid,
        data_hora: dataHoraAtual,
        latitude: this.EMPRESA_LAT,
        longitude: this.EMPRESA_LON,
        dispositivo: AuthController.obterIdDispositivo()
      });

      PontoView.notificarSucesso("Ponto registrado com sucesso!");
    } catch (erro) {
      PontoView.notificarErro("Falha ao salvar o ponto no servidor.");
    }
  },

  tratarErroGps(erro) {
    let msg = "Falha ao obter localização.";
    if (erro.code === erro.PERMISSION_DENIED) {
      msg = "Você precisa dar permissão de GPS ao navegador do celular.";
    }
    PontoView.atualizarStatusGps("erro", msg);
    PontoView.liberarBotaoPonto(false);
  },

  // Fórmula matemática de Haversine (Calcula distância linear exata sobre a curvatura da Terra)
  calcularDistancia(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Raio da Terra em metros
    const p1 = lat1 * Math.PI / 180;
    const p2 = lat2 * Math.PI / 180;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(p1) * Math.cos(p2) * Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }
};