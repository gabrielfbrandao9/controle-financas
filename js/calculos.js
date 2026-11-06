/*
 * Contas das telas Balanço e Investir. Só recebem números e devolvem números.
 *
 *   Taxas sempre em fração: 13,75% = 0.1375.
 *   Meses sempre em "AAAA-MM".
 */
(function (global) {
  'use strict';

  const round2 = (v) => Math.round((v + Number.EPSILON) * 100) / 100;
  const soma = (lista, f) => lista.reduce((s, x) => s + f(x), 0);

  function proximoMes(ym, n = 1) {
    const [y, m] = ym.split('-').map(Number);
    const d = new Date(y, m - 1 + n, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  // Atual: uma parcela de cada item que você deve e a fatura do próximo mês.
  // Total: todas as parcelas de quem deve e de quem você deve, e todas as faturas a partir do próximo mês.
  function balanco({ caixa, acertos, faturas, mesAtual }) {
    const prox = proximoMes(mesAtual);
    const parcelas = (a) => Number(a.parcelas) || 1;
    const credores = acertos.filter((a) => a.tipo === 'credor');
    const devedores = acertos.filter((a) => a.tipo === 'devedor');
    const futuras = faturas.filter((f) => f.mes >= prox);
    const fatura = soma(futuras.filter((f) => f.mes === prox), (f) => f.valor);

    const dividasAtual = soma(credores, (a) => a.valor) + fatura;
    const caixaTotal = caixa + soma(devedores, (a) => a.valor * parcelas(a));
    const dividasTotal = soma(credores, (a) => a.valor * parcelas(a)) + soma(futuras, (f) => f.valor);

    return {
      caixaAtual: round2(caixa),
      dividasAtual: round2(dividasAtual),
      saldoAtual: round2(caixa - dividasAtual),
      caixaTotal: round2(caixaTotal),
      dividasTotal: round2(dividasTotal),
      saldoTotal: round2(caixaTotal - dividasTotal),
    };
  }

  // Quanto sobra no caixa depois de pagar cada fatura, mês a mês
  function projecao({ caixa, faturas, mesAtual, meses }) {
    let resta = caixa;
    return Array.from({ length: meses }, (_, i) => {
      const mes = proximoMes(mesAtual, i + 1);
      const fatura = round2(soma(faturas.filter((f) => f.mes === mes), (f) => f.valor));
      resta = round2(resta - fatura);
      return { mes, fatura, caixa: resta };
    });
  }

  // Quantas linhas a tabela de faturas mostra: do próximo mês até o mês seguinte ao último
  // preenchido, ou até "ate", o último mês pedido à mão, se ele for mais adiante.
  function mesesDeFatura({ faturas, mesAtual, ate }) {
    const prox = proximoMes(mesAtual);
    const ultimo = faturas.map((f) => f.mes).filter((m) => m >= prox).sort().pop();
    let fim = ultimo ? proximoMes(ultimo) : prox;
    if (ate && ate > fim) fim = ate;
    const [y1, m1] = prox.split('-').map(Number);
    const [y2, m2] = fim.split('-').map(Number);
    return (y2 - y1) * 12 + (m2 - m1) + 1;
  }

  // Conversão de taxas. Mês de 30 dias; ano de 365 dias ou 12 meses.
  const deAnual = (anual) => ({ anual, mensal: (1 + anual) ** (1 / 12) - 1, diario: (1 + anual) ** (1 / 365) - 1 });
  const deMensal = (mensal) => ({ mensal, anual: (1 + mensal) ** 12 - 1, diario: (1 + mensal) ** (1 / 30) - 1 });
  const deDiario = (diario) => ({ diario, mensal: (1 + diario) ** 30 - 1, anual: (1 + diario) ** 365 - 1 });

  // ir em fração: 17,5% = 0.175
  function rendimento({ valor, mensal, ir }) {
    const liquido = valor * mensal * (1 - ir);
    return { liquido, variacao: valor > 0 ? (valor + liquido) / valor - 1 : 0 };
  }

  const media = (lista) => (lista.length ? soma(lista, (x) => x) / lista.length : 0);

  // Mayer Multiple: preço de hoje dividido pela média de 200 dias
  const mayer = ({ preco, media: m, alvo }) => ({ mayer: m > 0 ? preco / m : null, futuro: m * alvo });

  const Calc = { balanco, projecao, mesesDeFatura, proximoMes, deAnual, deMensal, deDiario, rendimento, media, mayer };
  if (typeof module !== 'undefined' && module.exports) module.exports = Calc;
  else global.Calc = Calc;
})(typeof window !== 'undefined' ? window : globalThis);
