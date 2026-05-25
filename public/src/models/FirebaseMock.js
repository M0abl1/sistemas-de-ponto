// src/models/FirebaseMock.js

// Simulando nossa base de dados local para testes no VS Code
const BANCO_LOCAL = {
  usuarios: [
    { cpf: "11111111111", senha: "123", nome: "Moab Lima", tipo_usuario: "funcionario" },
    { cpf: "22222222222", senha: "456", nome: "Iasmin Silva", tipo_usuario: "funcionario" },
    { cpf: "00000000000", senha: "admin", nome: "Administrador SEDUC", tipo_usuario: "administrador" }
  ],
  registros_ponto: [],
  registros_dispositivos: [] // Trava de dispositivo por dia
};

// Simulando as funções do Firebase que seu Model vai chamar
const firebaseMock = {
  auth() {
    return {
      signInWithEmailAndPassword: async (email, senha) => {
        const cpf = email.split('@')[0];
        const usuario = BANCO_LOCAL.usuarios.find(u => u.cpf === cpf && u.senha === senha);
        
        if (!usuario) throw new Error("Usuário ou senha inválidos");
        
        // Simula o usuário logado na sessão ativa
        localStorage.setItem('usuario_logado', JSON.stringify(usuario));
        return { user: { uid: cpf } };
      },
      signOut: async () => {
        localStorage.removeItem('usuario_logado');
        window.location.href = 'index.html';
      },
      getCurrentUser() {
        const dados = localStorage.getItem('usuario_logado');
        return dados ? JSON.parse(dados) : null;
      }
    };
  },
  
  firestore() {
    return {
      collection: (colecao) => ({
        doc: (id) => ({
          get: async () => ({
            exists: BANCO_LOCAL.usuarios.some(u => u.cpf === id),
            data: () => BANCO_LOCAL.usuarios.find(u => u.cpf === id)
          })
        }),
        where: (campo, operador, valor) => {
          // Simulação simples de filtros para os testes locais
          return {
            where: () => this,
            get: async () => {
              let resultado = BANCO_LOCAL[colecao] || [];
              return {
                empty: resultado.length === 0,
                forEach: (callback) => resultado.forEach(doc => callback({ data: () => doc }))
              };
            }
          };
        }
      })
    };
  }
};

// Para não quebrar o código futuro, dizemos que o 'firebase' global é o nosso mock por enquanto
window.firebase = firebaseMock;