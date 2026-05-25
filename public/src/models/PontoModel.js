// public/src/models/PontoModel.js

const PontoModel = {
  
  /**
   * 1. BUSCA O PERFIL DO USUÁRIO PELO CPF (ID do documento)
   */
  async buscarPerfil(cpfCru) {
    try {
      const doc = await firebase.firestore().collection('usuarios').doc(cpfCru).get();
      return doc.exists ? doc.data() : null;
    } catch (erro) {
      console.error("Model: Erro ao buscar perfil por CPF:", erro);
      throw erro;
    }
  },

  /**
   * 1B. BUSCA O PERFIL PELO UID (Para travas de segurança e Admin)
   */
  async buscarPerfilPorUid(uid) {
    try {
      const snapshot = await firebase.firestore().collection('usuarios')
        .where('uid', '==', uid)
        .get();
      
      if (snapshot.empty) return null;
      return snapshot.docs[0].data();
    } catch (erro) {
      console.error("Model: Erro ao buscar perfil por UID:", erro);
      throw erro;
    }
  },

  /**
   * 2. TRAVA DE SEGURANÇA POR DISPOSITIVO
   */
  async verificarDispositivoUsadoHoje(deviceId, cpfLogado) {
    try {
      const hoje = new Date().toISOString().split('T')[0];
      
      const snapshot = await firebase.firestore().collection('registros_dispositivos')
        .where('deviceId', '==', deviceId)
        .where('data', '==', hoje)
        .get();

      if (snapshot.empty) return false;

      let usadoPorOutro = false;
      snapshot.forEach(doc => {
        if (doc.data().cpf !== cpfLogado) {
          usadoPorOutro = true;
        }
      });
      return usadoPorOutro;
    } catch (erro) {
      console.error("Model: Erro ao checar dispositivo:", erro);
      throw erro;
    }
  },

  /**
   * 3. REGISTRA O USO DO DISPOSITIVO
   */
  async registrarUsoDispositivo(deviceId, cpfLogado) {
    try {
      const hoje = new Date().toISOString().split('T')[0];
      await firebase.firestore().collection('registros_dispositivos').add({
        deviceId: deviceId,
        cpf: cpfLogado,
        data: hoje,
        criadoEm: firebase.firestore.FieldValue.serverTimestamp()
      });
    } catch (erro) {
      console.error("Model: Erro ao vincular dispositivo:", erro);
      throw erro;
    }
  },

  /**
   * 4. SALVA A BATIDA DE PONTO
   */
  async salvarRegistroPonto(dadosPonto) {
    try {
      await firebase.firestore().collection('registro_ponto').add({
        usuario_id: dadosPonto.usuario_id,
        data_hora: dadosPonto.data_hora,
        latitude: dadosPonto.latitude,
        longitude: dadosPonto.longitude,
        dispositivo: dadosPonto.dispositivo,
        criadoEm: firebase.firestore.FieldValue.serverTimestamp()
      });
    } catch (erro) {
      console.error("Model: Erro ao salvar ponto:", erro);
      throw erro;
    }
  },

  /**
   * 5. SALVA ATESTADOS COM LOG DO ARQUIVO (Individual)
   */
  async salvarAtestado(dadosAtestado) {
    try {
      await firebase.firestore().collection('atestados_justificativas').add({
        cpf_funcionario: dadosAtestado.cpf,
        data_inicio: dadosAtestado.inicio,
        data_fim: dadosAtestado.fim,
        nome_comprovante: dadosAtestado.comprovante,
        lancadoPor: firebase.auth().currentUser.uid,
        criadoEm: firebase.firestore.FieldValue.serverTimestamp()
      });
    } catch (erro) {
      console.error("Model: Erro ao salvar atestado:", erro);
      throw erro;
    }
  },

  /**
   * 5B. SALVA ATESTADOS EM LOTE (Para múltiplos dias selecionados no calendário)
   */
  async salvarAtestadoMultiplosDias(dadosLote) {
    try {
      const db = firebase.firestore();
      const batch = db.batch();
      const uidOperador = firebase.auth().currentUser.uid;

      dadosLote.dias.forEach(dia => {
        const novoDocRef = db.collection('atestados_justificativas').doc();
        batch.set(novoDocRef, {
          cpf_funcionario: dadosLote.cpf,
          data_justificada: dia,
          nome_comprovante: dadosLote.comprovante,
          lancadoPor: uidOperador,
          criadoEm: firebase.firestore.FieldValue.serverTimestamp()
        });
      });

      await batch.commit();
      console.log(`Model: ${dadosLote.dias.length} dias de justificativa salvos em lote.`);
    } catch (erro) {
      console.error("Model: Erro ao salvar lote de atestados:", erro);
      throw erro;
    }
  },

  /**
   * 6. BUSCA DADOS PARA O RELATÓRIO MENSAL
   */
  async buscarRelatorioConsolidadoMensal() {
    try {
      const snapshot = await firebase.firestore().collection('registro_ponto')
        .orderBy('criadoEm', 'desc')
        .get();
      
      let registros = [];
      snapshot.forEach(doc => {
         registros.push({ id: doc.id, ...doc.data() });
      });
      return registros;
    } catch (erro) {
      console.error("Model: Erro ao buscar relatório consolidado:", erro);
      throw erro;
    }
  },

  /**
   * 7. SALVA O FUNCIONÁRIO NO FIRESTORE E CRIA O ACESSO NO AUTH COM SENHA PADRÃO "123456"
   */
  async salvarOuAtualizarFuncionario(dadosFuncionario) {
    try {
      const db = firebase.firestore();
      
      // 1. Grava os dados do perfil na coleção 'usuarios' usando o CPF como nome do documento
      await db.collection('usuarios').doc(dadosFuncionario.cpf).set({
        nome: dadosFuncionario.nome,
        cpf: dadosFuncionario.cpf,
        cargo: dadosFuncionario.cargo,
        tipo_usuario: dadosFuncionario.tipo_usuario,
        atualizadoEm: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      
      console.log(`Model: Perfil de ${dadosFuncionario.nome} salvo no Firestore.`);

      // 2. Cria o login no Firebase Auth de forma silenciosa e em segundo plano
      const emailFantasma = `${dadosFuncionario.cpf}@ponto.local`;
      const senhaPadrao = "123456"; // ◄ SENHA PADRÃO CONFIGURADA DE FORMA FIXA

      try {
        // Inicializa uma instância secundária rápida para não deslogar o admin atual durante a operação
        const secondaryApp = firebase.initializeApp(firebase.app().options, "SecondaryApp");
        await secondaryApp.auth().createUserWithEmailAndPassword(emailFantasma, senhaPadrao);
        
        // Recupera o UID gerado pelo Firebase para esse novo usuário
        const novoUid = secondaryApp.auth().currentUser.uid;
        
        // Atribui o UID de volta para o documento do funcionário no Firestore
        await db.collection('usuarios').doc(dadosFuncionario.cpf).update({ uid: novoUid });
        
        // Encerra a conexão da instância secundária de forma limpa
        await secondaryApp.delete();
        console.log(`Model: Conta de autenticação unificada criada com sucesso para o CPF.`);
      } catch (erroAuth) {
        // Se a conta já existir (for uma edição de cargo/nome), o Firebase avisa e nós ignoramos o erro de duplicidade
        if (erroAuth.code !== 'auth/email-already-in-use' && erroAuth.code !== 'auth/email-already-in-connected-account') {
          console.warn("Model: Nota/Aviso no fluxo de registro Auth:", erroAuth.message);
        }
      }

    } catch (erro) {
      console.error("Model: Erro completo ao salvar funcionário:", erro);
      throw erro;
    }
  },

  /**
   * 8. RETORNA A LISTA COMPLETA DE TODOS OS FUNCIONÁRIOS CADASTRADOS (Por ordem alfabética)
   */
  async buscarTodosFuncionarios() {
    try {
      const snapshot = await firebase.firestore().collection('usuarios')
        .orderBy('nome', 'asc')
        .get();
      
      let lista = [];
      snapshot.forEach(doc => {
        lista.push({ id: doc.id, ...doc.data() });
      });
      return lista;
    } catch (erro) {
      console.error("Model: Erro ao listar funcionários:", erro);
      throw erro;
    }
  },

  /**
   * 9. BUSCA TODAS AS JUSTIFICATIVAS/ATESTADOS DO MÊS CORRENTE
   */
  async buscarAtestadosDoMes() {
    try {
      const snapshot = await firebase.firestore().collection('atestados_justificativas').get();
      let atestados = [];
      snapshot.forEach(doc => {
        atestados.push(doc.data());
      });
      return atestados;
    } catch (erro) {
      console.error("Model: Erro ao buscar atestados do mês:", erro);
      throw erro;
    }
  }
};