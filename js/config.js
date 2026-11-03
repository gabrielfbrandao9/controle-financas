/*
 * Configuração do Supabase (login com Google e cópia na nuvem). Veja SUPABASE.md.
 *
 * É o mesmo projeto Supabase dos outros sites (Otimizador, Orçamentos, Porcos): os dados
 * ficam na tabela "financas_dados" (supabase/schema.sql).
 *
 * A chave "publishable" é pública por natureza e pode ficar no GitHub: quem protege os
 * dados são as regras de segurança (RLS) do schema.sql. NUNCA coloque aqui a chave
 * "service_role" ou "secret".
 */
window.APP_CONFIG = {
  supabaseUrl: 'https://hvpafupdzqoochnlkfvp.supabase.co',
  supabaseKey: 'sb_publishable_gxZJWsTHWsg4tZkcIAnhCA_tQPPYppf',
  // Para onde o login com Google volta no app Android (precisa estar nas Redirect URLs do Supabase)
  retornoApp: 'com.gabrielfbrandao.financas://login',
};
