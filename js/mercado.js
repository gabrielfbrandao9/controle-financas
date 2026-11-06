/*
 * Dados de fora para a tela Investir. Nada do usuário é enviado.
 *   Bitcoin: Binance; se não responder, CoinGecko.
 *   Selic (série 432) e CDI (série 4389): Banco Central.
 * A última resposta fica guardada no aparelho, para mostrar sem internet.
 */
(function (global) {
  'use strict';

  const KEY_BTC = 'financas:mercado:btc';
  const KEY_JUROS = 'financas:mercado:juros';
  const VALE_BTC = 10 * 60000;
  const VALE_JUROS = 6 * 3600000;
  const BINANCE = ['https://api.binance.com', 'https://data-api.binance.vision'];
  const DIAS_MEDIA = 200;

  function ler(key) {
    try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) { return null; }
  }

  function gravar(key, valor) {
    try { localStorage.setItem(key, JSON.stringify(valor)); } catch (e) { /* sem armazenamento */ }
  }

  async function buscar(url) {
    const ctl = new AbortController();
    const espera = setTimeout(() => ctl.abort(), 12000);
    try {
      const r = await fetch(url, { signal: ctl.signal, cache: 'no-store' });
      if (!r.ok) throw new Error(String(r.status));
      return await r.json();
    } finally {
      clearTimeout(espera);
    }
  }

  function conferir(precos) {
    if (precos.length < DIAS_MEDIA * 0.9 || !precos.every((p) => Number.isFinite(p) && p > 0)) {
      throw new Error('Resposta inesperada');
    }
    return { preco: precos[precos.length - 1], media: Calc.media(precos) };
  }

  async function bitcoinEm(par, moeda) {
    for (const base of BINANCE) {
      try {
        const velas = await buscar(`${base}/api/v3/klines?symbol=${par}&interval=1d&limit=${DIAS_MEDIA}`);
        return conferir(velas.map((v) => Number(v[4])));
      } catch (e) { /* tenta a próxima */ }
    }
    const g = await buscar(`https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=${moeda}&days=${DIAS_MEDIA}&interval=daily`);
    return conferir(g.prices.slice(-DIAS_MEDIA).map((p) => Number(p[1])));
  }

  async function atualizarBitcoin() {
    const [usd, brl] = await Promise.all([bitcoinEm('BTCUSDT', 'usd'), bitcoinEm('BTCBRL', 'brl')]);
    const novo = { em: Date.now(), usd, brl };
    gravar(KEY_BTC, novo);
    return novo;
  }

  // "2026-11-06" -> "06/11/2026"
  const dataBcb = (s) => s.split('-').reverse().join('/');

  function ultimaTaxa(lista) {
    const v = Number(lista[lista.length - 1].valor) / 100;
    if (!Number.isFinite(v)) throw new Error('Resposta inesperada');
    return v;
  }

  const serieHoje = (n) => buscar(`https://api.bcb.gov.br/dados/serie/bcdata.sgs.${n}/dados/ultimos/1?formato=json`).then(ultimaTaxa);

  async function atualizarJuros() {
    const [selic, cdi] = await Promise.all([serieHoje(432), serieHoje(4389)]);
    const antes = ler(KEY_JUROS) || {};
    const novo = { ...antes, em: Date.now(), selic, cdi };
    gravar(KEY_JUROS, novo);
    return novo;
  }

  // Selic e CDI numa data. O CDI só existe em dia útil: vale o último até a data.
  async function jurosEm(dataIso) {
    const guardado = ler(KEY_JUROS) || {};
    const datas = guardado.datas || {};
    if (datas[dataIso]) return datas[dataIso];
    const fim = new Date(`${dataIso}T12:00:00`);
    const ini = new Date(fim);
    ini.setDate(ini.getDate() - 10);
    const pad = (n) => String(n).padStart(2, '0');
    const isoDe = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const serie = (n) => buscar(`https://api.bcb.gov.br/dados/serie/bcdata.sgs.${n}/dados?formato=json&dataInicial=${dataBcb(isoDe(ini))}&dataFinal=${dataBcb(dataIso)}`).then(ultimaTaxa);
    const [selic, cdi] = await Promise.all([serie(432), serie(4389)]);
    const taxa = { selic, cdi };
    gravar(KEY_JUROS, { ...(ler(KEY_JUROS) || {}), datas: { ...datas, [dataIso]: taxa } });
    return taxa;
  }

  global.Mercado = {
    bitcoinGuardado: () => ler(KEY_BTC),
    jurosGuardados: () => ler(KEY_JUROS),
    bitcoinVencido: () => { const b = ler(KEY_BTC); return !b || Date.now() - b.em > VALE_BTC; },
    jurosVencidos: () => { const j = ler(KEY_JUROS); return !j || !j.em || Date.now() - j.em > VALE_JUROS; },
    atualizarBitcoin,
    atualizarJuros,
    jurosEm,
  };
})(window);
