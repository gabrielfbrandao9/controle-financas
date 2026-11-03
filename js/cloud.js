/*
 * Login com Google e sincronização com a nuvem (opcional).
 *
 * Sem login, nada sai do aparelho. Com login, as finanças da conta ficam numa linha da
 * tabela financas_dados (só a própria pessoa lê e grava). A cada mudança, e ao abrir o site,
 * o aparelho busca a versão da nuvem, junta com o que mudou aqui (Store.juntar) e grava de
 * volta. "versao" impede que dois aparelhos gravem um por cima do outro: se a nuvem mudou
 * no meio do caminho, junta de novo e tenta outra vez. Sem internet, as mudanças esperam
 * no aparelho e sobem quando a conexão volta.
 *
 * No site, o Google volta para a própria página (?code=...). No app Android o login abre no
 * navegador (o Google não deixa entrar dentro do app) e volta pelo endereço
 * com.gabrielfbrandao.financas://login, que o app entrega em window.onLoginRetorno().
 */
(function (global) {
  'use strict';

  const CFG = global.APP_CONFIG || {};
  const Android = global.Android || null;
  const TABELA = 'financas_dados';

  let sb = null;
  let user = null;
  let opts = {};
  let timer = null;
  let rodando = false;
  let deNovo = false;
  const estado = { status: 'off', erro: '', ultima: 0 };
  const ouvintes = [];

  const avisar = () => ouvintes.forEach((f) => { try { f(); } catch (e) { /* tela */ } });

  function setStatus(status, erro = '') {
    estado.status = status;
    estado.erro = erro;
    avisar();
  }

  function msgErro(e) {
    const m = (e && (e.message || e.error_description || e.msg)) || String(e || 'erro desconhecido');
    if (/fetch|network|Failed to fetch|NetworkError/i.test(m)) return 'sem conexão com a nuvem';
    return m;
  }

  function limparUrl() {
    const u = new URL(location.href);
    if (!['code', 'error', 'error_code', 'error_description', 'state'].some((k) => u.searchParams.has(k))) return;
    ['code', 'error', 'error_code', 'error_description', 'state'].forEach((k) => u.searchParams.delete(k));
    history.replaceState(null, '', u.pathname + u.search + u.hash);
  }

  function iniciar(o) {
    opts = o || {};
    // Erro devolvido pelo Google/Supabase na volta do login (por exemplo, cancelou)
    const q = new URLSearchParams(location.search);
    if (q.get('error')) {
      const d = q.get('error_description') || q.get('error');
      setTimeout(() => opts.erro && opts.erro(/denied|cancel/i.test(d) ? 'Login cancelado.' : `Não foi possível entrar: ${d}`), 300);
      limparUrl();
    }
    if (!global.supabase || !CFG.supabaseUrl) {
      setStatus('indisponivel');
      return;
    }
    sb = global.supabase.createClient(CFG.supabaseUrl, CFG.supabaseKey, {
      auth: {
        flowType: 'pkce',
        storageKey: 'financas:auth', // separado dos outros sites do mesmo endereço
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: !Android,
      },
    });
    sb.auth.onAuthStateChange((evento, session) => {
      const novo = session ? session.user : null;
      const trocou = (novo && novo.id) !== (user && user.id);
      user = novo;
      if (!user) setStatus('off');
      else if (evento === 'SIGNED_IN') limparUrl();
      if (trocou) {
        avisar();
        // Fora do callback: chamar o Supabase aqui dentro pode travar
        if (user) setTimeout(() => sincronizar(), 0);
      }
    });
    Store.onSalvo(() => agendar());
    global.addEventListener('online', () => agendar(200));
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && Date.now() - estado.ultima > 20000) agendar(300);
    });
  }

  function agendar(ms = 1500) {
    if (!user) return;
    clearTimeout(timer);
    if (Store.meta.pendente && estado.status !== 'sincronizando') setStatus(navigator.onLine === false ? 'offline' : 'pendente');
    timer = setTimeout(() => sincronizar(), ms);
  }

  async function entrar() {
    if (!sb) throw new Error('O login não carregou. Confira a internet e abra o app de novo.');
    const params = { prompt: 'select_account' };
    if (Android && Android.abrirNavegador) {
      const { data, error } = await sb.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: CFG.retornoApp, skipBrowserRedirect: true, queryParams: params },
      });
      if (error) throw error;
      Android.abrirNavegador(data.url);
      return;
    }
    const { error } = await sb.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: location.origin + location.pathname, queryParams: params },
    });
    if (error) throw error;
  }

  // O app Android chama isto quando o navegador devolve o login
  global.onLoginRetorno = async (url) => {
    try {
      const u = new URL(url);
      const erro = u.searchParams.get('error_description') || u.searchParams.get('error');
      if (erro) throw new Error(/denied|cancel/i.test(erro) ? 'Login cancelado.' : erro);
      const code = u.searchParams.get('code');
      if (!code || !sb) return;
      setStatus('sincronizando');
      const { error } = await sb.auth.exchangeCodeForSession(code);
      if (error) throw error;
    } catch (e) {
      setStatus(user ? 'erro' : 'off', msgErro(e));
      if (opts.erro) opts.erro(e.message === 'Login cancelado.' ? e.message : `Não foi possível entrar: ${msgErro(e)}`);
    }
  };

  // apagarAqui: também apaga as finanças deste aparelho (continuam na nuvem)
  async function sair(apagarAqui) {
    if (!sb) return;
    clearTimeout(timer);
    if (Store.meta.pendente && navigator.onLine !== false) {
      try { await sincronizar(); } catch (e) { /* tenta sair mesmo assim */ }
    }
    // "local": não desconecta os outros aparelhos nem os outros sites
    await sb.auth.signOut({ scope: 'local' });
    user = null;
    if (apagarAqui) Store.esquecer();
    setStatus('off');
  }

  const vazio = (d) => !d || !Array.isArray(d.lancamentos) || d.lancamentos.length === 0;

  function resumo(d) {
    const l = (d && d.lancamentos) || [];
    const ultima = l.reduce((m, x) => (x.data > m ? x.data : m), '');
    return { lancamentos: l.length, ultima };
  }

  // Envia "dados" se a nuvem ainda estiver na versão "versaoNuvem" (0 = ainda não existe a linha)
  async function enviar(dados, versaoNuvem) {
    if (!versaoNuvem) {
      const { error } = await sb.from(TABELA).insert({ user_id: user.id, dados, versao: 1 });
      if (error) {
        if (error.code === '23505') return null; // outro aparelho criou antes
        throw error;
      }
      return 1;
    }
    const { data, error } = await sb.from(TABELA)
      .update({ dados, versao: versaoNuvem + 1 })
      .eq('user_id', user.id).eq('versao', versaoNuvem)
      .select('versao');
    if (error) throw error;
    return data && data.length ? versaoNuvem + 1 : null;
  }

  async function sincronizar() {
    if (!sb || !user) return;
    if (rodando) {
      deNovo = true;
      return;
    }
    clearTimeout(timer);
    if (navigator.onLine === false) {
      setStatus(Store.meta.pendente ? 'offline' : 'ok');
      return;
    }
    rodando = true;
    setStatus('sincronizando');
    const conta = user.id;
    try {
      for (let tentativa = 0; tentativa < 5; tentativa++) {
        const { data: linha, error } = await sb.from(TABELA).select('dados, versao').eq('user_id', conta).maybeSingle();
        if (error) throw error;
        if (!user || user.id !== conta) return;
        const meta = Store.meta;
        const versaoNuvem = linha ? Number(linha.versao) : 0;
        let base = null;

        if (meta.uid !== conta) {
          // Primeira vez desta conta neste aparelho
          if (!linha) base = Store.db;
          else if (Store.virgem()) {
            Store.adotar(linha.dados);
            Store.setMeta({ uid: conta, versao: versaoNuvem });
            break;
          } else if (vazio(linha.dados)) base = Store.juntar(linha.dados, Store.alinhar(Store.db, linha.dados));
          else {
            const escolha = opts.decidir ? await opts.decidir(resumo(Store.db), resumo(linha.dados)) : 'juntar';
            if (!user || user.id !== conta) return;
            if (!escolha) {
              await sb.auth.signOut({ scope: 'local' });
              user = null;
              setStatus('off');
              if (opts.erro) opts.erro('Login cancelado. Os dados deste aparelho não foram mexidos.');
              return;
            }
            if (escolha === 'nuvem') {
              Store.adotar(linha.dados);
              Store.setMeta({ uid: conta, versao: versaoNuvem });
              break;
            }
            if (escolha === 'aparelho') {
              // Só o que está aqui vale: o resto da nuvem vira "excluído" para os outros aparelhos
              base = Store.normalizar(Store.db);
              const agora = Date.now();
              const ids = new Set(['contas', 'categorias', 'lancamentos'].flatMap((k) => base[k].map((r) => r.id)));
              ['contas', 'categorias', 'lancamentos'].forEach((k) => (linha.dados[k] || []).forEach((r) => {
                if (!ids.has(r.id)) base.removidos[r.id] = agora;
              }));
              base.orcamentos_mod = agora;
            } else {
              base = Store.juntar(linha.dados, Store.alinhar(Store.db, linha.dados));
            }
          }
          Store.adotar(base, true);
          Store.setMeta({ uid: conta, versao: 0 });
        } else if (linha && versaoNuvem === meta.versao) {
          if (!meta.pendente) break; // nada mudou dos dois lados
          base = Store.db;
        } else if (linha) {
          // Outro aparelho gravou depois
          if (!meta.pendente) {
            Store.adotar(linha.dados);
            Store.setMeta({ versao: versaoNuvem });
            break;
          }
          base = Store.juntar(linha.dados, Store.db);
          Store.adotar(base, true);
        } else {
          base = Store.db; // a linha sumiu da nuvem: grava de novo
        }

        const antes = Store.contador;
        const nova = await enviar(Store.normalizar(base), versaoNuvem);
        if (!user || user.id !== conta) return;
        if (nova == null) continue; // a nuvem mudou enquanto isso: junta de novo
        Store.setMeta({ uid: conta, versao: nova, pendente: Store.contador !== antes });
        if (Store.contador === antes) break;
      }
      estado.ultima = Date.now();
      setStatus(Store.meta.pendente ? 'pendente' : 'ok');
    } catch (e) {
      setStatus(navigator.onLine === false ? 'offline' : 'erro', msgErro(e));
    } finally {
      rodando = false;
      if (deNovo) {
        deNovo = false;
        agendar(300);
      } else if (Store.meta.pendente && estado.status !== 'erro') {
        agendar(2000);
      }
    }
  }

  global.Cloud = {
    iniciar, entrar, sair, sincronizar,
    onMudar: (f) => ouvintes.push(f),
    get disponivel() { return !!sb; },
    get user() { return user; },
    get estado() { return { ...estado }; },
  };
})(window);
