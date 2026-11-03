-- Minhas Finanças: dados na nuvem (opcional, para quem entra com Google).
-- Veja SUPABASE.md. Mesmo projeto Supabase dos outros sites; só cria a tabela financas_dados.
--
-- Cada conta Google tem UMA linha com todas as finanças dela em JSON (o mesmo formato do
-- arquivo de cópia de segurança). O site junta as mudanças de cada aparelho antes de gravar;
-- "versao" sobe a cada gravação e impede que um aparelho sobrescreva o que outro acabou de enviar.

create table if not exists public.financas_dados (
  user_id       uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  dados         jsonb not null,
  versao        bigint not null default 1 check (versao > 0),
  atualizado_em timestamptz not null default now()
);

comment on table public.financas_dados is 'Minhas Finanças: finanças de cada usuário (JSON), só o próprio usuário lê e grava.';

alter table public.financas_dados enable row level security;

-- Só a própria pessoa vê e mexe na própria linha
drop policy if exists "financas: ver as próprias" on public.financas_dados;
create policy "financas: ver as próprias" on public.financas_dados
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "financas: criar as próprias" on public.financas_dados;
create policy "financas: criar as próprias" on public.financas_dados
  for insert to authenticated with check (user_id = (select auth.uid()));

drop policy if exists "financas: alterar as próprias" on public.financas_dados;
create policy "financas: alterar as próprias" on public.financas_dados
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "financas: apagar as próprias" on public.financas_dados;
create policy "financas: apagar as próprias" on public.financas_dados
  for delete to authenticated using (user_id = (select auth.uid()));

revoke all on public.financas_dados from anon;
grant select, insert, update, delete on public.financas_dados to authenticated;

-- Hora da última gravação sempre pelo relógio do servidor
create or replace function public.financas_marca_hora()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.atualizado_em := now();
  return new;
end $$;

drop trigger if exists financas_marca_hora on public.financas_dados;
create trigger financas_marca_hora before insert or update on public.financas_dados
  for each row execute function public.financas_marca_hora();
