/*
 * Minhas Finanças: telas e interação.
 *
 * Telas (pelo endereço #/...):
 *   #/inicio        saldo nas contas, resumo do mês, contas a pagar e gastos por categoria
 *   #/lancamentos   despesas, receitas e transferências do mês
 *   #/orcamento     limite de gastos por categoria
 *   #/relatorios    receitas x despesas mês a mês e por categoria, no ano
 *   #/ajustes       contas, categorias, tema e cópia de segurança
 *
 * Os dados ficam neste aparelho (veja store.js). No app Android, o objeto
 * window.Android salva arquivos e ajusta a cor da barra de status.
 */
(function () {
  'use strict';

  const { esc, fmtDate, fmtMoney, fmtMonth, fmtMonthLong, fmtNum, parseNum, toInput, hoje, iso, addDays, daysUntil, plural } = U;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const view = $('#view');
  const dlg = $('#dlg');
  const form = $('#dlgForm');
  const Android = window.Android || null;

  const TIPOS = { despesa: 'Despesa', receita: 'Receita', transferencia: 'Transferência' };
  const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const AVISO_DIAS = 10;
  const COPIA_KEY = 'financas:ultimaCopia';
  const APK_URL = 'https://github.com/gabrielfbrandao9/controle-financas/releases/latest/download/MinhasFinancas.apk';
  const RELEASES_API = 'https://api.github.com/repos/gabrielfbrandao9/controle-financas/releases/latest';
  const UPDATE_KEY = 'financas:atualizacao';

  const ICON = {
    plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
    prev: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5 8 12l7 7"/></svg>',
    next: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg>',
    close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    ok: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
    transf: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8.5h13.5M15 5l3.5 3.5L15 12M19 15.5H5.5M9 12l-3.5 3.5L9 19"/></svg>',
    download: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11M7 10.5l5 5 5-5"/><path d="M5 19.5h14"/></svg>',
    upload: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15.5V4.5M7 9l5-5 5 5"/><path d="M5 19.5h14"/></svg>',
    table: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M3.5 9.5h17M3.5 14.5h17M9.5 9.5v10"/></svg>',
    check: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="m8.5 12.2 2.4 2.4 4.7-4.9"/></svg>',
    cloud: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 18.5h10.5a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.6 9.1 4.75 4.75 0 0 0 7 18.5z"/></svg>',
    sync: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3"/><path d="M19.5 4.5v4h-4"/></svg>',
    google: '<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>',
  };

  const LOGO = `<svg viewBox="0 0 64 64" aria-hidden="true">
    <rect width="64" height="64" rx="16" fill="#1f5a73"/>
    <rect x="15" y="36" width="10" height="13" rx="2.5" fill="#8fc6db"/>
    <rect x="27" y="28" width="10" height="21" rx="2.5" fill="#c4e2ee"/>
    <rect x="39" y="18" width="10" height="31" rx="2.5" fill="#ffffff"/>
    <circle cx="21" cy="19" r="8" fill="#f2c14e"/>
    <circle cx="21" cy="19" r="4.6" fill="none" stroke="#c48f1d" stroke-width="2"/>
  </svg>`;

  // ---------- Estado ----------

  let db = Store.carregar();
  let current = 'inicio';
  let mes = hoje().slice(0, 7);
  let ano = Number(mes.slice(0, 4));
  const filtros = { tipo: 'todos', busca: '' };
  let toastTimer = null;

  function salvar() {
    if (!Store.salvar()) toast('Não foi possível salvar neste aparelho (armazenamento cheio ou bloqueado).', { ms: 6000 });
  }

  // ---------- Datas e números ----------

  const round2 = (v) => Math.round(v * 100) / 100;

  function addMonthsDate(s, n) {
    const [y, m, d] = s.split('-').map(Number);
    const t = new Date(y, m - 1 + n, 1);
    const last = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate();
    t.setDate(Math.min(d, last));
    return iso(t);
  }
  const addMonths = (ym, n) => addMonthsDate(`${ym}-01`, n).slice(0, 7);
  function fimDoMes(ym) {
    const [y, m] = ym.split('-').map(Number);
    return iso(new Date(y, m, 0));
  }

  function fmtDia(s) {
    const n = daysUntil(s);
    if (n === 0) return 'Hoje';
    if (n === -1) return 'Ontem';
    if (n === 1) return 'Amanhã';
    const [y, m, d] = s.split('-').map(Number);
    const curto = window.innerWidth < 560;
    const txt = new Date(y, m - 1, d).toLocaleDateString('pt-BR', { weekday: curto ? 'short' : 'long', day: 'numeric', month: 'long' });
    return txt.charAt(0).toUpperCase() + txt.slice(1);
  }

  const compactFmt = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 });

  // ---------- Consultas nos dados ----------

  const categoria = (id) => db.categorias.find((c) => c.id === id) || null;
  const conta = (id) => db.contas.find((c) => c.id === id) || null;
  const nomeConta = (id) => (conta(id) || {}).nome || '—';
  const contasAtivas = () => db.contas.filter((c) => !c.arquivada);
  const catsDo = (tipo) => db.categorias.filter((c) => c.tipo === tipo).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

  const doMes = (ym) => db.lancamentos.filter((l) => l.data.startsWith(ym));
  const ordenar = (list, desc = true) => [...list].sort((a, b) => (desc ? -1 : 1) * (a.data.localeCompare(b.data) || String(a.id).localeCompare(String(b.id))));

  function totais(list) {
    let receitas = 0;
    let despesas = 0;
    let aPagar = 0;
    list.forEach((l) => {
      if (l.tipo === 'receita') receitas += l.valor;
      else if (l.tipo === 'despesa') {
        despesas += l.valor;
        if (!l.pago) aPagar += l.valor;
      }
    });
    return { receitas: round2(receitas), despesas: round2(despesas), saldo: round2(receitas - despesas), aPagar: round2(aPagar) };
  }

  // Efeito de um lançamento no saldo de uma conta
  function efeito(l, contaId) {
    if (l.tipo === 'receita') return l.conta_id === contaId ? l.valor : 0;
    if (l.tipo === 'despesa') return l.conta_id === contaId ? -l.valor : 0;
    let v = 0;
    if (l.conta_id === contaId) v -= l.valor;
    if (l.conta_destino_id === contaId) v += l.valor;
    return v;
  }

  // Saldo real: só o que já foi pago/recebido até a data. previsto: conta também o que falta pagar.
  function saldoConta(c, ate = hoje(), previsto = false) {
    let s = c.saldo_inicial || 0;
    db.lancamentos.forEach((l) => {
      if (l.data <= ate && (previsto || l.pago)) s += efeito(l, c.id);
    });
    return round2(s);
  }
  const saldoTotal = (ate, previsto) => round2(contasAtivas().reduce((s, c) => s + saldoConta(c, ate, previsto), 0));

  function gastosPorCategoria(list) {
    const m = new Map();
    list.filter((l) => l.tipo === 'despesa').forEach((l) => m.set(l.categoria_id, (m.get(l.categoria_id) || 0) + l.valor));
    return [...m.entries()].map(([id, v]) => ({ cat: categoria(id), id, valor: round2(v) })).sort((a, b) => b.valor - a.valor);
  }
  function receitasPorCategoria(list) {
    const m = new Map();
    list.filter((l) => l.tipo === 'receita').forEach((l) => m.set(l.categoria_id, (m.get(l.categoria_id) || 0) + l.valor));
    return [...m.entries()].map(([id, v]) => ({ cat: categoria(id), id, valor: round2(v) })).sort((a, b) => b.valor - a.valor);
  }

  // ---------- Pedaços de tela ----------

  const pageHead = (title, sub, actions = '') => `<div class="page-head">
      <div><h1>${title}</h1>${sub ? `<p class="muted">${sub}</p>` : ''}</div>
      ${actions ? `<div class="page-actions">${actions}</div>` : ''}
    </div>`;

  const stat = (label, value, sub, cls = '') => `<div class="stat ${cls}"><span class="stat-label">${label}</span>
      <strong class="stat-value">${value}</strong>${sub ? `<span class="stat-sub">${sub}</span>` : ''}</div>`;

  const novoBtn = () => `<button type="button" class="btn primary desk-only" data-act="novo">${ICON.plus} Novo lançamento</button>`;

  function periodoMes() {
    const atual = mes === hoje().slice(0, 7);
    const label = fmtMonthLong(mes);
    return `<div class="period" role="group" aria-label="Mês">
        <button type="button" class="icon" data-act="mes" data-n="-1" aria-label="Mês anterior" title="Mês anterior">${ICON.prev}</button>
        <strong>${label.charAt(0).toUpperCase() + label.slice(1)}</strong>
        <button type="button" class="icon" data-act="mes" data-n="1" aria-label="Próximo mês" title="Próximo mês">${ICON.next}</button>
        ${atual ? '' : '<button type="button" class="btn small ghost hoje-btn" data-act="mes" data-n="0">Hoje</button>'}
      </div>`;
  }

  function periodoAno() {
    const atual = ano === new Date().getFullYear();
    return `<div class="period" role="group" aria-label="Ano">
        <button type="button" class="icon" data-act="ano" data-n="-1" aria-label="Ano anterior" title="Ano anterior">${ICON.prev}</button>
        <strong>${ano}</strong>
        <button type="button" class="icon" data-act="ano" data-n="1" aria-label="Próximo ano" title="Próximo ano">${ICON.next}</button>
        ${atual ? '' : '<button type="button" class="btn small ghost hoje-btn" data-act="ano" data-n="0">Este ano</button>'}
      </div>`;
  }

  function dotHtml(l) {
    if (l.tipo === 'transferencia') return `<span class="dot transf">${ICON.transf}</span>`;
    const c = categoria(l.categoria_id);
    const nome = c ? c.nome : '?';
    return `<span class="dot" style="background:${esc(c ? c.cor : '#64748b')}">${esc(nome.charAt(0).toUpperCase())}</span>`;
  }

  const catDot = (c) => `<span class="dot sm" style="background:${esc(c ? c.cor : '#64748b')}"></span>`;

  function valorHtml(l) {
    if (l.tipo === 'receita') return `<span class="valor receita">+ ${fmtMoney(l.valor)}</span>`;
    if (l.tipo === 'despesa') return `<span class="valor despesa">− ${fmtMoney(l.valor)}</span>`;
    return `<span class="valor transferencia">${fmtMoney(l.valor)}</span>`;
  }

  function parcelaTxt(l) {
    if (!l.grupo || !l.parcelas) return '';
    return l.rep === 'mensal' ? 'todo mês' : `${l.parcela}/${l.parcelas}`;
  }

  function vencimentoBadge(l) {
    const n = daysUntil(l.data);
    const verbo = l.tipo === 'receita' ? 'a receber' : 'a pagar';
    if (n < 0) return `<span class="badge danger">atrasada ${plural(-n, 'dia', 'dias')}</span>`;
    if (n === 0) return '<span class="badge warn">vence hoje</span>';
    if (n <= 3) return `<span class="badge warn">${verbo} · ${n === 1 ? 'amanhã' : `em ${n} dias`}</span>`;
    return `<span class="badge">${verbo}</span>`;
  }

  function linhaLanc(l, opts = {}) {
    const c = categoria(l.categoria_id);
    const titulo = l.descricao || (l.tipo === 'transferencia' ? 'Transferência' : (c ? c.nome : 'Sem categoria'));
    const partes = [];
    if (opts.data) partes.push(fmtDate(l.data));
    if (l.tipo === 'transferencia') partes.push(`${esc(nomeConta(l.conta_id))} → ${esc(nomeConta(l.conta_destino_id))}`);
    else {
      if (l.descricao) partes.push(esc(c ? c.nome : 'Sem categoria'));
      partes.push(esc(nomeConta(l.conta_id)));
    }
    if (l.pessoa) partes.push(esc(l.pessoa));
    const p = parcelaTxt(l);
    if (p) partes.push(p);
    const acao = l.tipo === 'receita' ? 'Receber' : 'Pagar';
    const status = l.pago ? '' : (opts.vencimento ? vencimentoBadge(l)
      : `<button type="button" class="badge warn" data-act="pagar" data-id="${esc(l.id)}" title="Marcar como ${l.tipo === 'receita' ? 'recebido' : 'pago'}">${l.tipo === 'receita' ? 'a receber' : 'a pagar'}</button>`);
    return `<li class="list-row clickable${l.pago ? '' : ' pendente'}" data-act="editar" data-id="${esc(l.id)}" tabindex="0">
        ${dotHtml(l)}
        <div class="grow"><strong>${esc(titulo)}</strong><small>${partes.join(' · ')}</small></div>
        <div class="right">${status}${valorHtml(l)}${opts.vencimento ? `<button type="button" class="btn small" data-act="pagar" data-id="${esc(l.id)}">${ICON.ok} ${acao}</button>` : ''}</div>
      </li>`;
  }

  function barras(items, opts = {}) {
    if (!items.length) return `<div class="empty-box"><p>${opts.vazio || 'Nada por aqui.'}</p></div>`;
    const max = Math.max(...items.map((i) => i.valor)) || 1;
    return `<ul class="bars">${items.map((i) => `<li class="bar-row">
        <div class="bar-top"><span class="nome">${catDot(i.cat)}<span>${esc(i.cat ? i.cat.nome : 'Sem categoria')}</span></span>
          <span class="val"><b>${fmtMoney(i.valor)}</b>${opts.total ? ` · ${Math.round((i.valor / opts.total) * 100)}%` : ''}</span></div>
        <div class="track"><div class="fill" style="width:${((i.valor / max) * 100).toFixed(1)}%"></div></div>
      </li>`).join('')}</ul>`;
  }

  // ---------- Telas ----------

  function render() {
    const pages = {
      lancamentos: renderLancamentos,
      orcamento: renderOrcamento,
      relatorios: renderRelatorios,
      balanco: renderBalanco,
      investir: renderInvestir,
      ajustes: renderAjustes,
    };
    view.innerHTML = (pages[current] || renderInicio)();
    $('#fab').classList.toggle('off', ['ajustes', 'balanco', 'investir'].includes(current));
    if (current === 'relatorios') desenharGrafico();
  }

  // Início
  function renderInicio() {
    const lancs = doMes(mes);
    const t = totais(lancs);
    const atual = saldoTotal(hoje());
    const fim = fimDoMes(mes);
    const previsto = saldoTotal(fim, true);
    const limite = addDays(hoje(), AVISO_DIAS);
    const pend = ordenar(db.lancamentos.filter((l) => !l.pago && l.data <= limite), false);
    const gastos = gastosPorCategoria(lancs);
    const recentes = ordenar(db.lancamentos.filter((l) => l.data <= hoje())).slice(0, 6);

    let aviso = bannerAtualizacao();
    if (!db.lancamentos.length) {
      aviso += `<div class="banner"><p><strong>Bem-vindo!</strong> Comece registrando um gasto ou uma receita. Em Ajustes, coloque quanto
        você tem hoje em cada conta.</p><div class="btn-row"><a class="btn small" href="#/ajustes">Ajustar contas</a>
        <button type="button" class="btn small primary" data-act="novo">${ICON.plus} Primeiro lançamento</button></div></div>`;
    } else if (precisaCopia()) {
      aviso += `<div class="banner warn"><p><strong>Faça uma cópia de segurança.</strong> Os dados ficam só neste aparelho; se ele for perdido ou
        o app for desinstalado, eles somem junto.</p><button type="button" class="btn small" data-act="backup">${ICON.download} Baixar cópia</button></div>`;
    }

    const contasHtml = contasAtivas().map((c) => {
      const s = saldoConta(c);
      return `<li class="list-row clickable" data-act="conta" data-id="${esc(c.id)}" tabindex="0">
          <div class="grow"><strong>${esc(c.nome)}</strong><small>${esc(Store.CONTA_TIPOS[c.tipo] || '')}</small></div>
          <span class="valor ${s < 0 ? 'neg-text' : ''}">${fmtMoney(s)}</span></li>`;
    }).join('');

    return pageHead('Resumo', '', periodoMes() + novoBtn()) + aviso + `
      <div class="stats">
        ${stat('Saldo nas contas hoje', fmtMoney(atual), `Previsto no fim de ${MESES_CURTOS[Number(mes.slice(5)) - 1]}: ${fmtMoney(previsto)}`, 'hero')}
        ${stat('Receitas do mês', fmtMoney(t.receitas), '', 'pos')}
        ${stat('Despesas do mês', fmtMoney(t.despesas), t.aPagar ? `${fmtMoney(t.aPagar)} ainda a pagar` : '')}
        ${stat('Sobra do mês', fmtMoney(t.saldo), 'Receitas − despesas', t.saldo < 0 ? 'neg' : (t.saldo > 0 ? 'pos' : ''))}
      </div>

      <section class="section card">
        <div class="section-head"><h2>A pagar e a receber <small class="muted">· atrasadas e próximos ${AVISO_DIAS} dias</small></h2></div>
        ${pend.length ? `<ul class="list">${pend.map((l) => linhaLanc(l, { data: true, vencimento: true })).join('')}</ul>`
    : `<div class="empty-box">${ICON.check}<p>Nada vencendo nos próximos ${AVISO_DIAS} dias.</p></div>`}
      </section>

      <div class="two-col">
        <section class="section card">
          <div class="section-head"><h2>Gastos por categoria</h2><a class="btn small ghost" href="#/orcamento">Orçamento</a></div>
          ${barras(gastos.slice(0, 7), { total: t.despesas, vazio: 'Nenhuma despesa neste mês.' })}
        </section>
        <section class="section card">
          <div class="section-head"><h2>Contas</h2><a class="btn small ghost" href="#/ajustes">Ajustar</a></div>
          <ul class="list">${contasHtml}</ul>
        </section>
      </div>

      <section class="section card">
        <div class="section-head"><h2>Últimos lançamentos</h2><a class="btn small ghost" href="#/lancamentos">Ver todos</a></div>
        ${recentes.length ? `<ul class="list">${recentes.map((l) => linhaLanc(l, { data: true })).join('')}</ul>`
    : '<div class="empty-box"><p>Nenhum lançamento ainda.</p></div>'}
      </section>`;
  }

  // Lançamentos
  function filtrar(list) {
    const q = filtros.busca.trim().toLowerCase();
    return list.filter((l) => {
      if (filtros.tipo === 'pendentes' ? l.pago : (filtros.tipo !== 'todos' && l.tipo !== filtros.tipo)) return false;
      if (!q) return true;
      const c = categoria(l.categoria_id);
      const txt = [l.descricao, l.pessoa, c && c.nome, nomeConta(l.conta_id), l.conta_destino_id && nomeConta(l.conta_destino_id), l.obs, fmtMoney(l.valor)].join(' ').toLowerCase();
      return txt.includes(q);
    });
  }

  function listaLancamentosHtml() {
    const doMesList = doMes(mes);
    const list = ordenar(filtrar(doMesList));
    const t = totais(list);
    if (!list.length) {
      return `<div class="empty-box"><p>${doMesList.length ? 'Nenhum lançamento com esse filtro.' : 'Nenhum lançamento neste mês.'}</p></div>`;
    }
    let html = `<div class="resumo-linha"><span>Receitas <b class="pos-text">${fmtMoney(t.receitas)}</b></span>
      <span>Despesas <b>${fmtMoney(t.despesas)}</b></span><span>Saldo <b class="${t.saldo < 0 ? 'neg-text' : ''}">${fmtMoney(t.saldo)}</b></span>
      <span>${plural(list.length, 'lançamento', 'lançamentos')}</span></div>`;
    let dia = null;
    let itens = [];
    const fechar = () => {
      if (!dia) return;
      const td = totais(itens);
      html += `<div class="day-head"><span>${fmtDia(dia)}</span><span class="valor">${td.saldo ? fmtMoney(td.saldo) : ''}</span></div>
        <ul class="list">${itens.map((l) => linhaLanc(l)).join('')}</ul>`;
    };
    list.forEach((l) => {
      if (l.data !== dia) {
        fechar();
        dia = l.data;
        itens = [];
      }
      itens.push(l);
    });
    fechar();
    return html;
  }

  function renderLancamentos() {
    const list = doMes(mes);
    const n = (f) => list.filter(f).length;
    const chips = [
      ['todos', 'Todos', list.length],
      ['despesa', 'Despesas', n((l) => l.tipo === 'despesa')],
      ['receita', 'Receitas', n((l) => l.tipo === 'receita')],
      ['transferencia', 'Transferências', n((l) => l.tipo === 'transferencia')],
      ['pendentes', 'A pagar/receber', n((l) => !l.pago)],
    ];
    return pageHead('Lançamentos', '', periodoMes() + novoBtn()) + `
      <div class="chips scroll" role="group" aria-label="Filtro">${chips.map(([k, label, c]) => `<button type="button" class="chip${filtros.tipo === k ? ' on' : ''}"
        data-act="filtro" data-k="${k}" aria-pressed="${filtros.tipo === k}">${label} <span class="n">${c}</span></button>`).join('')}</div>
      <input type="search" class="busca" id="busca" placeholder="Buscar por descrição, categoria, conta ou valor" value="${esc(filtros.busca)}" aria-label="Buscar">
      <section class="card" id="lista">${listaLancamentosHtml()}</section>`;
  }

  // Orçamento
  function renderOrcamento() {
    const gastos = gastosPorCategoria(doMes(mes));
    const porCat = new Map(gastos.map((g) => [g.id, g.valor]));
    const limites = db.orcamentos || {};
    const ids = new Set([...Object.keys(limites).filter((id) => limites[id] > 0 && categoria(id)), ...gastos.map((g) => g.id)]);
    let orcado = 0;
    let gastoOrcado = 0;
    const itens = [...ids].map((id) => {
      const lim = limites[id] || 0;
      const gasto = porCat.get(id) || 0;
      if (lim) { orcado += lim; gastoOrcado += gasto; }
      return { id, cat: categoria(id), lim, gasto, pct: lim ? gasto / lim : null };
    }).sort((a, b) => (b.pct == null ? -1 : b.pct) - (a.pct == null ? -1 : a.pct) || b.gasto - a.gasto);

    const temLimite = itens.some((i) => i.lim);
    const resta = round2(orcado - gastoOrcado);
    const rows = itens.map((i) => {
      let cls = '';
      let sub = 'Sem limite definido';
      if (i.lim) {
        const r = round2(i.lim - i.gasto);
        if (r < 0) { cls = 'over'; sub = `Passou ${fmtMoney(-r)} do limite`; } else {
          if (i.pct >= 0.8) cls = 'warn';
          sub = `Restam ${fmtMoney(r)}`;
        }
      }
      const w = i.lim ? Math.min(100, i.pct * 100) : 0;
      return `<li class="bar-row ${cls}">
          <div class="bar-top"><span class="nome">${catDot(i.cat)}<span>${esc(i.cat ? i.cat.nome : 'Sem categoria')}</span></span>
            <span class="val"><b>${fmtMoney(i.gasto)}</b>${i.lim ? ` de ${fmtMoney(i.lim)}` : ''}</span></div>
          ${i.lim ? `<div class="track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(i.pct * 100)}"
            aria-label="${esc(i.cat ? i.cat.nome : '')}"><div class="fill" style="width:${w.toFixed(1)}%"></div></div>` : ''}
          <span class="bar-sub">${i.lim ? `${Math.round(i.pct * 100)}% · ` : ''}${sub}</span>
        </li>`;
    }).join('');

    return pageHead('Orçamento', 'Quanto você quer gastar por mês em cada categoria', periodoMes()
      + `<button type="button" class="btn${temLimite ? '' : ' primary'}" data-act="limites">Definir limites</button>`) + `
      ${temLimite ? `<div class="stats">
        ${stat('Orçado no mês', fmtMoney(orcado))}
        ${stat('Gasto nessas categorias', fmtMoney(gastoOrcado), orcado ? `${Math.round((gastoOrcado / orcado) * 100)}% do orçado` : '')}
        ${stat(resta < 0 ? 'Passou do orçado' : 'Ainda pode gastar', fmtMoney(Math.abs(resta)), '', resta < 0 ? 'neg' : 'pos')}
        ${mes === hoje().slice(0, 7)
    ? stat('Dias até o fim do mês', String(daysUntil(fimDoMes(mes)) + 1), resta > 0 ? `${fmtMoney(resta / (daysUntil(fimDoMes(mes)) + 1))} por dia` : '')
    : stat('Categorias que estouraram', String(itens.filter((i) => i.lim && i.gasto > i.lim).length), `de ${itens.filter((i) => i.lim).length} com limite`)}
      </div>` : `<div class="banner"><p>Defina um limite mensal para as categorias que você quer controlar (por exemplo, Alimentação e Lazer).
        O site avisa quando passar de 80% e quando estourar.</p></div>`}
      <section class="section card">
        <div class="section-head"><h2>Por categoria</h2></div>
        ${rows ? `<ul class="bars">${rows}</ul>` : '<div class="empty-box"><p>Nenhuma despesa neste mês.</p></div>'}
      </section>`;
  }

  // Balanço
  const MESES_FATURA = 12;

  function caixaDasContas() {
    return round2(contasAtivas().filter((c) => !['cartao', 'investimento'].includes(c.tipo)).reduce((s, c) => s + saldoConta(c), 0));
  }

  function resumoBalancoHtml() {
    const b = Calc.balanco({ caixa: caixaDasContas(), acertos: db.acertos, faturas: db.faturas, mesAtual: hoje().slice(0, 7) });
    const cls = (v) => (v < 0 ? 'neg' : 'pos');
    return `<div class="stats stats-2">
        ${stat('Saldo atual', fmtMoney(b.saldoAtual), 'Caixa menos o que vence agora', cls(b.saldoAtual))}
        ${stat('Saldo total', fmtMoney(b.saldoTotal), 'Contando todas as parcelas', cls(b.saldoTotal))}
      </div>
      <section class="section card">
        <div class="table-wrap"><table class="table">
          <thead><tr><th></th><th class="num">Atual</th><th class="num">Total</th></tr></thead>
          <tbody>
            <tr><th>Caixa</th><td class="num">${fmtMoney(b.caixaAtual)}</td><td class="num">${fmtMoney(b.caixaTotal)}</td></tr>
            <tr><th>Dívidas</th><td class="num">${fmtMoney(b.dividasAtual)}</td><td class="num">${fmtMoney(b.dividasTotal)}</td></tr>
          </tbody>
        </table></div>
        <p class="muted small nota">O caixa é a soma das suas <a href="#/ajustes">contas</a>, sem cartão de crédito e investimento.
          No total, ele soma também tudo o que vão te pagar. Nas dívidas, “atual” é a fatura do próximo mês e uma parcela de cada credor;
          “total” é tudo o que falta pagar.</p>
      </section>`;
  }

  function projecaoAtual() {
    return Calc.projecao({ caixa: caixaDasContas(), faturas: db.faturas, mesAtual: hoje().slice(0, 7), meses: MESES_FATURA });
  }

  function faturasHtml() {
    const linhas = projecaoAtual().map((p) => `<tr>
        <th>${fmtMonth(p.mes)}</th>
        <td class="celula-valor"><span class="input-affix"><i>R$</i><input data-fatura="${p.mes}" inputmode="decimal"
          value="${esc(p.fatura ? toInput(p.fatura) : '')}" placeholder="0,00" aria-label="Fatura de ${fmtMonth(p.mes)}"></span></td>
        <td class="num ${p.caixa < 0 ? 'neg-text' : ''}" data-caixa="${p.mes}">${fmtMoney(p.caixa)}</td>
      </tr>`).join('');
    return `<div class="table-wrap"><table class="table tabela-faturas">
        <thead><tr><th>Mês</th><th>Fatura</th><th class="num">Caixa futuro</th></tr></thead>
        <tbody>${linhas}</tbody>
      </table></div>`;
  }

  function listaAcertosHtml(tipo) {
    const lista = db.acertos.filter((a) => a.tipo === tipo).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    const total = round2(lista.reduce((s, a) => s + a.valor * a.parcelas, 0));
    const titulo = tipo === 'devedor' ? 'Quem te deve' : 'A quem você deve';
    const linhas = lista.map((a) => {
      const partes = [];
      if (a.descricao) partes.push(esc(a.descricao));
      partes.push(a.parcelas > 1 ? `${a.parcelas} parcelas de ${fmtMoney(a.valor)}` : '1 parcela');
      return `<li class="list-row clickable" data-act="acerto" data-id="${esc(a.id)}" tabindex="0">
          <div class="grow"><strong>${esc(a.nome)}</strong><small>${partes.join(' · ')}</small></div>
          <span class="valor">${fmtMoney(round2(a.valor * a.parcelas))}</span>
        </li>`;
    }).join('');
    return `<section class="section card">
        <div class="section-head"><h2>${titulo}</h2>
          <button type="button" class="btn small" data-act="novo-acerto" data-k="${tipo}">${ICON.plus} Adicionar</button></div>
        ${linhas ? `<ul class="list">${linhas}</ul>
          <p class="total-lista"><span class="muted">Total</span> <b class="valor">${fmtMoney(total)}</b></p>`
    : `<div class="empty-box"><p>${tipo === 'devedor' ? 'Ninguém te deve no momento.' : 'Você não deve a ninguém no momento.'}</p></div>`}
      </section>`;
  }

  function renderBalanco() {
    return pageHead('Balanço', 'O que você tem, o que deve e o que vão te pagar') + `
      <div id="balResumo">${resumoBalancoHtml()}</div>
      <section class="section card">
        <div class="section-head"><h2>Faturas e caixa futuro</h2></div>
        ${faturasHtml()}
      </section>
      <div class="two-col">${listaAcertosHtml('devedor')}${listaAcertosHtml('credor')}</div>`;
  }

  function salvarFatura(input) {
    const v = parseNum(input.value);
    const mesFatura = input.dataset.fatura;
    const id = `fatura-${mesFatura}`;
    const atual = db.faturas.find((f) => f.id === id);
    if (Number.isNaN(v) || (v != null && v < 0)) {
      toast('Valor inválido. Use, por exemplo, 1.250,90');
      input.value = atual ? toInput(atual.valor) : '';
      return;
    }
    if (!v) db.faturas = db.faturas.filter((f) => f.id !== id);
    else if (atual) atual.valor = round2(v);
    else db.faturas.push({ id, mes: mesFatura, valor: round2(v) });
    input.value = v ? toInput(round2(v)) : '';
    salvar();
    // Só os números mudam: o campo seguinte não pode perder o foco
    $('#balResumo').innerHTML = resumoBalancoHtml();
    projecaoAtual().forEach((p) => {
      const c = $(`[data-caixa="${p.mes}"]`);
      c.textContent = fmtMoney(p.caixa);
      c.classList.toggle('neg-text', p.caixa < 0);
    });
  }

  function formAcerto(a, tipo) {
    const novo = !a;
    const x = a || { nome: '', valor: '', descricao: '', parcelas: 1 };
    const quem = tipo === 'devedor' ? 'Quem te deve' : 'A quem você deve';
    abrir(`${dlgHead(`${novo ? 'Adicionar' : 'Editar'}: ${quem.toLowerCase()}`)}
      <div class="fields">
        <label class="field"><span>Nome</span><input name="nome" maxlength="60" value="${esc(x.nome)}" autofocus required></label>
        <label class="field half"><span>Valor de cada parcela</span><span class="input-affix"><i>R$</i><input name="valor" inputmode="decimal" value="${esc(toInput(x.valor))}" placeholder="0,00" required></span></label>
        <label class="field half"><span>Parcelas que faltam</span><input name="parcelas" type="number" inputmode="numeric" min="1" max="999" step="1" value="${esc(x.parcelas)}" required></label>
        <label class="field"><span>Descrição</span><input name="descricao" maxlength="120" value="${esc(x.descricao)}"></label>
      </div>
      <div class="dlg-actions">
        ${novo ? '' : '<button type="button" class="btn danger-ghost" data-dlg="excluir">Excluir</button>'}
        <span class="spacer"></span>
        <button type="button" class="btn" data-dlg="fechar">Cancelar</button>
        <button type="submit" class="btn primary">Salvar</button>
      </div>`, () => {
      const f = form.elements;
      const nome = f.nome.value.trim();
      if (!nome) throw new Error('Informe o nome.');
      const valor = lerValor('valor', { obrigatorio: true });
      if (!(valor > 0)) throw new Error('O valor precisa ser maior que zero.');
      const parcelas = Number(f.parcelas.value);
      if (!Number.isInteger(parcelas) || parcelas < 1) throw new Error('Informe quantas parcelas faltam (1 ou mais).');
      const dados = { tipo, nome, valor: round2(valor), parcelas, descricao: f.descricao.value.trim() };
      if (novo) db.acertos.push({ id: Store.uid(), ...dados });
      else {
        const alvo = db.acertos.find((o) => o.id === a.id);
        if (!alvo) throw new Error('Este registro foi excluído em outro aparelho.');
        Object.assign(alvo, dados);
      }
      salvar();
      render();
      toast('Salvo.');
      return true;
    }, async (k) => {
      if (k !== 'excluir') return;
      const ok = await confirmar('Excluir', `Excluir “${esc(a.nome)}”?`, [{ label: 'Excluir', value: true, cls: 'danger' }]);
      if (!ok) return;
      db.acertos = db.acertos.filter((o) => o.id !== a.id);
      salvar();
      render();
      toast('Excluído.');
    });
  }

  // Investir
  const usdFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'USD' });
  const fmtMult = (v) => (v == null ? '—' : v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  const fmtTaxa = (v) => (v == null ? '—' : `${(v * 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`);
  const horaDe = (t) => new Date(t).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  const taxaInput = (v) => (v == null ? '' : String(Number((v * 100).toFixed(6))).replace('.', ','));

  const mercado = { btcBusca: false, btcErro: false, jurosBusca: false, jurosErro: false, dataTaxa: null, dataErro: false };
  // Taxas do conversor, em fração. "origem": de onde veio a taxa (selic, cdi ou digitada).
  const conversor = { anual: null, mensal: null, diario: null, origem: null };

  const alvoMayer = () => (db.config.mayer_alvo > 0 ? db.config.mayer_alvo : 1.5);
  const irPct = () => (db.config.ir >= 0 ? db.config.ir : 17.5);
  function somaInvestimentos() {
    return round2(contasAtivas().filter((c) => c.tipo === 'investimento').reduce((s, c) => s + saldoConta(c), 0));
  }
  const valorInvestido = () => (db.config.valor_investido >= 0 ? db.config.valor_investido : somaInvestimentos());

  function usarTaxa(chave) {
    const j = Mercado.jurosGuardados();
    if (!j || j[chave] == null) return;
    Object.assign(conversor, Calc.deAnual(j[chave]), { origem: chave });
  }

  // A taxa escolhida ou, se ela faltar, a outra (a planilha parte da Selic)
  function usarTaxaDisponivel() {
    const preferida = conversor.origem === 'cdi' ? 'cdi' : 'selic';
    const j = Mercado.jurosGuardados() || {};
    usarTaxa(j[preferida] != null ? preferida : (preferida === 'cdi' ? 'selic' : 'cdi'));
  }

  function mayerHtml() {
    const b = Mercado.bitcoinGuardado();
    if (!b) {
      return `<div class="empty-box"><p>${mercado.btcErro ? 'Não foi possível buscar a cotação. Confira a internet e toque em Atualizar.' : 'Buscando a cotação…'}</p></div>`;
    }
    const alvo = alvoMayer();
    const coluna = (titulo, d, fmt) => {
      const m = Calc.mayer({ preco: d.preco, media: d.media, alvo });
      return `<div class="moeda"><h3>${titulo}</h3><table class="table"><tbody>
          <tr><th>Mayer Multiple</th><td class="num">${fmtMult(m.mayer)}</td></tr>
          <tr><th>Bitcoin hoje</th><td class="num">${fmt(d.preco)}</td></tr>
          <tr><th>Média de 200 dias</th><td class="num">${fmt(d.media)}</td></tr>
          <tr><th>Bitcoin no múltiplo ${fmtMult(alvo)}</th><td class="num"><b>${fmt(m.futuro)}</b></td></tr>
        </tbody></table></div>`;
    };
    return `<div class="moedas">${coluna('Em dólar (US$)', b.usd, (v) => usdFmt.format(v))}${coluna('Em real (R$)', b.brl, fmtMoney)}</div>
      <p class="muted small nota">${mercado.btcErro ? 'Sem conexão com a cotação: valores' : 'Valores'} de ${horaDe(b.em)}.</p>`;
  }

  function jurosHtml() {
    const j = Mercado.jurosGuardados();
    if (!j || (j.selic == null && j.cdi == null)) {
      return `<div class="empty-box"><p>${mercado.jurosErro ? 'Não foi possível buscar a Selic e o CDI. Você pode digitar a taxa abaixo.' : 'Buscando as taxas…'}</p></div>`;
    }
    const data = db.config.data_juros;
    const t = mercado.dataTaxa;
    const linhaData = !data ? '' : `<tr><th>${fmtDate(data)}</th>
        ${t ? `<td class="num">${fmtTaxa(t.selic)}</td><td class="num">${fmtTaxa(t.cdi)}</td>`
    : `<td class="num muted" colspan="2">${mercado.dataErro ? 'sem dados' : 'buscando…'}</td>`}</tr>`;
    return `<div class="table-wrap"><table class="table">
        <thead><tr><th>Data</th><th class="num">Selic</th><th class="num">CDI</th></tr></thead>
        <tbody><tr><th>Hoje</th><td class="num">${fmtTaxa(j.selic)}</td><td class="num">${fmtTaxa(j.cdi)}</td></tr>${linhaData}</tbody>
      </table></div>
      <p class="muted small nota">${mercado.jurosErro ? 'Sem conexão com o Banco Central: taxas' : 'Fonte: Banco Central. Taxas ao ano, buscadas'} em ${horaDe(j.em)}.</p>`;
  }

  function rendimentoHtml() {
    if (conversor.mensal == null) return '<p class="muted small nota">Informe uma taxa para ver o rendimento.</p>';
    const r = Calc.rendimento({ valor: valorInvestido(), mensal: conversor.mensal, ir: irPct() / 100 });
    return `<div class="stats stats-2">
        ${stat('Rendimento mensal', fmtMoney(r.liquido), `Já descontado ${fmtNum(irPct())}% de IR`, 'pos')}
        ${stat('Variação no mês', `${(r.variacao * 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`, 'Sobre o valor investido')}
      </div>`;
  }

  function atualizarCaixa(id, html) {
    const el = $(id);
    if (el) el.innerHTML = html;
  }

  function mostrarTaxas() {
    ['anual', 'mensal', 'diario'].forEach((k) => {
      const i = $(`[data-taxa="${k}"]`);
      if (i && i !== document.activeElement) i.value = taxaInput(conversor[k]);
    });
    atualizarCaixa('#rendBox', rendimentoHtml());
    $$('[data-act="usar-taxa"]').forEach((b) => b.classList.toggle('on', b.dataset.k === conversor.origem));
  }

  async function buscarTaxaDaData() {
    const data = db.config.data_juros;
    mercado.dataTaxa = null;
    mercado.dataErro = false;
    if (!data) return;
    try {
      const t = await Mercado.jurosEm(data);
      if (db.config.data_juros === data) mercado.dataTaxa = t;
    } catch (e) {
      mercado.dataErro = true;
    }
    if (current === 'investir') atualizarCaixa('#jurosBox', jurosHtml());
  }

  async function buscarBitcoin(forcar) {
    if (mercado.btcBusca || (!forcar && !Mercado.bitcoinVencido())) return;
    mercado.btcBusca = true;
    try {
      await Mercado.atualizarBitcoin();
      mercado.btcErro = false;
    } catch (e) {
      mercado.btcErro = true;
    }
    mercado.btcBusca = false;
    if (current === 'investir') atualizarCaixa('#mayerBox', mayerHtml());
  }

  async function buscarJuros(forcar) {
    if (mercado.jurosBusca || (!forcar && !Mercado.jurosVencidos())) return;
    mercado.jurosBusca = true;
    try {
      await Mercado.atualizarJuros();
      mercado.jurosErro = false;
      if (conversor.origem !== 'digitada') usarTaxaDisponivel();
    } catch (e) {
      mercado.jurosErro = true;
    }
    mercado.jurosBusca = false;
    if (current === 'investir') {
      atualizarCaixa('#jurosBox', jurosHtml());
      mostrarTaxas();
    }
  }

  function renderInvestir() {
    if (!conversor.origem) usarTaxaDisponivel();
    const cfg = db.config;
    const html = pageHead('Investir', 'Bitcoin, juros e rendimento', `<button type="button" class="btn" data-act="atualizar-mercado">${ICON.sync} Atualizar</button>`) + `
      <section class="section card">
        <div class="section-head"><h2>Mayer Multiple do Bitcoin</h2></div>
        <div id="mayerBox">${mayerHtml()}</div>
        <div class="campos-linha">
          <label class="field"><span>Múltiplo alvo</span><input data-config="mayer_alvo" inputmode="decimal" value="${esc(toInput(alvoMayer()))}"></label>
        </div>
        <p class="muted small nota">Mayer Multiple é o preço de hoje dividido pela média de 200 dias. O preço no múltiplo alvo é essa média vezes o alvo.</p>
      </section>
      <section class="section card">
        <div class="section-head"><h2>Selic e CDI</h2></div>
        <div id="jurosBox">${jurosHtml()}</div>
        <div class="campos-linha">
          <label class="field"><span>Comparar com a data</span><input id="dataJuros" type="date" max="${hoje()}" value="${esc(cfg.data_juros || '')}"></label>
        </div>
      </section>
      <section class="section card">
        <div class="section-head"><h2>Conversor de juros</h2>
          <div class="btn-row"><button type="button" class="btn small" data-act="usar-taxa" data-k="selic">Usar Selic</button>
            <button type="button" class="btn small" data-act="usar-taxa" data-k="cdi">Usar CDI</button></div></div>
        <div class="campos-linha tres">
          <label class="field"><span>Ao ano (%)</span><input data-taxa="anual" inputmode="decimal" value="${taxaInput(conversor.anual)}"></label>
          <label class="field"><span>Ao mês (%)</span><input data-taxa="mensal" inputmode="decimal" value="${taxaInput(conversor.mensal)}"></label>
          <label class="field"><span>Ao dia (%)</span><input data-taxa="diario" inputmode="decimal" value="${taxaInput(conversor.diario)}"></label>
        </div>
        <p class="muted small nota">Digite em qualquer campo e os outros se ajustam.</p>
      </section>
      <section class="section card">
        <div class="section-head"><h2>Rendimento</h2></div>
        <div class="campos-linha">
          <label class="field"><span>Valor investido</span><span class="input-affix"><i>R$</i><input data-config="valor_investido" inputmode="decimal" value="${esc(toInput(valorInvestido()))}" placeholder="0,00"></span></label>
          <label class="field"><span>Imposto de renda (%)</span><input data-config="ir" inputmode="decimal" value="${esc(toInput(irPct()))}"></label>
        </div>
        <p class="muted small nota">Usa a taxa ao mês do conversor. O valor começa com a soma das contas de investimento; se apagar o campo, ele volta a usar essa soma.</p>
        <div id="rendBox">${rendimentoHtml()}</div>
      </section>`;
    buscarBitcoin(false);
    buscarJuros(false);
    if (cfg.data_juros && !mercado.dataTaxa && !mercado.dataErro) buscarTaxaDaData();
    return html;
  }

  const LIMITES_CONFIG = {
    mayer_alvo: { min: 0.01, max: 100, erro: 'Use um múltiplo como 1,50' },
    ir: { min: 0, max: 100, erro: 'Use um percentual de 0 a 100, como 17,5' },
    valor_investido: { min: 0, max: 1e12, erro: 'Use um valor como 1.250,90' },
  };

  function salvarConfig(input) {
    const k = input.dataset.config;
    const v = parseNum(input.value);
    const lim = LIMITES_CONFIG[k];
    if (v == null) delete db.config[k];
    else if (Number.isNaN(v) || v < lim.min || v > lim.max) {
      toast(`Valor inválido. ${lim.erro}.`);
      input.value = toInput(k === 'mayer_alvo' ? alvoMayer() : (k === 'ir' ? irPct() : valorInvestido()));
      return;
    }
    else db.config[k] = v;
    salvar();
    if (v == null) input.value = toInput(k === 'mayer_alvo' ? alvoMayer() : (k === 'ir' ? irPct() : valorInvestido()));
    if (k === 'mayer_alvo') atualizarCaixa('#mayerBox', mayerHtml());
    else atualizarCaixa('#rendBox', rendimentoHtml());
  }

  function digitarTaxa(input) {
    const k = input.dataset.taxa;
    const v = parseNum(input.value);
    if (v == null || Number.isNaN(v) || v < 0 || v > 10000) return;
    const f = v / 100;
    const conv = { anual: Calc.deAnual, mensal: Calc.deMensal, diario: Calc.deDiario }[k];
    Object.assign(conversor, conv(f), { origem: 'digitada' });
    mostrarTaxas();
  }

  // Relatórios
  function dadosAno() {
    return Array.from({ length: 12 }, (_, i) => {
      const ym = `${ano}-${String(i + 1).padStart(2, '0')}`;
      return { ym, i, ...totais(doMes(ym)) };
    });
  }

  function tabelaCategorias(items, total, meses) {
    if (!items.length) return '<div class="empty-box"><p>Nada neste ano.</p></div>';
    return `<div class="table-wrap"><table class="table">
      <thead><tr><th>Categoria</th><th class="num">Total</th><th class="num">%</th><th class="num">Média/mês</th></tr></thead>
      <tbody>${items.map((i) => `<tr><th><span class="nome" style="display:inline-flex;gap:8px;align-items:center">${catDot(i.cat)}${esc(i.cat ? i.cat.nome : 'Sem categoria')}</span></th>
        <td class="num">${fmtMoney(i.valor)}</td><td class="num">${total ? Math.round((i.valor / total) * 100) : 0}%</td>
        <td class="num">${fmtMoney(i.valor / meses)}</td></tr>`).join('')}</tbody>
      <tfoot><tr><th>Total</th><td class="num">${fmtMoney(total)}</td><td class="num">100%</td><td class="num">${fmtMoney(total / meses)}</td></tr></tfoot>
    </table></div>`;
  }

  function renderRelatorios() {
    const d = dadosAno();
    const lancsAno = db.lancamentos.filter((l) => l.data.startsWith(`${ano}-`));
    const t = totais(lancsAno);
    const agora = hoje().slice(0, 7);
    const anoAtual = ano === new Date().getFullYear();
    const meses = anoAtual ? Number(agora.slice(5)) : (ano < new Date().getFullYear() ? 12 : 1);
    let acum = 0;
    const linhas = d.map((m) => {
      acum = round2(acum + m.saldo);
      const vazio = !m.receitas && !m.despesas;
      return `<tr class="clickable${m.ym > agora ? ' futuro' : ''}" data-act="ver-mes" data-ym="${m.ym}" tabindex="0">
          <th>${MESES_CURTOS[m.i]}</th>
          <td class="num">${vazio ? '—' : fmtMoney(m.receitas)}</td><td class="num">${vazio ? '—' : fmtMoney(m.despesas)}</td>
          <td class="num ${m.saldo < 0 ? 'neg-text' : ''}">${vazio ? '—' : fmtMoney(m.saldo)}</td>
          <td class="num ${acum < 0 ? 'neg-text' : ''}">${vazio && m.ym > agora ? '—' : fmtMoney(acum)}</td></tr>`;
    }).join('');

    return pageHead('Relatórios', 'Receitas e despesas de cada mês do ano', periodoAno()) + `
      <div class="stats">
        ${stat('Receitas no ano', fmtMoney(t.receitas), '', 'pos')}
        ${stat('Despesas no ano', fmtMoney(t.despesas))}
        ${stat('Saldo do ano', fmtMoney(t.saldo), t.receitas ? `Guardou ${Math.round((t.saldo / t.receitas) * 100)}% do que recebeu` : '', t.saldo < 0 ? 'neg' : (t.saldo > 0 ? 'pos' : ''))}
        ${stat('Gasto médio por mês', fmtMoney(t.despesas / meses), anoAtual ? `nos ${plural(meses, 'mês', 'meses')} até agora` : '')}
      </div>
      <section class="section card">
        <div class="section-head"><h2>Receitas × despesas</h2></div>
        <div class="legend"><span><i class="r"></i>Receitas</span><span><i class="d"></i>Despesas</span></div>
        <div class="chart" id="grafico" aria-hidden="true"></div>
        <div class="table-wrap" style="margin-top:14px"><table class="table">
          <thead><tr><th>Mês</th><th class="num">Receitas</th><th class="num">Despesas</th><th class="num">Saldo</th><th class="num">Acumulado</th></tr></thead>
          <tbody>${linhas}</tbody>
          <tfoot><tr><th>Ano</th><td class="num">${fmtMoney(t.receitas)}</td><td class="num">${fmtMoney(t.despesas)}</td>
            <td class="num ${t.saldo < 0 ? 'neg-text' : ''}">${fmtMoney(t.saldo)}</td><td class="num"></td></tr></tfoot>
        </table></div>
      </section>
      <div class="two-col">
        <section class="section card"><div class="section-head"><h2>Despesas por categoria</h2></div>
          ${tabelaCategorias(gastosPorCategoria(lancsAno), t.despesas, meses)}</section>
        <section class="section card"><div class="section-head"><h2>Receitas por categoria</h2></div>
          ${tabelaCategorias(receitasPorCategoria(lancsAno), t.receitas, meses)}</section>
      </div>`;
  }

  // Colunas agrupadas, com a largura real da tela (o texto fica sempre legível)
  function barPath(x, y, w, h, r) {
    if (h <= 0) return '';
    const rr = Math.min(r, h, w / 2);
    return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`;
  }

  function niceMax(v) {
    if (v <= 0) return 100;
    const p = 10 ** Math.floor(Math.log10(v));
    const n = v / p;
    const step = [1, 1.2, 1.6, 2, 2.4, 3, 4, 5, 6, 8, 10].find((s) => n <= s);
    return step * p;
  }

  function desenharGrafico() {
    const el = $('#grafico');
    if (!el) return;
    const d = dadosAno();
    const W = Math.max(280, el.clientWidth);
    const H = W < 500 ? 200 : 240;
    const padL = 44;
    const padR = 4;
    const padT = 8;
    const padB = 24;
    const max = niceMax(Math.max(...d.map((m) => Math.max(m.receitas, m.despesas))));
    const plotH = H - padT - padB;
    const gw = (W - padL - padR) / 12;
    const bw = Math.max(4, Math.min(16, gw * 0.32));
    const y = (v) => padT + plotH - (v / max) * plotH;
    const fs = W < 420 ? 10 : 11;

    let grid = '';
    for (let i = 0; i <= 4; i++) {
      const v = (max / 4) * i;
      const yy = y(v);
      grid += `<line x1="${padL}" x2="${W - padR}" y1="${yy}" y2="${yy}"/>`;
      grid += `<text x="${padL - 6}" y="${yy + 4}" text-anchor="end">${v ? compactFmt.format(v) : '0'}</text>`;
    }
    let bars = '';
    let labels = '';
    let hits = '';
    d.forEach((m, i) => {
      const cx = padL + gw * i + gw / 2;
      const hr = (m.receitas / max) * plotH;
      const hd = (m.despesas / max) * plotH;
      bars += `<path class="r" d="${barPath(cx - bw - 1, padT + plotH - hr, bw, hr, 4)}"/>`;
      bars += `<path class="d" d="${barPath(cx + 1, padT + plotH - hd, bw, hd, 4)}"/>`;
      labels += `<text x="${cx}" y="${H - 6}" text-anchor="middle">${MESES_CURTOS[i]}</text>`;
      hits += `<rect class="hit" data-i="${i}" x="${padL + gw * i}" y="${padT}" width="${gw}" height="${plotH}" rx="6"/>`;
    });
    el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" style="font-size:${fs}px">
      <g class="grid">${hits}${grid.replace(/<text[^>]*>[^<]*<\/text>/g, '')}</g>
      <g class="axis">${grid.replace(/<line[^>]*\/>/g, '')}${labels}</g>
      <g>${bars}</g>
      <line x1="${padL}" x2="${W - padR}" y1="${padT + plotH}" y2="${padT + plotH}" stroke="var(--line-strong)"/>
    </svg>`;

    const tip = $('#tip');
    const mostrar = (rect, ev) => {
      const m = d[Number(rect.dataset.i)];
      $$('.hit.on', el).forEach((r) => r.classList.remove('on'));
      rect.classList.add('on');
      tip.innerHTML = `<strong>${fmtMonthLong(m.ym)}</strong>
        <div><span><i class="r"></i>Receitas</span><b>${fmtMoney(m.receitas)}</b></div>
        <div><span><i class="d"></i>Despesas</span><b>${fmtMoney(m.despesas)}</b></div>
        <div><span>Saldo</span><b class="${m.saldo < 0 ? 'neg-text' : ''}">${fmtMoney(m.saldo)}</b></div>`;
      tip.hidden = false;
      const r = rect.getBoundingClientRect();
      const tw = tip.offsetWidth;
      let left = r.left + r.width / 2 - tw / 2;
      left = Math.max(8, Math.min(window.innerWidth - tw - 8, left));
      const top = Math.max(8, (ev && ev.clientY ? ev.clientY : r.top + 40) - tip.offsetHeight - 14);
      tip.style.left = `${left}px`;
      tip.style.top = `${top}px`;
    };
    const esconder = () => {
      tip.hidden = true;
      $$('.hit.on', el).forEach((r) => r.classList.remove('on'));
    };
    $$('.hit', el).forEach((rect) => {
      rect.addEventListener('pointerenter', (ev) => mostrar(rect, ev));
      rect.addEventListener('pointermove', (ev) => { if (ev.pointerType === 'mouse') mostrar(rect, ev); });
      rect.addEventListener('pointerleave', (ev) => { if (ev.pointerType === 'mouse') esconder(); });
      rect.addEventListener('click', (ev) => mostrar(rect, ev));
    });
    el.onpointerleave = (ev) => { if (ev.pointerType === 'mouse') esconder(); };
  }

  // Ajustes
  function precisaCopia() {
    if (Cloud.user || db.lancamentos.length < 15) return false;
    let ultima = null;
    try { ultima = localStorage.getItem(COPIA_KEY); } catch (e) { /* sem armazenamento */ }
    return !ultima || Date.now() - Number(ultima) > 30 * 86400000;
  }

  function renderAjustes() {
    const usos = (catId) => db.lancamentos.filter((l) => l.categoria_id === catId).length;
    const contasHtml = db.contas.map((c) => {
      const s = saldoConta(c);
      return `<li class="list-row clickable${c.arquivada ? ' arquivada' : ''}" data-act="conta" data-id="${esc(c.id)}" tabindex="0">
        <div class="grow"><strong>${esc(c.nome)}</strong><small>${esc(Store.CONTA_TIPOS[c.tipo] || '')}${c.arquivada ? ' · arquivada' : ''}
          · saldo inicial ${fmtMoney(c.saldo_inicial)}</small></div>
        <span class="valor ${s < 0 ? 'neg-text' : ''}">${fmtMoney(s)}</span></li>`;
    }).join('');
    const catList = (tipo) => `<ul class="list cat-list">${catsDo(tipo).map((c) => {
      const n = usos(c.id);
      return `<li class="list-row clickable" data-act="categoria" data-id="${esc(c.id)}" tabindex="0">
        <span class="dot" style="background:${esc(c.cor)}">${esc(c.nome.charAt(0).toUpperCase())}</span>
        <div class="grow"><strong>${esc(c.nome)}</strong><small>${n ? plural(n, 'lançamento', 'lançamentos') : 'sem lançamentos'}${db.orcamentos[c.id] ? ` · limite ${fmtMoney(db.orcamentos[c.id])}/mês` : ''}</small></div></li>`;
    }).join('')}</ul>`;

    let ultima = null;
    try { ultima = localStorage.getItem(COPIA_KEY); } catch (e) { /* sem armazenamento */ }
    const tema = themeChoice;

    return pageHead('Ajustes', 'Conta, contas, categorias, aparência e cópia de segurança') + cardConta() + `
      <section class="section card">
        <div class="section-head"><h2>Contas</h2><button type="button" class="btn small" data-act="nova-conta">${ICON.plus} Nova conta</button></div>
        <p class="muted small">O saldo de cada conta é o saldo inicial mais o que já foi pago ou recebido nela.</p>
        <ul class="list">${contasHtml}</ul>
      </section>

      <section class="section card">
        <div class="section-head"><h2>Categorias</h2><button type="button" class="btn small" data-act="nova-categoria">${ICON.plus} Nova categoria</button></div>
        <div class="two-col">
          <div><h3 class="muted small" style="margin:4px 0">DESPESAS</h3>${catList('despesa')}</div>
          <div><h3 class="muted small" style="margin:4px 0">RECEITAS</h3>${catList('receita')}</div>
        </div>
      </section>

      <div class="two-col">
        <section class="section card">
          <h2>Aparência</h2>
          <div class="seg" role="group" aria-label="Tema">
            ${[['auto', 'Automático'], ['light', 'Claro'], ['dark', 'Escuro']].map(([k, l]) => `<button type="button" data-act="tema" data-k="${k}"
              class="${tema === k ? 'on' : ''}" aria-pressed="${tema === k}">${l}</button>`).join('')}
          </div>
          <p class="muted small" style="margin-top:10px">Automático segue o modo claro/escuro do aparelho.</p>
        </section>

        <section class="section card">
          <h2>Cópia de segurança</h2>
          <p class="muted small">${Cloud.user ? 'Com a conta Google, os dados já ficam guardados na nuvem. A cópia em arquivo é um extra, para guardar onde você quiser.'
    : 'Seus dados ficam só neste aparelho. Baixe uma cópia de vez em quando. Ela também serve para passar os dados do celular para o computador (ou o contrário): baixe num e restaure no outro.'}</p>
          <p class="small">${ultima ? `Última cópia: ${new Date(Number(ultima)).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}` : '<span class="neg-text">Nenhuma cópia feita ainda.</span>'}</p>
          <div class="btn-row">
            <button type="button" class="btn primary" data-act="backup">${ICON.download} Baixar cópia</button>
            <button type="button" class="btn" data-act="csv">${ICON.table} Planilha (.csv)</button>
            <button type="button" class="btn" data-act="restaurar">${ICON.upload} Restaurar</button>
          </div>
        </section>
      </div>

      ${cardApp()}

      <section class="section card">
        <h2>Apagar dados</h2>
        <p class="muted small">Apaga todos os lançamentos, contas, categorias e limites e volta ao começo.${Cloud.user ? ' Como você entrou com Google, apaga também da nuvem e dos outros aparelhos.' : ''}</p>
        <button type="button" class="btn danger-ghost" data-act="apagar-tudo">Apagar tudo</button>
      </section>
      <p class="muted small" style="margin-top:20px">Minhas Finanças · <a href="privacidade.html">Privacidade</a>${Android ? ''
    : ` · <a href="${APK_URL}">Baixar o app Android (.apk)</a>`}</p>`;
  }

  // ---------- Versão nova do app Android ----------
  // As telas se atualizam sozinhas (o app baixa o site publicado). Só mudanças na parte
  // Android pedem instalar um APK novo: aqui o app descobre se há um e avisa.

  const versaoApp = () => (Android && Android.versao ? String(Android.versao()) : '');

  function maisNova(a, b) {
    const pa = a.split('.').map(Number);
    const pb = b.split('.').map(Number);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
      const x = pa[i] || 0;
      const y = pb[i] || 0;
      if (x !== y) return x > y;
    }
    return false;
  }

  function lerAtualizacao() {
    try { return JSON.parse(localStorage.getItem(UPDATE_KEY) || 'null'); } catch (e) { return null; }
  }

  function atualizacaoDisponivel() {
    const u = lerAtualizacao();
    const atual = versaoApp();
    return u && atual && u.versao && maisNova(u.versao, atual) ? u : null;
  }

  // Confere no GitHub no máximo a cada 6 horas (ou na hora, pelo botão em Ajustes)
  async function procurarAtualizacao(manual = false) {
    if (!versaoApp()) return;
    const ult = lerAtualizacao();
    if (!manual && ult && Date.now() - ult.em < 6 * 3600000) return;
    try {
      const r = await fetch(RELEASES_API, { headers: { Accept: 'application/vnd.github+json' } });
      if (!r.ok) throw new Error(String(r.status));
      const j = await r.json();
      const apk = (j.assets || []).find((a) => /\.apk$/i.test(a.name));
      const info = { em: Date.now(), versao: String(j.tag_name || '').replace(/^v/i, ''), url: apk ? apk.browser_download_url : APK_URL };
      try { localStorage.setItem(UPDATE_KEY, JSON.stringify(info)); } catch (e) { /* sem armazenamento */ }
      if (manual) toast(atualizacaoDisponivel() ? `Versão ${info.versao} disponível.` : 'Você já está na versão mais nova.');
      if (current === 'inicio' || current === 'ajustes') render();
    } catch (e) {
      if (manual) toast('Não foi possível procurar atualização (sem internet?).');
    }
  }

  function baixarAtualizacao() {
    const u = atualizacaoDisponivel();
    if (!u || !Android || !Android.abrirNavegador) return;
    Android.abrirNavegador(u.url);
    toast('Quando o download terminar, abra o arquivo e toque em Instalar. Seus dados continuam.', { ms: 7000 });
  }

  function bannerAtualizacao() {
    const u = atualizacaoDisponivel();
    if (!u) return '';
    return `<div class="banner"><p><strong>Versão nova do app: ${esc(u.versao)}.</strong> Baixe e toque em Instalar; seus dados continuam.</p>
      <button type="button" class="btn small primary" data-act="atualizar-app">${ICON.download} Baixar</button></div>`;
  }

  function cardApp() {
    if (!versaoApp()) return '';
    const u = atualizacaoDisponivel();
    return `<section class="section card">
      <h2>App</h2>
      <p class="muted small">Versão ${esc(versaoApp())}. As telas e funções se atualizam sozinhas quando o app abre com internet.
        Quando sai uma versão nova do próprio app, ele avisa aqui e no Início.</p>
      <div class="btn-row">
        ${u ? `<button type="button" class="btn primary" data-act="atualizar-app">${ICON.download} Baixar versão ${esc(u.versao)}</button>` : ''}
        <button type="button" class="btn" data-act="procurar-atualizacao">${ICON.sync} Procurar atualização</button>
      </div>
    </section>`;
  }

  // ---------- Conta e sincronização ----------

  function nomeUsuario(u) {
    const m = u.user_metadata || {};
    return { nome: m.full_name || m.name || u.email || 'Conta Google', foto: m.avatar_url || m.picture || '', email: u.email || '' };
  }

  function avatarHtml(u, cls = '') {
    const { nome, foto } = nomeUsuario(u);
    return foto ? `<img class="avatar ${cls}" src="${esc(foto)}" alt="" referrerpolicy="no-referrer">`
      : `<span class="avatar ${cls}">${esc(nome.charAt(0).toUpperCase())}</span>`;
  }

  function statusTexto() {
    const e = Cloud.estado;
    const hora = e.ultima ? new Date(e.ultima).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
    return {
      ok: `Tudo salvo na nuvem${hora ? ` · ${hora}` : ''}`,
      sincronizando: 'Sincronizando…',
      pendente: 'Mudanças esperando para subir…',
      offline: 'Sem internet: as mudanças sobem para a nuvem quando a conexão voltar.',
      erro: `Não foi possível sincronizar: ${e.erro}`,
    }[e.status] || '';
  }

  const statusHtml = () => `<span class="sync-dot ${Cloud.estado.status}"></span><span>${esc(statusTexto())}</span>`;

  function renderAccount() {
    const el = $('#account');
    const u = Cloud.user;
    if (u) {
      el.innerHTML = `${avatarHtml(u)}<span class="sync-dot ${Cloud.estado.status}"></span>`;
      el.title = `${nomeUsuario(u).nome} · ${statusTexto()}`;
    } else {
      el.innerHTML = ICON.cloud;
      el.title = 'Entrar com Google para guardar na nuvem';
    }
    el.setAttribute('aria-label', el.title);
  }

  function cardConta() {
    const u = Cloud.user;
    if (!u) {
      return `<section class="section card" id="contaCard">
        <h2>Conta e sincronização</h2>
        <p class="muted small">Entre com sua conta Google para guardar as finanças na nuvem e ver as mesmas no celular, no app
          e no computador. Funciona também sem internet: as mudanças sobem quando a conexão voltar. Sem entrar, tudo fica só neste aparelho.</p>
        <button type="button" class="btn google" data-act="entrar"${Cloud.disponivel ? '' : ' disabled'}>${ICON.google} Entrar com Google</button>
        ${Cloud.disponivel ? '' : '<p class="small neg-text" style="margin-top:8px">O login não carregou. Confira a internet e abra de novo.</p>'}
      </section>`;
    }
    const { nome, email } = nomeUsuario(u);
    return `<section class="section card" id="contaCard">
      <h2>Conta e sincronização</h2>
      <div class="conta-card">${avatarHtml(u, 'big')}<div><strong>${esc(nome)}</strong><small>${esc(email)}</small></div></div>
      <p class="sync-status ${Cloud.estado.status}" id="syncStatus">${statusHtml()}</p>
      <div class="btn-row">
        <button type="button" class="btn" data-act="sincronizar">${ICON.sync} Sincronizar agora</button>
        <button type="button" class="btn danger-ghost" data-act="sair">Sair da conta</button>
      </div>
    </section>`;
  }

  async function entrar(btn) {
    btn.disabled = true;
    try {
      await Cloud.entrar();
      if (Android) toast('Continue no navegador e depois volte para o app.', { ms: 5000 });
    } catch (e) {
      toast(e.message || String(e), { ms: 5000 });
    } finally {
      setTimeout(() => { btn.disabled = false; }, 3000);
    }
  }

  async function sair() {
    const escolha = await confirmar('Sair da conta', `As finanças continuam guardadas na nuvem. Neste aparelho, quer manter uma cópia
      (para continuar usando sem conta) ou apagar daqui? Em aparelho de outra pessoa, apague.`, [
      { label: 'Manter aqui', value: 'manter', cls: '' },
      { label: 'Apagar daqui', value: 'apagar', cls: 'danger' },
    ]);
    if (!escolha) return;
    try {
      await Cloud.sair(escolha === 'apagar');
      toast(escolha === 'apagar' ? 'Você saiu. As finanças foram apagadas deste aparelho.' : 'Você saiu da conta.');
    } catch (e) {
      toast(`Não foi possível sair: ${e.message || e}`);
    }
    render();
  }

  // Primeira vez desta conta num aparelho que já tem finanças: o que fazer com os dois lados
  function decidirJuncao(local, nuvem) {
    const desc = (r) => `${plural(r.lancamentos, 'lançamento', 'lançamentos')}${r.ultima ? `, o último em ${fmtDate(r.ultima)}` : ''}`;
    return new Promise((resolve) => {
      let escolha = null;
      abrir(`${dlgHead('Juntar as finanças?')}
        <p class="dlg-text">Este aparelho tem <strong>${desc(local)}</strong> e a sua conta na nuvem tem <strong>${desc(nuvem)}</strong>.</p>
        <div class="escolha">
          <button type="button" class="btn primary" data-dlg="e" data-v="juntar">Juntar os dois<small>Fica tudo: o que está aqui e o que está na nuvem</small></button>
          <button type="button" class="btn" data-dlg="e" data-v="nuvem">Usar só os da nuvem<small>Os deste aparelho são descartados</small></button>
          <button type="button" class="btn" data-dlg="e" data-v="aparelho">Usar só os deste aparelho<small>Os da nuvem são substituídos por estes</small></button>
        </div>
        <div class="dlg-actions"><span class="spacer"></span><button type="button" class="btn ghost" data-dlg="fechar">Cancelar login</button></div>`,
      () => false, (k, b) => {
        if (k === 'e') {
          escolha = b.dataset.v;
          dlg.close();
        }
      });
      dlg.addEventListener('close', () => resolve(escolha), { once: true });
    });
  }

  // ---------- Formulários ----------

  function abrir(html, onSubmit, onClick) {
    form.innerHTML = html;
    form.onsubmit = (e) => {
      e.preventDefault();
      const err = $('.form-error', form);
      if (err) err.remove();
      try {
        if (onSubmit(e) !== false) dlg.close();
      } catch (ex) {
        mostrarErro(ex.message || String(ex));
      }
    };
    form.onclick = (e) => {
      const b = e.target.closest('[data-dlg]');
      if (!b) return;
      if (b.dataset.dlg === 'fechar') { dlg.close(); return; }
      if (onClick) onClick(b.dataset.dlg, b, e);
    };
    if (!dlg.open) dlg.showModal();
    const first = $('[autofocus]', form);
    if (first && !matchMedia('(pointer: coarse)').matches) first.focus();
  }

  function mostrarErro(msg) {
    const old = $('.form-error', form);
    if (old) old.remove();
    const p = document.createElement('p');
    p.className = 'form-error';
    p.textContent = msg;
    $('.dlg-actions', form).before(p);
  }

  const dlgHead = (titulo) => `<div class="dlg-head"><h2>${titulo}</h2>
      <button type="button" class="icon" data-dlg="fechar" aria-label="Fechar">${ICON.close}</button></div>`;

  function confirmar(titulo, texto, botoes) {
    return new Promise((resolve) => {
      let escolha = null;
      abrir(`${dlgHead(titulo)}<p class="dlg-text">${texto}</p>
        <div class="dlg-actions"><span class="spacer"></span>
          <button type="button" class="btn" data-dlg="fechar">Cancelar</button>
          ${botoes.map((b, i) => `<button type="button" class="btn ${b.cls || 'primary'}" data-dlg="b" data-i="${i}">${b.label}</button>`).join('')}
        </div>`, () => true, (k, b) => {
        if (k === 'b') {
          escolha = botoes[Number(b.dataset.i)].value;
          dlg.close();
        }
      });
      dlg.addEventListener('close', () => resolve(escolha), { once: true });
    });
  }

  function lerValor(name, { obrigatorio = false, positivo = false } = {}) {
    const raw = form.elements[name].value;
    const v = parseNum(raw);
    if (v == null) {
      if (obrigatorio) throw new Error('Informe o valor.');
      return 0;
    }
    if (Number.isNaN(v)) throw new Error(`Valor inválido: "${raw}". Use, por exemplo, 1.250,90`);
    if (positivo && v <= 0) throw new Error('O valor precisa ser maior que zero.');
    return round2(v);
  }

  const opcoesContas = (sel) => contasAtivas().concat(db.contas.filter((c) => c.arquivada && c.id === sel))
    .map((c) => `<option value="${esc(c.id)}"${c.id === sel ? ' selected' : ''}>${esc(c.nome)}</option>`).join('');
  const opcoesCats = (tipo, sel) => catsDo(tipo).map((c) => `<option value="${esc(c.id)}"${c.id === sel ? ' selected' : ''}>${esc(c.nome)}</option>`).join('');

  // Lançamento novo ou editado
  function formLancamento(l, tipoInicial) {
    const novo = !l;
    const x = l || {
      tipo: tipoInicial || 'despesa', descricao: '', pessoa: '', valor: '', data: mes === hoje().slice(0, 7) ? hoje() : `${mes}-01`,
      categoria_id: null, conta_id: (contasAtivas()[0] || {}).id, conta_destino_id: (contasAtivas()[1] || {}).id, pago: true, obs: '',
    };
    let tipo = x.tipo;
    const proximos = l && l.grupo ? db.lancamentos.filter((o) => o.grupo === l.grupo && o.data > l.data) : [];
    const descricoes = [...new Set(ordenar(db.lancamentos).map((o) => o.descricao).filter(Boolean))].slice(0, 200);
    const pessoas = [...new Set(ordenar(db.lancamentos).map((o) => o.pessoa).filter(Boolean))].slice(0, 200);

    abrir(`${dlgHead(novo ? 'Novo lançamento' : 'Editar lançamento')}
      <div class="fields">
        <div class="seg full" role="group" aria-label="Tipo">
          ${Object.entries(TIPOS).map(([k, label]) => `<button type="button" data-dlg="tipo" data-k="${k}" class="t-${k}${k === tipo ? ' on' : ''}" aria-pressed="${k === tipo}">${label}</button>`).join('')}
        </div>
        <label class="field"><span>Valor</span>
          <span class="input-affix valor-grande"><i>R$</i><input name="valor" inputmode="decimal" autocomplete="off" placeholder="0,00" value="${esc(toInput(x.valor))}" autofocus required></span></label>
        <label class="field"><span>Descrição</span>
          <input name="descricao" list="descList" maxlength="120" autocomplete="off" placeholder="Ex.: Mercado, Aluguel, Salário" value="${esc(x.descricao)}"></label>
        <datalist id="descList">${descricoes.map((d) => `<option value="${esc(d)}">`).join('')}</datalist>
        <label class="field"><span>Pessoa</span>
          <input name="pessoa" list="pessoaList" maxlength="80" autocomplete="off" placeholder="Nome da pessoa (opcional)" value="${esc(x.pessoa || '')}"></label>
        <datalist id="pessoaList">${pessoas.map((p) => `<option value="${esc(p)}">`).join('')}</datalist>
        <label class="field half" data-so="cat"><span>Categoria</span><select name="categoria_id"></select></label>
        <label class="field half"><span>Data</span><input type="date" name="data" value="${esc(x.data)}" required></label>
        <label class="field half"><span data-txt="conta">Conta</span><select name="conta_id">${opcoesContas(x.conta_id)}</select></label>
        <label class="field half" data-so="transf"><span>Para a conta</span><select name="conta_destino_id">${opcoesContas(x.conta_destino_id)}</select></label>
        <label class="check"><input type="checkbox" name="pago"${x.pago ? ' checked' : ''}><span data-txt="pago">Já foi pago</span></label>
        ${novo ? `<div class="fields" style="grid-column:1/-1">
          <label class="field half"><span>Repetir</span><select name="repetir">
            <option value="nao">Não repete</option><option value="parcelado">Parcelado</option><option value="mensal">Todo mês</option></select></label>
          <label class="field half" data-so="rep"><span>Quantas vezes</span><input name="vezes" type="number" min="2" max="120" value="12" inputmode="numeric"></label>
          <p class="hint" data-so="rep" id="repHint" style="grid-column:1/-1;margin:0"></p>
        </div>` : ''}
        ${proximos.length ? `<label class="check"><input type="checkbox" name="proximos">
          <span>Mudar também ${proximos.length === 1 ? 'a próxima' : `as ${proximos.length} próximas`} (${l.rep === 'mensal' ? 'repetições' : 'parcelas'}): descrição, pessoa, valor, categoria e conta</span></label>` : ''}
        <label class="field"><span>Observação</span><textarea name="obs" rows="2" maxlength="500">${esc(x.obs || '')}</textarea></label>
      </div>
      <div class="dlg-actions">
        ${novo ? '' : '<button type="button" class="btn danger-ghost" data-dlg="excluir">Excluir</button>'}
        <span class="spacer"></span>
        <button type="button" class="btn" data-dlg="fechar">Cancelar</button>
        <button type="submit" class="btn primary">Salvar</button>
      </div>`, () => {
      const valor = lerValor('valor', { obrigatorio: true, positivo: true });
      const f = form.elements;
      const data = f.data.value;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) throw new Error('Informe a data.');
      const base = {
        tipo,
        descricao: f.descricao.value.trim(),
        pessoa: f.pessoa.value.trim(),
        categoria_id: tipo === 'transferencia' ? null : f.categoria_id.value || null,
        conta_id: f.conta_id.value || null,
        conta_destino_id: tipo === 'transferencia' ? f.conta_destino_id.value || null : null,
        pago: f.pago.checked,
        obs: f.obs.value.trim(),
      };
      if (!base.conta_id) throw new Error('Cadastre uma conta em Ajustes primeiro.');
      if (tipo !== 'transferencia' && !base.categoria_id) throw new Error('Escolha a categoria.');
      if (tipo === 'transferencia' && base.conta_id === base.conta_destino_id) throw new Error('Escolha contas diferentes para a transferência.');

      if (novo) {
        const rep = f.repetir.value;
        const n = rep === 'nao' ? 1 : Math.round(Number(f.vezes.value));
        if (rep !== 'nao' && !(n >= 2 && n <= 120)) throw new Error('Quantas vezes: de 2 a 120.');
        const grupo = n > 1 ? Store.uid() : null;
        const parcela = rep === 'parcelado' ? round2(Math.floor((valor / n) * 100) / 100) : valor;
        const primeira = rep === 'parcelado' ? round2(valor - parcela * (n - 1)) : valor;
        for (let i = 0; i < n; i++) {
          const item = { id: Store.uid(), ...base, valor: i === 0 ? primeira : parcela, data: addMonthsDate(data, i) };
          if (i > 0) item.pago = false;
          if (grupo) Object.assign(item, { grupo, parcela: i + 1, parcelas: n, rep: rep === 'mensal' ? 'mensal' : 'parcela' });
          db.lancamentos.push(item);
        }
        salvar();
        toast(n > 1 ? `${n} lançamentos criados (${rep === 'mensal' ? 'todo mês' : 'parcelas'}).` : 'Lançamento salvo.');
      } else {
        // Busca de novo: os dados podem ter sido atualizados pela nuvem com o formulário aberto
        const alvo = db.lancamentos.find((o) => o.id === l.id);
        if (!alvo) throw new Error('Este lançamento foi excluído em outro aparelho.');
        Object.assign(alvo, base, { valor, data });
        if (f.proximos && f.proximos.checked) {
          db.lancamentos.filter((o) => o.grupo === l.grupo && o.data > l.data).forEach((o) => Object.assign(o, {
            tipo, descricao: base.descricao, pessoa: base.pessoa, valor, categoria_id: base.categoria_id, conta_id: base.conta_id, conta_destino_id: base.conta_destino_id,
          }));
        }
        salvar();
        toast('Lançamento atualizado.');
      }
      render();
      return true;
    }, (k, b) => {
      if (k === 'tipo') { tipo = b.dataset.k; atualizarTipo(); }
      if (k === 'excluir') excluirLancamento(l);
    });

    let catTocada = !novo;
    const f = form.elements;
    function atualizarTipo() {
      $$('[data-dlg="tipo"]', form).forEach((b) => {
        b.classList.toggle('on', b.dataset.k === tipo);
        b.setAttribute('aria-pressed', String(b.dataset.k === tipo));
      });
      const transf = tipo === 'transferencia';
      $('[data-so="cat"]', form).hidden = transf;
      $('[data-so="transf"]', form).hidden = !transf;
      $('[data-txt="conta"]', form).textContent = transf ? 'Da conta' : (tipo === 'receita' ? 'Entra na conta' : 'Sai da conta');
      $('[data-txt="pago"]', form).textContent = transf ? 'Já foi feita' : (tipo === 'receita' ? 'Já foi recebido' : 'Já foi pago');
      if (!transf) {
        const atual = f.categoria_id.value || x.categoria_id;
        f.categoria_id.innerHTML = `<option value="">Escolha…</option>${opcoesCats(tipo, atual)}`;
      }
    }
    function atualizarRep() {
      if (!f.repetir) return;
      const rep = f.repetir.value;
      $$('[data-so="rep"]', form).forEach((el) => { el.hidden = rep === 'nao'; });
      const n = Math.round(Number(f.vezes.value)) || 0;
      const v = parseNum(f.valor.value);
      const hint = $('#repHint');
      if (rep === 'parcelado') {
        hint.textContent = v > 0 && n >= 2 ? `${n} parcelas de ${fmtMoney(Math.floor((v / n) * 100) / 100)}, uma por mês (o valor acima é o total).` : 'O valor acima é o total; ele é dividido nas parcelas, uma por mês.';
      } else if (rep === 'mensal') {
        hint.textContent = `O mesmo valor em ${n >= 2 ? `${n} meses seguidos` : 'cada mês'}. Só o primeiro fica marcado como pago.`;
      }
    }
    atualizarTipo();
    atualizarRep();
    if (f.repetir) {
      f.repetir.addEventListener('change', atualizarRep);
      f.vezes.addEventListener('input', atualizarRep);
      f.valor.addEventListener('input', atualizarRep);
    }
    f.categoria_id.addEventListener('change', () => { catTocada = true; });
    // Ao repetir uma descrição já usada, sugere a mesma categoria e conta
    f.descricao.addEventListener('change', () => {
      if (!novo || catTocada) return;
      const d = f.descricao.value.trim().toLowerCase();
      const ant = ordenar(db.lancamentos).find((o) => o.descricao && o.descricao.toLowerCase() === d && o.tipo === tipo);
      if (!ant) return;
      if (ant.categoria_id && categoria(ant.categoria_id)) f.categoria_id.value = ant.categoria_id;
      if (ant.conta_id && conta(ant.conta_id) && !conta(ant.conta_id).arquivada) f.conta_id.value = ant.conta_id;
    });
  }

  function guardarDesfazer() {
    const snap = JSON.stringify(db);
    return () => {
      db = Store.substituir(JSON.parse(snap));
      render();
      toast('Desfeito.');
    };
  }

  async function excluirLancamento(l) {
    const proximos = l.grupo ? db.lancamentos.filter((o) => o.grupo === l.grupo && o.data > l.data) : [];
    let escopo = 'este';
    if (proximos.length) {
      escopo = await confirmar('Excluir lançamento', `“${esc(l.descricao || 'Lançamento')}” faz parte de ${l.rep === 'mensal' ? 'uma repetição mensal' : 'um parcelamento'}
        (${l.parcela}/${l.parcelas}). Excluir só este ou também ${proximos.length === 1 ? 'o próximo' : `os ${proximos.length} próximos`}?`, [
        { label: 'Só este', value: 'este', cls: '' },
        { label: 'Este e os próximos', value: 'proximos', cls: 'danger' },
      ]);
      if (!escopo) return;
    } else if (dlg.open) {
      dlg.close();
    }
    const desfazer = guardarDesfazer();
    const ids = new Set([l.id, ...(escopo === 'proximos' ? proximos.map((o) => o.id) : [])]);
    db.lancamentos = db.lancamentos.filter((o) => !ids.has(o.id));
    salvar();
    render();
    toast(ids.size > 1 ? `${ids.size} lançamentos excluídos.` : 'Lançamento excluído.', { acao: 'Desfazer', fn: desfazer, ms: 6000 });
  }

  function marcarPago(id) {
    const l = db.lancamentos.find((o) => o.id === id);
    if (!l) return;
    l.pago = !l.pago;
    salvar();
    render();
    toast(l.pago ? (l.tipo === 'receita' ? 'Marcado como recebido.' : 'Marcado como pago.') : 'Voltou para a pagar.', {
      acao: 'Desfazer', fn: () => { l.pago = !l.pago; salvar(); render(); },
    });
  }

  // Conta
  function formConta(c) {
    const novo = !c;
    const x = c || { nome: '', tipo: 'corrente', saldo_inicial: 0, arquivada: false };
    const usos = c ? db.lancamentos.filter((l) => l.conta_id === c.id || l.conta_destino_id === c.id).length : 0;
    abrir(`${dlgHead(novo ? 'Nova conta' : 'Editar conta')}
      <div class="fields">
        <label class="field"><span>Nome</span><input name="nome" maxlength="60" value="${esc(x.nome)}" placeholder="Ex.: Nubank, Caixa, Carteira" autofocus required></label>
        <label class="field half"><span>Tipo</span><select name="tipo">${Object.entries(Store.CONTA_TIPOS).map(([k, l]) => `<option value="${k}"${k === x.tipo ? ' selected' : ''}>${l}</option>`).join('')}</select></label>
        <label class="field half"><span>Saldo inicial</span><span class="input-affix"><i>R$</i><input name="saldo" inputmode="decimal" value="${esc(toInput(x.saldo_inicial))}" placeholder="0,00"></span></label>
        <p class="hint">Saldo inicial: quanto havia na conta antes do primeiro lançamento. No cartão de crédito, use um valor negativo se já houver fatura.</p>
        ${novo ? '' : `<label class="check"><input type="checkbox" name="arquivada"${x.arquivada ? ' checked' : ''}><span>Arquivada (some das listas e do saldo, mas os lançamentos ficam)</span></label>`}
      </div>
      <div class="dlg-actions">
        ${novo ? '' : `<button type="button" class="btn danger-ghost" data-dlg="excluir">Excluir</button>`}
        <span class="spacer"></span>
        <button type="button" class="btn" data-dlg="fechar">Cancelar</button>
        <button type="submit" class="btn primary">Salvar</button>
      </div>`, () => {
      const f = form.elements;
      const nome = f.nome.value.trim();
      if (!nome) throw new Error('Dê um nome para a conta.');
      const dados = { nome, tipo: f.tipo.value, saldo_inicial: lerValor('saldo'), arquivada: f.arquivada ? f.arquivada.checked : false };
      if (dados.arquivada && contasAtivas().filter((o) => o.id !== (c && c.id)).length === 0) throw new Error('Deixe pelo menos uma conta sem arquivar.');
      if (novo) db.contas.push({ id: Store.uid(), ...dados });
      else {
        const alvo = conta(c.id);
        if (!alvo) throw new Error('Esta conta foi excluída em outro aparelho.');
        Object.assign(alvo, dados);
      }
      salvar();
      render();
      toast(novo ? 'Conta criada.' : 'Conta salva.');
      return true;
    }, async (k) => {
      if (k !== 'excluir') return;
      if (usos) {
        mostrarErro(`Esta conta tem ${plural(usos, 'lançamento', 'lançamentos')}. Para tirá-la das listas sem perder nada, marque “Arquivada”.`);
        return;
      }
      if (db.contas.length <= 1) { mostrarErro('Precisa haver pelo menos uma conta.'); return; }
      const ok = await confirmar('Excluir conta', `Excluir a conta “${esc(c.nome)}”?`, [{ label: 'Excluir', value: true, cls: 'danger' }]);
      if (!ok) return;
      db.contas = db.contas.filter((o) => o.id !== c.id);
      salvar();
      render();
      toast('Conta excluída.');
    });
  }

  // Categoria
  function formCategoria(c) {
    const novo = !c;
    const x = c || { nome: '', tipo: 'despesa', cor: Store.CORES[db.categorias.length % Store.CORES.length] };
    const usos = c ? db.lancamentos.filter((l) => l.categoria_id === c.id).length : 0;
    let tipo = x.tipo;
    abrir(`${dlgHead(novo ? 'Nova categoria' : 'Editar categoria')}
      <div class="fields">
        ${usos ? `<p class="muted small" style="margin:0">Categoria de ${tipo === 'despesa' ? 'despesa' : 'receita'} · ${plural(usos, 'lançamento', 'lançamentos')}</p>`
    : `<div class="seg full" role="group" aria-label="Tipo">
            <button type="button" data-dlg="tipo" data-k="despesa" class="t-despesa${tipo === 'despesa' ? ' on' : ''}">Despesa</button>
            <button type="button" data-dlg="tipo" data-k="receita" class="t-receita${tipo === 'receita' ? ' on' : ''}">Receita</button></div>`}
        <label class="field"><span>Nome</span><input name="nome" maxlength="40" value="${esc(x.nome)}" autofocus required></label>
        <fieldset class="field"><legend>Cor</legend><div class="cores">
          ${Store.CORES.map((cor) => `<label><input type="radio" name="cor" value="${cor}"${cor === x.cor ? ' checked' : ''}><span style="background:${cor}"></span></label>`).join('')}
        </div></fieldset>
        ${usos ? `<label class="field" data-so="mover" hidden><span>Ao excluir, mover os ${usos} lançamentos para</span>
          <select name="mover">${catsDo(tipo).filter((o) => o.id !== c.id).map((o) => `<option value="${esc(o.id)}">${esc(o.nome)}</option>`).join('')}</select></label>` : ''}
      </div>
      <div class="dlg-actions">
        ${novo ? '' : '<button type="button" class="btn danger-ghost" data-dlg="excluir">Excluir</button>'}
        <span class="spacer"></span>
        <button type="button" class="btn" data-dlg="fechar">Cancelar</button>
        <button type="submit" class="btn primary">Salvar</button>
      </div>`, () => {
      const f = form.elements;
      const nome = f.nome.value.trim();
      if (!nome) throw new Error('Dê um nome para a categoria.');
      const cor = (f.cor.value || x.cor);
      if (novo) db.categorias.push({ id: Store.uid(), nome, tipo, cor });
      else {
        const alvo = categoria(c.id);
        if (!alvo) throw new Error('Esta categoria foi excluída em outro aparelho.');
        Object.assign(alvo, { nome, cor, tipo });
      }
      salvar();
      render();
      toast(novo ? 'Categoria criada.' : 'Categoria salva.');
      return true;
    }, async (k, b) => {
      if (k === 'tipo') {
        tipo = b.dataset.k;
        $$('[data-dlg="tipo"]', form).forEach((o) => o.classList.toggle('on', o.dataset.k === tipo));
        return;
      }
      if (k !== 'excluir') return;
      const mover = $('[data-so="mover"]', form);
      if (usos && mover && mover.hidden) {
        if (!form.elements.mover.options.length) { mostrarErro('Crie outra categoria do mesmo tipo para receber os lançamentos.'); return; }
        mover.hidden = false;
        b.textContent = 'Confirmar exclusão';
        return;
      }
      const destino = usos ? form.elements.mover.value : null;
      if (!usos) {
        const ok = await confirmar('Excluir categoria', `Excluir a categoria “${esc(c.nome)}”?`, [{ label: 'Excluir', value: true, cls: 'danger' }]);
        if (!ok) return;
      }
      const desfazer = guardarDesfazer();
      db.lancamentos.forEach((l) => { if (l.categoria_id === c.id) l.categoria_id = destino; });
      if (db.orcamentos[c.id] && destino) db.orcamentos[destino] = (db.orcamentos[destino] || 0) + db.orcamentos[c.id];
      delete db.orcamentos[c.id];
      db.categorias = db.categorias.filter((o) => o.id !== c.id);
      salvar();
      if (dlg.open) dlg.close();
      render();
      toast('Categoria excluída.', { acao: 'Desfazer', fn: desfazer, ms: 6000 });
    });
  }

  // Limites do orçamento
  function formLimites() {
    abrir(`${dlgHead('Limites por mês')}
      <p class="dlg-text muted">Quanto você quer gastar, no máximo, por mês em cada categoria. Deixe em branco para não controlar.</p>
      <div class="limites">${catsDo('despesa').map((c) => `<label class="limite-row"><span class="nome">${catDot(c)}${esc(c.nome)}</span>
        <span class="input-affix"><i>R$</i><input name="lim_${esc(c.id)}" inputmode="decimal" placeholder="—" value="${esc(toInput(db.orcamentos[c.id] || ''))}"></span></label>`).join('')}</div>
      <div class="dlg-actions"><span class="spacer"></span>
        <button type="button" class="btn" data-dlg="fechar">Cancelar</button>
        <button type="submit" class="btn primary">Salvar</button></div>`, () => {
      const novos = {};
      catsDo('despesa').forEach((c) => {
        const v = lerValor(`lim_${c.id}`);
        if (v > 0) novos[c.id] = v;
      });
      db.orcamentos = novos;
      salvar();
      render();
      toast('Limites salvos.');
      return true;
    });
  }

  // ---------- Arquivos ----------

  function baixarArquivo(nome, conteudo, mime) {
    if (Android && Android.salvarArquivo) {
      Android.salvarArquivo(nome, conteudo, mime);
      return;
    }
    const blob = new Blob([conteudo], { type: mime });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = nome;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  // O app Android avisa aqui quando termina de salvar
  window.onArquivoSalvo = (ok, nome) => {
    if (ok && /\.json$/i.test(nome || '')) marcarCopia();
    toast(ok ? 'Arquivo salvo.' : 'O arquivo não foi salvo.');
  };

  function marcarCopia() {
    try { localStorage.setItem(COPIA_KEY, String(Date.now())); } catch (e) { /* sem armazenamento */ }
    if (current === 'ajustes' || current === 'inicio') render();
  }

  function baixarCopia() {
    const nome = `financas-${hoje()}.json`;
    baixarArquivo(nome, JSON.stringify({ app: 'minhas-financas', exportado_em: new Date().toISOString(), ...db }, null, 2), 'application/json');
    if (!Android) {
      marcarCopia();
      toast('Cópia baixada.');
    }
  }

  function baixarCsv() {
    const q = (s) => {
      const t = String(s == null ? '' : s);
      return /[;"\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
    };
    const num = (v) => v.toFixed(2).replace('.', ',');
    const linhas = [['Data', 'Tipo', 'Descrição', 'Pessoa', 'Categoria', 'Conta', 'Conta destino', 'Valor', 'Pago', 'Parcela', 'Observação']];
    ordenar(db.lancamentos, false).forEach((l) => {
      const c = categoria(l.categoria_id);
      const sinal = l.tipo === 'despesa' ? -1 : 1;
      linhas.push([fmtDate(l.data), TIPOS[l.tipo], l.descricao, l.pessoa, c ? c.nome : '', nomeConta(l.conta_id),
        l.conta_destino_id ? nomeConta(l.conta_destino_id) : '', num(sinal * l.valor), l.pago ? 'sim' : 'não', parcelaTxt(l), l.obs]);
    });
    baixarArquivo(`financas-${hoje()}.csv`, `﻿${linhas.map((r) => r.map(q).join(';')).join('\r\n')}`, 'text/csv');
    if (!Android) toast('Planilha baixada (abre no Excel ou no Google Planilhas).');
  }

  $('#restaurarInput').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    let novo;
    try {
      novo = Store.normalizar(JSON.parse(await file.text()));
    } catch (err) {
      toast(err instanceof SyntaxError ? 'Arquivo inválido: não é um JSON.' : err.message, { ms: 5000 });
      return;
    }
    const ok = await confirmar('Restaurar cópia', `A cópia tem ${plural(novo.lancamentos.length, 'lançamento', 'lançamentos')} e
      ${plural(novo.contas.length, 'conta', 'contas')}. Os dados atuais deste aparelho (${plural(db.lancamentos.length, 'lançamento', 'lançamentos')})
      serão <strong>substituídos</strong>.`, [{ label: 'Substituir', value: true, cls: 'danger' }]);
    if (!ok) return;
    const desfazer = guardarDesfazer();
    db = Store.substituir(novo);
    render();
    toast('Cópia restaurada.', { acao: 'Desfazer', fn: desfazer, ms: 8000 });
  });

  async function apagarTudo() {
    const ok = await confirmar('Apagar tudo', `Apagar <strong>todos</strong> os ${plural(db.lancamentos.length, 'lançamento', 'lançamentos')},
      contas, categorias e limites${Cloud.user ? ', aqui, na nuvem e nos outros aparelhos' : ' deste aparelho'}? Se quiser guardar, baixe uma cópia antes.`,
    [{ label: 'Apagar tudo', value: true, cls: 'danger' }]);
    if (!ok) return;
    const desfazer = guardarDesfazer();
    db = Store.apagarTudo();
    render();
    toast('Dados apagados.', { acao: 'Desfazer', fn: desfazer, ms: 8000 });
  }

  // ---------- Ações ----------

  const acoes = {
    novo: () => formLancamento(null, current === 'lancamentos' && ['receita', 'transferencia'].includes(filtros.tipo) ? filtros.tipo : 'despesa'),
    editar: (el) => {
      const l = db.lancamentos.find((o) => o.id === el.dataset.id);
      if (l) formLancamento(l);
    },
    pagar: (el) => marcarPago(el.dataset.id),
    mes: (el) => {
      const n = Number(el.dataset.n);
      mes = n === 0 ? hoje().slice(0, 7) : addMonths(mes, n);
      render();
    },
    ano: (el) => {
      const n = Number(el.dataset.n);
      ano = n === 0 ? new Date().getFullYear() : ano + n;
      render();
    },
    'ver-mes': (el) => {
      mes = el.dataset.ym;
      location.hash = '#/lancamentos';
    },
    filtro: (el) => {
      filtros.tipo = el.dataset.k;
      render();
    },
    limites: formLimites,
    conta: (el) => formConta(conta(el.dataset.id)),
    'nova-conta': () => formConta(null),
    categoria: (el) => formCategoria(categoria(el.dataset.id)),
    'nova-categoria': () => formCategoria(null),
    acerto: (el) => {
      const a = db.acertos.find((o) => o.id === el.dataset.id);
      if (a) formAcerto(a, a.tipo);
    },
    'novo-acerto': (el) => formAcerto(null, el.dataset.k),
    'atualizar-mercado': () => {
      buscarBitcoin(true);
      buscarJuros(true);
      mercado.dataErro = false;
      buscarTaxaDaData();
      toast('Buscando os valores mais novos…');
    },
    'usar-taxa': (el) => {
      if (!(Mercado.jurosGuardados() || {})[el.dataset.k]) {
        toast('A taxa ainda não foi carregada.');
        return;
      }
      usarTaxa(el.dataset.k);
      mostrarTaxas();
    },
    tema: (el) => { setTheme(el.dataset.k); render(); },
    backup: baixarCopia,
    csv: baixarCsv,
    restaurar: () => $('#restaurarInput').click(),
    'apagar-tudo': apagarTudo,
    entrar,
    sair,
    sincronizar: () => Cloud.sincronizar(),
    'atualizar-app': baixarAtualizacao,
    'procurar-atualizacao': () => procurarAtualizacao(true),
  };

  view.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el || !view.contains(el)) return;
    // Botão dentro de uma linha clicável: só a ação do botão
    const fn = acoes[el.dataset.act];
    if (fn) {
      e.preventDefault();
      fn(el);
    }
  });
  view.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[tabindex="0"][data-act]')) {
      e.preventDefault();
      const fn = acoes[e.target.dataset.act];
      if (fn) fn(e.target);
    }
  });
  view.addEventListener('input', (e) => {
    if (e.target.dataset.taxa) {
      digitarTaxa(e.target);
      return;
    }
    if (e.target.id !== 'busca') return;
    filtros.busca = e.target.value;
    $('#lista').innerHTML = listaLancamentosHtml();
  });
  view.addEventListener('change', (e) => {
    const t = e.target;
    if (t.dataset.fatura) salvarFatura(t);
    else if (t.dataset.config) salvarConfig(t);
    else if (t.dataset.taxa) mostrarTaxas();
    else if (t.id === 'dataJuros') {
      if (t.value) db.config.data_juros = t.value;
      else delete db.config.data_juros;
      salvar();
      mercado.dataTaxa = null;
      mercado.dataErro = false;
      atualizarCaixa('#jurosBox', jurosHtml());
      buscarTaxaDaData();
    }
  });
  // Dados que chegam da nuvem não podem tirar o foco do campo que está sendo digitado
  const editandoNaTela = () => {
    const a = document.activeElement;
    return !!a && view.contains(a) && a.matches('[data-fatura], [data-config], [data-taxa], #dataJuros');
  };
  let telaAtrasada = false;
  view.addEventListener('focusout', () => {
    setTimeout(() => {
      if (telaAtrasada && !editandoNaTela()) {
        telaAtrasada = false;
        render();
      }
    }, 0);
  });
  $('#fab').addEventListener('click', acoes.novo);

  function toast(msg, opts = {}) {
    const t = $('#toast');
    t.innerHTML = `<span>${esc(msg)}</span>${opts.acao ? `<button type="button">${esc(opts.acao)}</button>` : ''}`;
    if (opts.acao) {
      $('button', t).onclick = () => {
        t.classList.remove('show');
        opts.fn();
      };
    }
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), opts.ms || 3000);
  }

  // ---------- Rotas ----------

  function onRoute() {
    const name = (location.hash.replace(/^#\/?/, '').split('/')[0]) || 'inicio';
    current = ['inicio', 'lancamentos', 'orcamento', 'relatorios', 'balanco', 'investir', 'ajustes'].includes(name) ? name : 'inicio';
    $$('#nav a').forEach((a) => a.classList.toggle('on', a.dataset.route === current));
    $('#tip').hidden = true;
    render();
    window.scrollTo(0, 0);
  }

  // Botão "voltar" do Android: fecha o formulário, depois volta ao Início, depois sai do app
  window.voltarAndroid = () => {
    if (dlg.open) { dlg.close(); return true; }
    if (current !== 'inicio') { location.hash = '#/inicio'; return true; }
    return false;
  };

  // ---------- Tema ----------

  const darkQuery = matchMedia('(prefers-color-scheme: dark)');
  let themeChoice = (() => {
    const t = document.documentElement.dataset.theme;
    return t === 'light' || t === 'dark' ? t : 'auto';
  })();

  const isDark = () => themeChoice === 'dark' || (themeChoice === 'auto' && darkQuery.matches);

  function setTheme(choice) {
    themeChoice = choice;
    if (choice === 'auto') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = choice;
    try {
      if (choice === 'auto') localStorage.removeItem('financas:tema');
      else localStorage.setItem('financas:tema', choice);
    } catch (e) { /* sem armazenamento: vale até fechar */ }
    renderTheme();
  }

  function renderTheme() {
    const dark = isDark();
    document.documentElement.classList.toggle('dark', dark);
    const label = dark ? 'Mudar para o modo claro' : 'Mudar para o modo escuro';
    const btn = $('#btnTheme');
    btn.title = label;
    btn.setAttribute('aria-label', label);
    const css = getComputedStyle(document.documentElement);
    const bg = css.getPropertyValue('--bg').trim();
    $('meta[name="theme-color"]').setAttribute('content', bg || '#1f5a73');
    if (Android && Android.tema) Android.tema(dark, bg, css.getPropertyValue('--surface').trim());
  }

  darkQuery.addEventListener('change', () => { renderTheme(); if (current === 'relatorios') desenharGrafico(); });
  $('#btnTheme').addEventListener('click', () => {
    setTheme(isDark() ? 'light' : 'dark');
    if (current === 'ajustes') render();
  });

  // ---------- App instalável ----------

  function bindApp() {
    // No app Android os arquivos já vêm dentro do APK: não precisa de service worker
    if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol) && !Android) {
      window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
    }
    // Outra aba mudou os dados: recarrega
    window.addEventListener('storage', (e) => {
      if (e.key === Store.KEY) {
        db = Store.carregar();
        if (!dlg.open) render();
      }
    });
    let w = window.innerWidth;
    window.addEventListener('resize', () => {
      if (current === 'relatorios' && Math.abs(window.innerWidth - w) > 20) {
        w = window.innerWidth;
        desenharGrafico();
      }
    });
    document.addEventListener('pointerdown', (e) => {
      if (!e.target.closest('.hit')) {
        $('#tip').hidden = true;
        $$('.hit.on').forEach((r) => r.classList.remove('on'));
      }
    });
  }

  function bindCloud() {
    // Dados que chegaram da nuvem (ou restaurados): redesenha com eles
    Store.onTroca((d) => {
      db = d;
      if (editandoNaTela()) telaAtrasada = true;
      else render();
    });
    let ultimoUser = null;
    Cloud.onMudar(() => {
      renderAccount();
      const el = $('#syncStatus');
      if (el) {
        el.className = `sync-status ${Cloud.estado.status}`;
        el.innerHTML = statusHtml();
      }
      const u = Cloud.user ? Cloud.user.id : null;
      if (u !== ultimoUser) {
        ultimoUser = u;
        render();
      }
    });
    Cloud.iniciar({ decidir: decidirJuncao, erro: (m) => toast(m, { ms: 6000 }) });
    renderAccount();
  }

  function init() {
    $$('[data-logo]').forEach((el) => { el.innerHTML = LOGO; });
    renderTheme();
    bindCloud();
    window.addEventListener('hashchange', () => {
      if (dlg.open) dlg.close();
      onRoute();
    });
    bindApp();
    onRoute();
    procurarAtualizacao();
  }

  init();
})();
