/*
 * Dados: tudo fica guardado neste aparelho (localStorage), num único JSON.
 * Quem entra com Google também tem uma cópia na nuvem (cloud.js), e os aparelhos se juntam.
 *
 *   contas       { id, nome, tipo, saldo_inicial, arquivada, mod }
 *   categorias   { id, nome, tipo: 'despesa' | 'receita', cor, mod }   (sem tela: servem aos lançamentos antigos)
 *   lancamentos  { id, tipo: 'despesa' | 'receita' | 'transferencia', descricao, pessoa, valor, data,
 *                  categoria_id, conta_id, conta_destino_id, pago, grupo, parcela, parcelas, obs, mod }
 *   orcamentos   { [categoria_id]: limite mensal }   (orcamentos_mod: quando mudou). Só guardado: não há mais tela.
 *   acertos      { id, tipo: 'devedor' | 'credor', nome, valor (de cada parcela), descricao, parcelas, vencimento, mod }
 *                cada registro é um item; itens com o mesmo nome são da mesma pessoa
 *   faturas      { id: 'fatura-AAAA-MM', mes: 'AAAA-MM', valor, mod }
 *   config       { mayer_alvo, ir, valor_investido, data_juros }   (config_mod: quando mudou)
 *   removidos    { [id]: quando foi excluído }
 *
 * "grupo" liga as parcelas (ou as repetições mensais) criadas juntas.
 *
 * Para juntar o que foi feito em aparelhos diferentes, cada registro guarda em "mod" quando
 * mudou pela última vez, e as exclusões ficam em "removidos". Não é preciso marcar nada à mão:
 * a cada salvar(), o que mudou desde a última gravação recebe a hora atual.
 */
(function (global) {
  'use strict';

  const KEY = 'financas:dados';
  const META_KEY = 'financas:sync';
  const VERSAO = 3;
  const LISTAS = ['contas', 'categorias', 'lancamentos', 'acertos', 'faturas'];
  const GUARDA_REMOVIDOS = 180 * 86400000;

  const CORES = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948', '#0e8a9e', '#8a6d3b', '#64748b', '#b5179e'];

  const CONTA_TIPOS = {
    corrente: 'Conta corrente', poupanca: 'Poupança', carteira: 'Dinheiro', cartao: 'Cartão de crédito', investimento: 'Investimento',
  };

  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  // Contas e categorias iniciais. Ficam com mod 0: qualquer mudança feita em outro aparelho vale mais.
  function padrao() {
    const cat = (nome, tipo, cor) => ({ id: uid(), nome, tipo, cor, mod: 0 });
    return {
      versao: VERSAO,
      contas: [
        { id: uid(), nome: 'Carteira', tipo: 'carteira', saldo_inicial: 0, arquivada: false, mod: 0 },
        { id: uid(), nome: 'Banco', tipo: 'corrente', saldo_inicial: 0, arquivada: false, mod: 0 },
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
      orcamentos_mod: 0,
      acertos: [],
      faturas: [],
      config: {},
      config_mod: 0,
      removidos: {},
    };
  }

  // Confere e completa um JSON vindo do armazenamento, da nuvem ou de uma cópia de segurança.
  function normalizar(d) {
    if (!d || typeof d !== 'object' || !Array.isArray(d.lancamentos) || !Array.isArray(d.contas) || !Array.isArray(d.categorias)) {
      throw new Error('Arquivo inválido: não parece uma cópia do Minhas Finanças.');
    }
    const mod = (r) => Number(r.mod) || 0;
    const removidos = {};
    if (d.removidos && typeof d.removidos === 'object') {
      Object.entries(d.removidos).forEach(([id, t]) => { if (Number(t)) removidos[id] = Number(t); });
    }
    return {
      versao: VERSAO,
      contas: d.contas.map((c) => ({ arquivada: false, tipo: 'corrente', ...c, saldo_inicial: Number(c.saldo_inicial) || 0, mod: mod(c) })),
      categorias: d.categorias.map((c) => ({ cor: CORES[10], ...c, mod: mod(c) })),
      lancamentos: d.lancamentos.map((l) => ({ pago: true, obs: '', pessoa: '', ...l, valor: Number(l.valor) || 0, mod: mod(l) })),
      orcamentos: d.orcamentos && typeof d.orcamentos === 'object' ? d.orcamentos : {},
      orcamentos_mod: Number(d.orcamentos_mod) || 0,
      acertos: (Array.isArray(d.acertos) ? d.acertos : []).map((a) => ({
        descricao: '', vencimento: '', ...a, valor: Number(a.valor) || 0, parcelas: Math.max(1, Math.round(Number(a.parcelas)) || 1), mod: mod(a),
      })),
      faturas: (Array.isArray(d.faturas) ? d.faturas : []).map((f) => ({ ...f, valor: Number(f.valor) || 0, mod: mod(f) })),
      config: d.config && typeof d.config === 'object' ? d.config : {},
      config_mod: Number(d.config_mod) || 0,
      removidos,
    };
  }

  // Junta duas versões dos dados: em cada registro fica a alteração mais recente,
  // e o que foi excluído depois da última alteração some.
  function juntar(a, b) {
    a = normalizar(a);
    b = normalizar(b);
    const out = { versao: VERSAO, removidos: {} };
    [a.removidos, b.removidos].forEach((r) => Object.entries(r).forEach(([id, t]) => {
      if (!(out.removidos[id] >= t)) out.removidos[id] = t;
    }));
    LISTAS.forEach((k) => {
      const m = new Map();
      [...a[k], ...b[k]].forEach((r) => {
        const o = m.get(r.id);
        if (!o || r.mod > o.mod) m.set(r.id, r);
      });
      out[k] = [...m.values()].filter((r) => !(out.removidos[r.id] >= r.mod));
      out[k].forEach((r) => { delete out.removidos[r.id]; });
    });
    const usarB = b.orcamentos_mod > a.orcamentos_mod;
    out.orcamentos = { ...(usarB ? b.orcamentos : a.orcamentos) };
    out.orcamentos_mod = Math.max(a.orcamentos_mod, b.orcamentos_mod);
    out.config = { ...(b.config_mod > a.config_mod ? b.config : a.config) };
    out.config_mod = Math.max(a.config_mod, b.config_mod);
    return out;
  }

  // Antes de juntar dois aparelhos pela primeira vez: categorias e contas com o mesmo nome
  // (as iniciais, por exemplo) passam a usar o código da outra versão, para não duplicar.
  function alinhar(local, outro) {
    const d = normalizar(JSON.parse(JSON.stringify(local)));
    const o = normalizar(outro);
    const chave = (r, comTipo) => `${String(r.nome || '').trim().toLowerCase()}|${comTipo ? r.tipo : ''}`;
    const troca = (lista, outros, comTipo) => {
      const ids = new Set(outros.map((r) => r.id));
      const porNome = new Map(outros.map((r) => [chave(r, comTipo), r.id]));
      const mapa = {};
      lista.forEach((r) => {
        const alvo = porNome.get(chave(r, comTipo));
        if (alvo && alvo !== r.id && !ids.has(r.id)) {
          mapa[r.id] = alvo;
          r.id = alvo;
        }
      });
      return mapa;
    };
    const cats = troca(d.categorias, o.categorias, true);
    const contas = troca(d.contas, o.contas, false);
    d.lancamentos.forEach((l) => {
      if (cats[l.categoria_id]) l.categoria_id = cats[l.categoria_id];
      if (contas[l.conta_id]) l.conta_id = contas[l.conta_id];
      if (contas[l.conta_destino_id]) l.conta_destino_id = contas[l.conta_destino_id];
    });
    const orc = {};
    Object.entries(d.orcamentos).forEach(([id, v]) => { orc[cats[id] || id] = v; });
    d.orcamentos = orc;
    return d;
  }

  // ---------- Estado ----------

  let db = null;
  let foto = null; // como os registros estavam na última gravação
  let meta = null; // { uid, versao, pendente, mudou }
  let erroGravar = false;
  let contador = 0;
  const aoSalvar = [];
  const aoTrocar = [];

  const corpo = (r) => {
    const { mod, ...resto } = r;
    return JSON.stringify(resto);
  };

  function fotografar(d) {
    const s = { orc: JSON.stringify(d.orcamentos || {}), cfg: JSON.stringify(d.config || {}) };
    LISTAS.forEach((k) => { s[k] = new Map(d[k].map((r) => [r.id, corpo(r)])); });
    return s;
  }

  // Dá a hora atual ao que mudou desde a última gravação e anota o que foi excluído
  function marcarMudancas() {
    const agora = Date.now();
    let mudou = false;
    LISTAS.forEach((k) => {
      const antes = foto[k];
      const vistos = new Set();
      db[k].forEach((r) => {
        vistos.add(r.id);
        if (antes.get(r.id) !== corpo(r)) {
          r.mod = agora;
          delete db.removidos[r.id];
          mudou = true;
        }
      });
      antes.forEach((_, id) => {
        if (!vistos.has(id)) {
          db.removidos[id] = agora;
          mudou = true;
        }
      });
    });
    if (JSON.stringify(db.orcamentos || {}) !== foto.orc) {
      db.orcamentos_mod = agora;
      mudou = true;
    }
    if (JSON.stringify(db.config || {}) !== foto.cfg) {
      db.config_mod = agora;
      mudou = true;
    }
    // Exclusões muito antigas já chegaram a todos os aparelhos
    Object.keys(db.removidos).forEach((id) => { if (agora - db.removidos[id] > GUARDA_REMOVIDOS) delete db.removidos[id]; });
    return mudou;
  }

  function gravarMeta() {
    try { localStorage.setItem(META_KEY, JSON.stringify(meta)); } catch (e) { /* sem armazenamento */ }
  }

  function gravar() {
    try {
      localStorage.setItem(KEY, JSON.stringify(db));
      erroGravar = false;
    } catch (e) {
      erroGravar = true;
    }
    gravarMeta();
    return !erroGravar;
  }

  function carregar() {
    let raw = null;
    try { raw = localStorage.getItem(KEY); } catch (e) { /* sem armazenamento */ }
    try {
      db = raw ? normalizar(JSON.parse(raw)) : padrao();
    } catch (e) {
      db = padrao();
    }
    foto = fotografar(db);
    try { meta = JSON.parse(localStorage.getItem(META_KEY) || 'null'); } catch (e) { meta = null; }
    if (!meta || typeof meta !== 'object') {
      // Dados de antes da sincronização existir contam como alterados pelo usuário
      const temDados = !!raw && db.lancamentos.length > 0;
      meta = { uid: null, versao: 0, pendente: temDados, mudou: temDados };
    }
    return db;
  }

  function salvar() {
    if (marcarMudancas()) {
      meta.pendente = true;
      meta.mudou = true;
      contador++;
    }
    foto = fotografar(db);
    const ok = gravar();
    aoSalvar.forEach((f) => f());
    return ok;
  }

  function trocar(novo) {
    db = novo;
    aoTrocar.forEach((f) => f(db));
  }

  // Cópia restaurada, "desfazer" ou "apagar tudo": entra como mudança feita agora
  function substituir(novo) {
    db = normalizar(novo);
    db.removidos = { ...db.removidos };
    salvar();
    trocar(db);
    return db;
  }

  function apagarTudo() {
    return substituir(padrao());
  }

  // Dados que vieram da nuvem: passam a valer aqui, sem contar como mudança deste aparelho
  function adotar(novo, pendente = false) {
    db = normalizar(novo);
    foto = fotografar(db);
    meta.pendente = pendente;
    if (db.lancamentos.length) meta.mudou = true;
    gravar();
    trocar(db);
    return db;
  }

  // Esquece tudo deste aparelho (ao sair da conta escolhendo apagar)
  function esquecer() {
    db = padrao();
    foto = fotografar(db);
    meta = { uid: null, versao: 0, pendente: false, mudou: false };
    gravar();
    trocar(db);
    return db;
  }

  function setMeta(parcial) {
    Object.assign(meta, parcial);
    gravarMeta();
  }

  global.Store = {
    KEY, CORES, CONTA_TIPOS, uid, padrao, normalizar, juntar, alinhar, carregar, salvar, substituir, apagarTudo, adotar, esquecer, setMeta,
    onSalvo: (f) => aoSalvar.push(f),
    onTroca: (f) => aoTrocar.push(f),
    // Nunca usado de verdade: só as contas e categorias iniciais
    virgem: () => !meta.mudou && db.lancamentos.length === 0,
    get db() { return db; },
    get meta() { return { ...meta }; },
    get contador() { return contador; },
    get erroGravar() { return erroGravar; },
  };
})(window);
