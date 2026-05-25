// public/src/views/pontoView.js

const PontoView = {
  // Coordenadas centrais da Creche (Santo Estêvão - BA)
  CRECHE_LAT: -12.2858,
  CRECHE_LON: -39.2522,
  RAIO_MAXIMO_METROS: 500,

  // 1. Atualiza o relógio digital em tempo real
  iniciarRelogio() {
    const relogio = document.getElementById('relogio');
    const dataAtual = document.getElementById('dataAtual');
    
    setInterval(() => {
      const agora = new Date();
      if (relogio) relogio.innerText = agora.toLocaleTimeString('pt-BR');
      if (dataAtual) {
        dataAtual.innerText = agora.toLocaleDateString('pt-BR', {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
      }
    }, 1000);
  },

  // 2. Calcula a distância real em metros usando a Fórmula de Haversine
  calcularDistancia(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Raio da Terra em metros
    const phi1 = lat1 * Math.PI / 180;
    const phi2 = lat2 * Math.PI / 180;
    const deltaPhi = (lat2 - lat1) * Math.PI / 180;
    const deltaLambda = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
              Math.cos(phi1) * Math.cos(phi2) *
              Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distância em metros
  },

  // 3. Valida a posição do GPS e gerencia o estado do botão
  validarLocalizacaoEBloqueio(latAtual, lonAtual, jaBateuHoje) {
    const distancia = this.calcularDistancia(latAtual, lonAtual, this.CRECHE_LAT, this.CRECHE_LON);
    
    if (jaBateuHoje) {
      this.atualizarStatusInterface(false, "Bloqueado: Você já registrou o ponto hoje.", true);
      return;
    }

    if (distancia <= this.RAIO_MAXIMO_METROS) {
      this.atualizarStatusInterface(true, `Dentro do perímetro (${Math.round(distancia)}m da creche).`, false);
    } else {
      this.atualizarStatusInterface(false, `Fora do perímetro: Você está a ${Math.round(distancia / 1000)}km da creche.`, false);
    }
  },

  // 4. Modifica as cores das caixas e ativa/desativa o botão
  atualizarStatusInterface(sucesso, mensagem, erroCritico) {
    const box = document.getElementById('statusGpsBox');
    const texto = document.getElementById('statusGpsTexto');
    const indicador = box ? box.querySelector('div') : null;
    const btn = document.getElementById('btnBaterPonto');

    if (!box || !texto) return;

    texto.innerText = mensagem;

    if (sucesso) {
      box.className = "bg-green-50 border border-green-100 rounded-xl p-4 flex items-center space-x-3 transition-all";
      if (indicador) indicador.className = "w-2.5 h-2.5 rounded-full bg-green-500";
      if (btn) {
        btn.disabled = false;
        btn.className = "w-full py-5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg rounded-2xl shadow-sm transition-all text-center uppercase tracking-wide cursor-pointer";
      }
    } else {
      box.className = erroCritico ? "bg-red-50 border border-red-100 rounded-xl p-4 flex items-center space-x-3 transition-all" : "bg-amber-50 border border-amber-100 rounded-xl p-4 flex items-center space-x-3 transition-all";
      if (indicador) indicador.className = erroCritico ? "w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" : "w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse";
      if (btn) {
        btn.disabled = true;
        btn.className = "w-full py-5 bg-gray-300 text-gray-500 font-bold text-lg rounded-2xl shadow-sm transition-all text-center uppercase tracking-wide cursor-not-allowed";
      }
    }
  },

  // 5. Carrega registros e define se o usuário já bateu ponto hoje
  async carregarRegistrosHoje(cpfUsuario) {
    const listaContainer = document.getElementById('listaRegistrosHoje');
    if (!listaContainer) return false;

    try {
      const hojeInicio = new Date();
      hojeInicio.setHours(0, 0, 0, 0);
      
      const hojeFim = new Date();
      hojeFim.setHours(23, 59, 59, 999);

      const snapshot = await firebase.firestore().collection('registro_ponto')
        .where('usuario_id', '==', cpfUsuario)
        .where('data_hora', '>=', hojeInicio.toISOString())
        .where('data_hora', '<=', hojeFim.toISOString())
        .get();

      if (snapshot.empty) {
        listaContainer.innerHTML = `<p class="text-gray-400 text-center py-2 text-xs">Nenhum ponto registrado hoje.</p>`;
        return false;
      }

      let pontos = [];
      snapshot.forEach(doc => pontos.push(doc.data()));
      pontos.sort((a, b) => new Date(a.data_hora) - new Date(b.data_hora));

      listaContainer.innerHTML = pontos.map((ponto, index) => {
        const horaFormatada = new Date(ponto.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        return `
          <div class="flex justify-between items-center py-2.5 first:pt-0 last:pb-0">
            <span class="text-gray-500 font-medium">${index + 1}ª Batida</span>
            <span class="font-mono font-bold text-gray-900 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100">${horaFormatada}</span>
          </div>
        `;
      }).join('');

      return true; // Retorna verdadeiro se já houver registros hoje

    } catch (erro) {
      console.error("View: Erro ao renderizar registros diários:", erro);
      listaContainer.innerHTML = `<p class="text-red-400 text-center py-2 text-xs">Erro ao carregar histórico.</p>`;
      return false;
    }
  }
};

// =========================================================================
// MONITOR DE ESTADO DO COLABORADOR EM TEMPO REAL
// =========================================================================
document.addEventListener('DOMContentLoaded', () => {
  PontoView.iniciarRelogio();

  firebase.auth().onAuthStateChanged(async (usuarioLogado) => {
    if (!usuarioLogado) {
      window.location.href = 'index.html';
      return;
    }

    try {
      if (usuarioLogado.email && usuarioLogado.email.includes('@ponto.local')) {
        const cpfCru = usuarioLogado.email.split('@')[0];
        const perfil = await PontoModel.buscarPerfil(cpfCru);
        
        if (perfil && perfil.nome) {
          document.getElementById('saudacaoTexto').innerText = `Olá, ${perfil.nome}`;
          
          // Verifica se já possui batida hoje antes de ler o GPS
          const jaBateuHoje = await PontoView.carregarRegistrosHoje(cpfCru);

          // Captura a geolocalização real do navegador/smartphone do usuário
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              (position) => {
                const { latitude, longitude } = position.coords;
                // Guarda as coordenadas reais coletadas na janela global para o Controller salvar depois
                window.coordsAtuais = { latitude, longitude };
                PontoView.validarLocalizacaoEBloqueio(latitude, longitude, jaBateuHoje);
              },
              (error) => {
                PontoView.atualizarStatusInterface(false, "Erro: Ative a geolocalização do seu aparelho.", true);
              },
              { enableHighAccuracy: true }
            );
          } else {
            PontoView.atualizarStatusInterface(false, "GPS não suportado neste aparelho.", true);
          }
        }
      }
    } catch (erro) {
      console.error("Erro no fluxo principal de inicialização:", erro);
    }
  });
});

// =========================================================================
// CONTROLADOR GLOBAL DO FUNCIONÁRIO
// =========================================================================
const FuncionarioController = {
  async registrarBatidaPonto() {
    try {
      const usuarioLogado = firebase.auth().currentUser;
      if (!usuarioLogado) return;

      const cpfCru = usuarioLogado.email.split('@')[0];
      const coords = window.coordsAtuais || { latitude: 0, longitude: 0 };

      const btn = document.getElementById('btnBaterPonto');
      if (btn) btn.disabled = true;

      const dadosPonto = {
        usuario_id: cpfCru,
        data_hora: new Date().toISOString(),
        latitude: coords.latitude,
        longitude: coords.longitude,
        dispositivo: navigator.userAgent
      };

      await PontoModel.salvarRegistroPonto(dadosPonto);

      alert("✅ Ponto registrado com sucesso!");
      window.location.reload();

    } catch (erro) {
      console.error("Erro ao registrar batida de ponto:", erro);
      alert("Erro ao salvar o ponto. Tente novamente.");
      const btn = document.getElementById('btnBaterPonto');
      if (btn) btn.disabled = false;
    }
  }
};