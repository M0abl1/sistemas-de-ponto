// src/config/firebase-config.js

// Cole aqui dentro as credenciais exatas fornecidas pelo painel do seu Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBpEUOvlyDn-D8SjMOaI0WtSdsKZxFK9TU",
  authDomain: "sistema-de-ponto-zelinha.firebaseapp.com",
  projectId: "sistema-de-ponto-zelinha",
  storageBucket: "sistema-de-ponto-zelinha.firebasestorage.app",
  messagingSenderId: "796704115400",
  appId: "1:796704115400:web:4663aba05a2e05a1b8f3fd",
  measurementId: "G-CL5J3G9QN9"
};

// Inicializa o Firebase globalmente para que os Models e Controllers consigam usar
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Configura explicitamente a persistência da sessão no navegador/celular.
// O modo 'LOCAL' garante que o funcionário permaneça logado mesmo se fechar a aba do navegador.
firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL)
  .catch((erro) => {
    console.error("Erro ao configurar persistência de login:", erro);
  });