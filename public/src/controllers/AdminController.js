// src/controllers/AdminController.js

const AdminController = {
  
  /**
   * FUNÇÃO AUXILIAR DE SEGURANÇA (ESTRATÉGIA DUPLA)
   * Verifica o nível de acesso direto do usuário ativo de forma instantânea.
   */
  async _verificarPermissaoAdmin() {
    try {
      const usuarioLogado = firebase.auth().currentUser;
      if (!usuarioLogado) return false;

      if (usuarioLogado.email && usuarioLogado.email.includes('@ponto.local')) {
        const cpfCru = usuarioLogado.email.split('@')[0];
        const perfilPorCpf = await PontoModel.buscarPerfil(cpfCru);
        if (perfilPorCpf && perfilPorCpf.tipo_usuario === 'administrador') {
          return true;
        }
      }

      const perfilPorUid = await PontoModel.buscarPerfilPorUid(usuarioLogado.uid);
      return perfilPorUid && perfilPorUid.tipo_usuario === 'administrador';

    } catch (erro) {
      console.error("Erro interno ao validar permissão de administrador:", erro);
      return false;
    }
  },

  /**
   * FUNÇÃO CENTRAL DE CARREGAMENTO DE DADOS DO PAINEL (COM CONTADOR INTEGRADO)
   */
/**
   * FUNÇÃO CENTRAL DE CARREGAMENTO DE DADOS DO PAINEL (CORRIGIDA)
   */
  async carregarDadosPainel() {
    try {
      // CORREÇÃO DA DIGITAÇÃO: Mudar de 'buscarRelatorioConsolidatedMensal' para 'buscarRelatorioConsolidadoMensal'
      const pontos = await PontoModel.buscarRelatorioConsolidadoMensal();
      
      if (typeof AdminView.renderizarTabelaFaltas === 'function') {
        AdminView.renderizarTabelaFaltas(pontos);
      }

      // 2. Puxa a lista de funcionários e a lista de atestados lançados do banco
      const funcionarios = await PontoModel.buscarTodosFuncionarios();
      const atestados = await PontoModel.buscarAtestadosDoMes();

      // Mapeia os funcionários adicionando o contador dinâmico baseado nas justificativas correspondentes
      const funcionariosComFaltas = funcionarios.map(func => {
        const totalFaltasJustificadas = atestados.filter(atest => atest.cpf_funcionario === func.cpf).length;
        return {
          ...func,
          faltasNoMes: totalFaltasJustificadas
        };
      });

      // 3. Renderiza a tabela de funcionários passando a lista com os contadores incluídos
      if (typeof AdminView.renderizarTabelaFuncionarios === 'function') {
        AdminView.renderizarTabelaFuncionarios(funcionariosComFaltas);
      }

    } catch (erro) {
      console.error("Controller: Erro ao alimentar tabelas do painel:", erro);
    }
  },

  /**
   * 1. ADICIONAR / ALTERAR FUNCIONÁRIO (Acesso Restrito)
   */
  async processarCadastroFuncionario(nome, cpfComMascara, cargo, ehAdmin) {
    try {
      const temPermissao = await this._verificarPermissaoAdmin();
      if (!temPermissao) {
        AdminView.exibirMensagem("Acesso Negado: Sua sessão não possui nível de administrador ativo no controlador.", "erro");
        return;
      }

      const cpfCru = cpfComMascara.replace(/\D/g, '');
      if (cpfCru.length !== 11) {
        AdminView.exibirMensagem("Por favor, insira um CPF válido com 11 dígitos.", "erro");
        return;
      }

      if (!nome || nome.trim().length < 3) {
        AdminView.exibirMensagem("O nome do colaborador precisa ser completo.", "erro");
        return;
      }

      const dadosFuncionario = {
        nome: nome.trim(),
        cpf: cpfCru,
        cargo: cargo,
        tipo_usuario: ehAdmin ? 'administrador' : 'funcionario'
      };

      // Gravação unificada pelo Model
      await PontoModel.salvarOuAtualizarFuncionario(dadosFuncionario);

      AdminView.exibirMensagem(`Funcionário ${dadosFuncionario.nome} salvo com sucesso!`, "sucesso");
      
      // Ações visuais de encerramento do fluxo
      AdminView.fecharModalFuncionario();
      this.carregarDadosPainel();

    } catch (erro) {
      console.error("Controller: Erro ao cadastrar funcionário:", erro);
      AdminView.exibirMensagem("Erro interno ao salvar os dados cadastrais.", "erro");
    }
  },

  /**
   * 2. LANÇAR JUSTIFICATIVA / ATESTADO EM MÚLTIPLOS DIAS (Acesso Restrito)
   */
  async lancarJustificativaAtestado(cpfFuncionario, dataInicio, dataFim, arquivo) {
    try {
      const temPermissao = await this._verificarPermissaoAdmin();
      if (!temPermissao) {
        AdminView.exibirMensagem("Acesso Negado: Você não tem permissão para lançar justificativas.", "erro");
        return;
      }

      const [anoI, mesI, diaI] = dataInicio.split('-');
      const [anoF, mesF, diaF] = dataFim.split('-');

      const dataAtual = new Date(anoI, mesI - 1, diaI);
      const dataLimite = new Date(anoF, mesF - 1, diaF);

      if (dataAtual > dataLimite) {
        AdminView.exibirMensagem("A data de início não pode ser maior que a de término.", "erro");
        return;
      }

      let listaDeDias = [];
      while (dataAtual <= dataLimite) {
        const ano = dataAtual.getFullYear();
        const mes = String(dataAtual.getMonth() + 1).padStart(2, '0');
        const dia = String(dataAtual.getDate()).padStart(2, '0');
        
        listaDeDias.push(`${ano}-${mes}-${dia}`);
        dataAtual.setDate(dataAtual.getDate() + 1);
      }

      await PontoModel.salvarAtestadoMultiplosDias({
        cpf: cpfFuncionario.replace(/\D/g, ''),
        dias: listaDeDias,
        comprovante: arquivo ? arquivo.name : "Nenhum arquivo anexado"
      });

      AdminView.exibirMensagem(`Sucesso! Foram justificadas ${listaDeDias.length} datas para este funcionário.`, "sucesso");
      AdminView.limparFormularioAtestado();
      this.carregarDadosPainel(); // Recarrega o painel atualizando o contador de faltas

    } catch (erro) {
      console.error("Erro no controlador do Admin:", erro);
      AdminView.exibirMensagem("Erro ao lançar justificativa no período selecionado.", "erro");
    }
  },

  /**
   * 3. EXPORTAR RELATÓRIO MENSAL EM PDF (Acesso Restrito)
   */
  async exportarFaltasPdf() {
    try {
      const temPermissao = await this._verificarPermissaoAdmin();
      if (!temPermissao) {
        alert("Acesso Negado: Permissão insuficiente para exportar relatórios.");
        return;
      }

      const listaFaltasERegistros = await PontoModel.buscarRelatorioConsolidadoMensal();
      alert("Gerando dados para o PDF... (Os relatórios mensais mantêm seus formatos estáveis salvando dados consolidados)");
      console.log("Dados consolidados para o PDF do mês:", listaFaltasERegistros);
      
    } catch (erro) {
      alert("Erro ao processar relatório.");
    }
  }
};