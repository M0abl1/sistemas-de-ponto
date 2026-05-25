// public/src/views/dashboardView.js

const AdminView = {
  
  // 1. GERENCIA A TROCA VISUAL DAS ABAS (Menu Lateral)
  configurarAbas() {
    const botoes = document.querySelectorAll('.bind-aba');
    const blocosConteudo = document.querySelectorAll('.abas-painel');

    botoes.forEach(botao => {
      botao.addEventListener('click', () => {
        const destinoAba = botao.getAttribute('data-aba');

        blocosConteudo.forEach(bloco => bloco.classList.add('hidden'));

        const blocoAlvo = document.getElementById(`conteudo-${destinoAba}`);
        if (blocoAlvo) blocoAlvo.classList.remove('hidden');

        botoes.forEach(btn => {
          btn.className = "w-full flex items-center px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-xl transition-all text-left bind-aba";
        });
        botao.className = "w-full flex items-center px-4 py-3 text-sm font-semibold text-blue-600 bg-blue-50 rounded-xl transition-all text-left bind-aba";
      });
    });
  },

  // 2. CONFIGURA OS OUVINTES DE EVENTOS E SUBMITS DOS FORMULÁRIOS
  configurarEventos() {
    const formAtestado = document.getElementById('formAtestado');
    if (formAtestado) {
      formAtestado.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const cpfFuncionario = formAtestado.querySelector('input[type="text"]').value.replace(/\D/g, '');
        const dataInicio = formAtestado.querySelectorAll('input[type="date"]')[0].value;
        const dataFim = formAtestado.querySelectorAll('input[type="date"]')[1].value;
        const arquivo = formAtestado.querySelector('input[type="file"]').files[0];

        AdminController.lancarJustificativaAtestado(cpfFuncionario, dataInicio, dataFim, arquivo);
      });
    }

    const formFuncionario = document.getElementById('formGerenciarFuncionario');
    if (formFuncionario) {
      const inputCpfCad = document.getElementById('cadCpf');
      
      inputCpfCad.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length <= 11) {
          value = value.replace(/(\d{3})(\d)/, '$1.$2');
          value = value.replace(/(\d{3})(\d)/, '$1.$2');
          value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
        }
        e.target.value = value;
      });

      formFuncionario.addEventListener('submit', (e) => {
        e.preventDefault();
        const nome = document.getElementById('cadNome').value;
        const cpf = inputCpfCad.value;
        const cargo = document.getElementById('cadCargo').value;
        const ehAdmin = document.getElementById('cadAdmin').checked;

        AdminController.processarCadastroFuncionario(nome, cpf, cargo, ehAdmin);
      });
    }
  },

  // =========================================================================
  // MÉTODOS DE CONTROLE VISUAL DO POPUP (MODAL)
  // =========================================================================
  abrirModalFuncionario() {
    const modal = document.getElementById('modalFuncionario');
    if (modal) {
      modal.classList.remove('hidden');
      setTimeout(() => {
        modal.classList.remove('opacity-0');
        modal.querySelector('div').classList.remove('scale-95');
      }, 10);
    }
  },

  fecharModalFuncionario() {
    const modal = document.getElementById('modalFuncionario');
    if (modal) {
      modal.classList.add('opacity-0');
      modal.querySelector('div').classList.add('scale-95');
      setTimeout(() => {
        modal.classList.add('hidden');
        AdminView.limparFormularioFuncionario();
      }, 300);
    }
  },

  // 3. RENDERIZA AS LINHAS NA TABELA DE AUDITORIA DO PAINEL (Ocorrências)
  renderizarTabelaFaltas(listaRegistros) {
    const tabela = document.getElementById('tabelaFaltas');
    if (!tabela) return;

    if (listaRegistros.length === 0) {
      tabela.innerHTML = `<tr><td colspan="4" class="py-4 text-center text-gray-400 text-xs">Nenhum registro encontrado.</td></tr>`;
      return;
    }

    tabela.innerHTML = listaRegistros.map(reg => {
      const dataFormatada = new Date(reg.data_hora).toLocaleDateString('pt-BR');
      const horaFormatada = new Date(reg.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

      return `
        <tr class="text-gray-500 hover:bg-gray-50 transition-all">
          <td class="py-4 px-2 font-medium text-gray-900">ID Usuário: ${reg.usuario_id.substr(0, 5)}...</td>
          <td class="py-4 px-2 font-mono text-xs">${dataFormatada} às ${horaFormatada}</td>
          <td class="py-4 px-2">
            <span class="px-2.5 py-1 text-xs font-semibold text-green-700 bg-green-50 rounded-full">Ponto Batido</span>
          </td>
          <td class="py-4 px-2 text-right">
            <button class="text-xs text-blue-600 font-semibold hover:underline">Ver Detalhes</button>
          </td>
        </tr>
      `;
    }).join('');
  },

  // 4. RENDERIZA A TABELA DE LISTAGEM DE FUNCIONÁRIOS (Com o contador de faltas no mês)
  renderizarTabelaFuncionarios(funcionarios) {
    const tabela = document.getElementById('tabelaFuncionarios');
    if (!tabela) return;

    if (funcionarios.length === 0) {
      tabela.innerHTML = `<tr><td colspan="5" class="py-4 text-center text-gray-400 text-xs">Nenhum funcionário cadastrado.</td></tr>`;
      return;
    }

    tabela.innerHTML = funcionarios.map(func => {
      const distintivoAcesso = func.tipo_usuario === 'administrador' 
        ? `<span class="px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 rounded-full">Admin</span>`
        : `<span class="px-2.5 py-1 text-xs font-semibold text-gray-600 bg-gray-100 rounded-full">Funcionário</span>`;

      const cpfFormatado = func.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
      
      const badgeFaltas = func.faltasNoMes > 0 
        ? `<span class="px-2.5 py-1 text-xs font-bold text-red-700 bg-red-50 rounded-full">${func.faltasNoMes}</span>`
        : `<span class="px-2.5 py-1 text-xs font-medium text-gray-400 bg-gray-50 rounded-full">0</span>`;

      return `
        <tr class="text-gray-600 hover:bg-gray-50/50 transition-all">
          <td class="py-3 px-4 font-semibold text-gray-900">${func.nome}</td>
          <td class="py-3 px-4 font-mono text-xs">${cpfFormatado}</td>
          <td class="py-3 px-4 text-gray-500">${func.cargo || 'Não informado'}</td>
          <td class="py-3 px-4">${distintivoAcesso}</td>
          <td class="py-3 px-4 text-center">${badgeFaltas}</td>
        </tr>
      `;
    }).join('');
  },

  // 5. MÉTODOS AUXILIARES VISUAIS (Mensagens e Limpezas de Campos)
  exibirMensagem(mensagem, tipo) {
    alert(`${tipo === 'sucesso' ? '✅' : '❌'} ${mensagem}`);
  },

  limparFormularioAtestado() {
    const form = document.getElementById('formAtestado');
    if (form) form.reset();
  },

  limparFormularioFuncionario() {
    const form = document.getElementById('formGerenciarFuncionario');
    if (form) form.reset();
  }
};

// =========================================================================
// 6. INICIALIZAÇÃO CENTRALIZADA COM MONITOR EM TEMPO REAL DO FIREBASE AUTH
// =========================================================================
document.addEventListener('DOMContentLoaded', () => {
  AdminView.configurarAbas();
  AdminView.configurarEventos();

  firebase.auth().onAuthStateChanged(async (usuarioLogado) => {
    if (!usuarioLogado) {
      console.warn("Segurança: Nenhum usuário detectado. Redirecionando...");
      window.location.href = 'index.html';
      return;
    }

    try {
      const perfil = await PontoModel.buscarPerfilPorUid(usuarioLogado.uid);
      console.log("=== DADOS RETORNADOS DO FIRESTORE ===");
      console.log(perfil);
      console.log("=====================================");

      if (!perfil || perfil.tipo_usuario !== 'administrador') {
        console.error("Acesso negado. Motivo: Perfil nulo ou tipo_usuario diferente de 'administrador'");
        alert("Acesso restrito a administradores!");
        window.location.href = 'ponto.html'; 
        return;
      }

      console.log(`✅ Acesso administrativo concedido para: ${perfil.nome}`);
      
      // Alimenta os gráficos e tabelas (Ocorrências e Funcionários)
      if (typeof AdminController !== 'undefined' && AdminController.carregarDadosPainel) {
        AdminController.carregarDadosPainel();
      }

    } catch (erro) {
      console.error("Erro crítico na trava do Dashboard:", erro);
      window.location.href = 'index.html';
    }
  });
});