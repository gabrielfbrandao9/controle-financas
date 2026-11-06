# Minhas Finanças

Site e app Android para controlar o dinheiro: gastos, receitas, contas a pagar, orçamento por categoria
e relatórios do ano.

## Telas

- **Início**: saldo nas contas hoje e previsto para o fim do mês, receitas, despesas e sobra do mês,
  contas a pagar e a receber (atrasadas e dos próximos 10 dias, com botão para marcar como paga),
  gastos por categoria e últimos lançamentos.
- **Lançamentos**: despesas, receitas e transferências do mês, agrupadas por dia, com filtro (a pagar,
  só despesas etc.) e busca. Um lançamento pode ser **parcelado** (o valor total é dividido em N meses)
  ou **repetir todo mês** (aluguel, salário, assinaturas). Ao excluir uma parcela, dá para excluir também
  as próximas; excluir tem "Desfazer".
- **Orçamento**: limite mensal por categoria, com aviso aos 80% e quando estoura, e quanto ainda dá para
  gastar por dia até o fim do mês.
- **Relatórios**: gráfico de receitas × despesas mês a mês, tabela com saldo e acumulado, e despesas e
  receitas por categoria no ano (total, % e média por mês).
- **Balanço**: caixa, dívidas e saldo (atual e total), faturas dos próximos 12 meses com o caixa futuro e
  quem te deve e a quem você deve, com parcelas. O caixa é a soma das contas, sem cartão e investimento.
- **Investir**: Mayer Multiple do Bitcoin em US$ e R$ com preço-alvo, Selic e CDI de hoje e de outra data,
  conversor de taxa anual, mensal e diária e rendimento mensal já descontado o IR.
- **Ajustes**: contas (com saldo inicial; dá para arquivar), categorias (nome e cor), tema claro/escuro e
  **cópia de segurança**: baixar (.json), planilha (.csv para Excel) e restaurar.

## Onde ficam os dados

No aparelho (localStorage do navegador ou do app), e funciona sem internet.

**Login com Google (opcional)**, em Ajustes: com ele, as finanças também ficam na nuvem (Supabase) e
aparecem iguais no site, no app e em outros aparelhos; mudanças feitas sem internet sobem depois, e os
aparelhos se juntam sem apagar o que o outro fez. Cada conta só vê as próprias finanças. Veja
[SUPABASE.md](SUPABASE.md).

Sem login, para passar os dados do celular para o computador (ou o contrário), baixe uma cópia num e
restaure no outro. O site lembra de fazer cópia se a última tiver mais de 30 dias.

## Como funciona

Site estático (HTML, CSS e JavaScript, sem etapa de build), no mesmo estilo dos outros sites
(controle-porcos, calculadora-racao). Pode ser publicado no GitHub Pages. O botão **Instalar app** baixa o app para Android
(`js/app-apk.js`); dentro do app, ele vira **Atualizar**.

```
index.html            página e menu
css/style.css         visual (tema claro e escuro)
js/util.js            datas e dinheiro no formato brasileiro
js/store.js           dados (localStorage), categorias iniciais e como juntar dois aparelhos
js/config.js          endereço e chave pública do Supabase
js/cloud.js           login com Google e sincronização
js/vendor/            biblioteca do Supabase (dentro do projeto, para abrir sem internet)
js/calculos.js        contas do Balanço, dos juros e do Mayer Multiple
js/mercado.js         Bitcoin (Binance, CoinGecko) e Selic e CDI (Banco Central)
js/app.js             telas, formulários, gráfico, cópia de segurança
supabase/schema.sql   tabela financas_dados e regras de segurança
sw.js                 funcionamento offline como app instalável
android/              app Android (WebView com o site dentro)
```

Para testar no computador: `python -m http.server 8771` e abra `http://localhost:8771`.
Ao mudar a lista de arquivos, aumente `VERSION` em `sw.js`.

## App Android (.apk)

**Baixar:** <https://github.com/gabrielfbrandao9/controle-financas/releases/latest/download/MinhasFinancas.apk>
(também tem link em Ajustes, no site). Cada versão fica em
[Releases](https://github.com/gabrielfbrandao9/controle-financas/releases), sempre com o arquivo
`MinhasFinancas.apk`, para o link acima apontar para a mais nova.

`android/` tem um app mínimo em Java: um WebView que mostra o site, salva a cópia de segurança e a planilha
pelo seletor de arquivos do Android, abre arquivos para restaurar, pinta as barras do sistema conforme o tema
e trata o botão voltar. O login com Google abre no navegador do celular e volta para o app pelo endereço
`com.gabrielfbrandao.financas://login`.

### Como o app se atualiza

- **Telas e funções (HTML, CSS, JS): sozinhas.** Ao abrir com internet, o app pega cada arquivo do site
  publicado no GitHub Pages e guarda uma cópia; sem internet, usa a última cópia (ou a que veio no APK).
  Basta publicar o site (`git push`) e na próxima abertura do app está lá. Os dados não mudam de lugar.
- **A parte Android (`android/`): precisa de APK novo.** O app consulta as Releases do GitHub (no máximo a
  cada 6 horas) e, se houver versão mais nova que a instalada, avisa no Início e em Ajustes com um botão
  que baixa o APK; aí é só tocar em Instalar. O Android não deixa um app instalado fora da Play Store se
  atualizar sem esse toque.
- Ao mudar algo no site que dependa de uma função nova do Android, confira antes se `window.Android.xxx`
  existe, porque quem ainda não instalou o APK novo recebe o site novo com o app antigo.

Gerar o APK (Git Bash, na pasta do projeto):

```
bash android/build-apk.sh
```

Sai em `dist/MinhasFinancas-<versão>.apk`. Precisa do JDK 17 e do Android SDK (build-tools e platform 34)
em `C:\Users\Gabriel\android-sdk` (ou na variável `ANDROID_SDK`). Não usa Gradle.

- Para uma versão nova, aumente os dois números em `android/versao.txt` (código e nome).
- A primeira execução cria a chave de assinatura `android/financas.keystore` e a senha em
  `android/assinatura.properties`. **Guarde os dois** (fora do Git): sem eles, versões novas não
  instalam por cima da antiga e seria preciso desinstalar (perdendo os dados do app).
