/*
 * Dados: tudo fica guardado neste aparelho (localStorage), num único JSON.
 *
 *   contas       { id, nome, tipo, saldo_inicial, arquivada }
 *   categorias   { id, nome, tipo: 'despesa' | 'receita', cor }
 *   lancamentos  { id, tipo: 'despesa' | 'receita' | 'transferencia', descricao, valor, data,
 *                  categoria_id, conta_id, conta_destino_id, pago, grupo, parcela, parcelas, obs }
 *   orcamentos   { [categoria_id]: limite mensal }
 *
 * "grupo" liga as parcelas (ou as repetições mensais) criadas juntas.
 */
(function (global) {
  'use strict';

  const KEY = 'financas:dados';
  const VERSAO = 1;

  const CORES = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948', '#0e8a9e', '#8a6d3b', '#64748b', '#b5179e'];

  const CONTA_TIPOS = {
    corrente: 'Conta corrente', poupanca: 'Poupança', carteira: 'Dinheiro', cartao: 'Cartão de crédito', investimento: 'Investimento',
  };

  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  function padrao() {
    const cat = (nome, tipo, cor) => ({ id: uid(), nome, tipo, cor });
    return {
      versao: VERSAO,
      contas: [
        { id: uid(), nome: 'Carteira', tipo: 'carteira', saldo_inicial: 0, arquivada: false },
        { id: uid(), nome: 'Banco', tipo: 'corrente', saldo_inicial: 0, arquivada: false },
      ],
      categorias: [
        cat('Moradia', 'despesa', CORES[0]),
        cat('Alimentação', 'despesa', CORES[1]),
        cat('Transporte', 'despesa', CORES[2]),
        cat('Contas da casa', 'despesa', CORES[3]),
        cat('Saúde', 'despesa', CORES[4]),
        cat('Educação', 'despesa', CORES[5]),
        cat('Lazer', 'despesa', CORES[6]),
        cat('Compras', 'despesa', CORES[7]),
        cat('Assinaturas', 'despesa', CORES[8]),
        cat('Impostos e taxas', 'despesa', CORES[9]),
        cat('Outras despesas', 'despesa', CORES[10]),
        cat('Salário', 'receita', CORES[2]),
        cat('Vendas', 'receita', CORES[0]),
        cat('Serviços extras', 'receita', CORES[6]),
        cat('Rendimentos', 'receita', CORES[5]),
        cat('Outras receitas', 'receita', CORES[10]),
      ],
      lancamentos: [],
      orcamentos: {},
    };
  }

  // Confere e completa um JSON vindo do armazenamento ou de uma cópia de segurança.
  function normalizar(d) {
    if (!d || typeof d !== 'object' || !Array.isArray(d.lancamentos) || !Array.isArray(d.contas) || !Array.isArray(d.categorias)) {
      throw new Error('Arquivo inválido: não parece uma cópia do Minhas Finanças.');
    }
    return {
      versao: VERSAO,
      contas: d.contas.map((c) => ({ arquivada: false, tipo: 'corrente', ...c, saldo_inicial: Number(c.saldo_inicial) || 0 })),
      categorias: d.categorias.map((c) => ({ cor: CORES[10], ...c })),
      lancamentos: d.lancamentos.map((l) => ({ pago: true, obs: '', ...l, valor: Number(l.valor) || 0 })),
      orcamentos: d.orcamentos && typeof d.orcamentos === 'object' ? d.orcamentos : {},
    };
  }

  let db = null;
  let erroGravar = false;

  function carregar() {
    try {
      const raw = localStorage.getItem(KEY);
      db = raw ? normalizar(JSON.parse(raw)) : padrao();
    } catch (e) {
      db = padrao();
    }
    return db;
  }

  function salvar() {
    try {
      localStorage.setItem(KEY, JSON.stringify(db));
      erroGravar = false;
      return true;
    } catch (e) {
      erroGravar = true;
      return false;
    }
  }

  function substituir(novo) {
    db = normalizar(novo);
    salvar();
    return db;
  }

  function apagarTudo() {
    db = padrao();
    salvar();
    return db;
  }

  global.Store = {
    KEY, CORES, CONTA_TIPOS, uid, padrao, normalizar, carregar, salvar, substituir, apagarTudo,
    get db() { return db; },
    get erroGravar() { return erroGravar; },
  };
})(window);
