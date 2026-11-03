# Login com Google e nuvem (Supabase)

O login é **opcional**. Sem ele, o Minhas Finanças guarda tudo só no aparelho. Entrando com Google,
as finanças da conta vão para a nuvem e ficam iguais no site, no app Android e em outros aparelhos.

Usa **o mesmo projeto Supabase dos outros sites** (Otimizador, Orçamentos, Porcos): o mesmo login com
Google e a mesma chave, que estão em [`js/config.js`](js/config.js). Só acrescenta a tabela `financas_dados`.

## Endereços liberados no login

Em **Authentication** → **URL Configuration** → **Redirect URLs** precisam estar:

- `https://gabrielfbrandao9.github.io/controle-financas/**` (o site)
- `com.gabrielfbrandao.financas://login` (o app Android)
- `http://localhost:8771/**` (para testar no computador)

O **Site URL** continua sendo o do Otimizador. Sem esses endereços na lista, o Google devolveria a pessoa
para o Otimizador depois do login (e o app Android nunca receberia o login).

## Quem vê o quê

Cada conta Google tem as próprias finanças, numa linha da tabela `financas_dados`. As regras de segurança
(RLS) só deixam a própria conta ler, criar, alterar e apagar a sua linha; quem não entrou não acessa nada.
Não há lista de acesso: qualquer conta Google pode usar, e cada uma só vê o que é dela.

| Coluna | O que guarda |
|--------|--------------|
| `user_id` | A conta (do login) |
| `dados` | Todas as finanças em JSON, no mesmo formato do arquivo de cópia de segurança |
| `versao` | Sobe a cada gravação. Um aparelho só grava se a nuvem ainda estiver na versão que ele leu |
| `atualizado_em` | Hora da última gravação (do servidor) |

## Como os aparelhos se juntam

Cada conta, categoria e lançamento guarda quando mudou (`mod`), e as exclusões ficam em `removidos`.
Ao sincronizar, o aparelho lê a nuvem, junta com o que mudou nele (fica a alteração mais recente de cada
registro) e grava. Se outro aparelho gravou no meio do caminho, junta de novo. Sem internet, as mudanças
esperam no aparelho e sobem quando a conexão volta.

Na primeira vez que uma conta entra num aparelho que já tem finanças, o site pergunta: juntar os dois,
usar só os da nuvem ou usar só os do aparelho.

## Login no app Android

O Google não deixa entrar com a conta dentro de um app que mostra o site num WebView. Por isso o app abre o
login no navegador do celular; no fim, o Supabase manda de volta para `com.gabrielfbrandao.financas://login`,
o Android reabre o app e ele termina o login (código PKCE).

## Projeto novo do zero

1. **SQL Editor** → **New query**, cole [`supabase/schema.sql`](supabase/schema.sql) e clique em **Run**.
2. Ative o login com Google em **Authentication** → **Sign In / Providers**.
3. Coloque a URL e a chave *publishable* do projeto em `js/config.js` e os endereços acima nas Redirect URLs.

## Bom saber

- **Projeto pausado**: no plano gratuito, o Supabase pausa o projeto depois de 1 semana sem acesso a nenhum
  dos sites. Se acontecer, entre no painel e clique em **Restore**. Os dados não se perdem, e o app continua
  funcionando no aparelho enquanto isso.
- **Sair da conta** no site usa saída "local": não desconecta os outros aparelhos nem os outros sites.
