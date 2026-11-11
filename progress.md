# Progresso do projeto — Planilha de Treinos

Atualizado em: 2026-11-11

## Visão geral

- **Repositório:** `dev-zeq/planilha-bruna`
- **Site/PWA:** https://treinos.paceplus.app
- **Objetivo:** planejamento de treinos compartilhado entre três atletas (Ezequiel, Bruna e Renato Cirino), com contas individuais e resultados separados.
- **Hospedagem:** GitHub Pages.
- **Backend dedicado:** Supabase, projeto `planilha-treinos` (referência `hzcqlygvzxxnvpywzppp`), região São Paulo, plano gratuito.
- **Strava:** conexões individuais de Ezequiel/Bruna, webhook ativo e fila/Cron validados; agrupamento manual confirmado de atividades por treino. Renato depois.
- **Aplicativo Pace Plus principal:** separado deste projeto; evitar mudanças nele sem necessidade.

## Concluído / confirmado nas conversas

- [x] Site da planilha publicado em `treinos.paceplus.app`.
- [x] Adaptação inicial a PWA (instalação na tela inicial, manifesto/ícone e suporte offline básico); instalação e reabertura testadas com sucesso pelo usuário.
- [x] Decisão de manter **uma conta por atleta** com **agenda compartilhada** e **resultados individuais**.
- [x] Supabase independente criado: `planilha-treinos`.
- [x] Migração inicial do banco aplicada, conforme confirmação da execução anterior.
- [x] Quatro conjuntos de dados confirmados: grupos de treino, membros, treinos planejados e resultados individuais.
- [x] Regras de acesso/RLS ativadas nas quatro tabelas, segundo verificação anterior.

## Ponto atual — referência para retomada (11/11/2026)

**Versão 2.2.1 publicada em https://treinos.paceplus.app/. Branch de produção: main.** Este resumo prevalece sobre estados intermediários do histórico abaixo.

- **Agenda/Auth:** contas individuais de Ezequiel, Bruna e Renato no mesmo grupo; agenda compartilhada; resultados separados. Criar, editar, concluir individualmente, persistir e excluir foram verificados. Senhas definidas pelo responsável; nenhuma senha registrada aqui.
- **Dados antigos:** backup exportado/preservado e importação idempotente de oito treinos para Ezequiel/Bruna, sem apagar armazenamento local. Renato permanece membro, sem inclusão automática nos treinos antigos.
- **Strava:** Ezequiel e Bruna autorizados separadamente, com 36 e 43 atividades na última verificação. Dados da API visíveis apenas ao próprio atleta; resultados manuais compartilhados. Renato será conectado posteriormente, conforme solicitado.
- **Automação:** assinatura oficial ativa; fila privada persistente, processamento em background e recuperação por Cron. Prova real com releitura de atividade existente concluída em uma tentativa, HTTP 200, sem timeout, duplicação ou pendências. A primeira corrida NOVA chegando pelo webhook externo ainda precisa ser observada.
- **Gravações separadas:** até dez atividades próprias podem formar um resultado. Aquecimento/principal/desaquecimento somam metros e segundos em movimento; pace usa os totais. Confirmação e versão protegem o vínculo; não há escolha automática do treino. Agrupamento real de três partes da terça de manhã validado e persistente após recarga.
- **Identidade visual:** ícone SVG do app ao lado de Treinos, sem emoji e sem os nomes sob o título. Identificação do usuário preservada na área autenticada. Cache PWA 2.2.1 e atualização pelo botão verificados em produção.
- **Infraestrutura:** somente repositório dev-zeq/planilha-bruna e Supabase hzcqlygvzxxnvpywzppp. Edge Function strava v3; tokens cifrados no Vault; Client Secret nos secrets de servidor. Resend/SMTP com paceplus.app verificado. Aplicativo Pace Plus principal e demais projetos não alterados.
- **Testes aprovados:** core/servidor; autenticação e acesso negado; OAuth; RLS com fixtures revertidas e UUIDs reais; webhook/challenge, deduplicação, claims/retries, revogação/época da conexão; agrupamento, pace ponderado, CAS e exclusão de componente; Chrome em largura móvel/desktop; conferência visual do cabeçalho e atualização da PWA.
- **Últimas verificações de publicação:** [CI da main](https://github.com/dev-zeq/planilha-bruna/actions/runs/43085048427) e [GitHub Pages](https://github.com/dev-zeq/planilha-bruna/actions/runs/43085047997) aprovados no commit documental 998cd7f3d3ba740dd71573c3f10ec6f7295ef8f1.

### Entregas e commits de referência

| Entrega | PR / commit |
| --- | --- |
| Agenda compartilhada, Auth e PWA | [PR #1](https://github.com/dev-zeq/planilha-bruna/pull/1) · [7e478b7](https://github.com/dev-zeq/planilha-bruna/commit/7e478b780852a468e36c6d30c8525b40926b83ce) |
| OAuth e sincronização individual Strava | [PR #2](https://github.com/dev-zeq/planilha-bruna/pull/2) · [1ab4d6c](https://github.com/dev-zeq/planilha-bruna/commit/1ab4d6c5567716391f7f717a4e1d92933f545960) |
| Webhook automático e agrupamento de atividades | [PR #3](https://github.com/dev-zeq/planilha-bruna/pull/3) · [f04e2af](https://github.com/dev-zeq/planilha-bruna/commit/f04e2af178925751a4812c8ada4357c5e03d3ebd) |
| Correção e validação real do teste da fila | [cb9b786](https://github.com/dev-zeq/planilha-bruna/commit/cb9b786bdbfb052d35abb19fb8b67100d03d5ce0) |
| Cabeçalho profissional / versão 2.2.1 | [PR #4](https://github.com/dev-zeq/planilha-bruna/pull/4) · [8477518](https://github.com/dev-zeq/planilha-bruna/commit/847751858c25a86fd70ac4dbdf62929447fcbf89) |
| Confirmação visual e documentação da publicação | [998cd7f](https://github.com/dev-zeq/planilha-bruna/commit/998cd7f3d3ba740dd71573c3f10ec6f7295ef8f1) |

Histórico completo: https://github.com/dev-zeq/planilha-bruna/commits/main. Arquivos modificados, migrações Supabase, falhas corrigidas e resultados de cada etapa estão registrados abaixo. Procedimentos complementares: README.md e docs/strava.md.

### Pendências verificáveis e próxima ação

1. Observar uma corrida NOVA enviada por Amazfit/Zepp ou Garmin ao Strava e recebida pelo webhook. Não confundir esse teste com a releitura já validada pelo Cron.
2. Conferir uso simultâneo em celulares/computador, offline real em Safari/iPhone e Android e recuperação de senha por e-mail. Não marcar esses testes como realizados apenas pelo CI.
3. Conectar Renato quando o responsável estiver com ele e tiver os dados necessários. Conta/grupo já existem; não reutilizar autorização do casal.
4. Revisar com o responsável um vínculo antigo de corrida do fim do dia em outra data da agenda. Não remapear automaticamente sem revisar a correspondência.
5. Avisos de segurança já documentados: proteção de senhas vazadas desativada; metadados da extensão pg_net em public, com funções inspecionadas no schema net; tabelas privadas deliberadamente sem policies de cliente. Não alterar plano, credenciais ou outros projetos para resolver avisos sem necessidade.

No celular: abrir o aplicativo, aplicar **Nova versão disponível — atualizar** se aparecer e conferir 2.2.1. Em **Meu Strava**, a importação é automática após a atividade chegar ao Strava; para juntar partes, marcar as gravações → **Vincular atividades selecionadas** → revisar os totais e o treino → confirmar.

## Checklist original (histórico; execução detalhada abaixo)

- [ ] Inspecionar a versão atual do site e identificar o formato/chaves de armazenamento local dos treinos.
- [ ] Preparar **backup e importação idempotente** dos treinos locais antes de alterar a persistência; evitar perda e duplicação.
- [ ] Validar o esquema real do Supabase, nomes das tabelas, relacionamentos e políticas RLS com as contas autenticadas.
- [ ] Implementar login individual e associação segura dos três usuários ao mesmo grupo de treino (com suporte para incluir mais integrantes futuramente).
- [ ] Conectar leitura/escrita da agenda compartilhada ao Supabase; manter os resultados separados por usuário.
- [ ] Testar criação, edição e conclusão de treinos nas três contas e respectivos aparelhos, incluindo atualização após recarregar.
- [ ] Testar isolamento de dados e permissões com usuário não pertencente ao grupo.
- [ ] Após testes, implementar integração com Strava usando OAuth e segredos no servidor (nunca expor tokens privados no navegador).
- [ ] Associar atividades importadas aos treinos planejados com confirmação ou regras de correspondência verificáveis.
- [ ] Revisar experiência de instalação, cache e atualização do PWA depois de cada implantação relevante.

## Regras e decisões

1. **Não apagar nem sobrescrever dados locais** antes de exportação/backup e migração validada.
2. **Não expor** chaves secretas, tokens do Strava, credenciais ou service-role do Supabase no GitHub ou no frontend.
3. Cada atleta autoriza sua própria conta Strava; atividades importadas não devem ser expostas indevidamente ao outro usuário.
4. Manter o Pace Plus principal isolado; reaproveitar ideias e lógica, não copiar tokens.
5. Não considerar funcionalidade pronta sem teste prático e registro do resultado.
6. PWA dispensa publicação na App Store para instalação pelo navegador, mas não substitui sincronização em nuvem.

## Histórico de execução

| Data | Etapa | Resultado |
|---|---|---|
| 2026-11-11 | PWA | Usuário confirmou instalação e reabertura com dados locais preservados |
| 2026-11-11 | Arquitetura | Definidas contas individuais para Ezequiel, Bruna e Renato Cirino, calendário compartilhado e resultados separados |
| 2026-11-11 | Supabase | Projeto `planilha-treinos` criado; estrutura inicial e RLS relatadas como aplicadas/verificadas |
| 2026-11-11 | Escopo | Renato Cirino incluído como terceiro atleta planejado; cadastro/login ainda não criado |
| 2026-11-11 | Segurança | Corrigidas políticas de treinos para exigir vínculo ao grupo específico; migração aplicada, testes de usuário ainda pendentes |
| 2026-11-11 | Documentação | Registro inicial criado neste `progress.md` |

## Como manter este documento

A cada alteração, atualizar: **data, arquivos/área alterados, mudanças realizadas, testes efetuados, pendências, riscos e próximo passo**. Marcar tarefas concluídas apenas após evidência. Registrar PR/commit quando houver.

## Referências

- Site: https://treinos.paceplus.app
- Repositório: https://github.com/dev-zeq/planilha-bruna
- Supabase: https://supabase.com/dashboard/project/hzcqlygvzxxnvpywzppp

> Este documento resume informações confirmadas em conversas anteriores. Para detalhes de banco e implementação, conferir novamente código e configurações antes de mudanças.



## 2026-11-11 — Etapa 1: inspeção e backend real

- Branch: `feat/supabase-shared-training`, baseada na main `6d44e42`.
- Inspecionados todos os arquivos da main e as quatro tabelas/políticas reais. Banco sem usuários, membros ou treinos.
- Aplicada migração remota `shared_training_sync_and_authorization`, somente em `hzcqlygvzxxnvpywzppp`. Fonte: `supabase/shared-training.sql`.
- Criado grupo dedicado; vínculo exige e-mail confirmado autorizado na tabela privada. Nenhum e-mail autorizado por inferência.
- Corrigidas políticas para leitura dos integrantes, isolamento por grupo e resultados com escrita exclusiva do próprio atleta, inclusive após revogação.
- Adicionados destinatários por UUID (vazio = grupo inteiro), versionamento, exclusão lógica e RPC transacional com recibos idempotentes. Pace calculado no banco.
- `tests/rls.sql` executado no projeto real com três identidades de um grupo e uma de outro, papéis Postgres authenticated/anon, JWT subject distinto. Assertions passaram; fixtures em transação revertida. Não equivale a login real nos celulares.
- Validados: leitura compartilhada; edição por outro membro; conclusão individual; tentativa de adulterar resultado alheio; bloqueio de grupo externo; revogação; anônimo; repetição idempotente e conflito de versão.
- Advisor de segurança: sem WARN/ERROR. INFO esperado: autorizações privadas com RLS e nenhuma policy, acesso direto revogado.
- Ambiente local sem DNS para GitHub/npm e sem CLI Supabase instalada: fontes obtidas e commits enviados pelo conector; SQL remoto aplicado por MCP e fonte sem nome de migração CLI inventado.
- Arquivos: `supabase/shared-training.sql`, `tests/rls.sql`, `progress.md`.
- Commit: etapa registrada no commit que contém esta seção; SHA será registrado na próxima etapa.
- Pendente: e-mails exatos dos três atletas, configuração de URLs do Auth, login/recuperação reais, UI e sincronização.
- Próximo passo: implementar interface e testes de importação/fila; depois autorizar os e-mails fornecidos pelo usuário.


## 2026-11-11 — Etapa 2: aplicação, autorizações e testes

- Commit etapa 1: https://github.com/dev-zeq/planilha-bruna/commit/4e0c481b0cbec3b717e0f781adac520fa2536dc6.
- Implementados `app.js`, `core.mjs`, `styles.css` e nova interface `index.html`: login/cadastro/recuperação, agenda semanal compartilhada, filtros dinâmicos por integrante, planejamento e resultado próprio separados, pace calculado e botão de conclusão.
- Fila persistente por conta com UUIDs, recibos no servidor, trava entre abas, comparação de versões, conflito visível, exportação e descarte explícito. Leitura paginada, atualização automática a cada 20 s e ao retomar foco/reconectar.
- Migração dos dados `ez_bruna_treinos_v1` por confirmação, UUID determinístico por grupo/ID legado, sem apagar o localStorage. “Ambos” mantém Ezequiel/Bruna, sem incluir Renato por inferência; resultados só para a conta que confirma. Reimportação não sobrescreve resultados existentes.
- Service worker com shell coerente por versão, SDK fixado em 2.81.1, ativação de atualização por botão; não armazena Auth/REST no Cache API. Manifesto, domínio e instalação mantidos.
- E-mails fornecidos pelo usuário autorizados na tabela privada; não registrados no repositório público. Contas e senhas ainda não criadas.
- URLs reais do Auth configuradas no dashboard: Site URL e único redirect `https://treinos.paceplus.app/`. Confirm email ativado; anonymous sign-ins desativado. Nenhuma alteração no Pace Plus principal.
- Aplicada segunda migração remota `training_advisor_indexes_and_input_limits`: índices redundantes removidos, FKs indexadas, limites de texto no banco. Fonte `supabase/hardening-followup.sql`.
- Testes locais: 7 casos unitários em `tests/core.test.mjs` passaram (tempo/pace, validação de backup, IDs estáveis, resultados individuais, projeção e versões, duplicação/exclusão, escape de HTML). `node --check` passou nos três módulos da aplicação.
- `tests/rls.sql` ampliado e executado com sucesso: convite exige confirmação de e-mail, reivindicação repetida não duplica membro, tabela de autorizações não é legível pelo usuário. Fixtures revertidas. Verificação posterior: zero usuários/treinos e três autorizações reais.
- Criados testes de navegador em `tests/browser-*` e mock isolado `tests/mock-supabase.js`; aguardando execução no GitHub Actions. Não considerar esses cenários verificados ainda.
- Ambiente local bloqueia abertura de sockets de servidor; teste do navegador será executado em CI. Isso não altera o servidor publicado.
- Pendente: executar CI, revisar UI publicada, validar serviço de entrega de e-mail (SMTP) e os três logins reais; testes offline reais em iPhone/Android e recuperação por e-mail.
- Próximo passo: PR e verificações automáticas, corrigir falhas e publicar após validação; depois testes assistidos das três contas.


### Etapa 2 — ajuste de testes e bloqueio de e-mail

- Commit de implementação: `54e19a4df63e44df6344ca069e67159a6455f369`; PR https://github.com/dev-zeq/planilha-bruna/pull/1.
- CI inicial https://github.com/dev-zeq/planilha-bruna/actions/runs/43060800775: 7 unitários e sintaxe passaram; navegador parou aguardando a trava nativa com relógio virtual do Chrome. Trocado o harness de `--dump-dom --virtual-time-budget` por sessão CDP isolada no runner com relógio real, capturas mobile/desktop e diagnóstico do status visível. Reexecução pendente.
- O commit `3cfcc2a` não teve diff devido a uma falha de caminho na edição local; a alteração do harness está no commit seguinte. Histórico preservado.
- Confirmado no dashboard: SMTP customizado desativado. O provedor padrão do Supabase só entrega para membros da organização e tem limite baixo (docs oficiais: https://supabase.com/docs/guides/auth/auth-smtp). E-mails autorizados para o aplicativo não equivalem a membros administrativos da organização. Não conceder acesso administrativo aos atletas para contornar isso.
- Bloqueio real para validar os três cadastros/recuperação: configurar um provedor SMTP do usuário. Confirmação de e-mail segue ativada. Não foram enviadas mensagens nem criadas senhas.


## 2026-11-11 — Etapa 3: CI, revisão e documentação de uso

- Harness corrigido em `17ad0e6dc20288e7a7134e0bf24f12b47141fa48`.
- CI https://github.com/dev-zeq/planilha-bruna/actions/runs/43061302109 passou: sete unitários, sintaxe, download/sintaxe do SDK fixado e navegador Chrome com três contas simuladas; CRUD compartilhado, resultado individual, escape HTML, falha de rede, reenvio e conflito. Capturas mobile 390×844 e desktop geradas como artifacts, sem overflow mobile.
- Execução irmã https://github.com/dev-zeq/planilha-bruna/actions/runs/43061291493 identificou corrida de mensagens: falha deliberada de registro do SW no mock sobrescrevia aviso de sincronização. Corrigido produto para usar aviso de PWA separado, preservando o estado da sincronização. Nova execução pendente.
- Revisão adicional: botão de reenvio permite repetir operação que havia sido bloqueada por erro recuperável; troca de identidade espera a sincronização anterior terminar antes de carregar a nova; mensagem de erro de entrega de confirmação ficou clara.
- README reescrito com instruções de teste nos celulares, migração, restauração v2 assistida, modelo de segurança, polling, atualização PWA e arquitetura futura Strava.
- Advisor final: sem WARN/ERROR de segurança ou performance. INFO sobre autorizações privadas sem policy é intencional; índices sem uso esperados em banco vazio. FK de grupo das autorizações (três registros) ainda sem índice, sem impacto para este volume.
- Arquivos desta etapa: `app.js`, `index.html`, `README.md`, `.gitignore`, `progress.md`.
- Bloqueio de produção: SMTP próprio ainda não configurado. PR permanece draft até completar entrega de e-mail e validar contas reais; main/domínio publicado continuam com a versão anterior. Nenhum dado local apagado.
- Próximo passo: conferir CI final e configurar SMTP com o serviço escolhido pelo usuário; então validar o cadastro/login/recuperação dos três, promover PR e conferir PWA nos aparelhos.


### Encerramento desta sessão — 11/11/2026

- Correção `511af6b` validada em CI push e PR, ambos verdes. O aviso do PWA não sobrescreve mais o estado da sincronização.
- Testes executados: sete unitários; sintaxe JS; disponibilidade/sintaxe do SDK Supabase 2.81.1; UI Chrome com três contas simuladas (CRUD compartilhado, resultado próprio, XSS, erro de rede/fila/reenvio, conflito e exclusão); viewport mobile sem overflow; SQL/RLS real com três identidades, outsider, anônimo, revogação e autorização por e-mail confirmado.
- Evidências UI em artifacts dos runs de CI. Capturas foram geradas automaticamente; inspeção visual humana de Safari/Android ainda pendente. Não confundir contas simuladas de CI com os três cadastros reais, que não foram criados.
- Estado remoto revisado: dois novos registros de migração, três autorizações privadas, zero usuários reais, zero treinos migrados. Nenhum dado do navegador acessado/apagado por esta execução.
- Commits relevantes: `4e0c481` banco; `54e19a4` UI; `17ad0e6` harness; `511af6b` correções de sincronização. Esta atualização de documentação está em commit posterior, sem alteração do código testado.
- Nenhuma dependência de credenciais de outro projeto. SMTP a configurar exclusivamente neste projeto. Não adicionar os atletas à organização Supabase como administradores.


## 2026-11-11 — Etapa 4: domínio de e-mail no Resend

- Usuário confirmou conta Resend existente e autorizou usar paceplus.app.
- Domínio paceplus.app adicionado de fato no Resend (região São Paulo); recebimento de e-mails desativado, somente envio preparado. Não alterado o domínio já existente na conta.
- Cadastro atual: https://resend.com/domains/add/654d6921-8fdb-4c41-a77b-6d860211467b.
- Verificação DNS ainda não concluída. O Resend apresentou estes registros, a confirmar novamente na interface antes de inserir:
  - TXT resend._domainkey: valor DKIM público disponível no cadastro do domínio.
  - CNAME rsend → rsend-sae1.forge.rmta.net.
  - CNAME send → send.forge.rmta.net.
- Resend aponta Porkbun como provedor DNS. Aberta a página do domínio no Porkbun; bloqueada por login do usuário. Nenhum registro DNS foi modificado.
- Formulário SMTP do projeto planilha-treinos preparado, mas NÃO salvo: remetente treinos@paceplus.app, nome Treinos | Pace Plus, smtp.resend.com, porta 465, usuário resend. Senha/chave ainda não configurada; serviço customizado não ativado no servidor.
- Documentação oficial conferida: https://resend.com/docs/send-with-supabase-smtp.
- Nenhuma chave Resend criada, copiada, publicada ou reutilizada de outro projeto. Antes de configurar, criar credencial exclusiva com permissão mínima de envio para este domínio.
- Pendência imediata: usuário entrar no Porkbun na aba aberta e avisar. Depois adicionar/verificar os registros DNS, configurar a credencial SMTP diretamente no painel, salvar e validar entrega/cadastro/login.
- main e PR continuam no estado anterior: implantação nova ainda pendente. Esta etapa altera apenas documentação em progress.md.


## 2026-11-11 — Etapa 5: registros DNS aplicados

- Após login do usuário, inspecionados os 12 registros DNS existentes de paceplus.app no Porkbun.
- Adicionados exatamente três registros novos, TTL 600, conferidos na listagem final de 15 registros:
  - TXT resend._domainkey.paceplus.app, chave DKIM pública apresentada pelo Resend.
  - CNAME rsend.paceplus.app → rsend-sae1.forge.rmta.net.
  - CNAME send.paceplus.app → send.forge.rmta.net.
- Preservados os registros A/CNAME do site, api, admin, www e treinos; também MX, SPF, DKIM e DMARC já existentes. Nameservers não alterados.
- Clicado “I've already added the records” no Resend. Evidência posterior: evento “DNS verified”; domínio global ainda Pending / Verifying domain; CNAME send Verified, DKIM e rsend ainda Pending. Não considerar envio pronto até status global Verified.
- Conferida a criação de chave de API: o formulário permite Sending access; a lista de escopo ainda não mostra paceplus.app enquanto a verificação está pendente. Formulário cancelado; nenhuma chave criada, nenhum segredo lido.
- Próximo passo concreto: após liberação, criar Treinos-Supabase-SMTP com Sending access restrito a paceplus.app e registrar apenas no SMTP do Supabase planilha-treinos. A criação de credencial permanente no navegador exige confirmação no momento da ação; aguardando confirmação do usuário.
- SMTP continua preparado e não salvo; nenhum teste de e-mail enviado. Sem alterações de código ou de esquema nesta etapa. progress.md atualizado no commit desta seção.


## 2026-11-11 — Etapa 6: Resend e SMTP ativos

- Domínio paceplus.app global Verified no Resend; DKIM e os dois CNAMEs Verified. Região São Paulo. Recebimento continua desativado.
- Após confirmação explícita do usuário, criada chave exclusiva Treinos-Supabase-SMTP com Sending access restrito a paceplus.app. Nenhuma chave preexistente reutilizada. Segredo não incluído em arquivos, commits, mensagens ou documentação.
- Chave transferida pela interface entre os painéis e salva no SMTP exclusivamente de hzcqlygvzxxnvpywzppp: treinos@paceplus.app, Treinos | Pace Plus, smtp.resend.com:465, usuário resend. Toast confirmado: Successfully updated settings; senha armazenada oculta.
- O primeiro método de copiar pela acessibilidade não integrou a área de transferência virtual; resolvido pelo botão Copy via automação DOM documentada. Nenhum segredo impresso.
- Ajustado o fluxo de convite: capturar type=invite/recovery antes de inicializar o SDK e abrir definição de senha antes de reivindicar o grupo. Incluído teste de navegador com hash consumido pelo SDK simulado.
- Arquivos: app.js, index.html, sw.js, package.json, tests/mock-supabase.js, tests/browser-scenarios.js, tests/browser-smoke.mjs, progress.md.
- Versão do shell/app 2.0.1. Unitários (7) e sintaxe passaram localmente. CI do fluxo de convite ainda a executar.
- Próximo passo: validar CI, publicar a versão, enviar convites individuais e verificar entrega. Cada atleta definirá sua própria senha; login real nos três aparelhos continua pendente.





### Etapa 6 — preservação do fluxo de senha

- Revisão do PWA: o primeiro service worker não força recarregamento; troca de controlador também não recarrega enquanto o usuário define a senha. Isso evita perder o contexto de convite/recuperação depois que o SDK consome o hash.
- Arquivo app.js. A suíte de convite está no CI da etapa; sem novos segredos ou mudanças de banco.


### Etapa 6 — teste de conflito determinístico

- CI do convite: execução push 43065924272 passou; PR 43065935346 expôs teste instável, não sobrescrita no produto. A UI ordena por UUID, mas o fixture alterava sempre a primeira sessão criada; com UUIDs aleatórios, às vezes editava outro treino.
- Teste corrigido para selecionar o ID exato nas ações de conflito/exclusão. Mantida a comparação de versões e ampliada a tolerância de espera de UI para runners mais lentos. Nova execução pendente antes da publicação.


## 2026-11-11 — Etapa 7: publicação e entrega dos convites

- Duas execuções finais do head eb8fae7 passaram, inclusive convite e definição de senha com SDK simulado que consome o hash. Instabilidade de seleção por UUID do teste foi corrigida.
- PR #1 promovido e integrado à main no merge 7e478b780852a468e36c6d30c8525b40926b83ce. Publicação GitHub Pages e testes da main aprovados nos links do ponto atual.
- Conferida a URL real no navegador: página de login em português, três nomes no cabeçalho, backup local disponível e versão 2.0.1. SDK real carregado. O service worker apresentou atualização; botão executado e nova página reaberta. Isso não equivale a teste offline real no iPhone/Android.
- Criadas as três contas pelo recurso oficial Invite user do Supabase Auth, sem senha provisória e sem confirmação administrativa artificial. Convites individuais enviados pelos e-mails informados pelo usuário.
- Resend confirmou Delivered nos três convites. IDs dos envios: Ezequiel 01a1cb9c-8f72-7921-bc2b-209a6ea8406f; Bruna 01a1cb9d-205d-70dd-ad25-580197303667; Renato 01a1cb9d-9fb9-7477-be09-03b3ad38e126. Não registrar os links de convite, que contêm tokens.
- Consulta após os envios: três auth.users convidados, três autorizações privadas, zero confirmações, zero membros, zero sessões/resultados. Essa foi a leitura antes da aceitação dos links; não tratar como estado permanente. Vínculo é criado pelo próprio usuário confirmado ao acessar o aplicativo.
- E-mails usam o template padrão em inglês (“You've been invited”); usuário informou que isso não impede o uso e que fará as senhas das três contas.
- SMTP e credencial permaneceram salvos após recarregar o dashboard. Chave com Sending access somente para paceplus.app; janela de visualização única fechada após a gravação e área de transferência virtual limpa. Nenhum segredo em código, docs ou logs produzidos.
- Arquivos desta etapa documental: progress.md e README.md. Sem alteração do código já validado.
- Pendências: usuário aceitar convites/definir senhas; validar login real e sincronização nos três aparelhos; migrar backups somente após confirmação; verificar recuperação real por e-mail e offline nos dispositivos.


## 2026-11-11 — Etapa 8: contas reais e teste funcional em produção

- Ezequiel informou que terminou as três senhas. Consulta real confirmou: três auth.users com email_confirmed_at preenchido, senha cadastrada (somente booleano verificado, sem ler hash/senha), last_sign_in_at e três vínculos ao mesmo grupo 710f069b-8940-451b-bb6e-ef60406fb1b1.
- Identidade do responsável esclarecida: Ezequiel gerencia sua conta, a da esposa Bruna e a de Renato. Isso não altera a separação de resultados no banco.
- Sessão aberta no aplicativo identifica Ezequiel e exibe os filtros Todos/Bruna/Ezequiel/Renato.
- Pela interface real criada a sessão técnica temporária 119858f7-5649-46bc-80dc-a84042d09cc1 em 11/11, para todos, com 1 km planejado. Operação confirmada no servidor.
- Registrado resultado fictício somente em Ezequiel: 1 km, 300 s, pace calculado 300 s/km. Bruna e Renato permaneceram planned e sem resultados gravados.
- Recarregada a página; sessão e resultado recuperados do servidor, sem pendências. Editada a descrição pela interface; versão do treino passou de 1 a 2 no banco.
- Teste SQL com papéis authenticated e auth.uid dos membros reais, em BEGIN/ROLLBACK: Bruna lê o treino, não altera o resultado do Ezequiel e pode inserir resultado próprio; Renato lê o treino e pode editar o planejamento. Assertions passaram. Alterações desse teste foram revertidas.
- Limpeza iniciada pelo botão Excluir da UI. O confirm nativo abriu, mas os comandos de aceitar/tecla ficaram bloqueados pelo controle do navegador (timeouts de Emulation.setFocusEmulationEnabled). Nenhuma tentativa de contornar por acesso privilegiado.
- Última consulta: treino técnico ainda ativo, versão 2, deleted_at nulo. Há um resultado fictício ligado a ele. O usuário precisa clicar OK na confirmação aberta; então conferir exclusão lógica e ausência de pendências. Não marcar limpeza como concluída ainda.
- Dados locais antigos não importados nem apagados. Resultado do teste técnico deve ficar fora da agenda após a exclusão.
- Arquivo modificado: progress.md, commit desta etapa. Sem mudanças de aplicação/banco além das operações de teste autorizadas.


## 2026-11-11 — Etapa 9: limpeza do teste confirmada

- Usuário confirmou o diálogo de exclusão no navegador.
- Consulta real confirmou deleted_at preenchido (11/11/2026 às 14:32:58, Brasília) e versão 3 para o treino técnico 119858f7-5649-46bc-80dc-a84042d09cc1.
- Zero sessões ativas. Exclusão lógica mantém o registro e o resultado fictício vinculados para auditoria, fora da agenda e dos totais visíveis.
- Interface conferida: agenda vazia, 0 resultados/0 km/0 pendentes e mensagem “Agenda atualizada. Todas as alterações foram confirmadas.” Nenhuma operação presa na fila.
- Comprovados em produção pela UI autenticada: criar, editar, concluir individualmente, persistir após recarga e excluir. Três contas confirmadas e membros do mesmo grupo; permissões com UUIDs reais já testadas em transação revertida.
- Nenhum dado local antigo apagado ou migrado. Próxima etapa de dados: exportar backup no aparelho que contém os treinos e revisar a confirmação de importação antes de enviar ao Supabase.
- Permanecem pendentes: teste simultâneo em aparelhos distintos, recuperação real de senha por e-mail e offline específico em Safari/iPhone e Android.
- Arquivo modificado: progress.md; commit desta etapa documental.


## 2026-11-11 — Etapa 10: backup e migração dos dados locais

- Backup real exportado pelo botão Exportar dados antigos da sessão aberta. O evento de download não foi reportado pela automação, mas o arquivo foi localizado em Downloads, lido e validado pelo validador da aplicação.
- Arquivo: backup-local-treinos-2026-11-11.json, 2.326 bytes. SHA-256: c4168f03a6aef272abc7203002e8a2e5fd366b74d0d8ae40cf0b81d1e5054d7d. Cópia persistente disponibilizada ao usuário; original local intacto. Conteúdo completo não foi publicado no GitHub.
- Encontrados 8 treinos entre 09 e 15/11/2026, todos com atleta Ambos (Ezequiel/Bruna); 3 realizados, soma 42,6 km. Confirmado com o usuário que a restrição ao casal é somente nesta importação; Renato continua no grupo e terá conexão própria depois.
- Executadas 11 operações pela mesma RPC apply_training_operation da aplicação, dentro de uma transação com papel authenticated e auth.uid do Ezequiel. Usados o conversor legacyOperations e os mesmos IDs determinísticos/recibos do frontend. Sem credenciais administrativas no navegador.
- Resultado confirmado no banco: 8 sessões ativas; destinatários somente Ezequiel/Bruna; 3 resultados do Ezequiel (42,6 km), zero resultados da Bruna/Renato. Nenhum resultado atribuído ao outro atleta automaticamente.
- Reexecutadas as mesmas 11 operações para validar idempotência: permaneceu exatamente em 8 sessões e 3 resultados, sem duplicação.
- Interface publicada atualizada: 8 treinos visíveis, Ezequiel com resultados e Bruna planejada. O total de pendências com filtro Todos conta cada destinatário individualmente.
- Nenhum dado local apagado. Sem nova migração de schema ou mudança de código nesta etapa.
- Próximo passo: preparar OAuth Strava exclusivo deste aplicativo, sem reutilizar segredos do Pace Plus; autorizações individuais e importação privada por atleta.


## 2026-11-11 — Etapa 11: preparação do cadastro Strava

- Consultadas fontes oficiais OAuth, cadastro, limites, API Agreement, secrets Supabase e Vault. Decisões/requisitos documentados em docs/strava.md.
- Verificada sessão Strava aberta da Bruna (assinante); página Minha aplicação API apresenta criação, sem aplicação existente. Não houve leitura/cópia ou alteração de credenciais do Pace Plus.
- Formulário preparado: Treinos Pace Plus, Treinamento, site https://treinos.paceplus.app, callback treinos.paceplus.app, descrição de agenda e importação privada individual.
- Não marcado “Li e concordo com o Acordo da API do Strava” nem clicado Criar: o cadastro exige aceite contratual pelo usuário. Aba mantida para esse próximo passo.
- Projeto dedicado ainda sem Edge Functions e sem novas tabelas Strava. Integração não implementada/conectada nesta etapa; nenhum segredo/token coletado.
- Requisito identificado para o código: dados recebidos da API visíveis somente ao próprio atleta. O modelo atual de resultados compartilhados precisará diferenciar a origem antes de receber dados Strava. Dados manuais/backup existentes permanecem iguais.
- Renato continua como membro, sem atividades antigas migradas para ele; conexão Strava dele será feita posteriormente, conforme esclarecimento do usuário.
- Próximo passo: usuário concluir cadastro/aceite na aba preparada; então implementar OAuth no servidor, armazenamento protegido, importação individual e testes, conferindo capacidade do aplicativo.
- Arquivos: docs/strava.md e progress.md. Branch feat/strava-individual-sync reservada para o desenvolvimento; nenhuma integração foi anunciada como pronta.


## 2026-11-11 — Etapa 12: implementação Strava em desenvolvimento

- Usuário concluiu cadastro/aceite do aplicativo na conta da Bruna. Strava exige upload do ícone antes de exibir a configuração; ícone PNG 512x512 convertido fielmente do SVG do app.
- Upload automatizado bloqueado pela permissão da extensão para arquivos locais. Ícone disponibilizado para seleção manual no botão Carregar. Não ampliadas permissões da extensão, não lidos Client Secret/tokens, nem alterado o Pace Plus.
- Branch: feat/strava-individual-sync. Código ainda NÃO integrado à main; produção segue 2.0.1.
- Aplicadas três migrações dedicadas: strava_private_individual_connections, strava_vault_variable_resolution, strava_membership_and_vault_cleanup. Fontes SQL em supabase/strava-*.sql.
- Conexões/atividades com leitura exclusiva por usuário, tokens cifrados no Vault e states privados com expiração/uso único. Funções públicas de servidor com EXECUTE somente service_role. Nenhum segredo no frontend.
- Resultado importado identificado por source=strava e visível somente ao próprio atleta. Resultados manuais/backup mantêm leitura compartilhada. Origem protegida contra alteração pelo cliente.
- Edge Function implementada em supabase/functions/strava: valida JWT com Auth, vínculo ao grupo, origem/CORS, callback fixo, scopes, state vinculado ao UUID; renova tokens sob lease, importa corridas dos últimos 30 dias sem duplicar, vincula somente por confirmação/versão e desconecta removendo dados Strava.
- Interface 2.1.0 em desenvolvimento: painel Meu Strava, conexão, sincronização manual, atividades privadas e vínculo confirmado ao treino. Callback capturado/removido da URL antes de inicializar Supabase Auth para evitar confusão entre códigos OAuth.
- Testes locais: sete casos core + onze casos do servidor Strava passaram; sintaxe dos módulos passou. tests/strava-rls.sql passou no banco real com usuários/tokens sintéticos, fixtures revertidas: Vault cifrado, state isolado/uso único, lease, importação idempotente, RPCs negadas ao navegador/anônimo, dados e resultados privados, origem protegida e limpeza preservando resultados manuais.
- Falhas corrigidas durante aplicação: alias PL/pgSQL no bloco GRANT (migração revertida antes de reaplicar) e variável secret ambígua com a view Vault (migração corretiva versionada).
- Advisor de schema: INFO esperado para tabelas privadas com RLS sem policies. Advisor Auth relata proteção de senhas vazadas desativada; não foi alterado plano/assinatura do projeto.
- Pendentes: CI de navegador/Deno e lockfile, finalizar ícone/cadastro, configurar credenciais no servidor, implantar função, autorização e testes reais de Ezequiel/Bruna. Webhooks de revogação/alteração ainda não implementados; não considerar integração completa/pronta para produção.
- Arquivos: supabase/strava-individual.sql, strava-vault-fix.sql, strava-revocation-cleanup.sql, supabase/functions/strava/*, strava-client.mjs, app.js, index.html, sw.js, manifest.webmanifest, icon-512.png, package.json, tests/strava-*, tests/mock-supabase.js, .github/workflows/tests.yml, .gitignore e progress.md.


## 2026-11-11 — Etapa 13: servidor publicado e CI inicial aprovado

- Commit 6e4fb3fefaab8acbd0abbca2e2cdaa18c3110a2b na branch feat/strava-individual-sync; PR #2: https://github.com/dev-zeq/planilha-bruna/pull/2 (rascunho até validação real).
- CI push 43075587760 e PR 43075639426 passaram: testes locais, sintaxe, SDK fixo, Deno 2.5.6 e cenários Chrome de agenda em 390px/desktop. Lockfile Deno obtido do CI; próximo commit fixa --frozen.
- Reexecutado tests/strava-rls.sql no projeto real: sucesso, incluindo limpeza do Vault ao remover último vínculo de grupo; fixtures integralmente revertidas.
- Strava dashboard confirmou cadastro, ícone finalizado, Client ID 296243, capacidade de 10 atletas. Segredo e tokens permaneceram ocultos; nenhuma conexão real do app ainda autorizada.
- Edge Function strava v1 publicada ACTIVE exclusivamente em hzcqlygvzxxnvpywzppp. JWT validado internamente por auth.getUser e associação ao grupo; tokens nunca enviados ao frontend. Sem credenciais Strava, ações de conexão permanecem indisponíveis.
- Tentativa HTTP pelo terminal não pôde resolver DNS no ambiente; não confundir deploy ativo com teste real de resposta autenticada. Verificação pela interface pendente.
- Acrescentados testes de interface para painel privado, limpeza na troca de conta, sincronização manual e vínculo explícito com CAS. Ainda aguardam CI deste novo commit.
- Arquivos desta etapa: deno.lock, .github/workflows/tests.yml, tests/mock-supabase.js, tests/browser-scenarios.js, docs/strava.md, progress.md.
- Pendências: credenciais Strava no servidor, publicação da interface, OAuth real de Bruna/Ezequiel, validação da sincronização/vínculo/repetição e celulares. Webhooks permanecem pendentes; não anunciar sincronização automática completa.

- CI do commit 0ca546e: cenários funcionais Strava passaram e lockfile congelado validou. Verificação de largura falhou porque o relatório técnico do teste usa um pre sem quebra; corrigido o próprio relatório para quebrar linhas, mantendo a detecção de overflow na aplicação e acrescentando diagnóstico de elementos. Revalidação pendente.

- Correção do relatório validada: execução 43076316511 aprovada no commit 0f939158ab47d02408b44ef0832f1c15f8de2f91, incluindo Deno com --frozen, core/servidor, painel privado Strava, sincronização/vínculo simulados, troca A/B/C, fila/conflito e largura móvel.
- Consulta final: 8 sessões ativas, 3 resultados reais, zero conexões/atividades Strava reais. Dados existentes preservados.
- Próxima intervenção necessária: autorização específica para salvar o Client Secret do aplicativo Strava 296243 nos secrets do projeto Treinos. Formulário de secrets e cadastro Strava preparados no navegador; nenhum segredo lido/copiado. Após isso publicar a interface e testar OAuth real por atleta.


## 2026-11-11 — Etapa 14: configuração autorizada e publicação 2.1.0

- Responsável autorizou explicitamente transferir o Client Secret do aplicativo Treinos Pace Plus para os secrets do projeto Treinos. STRAVA_CLIENT_SECRET e STRAVA_CLIENT_ID salvos em Edge Functions → Secrets de hzcqlygvzxxnvpywzppp; lista de secrets confirmou gravação. Nenhum segredo em código, logs, chat ou navegador do aplicativo; painel Strava voltou a ocultar o valor e variável temporária foi limpa.
- CI final do head c5118f7a14c5928f984659cf054c054c925a24e3 passou nas execuções 43076480129 e 43076489452.
- PR #2 integrado à main pelo merge 1ab4d6c5567716391f7f717a4e1d92933f545960 para validar OAuth no domínio definitivo. Pages e testes da main iniciados; aguardam confirmação.
- Sessão Treinos aberta identifica Ezequiel, enquanto Strava aberto identifica Bruna (atleta 36508418). Não iniciar autorização nessas identidades divergentes; será necessário usar a conta Bruna no Treinos ou a conta Ezequiel no Strava.
- Ainda não conectado nenhum atleta nem importada atividade real; não marcar OAuth/sincronização como concluídos. Próximo passo: confirmar publicação, testar status autenticado e autorizar a conexão com identidades correspondentes.

- Publicação confirmada: Pages 43076731245 e testes main 43076732516 concluídos com sucesso. Botão “Nova versão disponível — atualizar” usado na PWA; rodapé passou de 2.0.1 para 2.1.0.

- Status autenticado real na versão 2.1.0 confirmou servidor configurado: painel Meu Strava exibiu “Nenhuma conta Strava conectada” e botão Conectar habilitado, sem erro. Agenda manteve os 8 treinos/3 resultados e zero pendências.
- Preparado login da Bruna no Treinos (bru777@hotmail.com), após sair da sessão Ezequiel sem pendências. Strava permanece Bruna. Intervenção necessária: responsável inserir a senha da Bruna diretamente no aplicativo e entrar; senha não solicitada no chat nem conhecida pelo agente. Não iniciada autorização com identidades divergentes.


## 2026-11-11 — Etapa 15: OAuth e sincronização reais da Bruna validados

- Responsável entrou como Bruna no Treinos e aceitou pessoalmente o consentimento de leitura no Strava. Callback concluiu no domínio definitivo, sem código OAuth persistente na barra; painel identificou Bruna Oliveira.
- Sincronização real pelo botão da interface importou 43 corridas dos últimos 30 dias. Segunda execução permaneceu exatamente em 43 registros; zero atividades atribuídas a Ezequiel/Renato, 8 sessões da agenda preservadas.
- Vinculada explicitamente pela interface a corrida de segunda-feira ao treino correspondente da Bruna; somente um resultado source=strava criado para ela. Nenhum resultado dos demais atletas foi concluído pelo vínculo.
- Recarregado o aplicativo: resultado individual permaneceu salvo, com marca Strava (privado), distância, tempo em movimento e pace. Métricas e IDs das atividades reais não são publicados nesta documentação.
- Teste RLS com papéis authenticated e UUIDs reais em BEGIN/ROLLBACK: Bruna lê suas 43 atividades e seu resultado importado; Ezequiel não lê a conexão/atividades/resultado dela; Renato não lê atividades/resultados dela. Assertions aprovadas, sem alteração de dados.
- Nenhum segredo/token lido para validação; uso do Vault permanece exclusivamente no servidor.
- Arquivos desta etapa: progress.md e docs/strava.md. Código de aplicação da versão 2.1.0 não precisou de correção nesta validação.
- Concluído para Bruna: OAuth, importação real, repetição sem duplicação, vínculo individual, persistência após recarga e isolamento por RLS.
- Pendências: conectar e validar Ezequiel com a própria sessão Strava; Renato posteriormente conforme combinado. Testes de celular/offline/recuperação e webhooks continuam pendentes. Sincronização atual usa botão manual, não é atualização automática contínua.


## 2026-11-11 — Etapa 16: conexões individuais do casal validadas

- Responsável informou que concluiu o acesso. Sessões verificadas: Treinos Ezequiel; Strava Ezequiel Miranda, atleta 36486890. Ao consultar o banco, a conexão e a sincronização do Ezequiel já estavam concluídas pelo uso do aplicativo, com 36 atividades e um resultado vinculado. Nenhum vínculo foi reatribuído pelo agente nesta etapa.
- Uma nova autorização havia sido iniciada pela tela anterior ainda mostrando estado de conexão ausente; ao identificar a conexão válida, fluxo repetido cancelado sem substituir ou desconectar a autorização existente. Depois o painel exibiu a conexão correta.
- Executada novamente Sincronizar atividades na conta Ezequiel: 36 atividades verificadas, sem duplicação; Bruna permaneceu com 43.
- Recarregada a aplicação: sessão Ezequiel preservada, agenda carregada, resultado próprio marcado Strava (privado) persistente. Dados Strava da Bruna não exibidos nessa conta.
- Teste RLS em BEGIN/ROLLBACK com papéis authenticated e UUIDs reais: Ezequiel lê 36 atividades/um resultado próprio, Bruna lê 43/um próprio; Renato lê zero conexões/atividades/resultados Strava. Assertions aprovadas; consulta de outro UUID não libera dados privados. Sem mudanças de dados nesse teste.
- Mantidas 8 sessões da agenda e Renato sem integração. Resultados já registrados pelo usuário preservados; nenhum atleta concluído automaticamente. Não publicar métricas, nomes de atividades ou IDs das corridas privadas no GitHub.
- Arquivos modificados: progress.md e docs/strava.md. Sem mudanças adicionais no schema/Edge Function/código de aplicação nesta etapa documental.
- Commits de referência: implementação 6e4fb3fefaab8acbd0abbca2e2cdaa18c3110a2b; lock/testes 0ca546ef86726c70d770b19481fd3cba40b5e633; teste móvel 0f939158ab47d02408b44ef0832f1c15f8de2f91; merge PR #2 1ab4d6c5567716391f7f717a4e1d92933f545960; validação Bruna 2639a8513df75e15848c544e54a1e1d532ebdd5d. Esta etapa recebe commit documental próprio.
- Funcionando e verificado para ambos: login individual, autorização própria, importação manual, reexecução idempotente, resultado individual persistente e isolamento. Importação é dos últimos 30 dias, acionada pelo botão; não há sincronização contínua/webhooks ainda.
- Pendências reais: testes simultâneos no iPhone/Android/computador; offline e recuperação de senha nos aparelhos; webhooks para mudanças/exclusões/revogação no Strava; conexão Renato quando disponível. Não anunciar essas pendências como concluídas.
- Teste nos celulares: abrir treinos.paceplus.app, aplicar Nova versão disponível se aparecer, confirmar versão 2.1.0; cada um entrar com sua conta; abrir Meu Strava → Sincronizar atividades; usar Vincular a um treino somente para o próprio resultado correspondente. A agenda é compartilhada; dados originados da API ficam individuais.


## 2026-11-11 — Etapa 17: sincronização automática em implementação

- Solicitação do responsável: automatizar importação sem o botão. Branch feat/strava-auto-sync criada da main.
- Consultadas fontes oficiais Strava Webhooks e Supabase Cron/pg_net/background tasks. Projeto dedicado inspecionado; habilitados pg_cron/pg_net somente no Treinos.
- Aplicadas migrações strava_durable_automatic_sync e strava_automation_epoch_guard. Fila privada persistente com deduplicação, claims/leases, retries, limpeza, proteção de época da conexão e processamento de exclusão/revogação. Callback e worker usam capacidades derivadas do segredo existente e nunca são retornados ao frontend. Tokens continuam no Vault.
- Adicionados servidor de webhook/worker e ativação restrita ao responsável; recebimento ACK rápido, processamento em background e recuperação por Cron quando houver trabalho pendente. Assinatura Strava ainda NÃO ativada; não anunciar automação funcionando.
- Testes locais de servidor, autenticação, challenge, callback, ACK independente da API, repetição, limite 429, proprietário, revogação e worker passaram. SQL real com fixtures revertidas aprovou fila, claims exclusivos, retries, atualização individual, exclusão, época e isolamento. CI de navegador/Deno ainda pendente.
- Nova informação do usuário durante esta etapa: Amazfit grava aquecimento, principal e desaquecimento em atividades separadas. Incluir vínculo de múltiplas atividades ao mesmo resultado, somando distância e tempo em movimento e calculando pace ponderado. Agrupamento exige confirmação, sem juntar automaticamente sessões diferentes.
- Arquivos em desenvolvimento: supabase/strava-automation*.sql, supabase/functions/strava/automation.mjs, logic.mjs, index.ts; strava-client.mjs, app.js, index.html, sw.js, package.json, tests/strava-automation* e testes existentes ajustados. Commit de checkpoint desta etapa registra fontes; publicação só após validar também agrupamento.


## 2026-11-11 — Etapa 18: aquecimento, principal e desaquecimento agrupáveis

- Commit de checkpoint da automação: 1cc3db166d359809c06dbadf008c7f594a253da5 na branch feat/strava-auto-sync.
- Aplicadas migrações strava_multiple_activities_per_result e strava_group_notes_without_stale_count. Criada relação privada por atleta entre resultado e várias atividades; vínculos individuais existentes preservados. Campo antigo strava_activity_id mantido nulo por compatibilidade; função antiga de vínculo único delega ao novo fluxo.
- Resultado agrupado soma metros antes de arredondar quilômetros e soma segundos em movimento; pace calculado pelos totais. Limite de 10 atividades distintas por vínculo; unicidade impede contar a mesma atividade em dois treinos. Edição protegida por versão. Exclusão/correção de componente recalcula o grupo; ajustes manuais de métricas são preservados.
- Interface em desenvolvimento 2.2.0: seleção por checkbox, prévia dos totais e confirmação de agrupamento ao treino escolhido. Não há vínculo automático de corridas a treinos da agenda.
- Teste SQL real (fixtures revertidas) aprovou três atividades → um resultado, pace ponderado, CAS, proteção contra outro atleta, proteção contra dupla contagem, recálculo após excluir componente e compatibilidade do cliente anterior. Testes de automação reexecutados com novo modelo: sucesso. Testes locais e sintaxe: aprovados.
- Falha de sintaxe detectada pelo check local (parêntese excedente no filtro de seleção) corrigida antes do commit/publicação. CI/Deno/navegador com seleção múltipla ainda pendentes.
- Fontes: supabase/strava-multiple-activities.sql, supabase/strava-group-notes.sql, strava-client.mjs, index.html, styles.css, servidor/automation.mjs/logic.mjs e testes de agrupamento/automação.
- Assinatura automática ainda não cadastrada no Strava; produção permanece 2.1.0 enquanto a branch passa pela validação. Próximo passo: CI, revisão de segurança, publicar servidor/interface, ativar webhook e testar agrupamento real de terça-feira com seleção correta.

## 2026-11-11 — Etapa 19: validação da automação e agrupamento antes de publicar

- PR #3: https://github.com/dev-zeq/planilha-bruna/pull/3. CI 43082098786 aprovado no commit de14483e1492e633070a2000b8adb68e1a70a06e: core/servidor, webhook/worker, Deno com lockfile congelado e Chrome móvel/desktop, incluindo seleção de três gravações com soma em um resultado e CAS.
- Corrigido erro de tipo Deno no parâmetro background, detectado no CI dos checkpoints; o callback tem default tipado como função. Nenhuma função defeituosa foi publicada por essa falha.
- Advisor: removidos índices duplicados/obsoletos do campo legado Strava e criado índice da FK de autorizações ao grupo (strava_group_indexes_cleanup). Tabelas privadas com RLS sem policies são intencionais. pg_net relata metadata da extensão em public, mas inspeção confirmou as 12 funções no schema net, não no public; extensão não relocatable, sem tentativa de mover/desativar a plataforma. Proteção de senhas vazadas permanece desativada, aviso de Auth já existente.
- Referências: https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public e https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection.
- Aplicada strava_automation_live_probe: após ativar, agenda a releitura de uma atividade própria existente na fila, sem inventar atividade ou alterar registro no Strava. O Cron real fará o processamento para validar recuperação; worker acorda somente com trabalho pendente. Timeout HTTP do worker ajustado para 5s, separado do ACK de webhook/challenge de 2s.
- Documentação de uso e arquitetura atualizada no README.md e docs/strava.md. Pendentes: CI do último ajuste, publicar servidor/interface, ativar assinatura, conferir processamento e agrupamento real de terça-feira. Não marcar a assinatura como ativa até confirmar no Strava.


## 2026-11-11 — Etapa 20: automação ativada e agrupamento real publicado

- PR #3 integrado à main pelo merge f04e2af178925751a4812c8ada4357c5e03d3ebd. Head final b2d6ab47100ac82e0f0798f874e9513ce3d07c56 aprovado em 43082424947/43082434300; CI main 43082589035 e Pages 43082587991 aprovados. PWA atualizada pelo botão de nova versão; rodapé 2.2.0.
- Edge Function strava v3 ACTIVE no projeto Treinos. Primeira tentativa de atualização rejeitada por import_map_path absoluto herdado da versão anterior; reenviado explicitamente deno.json relativo e deploy confirmado. Nenhum segredo copiado para código/chat.
- Pela sessão Ezequiel no aplicativo, ativada a sincronização automática solicitada pelo responsável. Strava confirmou a assinatura oficial após validar hub.challenge em callback protegido. Configuração do worker armazenada no Vault; cron treinos-strava-inbox ativo a cada minuto e sem HTTP quando não há trabalho pendente.
- A assinatura foi criada, mas o teste inicial da fila encontrou conversão ausente numeric → bigint ao chamar enqueue. Corrigido em strava_probe_epoch_cast, fonte supabase/strava-probe-cast.sql. Acrescentada assert de probe no teste SQL; execução integral passou com fixtures revertidas. Ativação real preservada.
- Prova real: enfileirada releitura de uma atividade existente do Ezequiel, sem alterar o Strava nem inventar corrida. Cron processou sozinho entre 19:00 e 19:01 UTC; evento concluído em uma tentativa, sem erro; HTTP worker 200 e sem timeout; cron succeeded. Final: zero pendências, 79 atividades/duas conexões/8 sessões preservadas. Isso valida fila/cron/API em produção; a chegada da próxima corrida nova do relógio ainda é um teste externo adicional, não simulado como concluído.
- Caso real do responsável: encontradas três gravações matinais consecutivas de terça e uma corrida separada no fim do dia. Selecionadas somente as três da manhã na interface; totais revisados e vinculados explicitamente ao treino principal correspondente da agenda. Um único resultado do Ezequiel, sem concluir Bruna/Renato; notas do resultado identificam origem agrupada. IDs e métricas dessas atividades privadas não são publicados no GitHub.
- Recarregada a página: resultado agrupado persistente e painel mostrando Sincronização automática ativa. Teste RLS com os UUIDs reais em rollback aprovou três componentes próprios, visibilidade exclusiva por atleta e Renato sem acesso aos vínculos da API.
- Observação para revisão posterior com o responsável: existe vínculo antigo de uma corrida do fim do dia em outra data da agenda; não foi reatribuído automaticamente nesta etapa, cujo escopo era agrupar o treino da manhã.
- Arquivos finais: progress.md, README.md, docs/strava.md, supabase/strava-probe-cast.sql e tests/strava-automation-rls.sql. SQL corretivo testado antes de registrar este commit; não há nova alteração de frontend/servidor após o CI aprovado.
- Para testar: abrir Meu Strava na versão 2.2.0; as novas corridas serão importadas após chegarem ao Strava. Para agrupar gravações do relógio, marcar as partes → Vincular atividades selecionadas → escolher o treino → conferir distância/tempo/pace → confirmar. O vínculo continua explícito para não misturar treino da manhã com corrida da noite.
- Pendentes: primeira nova corrida externa pelo webhook; testes simultâneos iPhone/Android/computador, offline e recuperação de senha; Renato posteriormente. Auditoria de Auth/pg_net e limitações documentadas na etapa 19.


## 2026-11-11 — Etapa 21: cabeçalho com identidade do aplicativo

- Pedido do responsável: substituir o emoji pelo ícone do aplicativo e remover os três nomes abaixo do título.
- Cabeçalho usa icon.svg já existente, título Treinos e alinhamento compacto responsivo. Ícone decorativo com alt vazio evita leitura duplicada por leitor de tela. Descrição da página generalizada, sem nomes pessoais. Identificação da conta continua na área autenticada.
- Versão preparada 2.2.1 e cache do service worker incrementado para atualizar a PWA instalada. Arquivos: index.html, styles.css, package.json, sw.js e progress.md. Sem alteração de banco, credenciais ou sincronização.
- Próximo passo: verificações existentes, CI e conferência visual no domínio após publicar; não marcar publicado antes da confirmação.

- Commit b168f19a28a36c12fa8aa20871826dd928d11bcb no PR #4 (https://github.com/dev-zeq/planilha-bruna/pull/4). CI push 43084640818 e PR 43084649604 aprovados, incluindo os cenários existentes no Chrome móvel/desktop.
- PR #4 integrado à main no merge 847751858c25a86fd70ac4dbdf62929447fcbf89. Pages e conferência visual do domínio ainda aguardam confirmação.

- Publicação confirmada: CI main 43084749515 e Pages 43084749087 aprovados. Botão de atualização da PWA executado na produção; cabeçalho exibiu somente ícone SVG carregado e título Treinos. Conferência visual no navegador: alinhamento correto e nomes/emoji removidos. Cache 2.2.1 confirmado.
- Etapa concluída; sem alterações no Supabase ou nos dados dos atletas. Pendências de integração/dispositivos continuam as registradas na etapa 20.


## 2026-11-11 — Etapa 22: consolidação solicitada pelo responsável

- Pedido: deixar todo o trabalho registrado em progress.md para retomada futura.
- Revisado o arquivo atual da main antes da edição; preservado o histórico das etapas 1–21 e consolidado o ponto atual no início, removendo ambiguidades entre publicações antigas e a versão 2.2.1.
- Acrescentados quadro de PRs/commits, escopo de infraestrutura, funcionalidades verificadas, testes, uso nos celulares, problemas corrigidos e lista explícita do que ainda falta verificar. Dados de atividades privadas, segredos e senhas não foram incluídos.
- Confirmadas as execuções 43085048427 (Tests) e 43085047997 (Pages), ambas aprovadas no último commit documental anterior. Esta etapa modifica apenas progress.md; não altera código, Supabase ou dados dos atletas e não requer repetir testes funcionais.
- Arquivo registrado em commit próprio na main. Próxima ação: validar a próxima corrida nova recebida automaticamente e então atualizar esta referência com a evidência; manter as demais pendências até confirmação real.


## 2026-11-11 — Etapa 23: interface mobile por atleta e correções de sincronização (2.3.0)

- Revisão do repositório feita com Claude Code a pedido do responsável; decisões de interface tomadas com ele em conversa. PR dev-zeq/planilha-bruna#5.
- Cada conta abre na própria planilha; a de outro atleta aparece ao tocar no nome. Filtro "Todos" removido. Na planilha de outro atleta é possível editar e criar treinos, mas não concluir por ele.
- Semana de segunda a domingo com faixa de dias, resumo em uma linha, só dias com treino listados, cartão com um botão principal e menu "⋯" para Editar/Excluir.
- Quatro abas: Semana, Ranking (semana, mês, ano), Strava e Conta. Cabeçalho com estado da sincronização. CSS reescrito com variáveis e tema escuro automático.
- Correções: ordem dos treinos do dia por período (Manhã, Tarde, Noite); erros HTTP 5xx/429 tratados como temporários, sem travar a fila; operação criada durante uma sincronização é enviada em seguida.

## 2026-11-11 — Etapa 24: compartilhamento opcional dos resultados do Strava (2.4.0)

- Lidos o Acordo e a Política da API do Strava em vigor desde 01/06/2026. Item 2.3 restringe a exibição ao próprio usuário; item 6.1 excetua aplicativos com capacidade de até 9.999 atletas; item 5.13 exige consentimento expresso prévio. O responsável optou pelo compartilhamento por consentimento, ciente de que a leitura não é isenta de dúvida.
- Migração `strava_group_sharing_consent` aplicada: coluna `training_members.strava_shared_at`, função `set_strava_sharing()` (cada atleta altera só o próprio consentimento), política `results_read` passa a mostrar resultados do Strava ao grupo enquanto houver consentimento, e remoção da conexão zera o consentimento.
- Ensaiada antes em transação desfeita e validada depois com `tests/strava-sharing-rls.sql` (identidades sintéticas, rollback, sem sobras).
- Tela: opção "Mostrar meus treinos do Strava para o grupo" na aba Strava, desligada por padrão. PR #6.
- Pendente de cada atleta: ligar a opção. Em 11/11 nenhum dos três havia ligado; por isso o ranking de cada conta mostrava só os próprios km do Strava.

## 2026-11-11 — Etapa 25: login travado no Android (2.4.1)

- Sintoma: após sair de uma conta e entrar em outra, o app parava em "Verificando seu acesso ao grupo…", sem erro.
- Evidência: registros do servidor mostravam `POST /auth/v1/token` 200 e nenhuma requisição depois. O `getSession()` do SDK 2.81.1 espera sem limite por um Web Lock compartilhado entre abas e janelas do app; uma janela congelada em segundo plano mantinha a trava.
- Correção: `lockWithTakeover()` em `core.mjs` espera até um limite e então assume a trava. Usada como trava de sessão do SDK (8 s) e nas travas de sincronização (90 s) e fila (8 s). PR #7.
- Confirmado pelo responsável no aparelho: o login voltou a funcionar.

## 2026-11-11 — Etapa 26: crédito ao aparelho e cache de 7 dias (2.5.0)

- Política da API, item 4.4 (atribuição a dados de origem Garmin) e item 6.2 (cache de até sete dias). O responsável pediu crédito a qualquer aparelho informado pelo Strava.
- Migração `strava_device_credit_and_seven_day_cache` aplicada: `training_strava_activities.device_name`, `training_results.source_device` (mantido por gatilhos, gravável só pelo servidor), importação guardando o aparelho, e rotina diária `treinos-strava-retention` (03:17 UTC) que apaga atividades com mais de 7 dias não vinculadas a um treino. As vinculadas permanecem.
- Edge Function `strava` versão 4: sincronização manual de 7 dias (antes 30) e consulta ao detalhe de cada atividade para obter o aparelho; falha nessa consulta só omite o crédito.
- Verificado em produção pelo responsável: resultado exibindo "Strava · Amazfit GTR 4". PR #8.
- Não consultadas as diretrizes de marca da Garmin; o crédito usa o nome do aparelho como o Strava informa. Retenção dos resultados vinculados além de 7 dias permanece como decisão consciente do responsável.

## 2026-11-11 — Etapa 27: cores dos cartões por estado (2.6.0 e 2.6.1)

- `sessionState()` em `core.mjs` define um estado por cartão: feito, não realizado, hoje, atrasado, a definir ou planejado. A etiqueta sempre diz o estado por escrito.
- 2.6.0 (PR #9): cor na borda e na etiqueta; bolinha âmbar na faixa da semana quando há treino atrasado; botão secundário nos treinos futuros.
- 2.6.1 (PR #10): a pedido do responsável, fundo do cartão tingido pelo estado e faixa grossa à esquerda, para o estado ser lido só pela cor.

## 2026-11-11 — Observações de operação

- Entre 20:25 e 21:10 UTC o GitHub Actions deixou execuções em "Queued" sem criar tarefas e três publicações do Pages terminaram em `startup_failure`; havia incidente aberto de Webhooks na página de status. Os PRs #8, #9 e #10 foram mesclados com base nos mesmos testes rodados localmente, com autorização do responsável. Depois da normalização, Tests e Pages passaram na `main`.
- Estado ao fim do dia: `main` na versão 2.6.1 publicada em https://treinos.paceplus.app; 36 testes unitários e o cenário de navegador aprovados.
- Pendências conhecidas: sincronização baixa a agenda inteira a cada 20 s; escrita direta nas tabelas fora da RPC; publicação do Pages expõe o repositório inteiro e não depende dos testes; SQL sem ordem de migração e tabelas base fora do repositório; testes de RLS fora do CI; migração legada ainda na tela; ID do administrador fixo no código da Edge Function. Em avaliação: migrar a hospedagem para Cloudflare Pages.


## 2026-11-11 — Solicitação: sugestão automática de vínculo Strava (pendente de implementação)

- **Contexto:** uso privado do app pelos três atletas. O responsável relata dificuldade em identificar corridas na lista do Strava e vinculá-las ao treino correto, especialmente quando Amazfit registra aquecimento, parte principal e desaquecimento em atividades separadas.
- **Experiência desejada:** após uma corrida chegar ao Strava, o Treinos deve mostrar uma sugestão para o treino planejado do atleta na data correspondente, priorizando proximidade de data/horário, distância e tipo previsto; destacar claramente horários, distâncias e ritmos das atividades candidatas.
- **Fluxo escolhido:** pré-seleção automática da(s) atividade(s) candidata(s), com **confirmação explícita do atleta antes de salvar**. Permitir revisar/desmarcar/adicionar gravações, inclusive várias partes para um treino, preservando métricas originais e exibindo o total agregado e ritmo ponderado.
- **Segurança/correção:** não associar automaticamente sem confirmação, nem misturar manhã/noite, diferentes atletas ou atividades já vinculadas. Tratar falta de correspondência ou múltiplas sugestões com seleção manual. Evitar duplicidade e respeitar limites de retenção e privacidade Strava.
- **Critérios de aceite:** 1) corrida única recém-sincronizada sugerida para o treino correto do dia; 2) três gravações consecutivas sugeridas como conjunto revisável; 3) treinos diferentes no mesmo dia não são fundidos sem escolha; 4) resultado não muda até confirmar; 5) recarga mantém vínculo único; 6) resultados permanecem separados por atleta.
- **Estado:** requisito aprovado pelo responsável, **não implementado nem testado** nesta etapa. Próximo passo: inspecionar UI/lógica Strava atuais, implementar em branch/PR, executar testes e publicar apenas após validação; registrar links e evidências aqui.


### Decisão de interface — sugestões Strava (11/11/2026)

- **Sem nova aba:** manter Semana, Ranking, Strava e Conta. Adicionar seção de sugestões de vínculo na própria aba Strava e atalho contextual «Vincular Strava» no treino da aba Semana.
- **Destaque visual:** card da sincronização automática/sugestão de atividade em laranja inspirado na identidade visual do Strava, acima da lista de atividades, com contraste acessível; demais cards permanecem neutros para diferenciar claramente a ação sugerida.
- **Estado do card:** deixar nítido se está aguardando nova atividade, se existe sugestão para revisar ou se o vínculo foi confirmado; nunca indicar vínculo concluído apenas porque houve importação.
- **Ação:** mostrar proposta automática com data/horário/distância, permitir revisar múltiplas partes (aquecimento, treino principal, desaquecimento) e confirmar explicitamente. Não usar dados fictícios no aplicativo real.
- **Status:** decisão de produto registrada; **layout e comportamento ainda não implementados nem testados**.


## 2026-11-11 — Etapa 28: sugestão Strava e card laranja (versão 2.6.2)

- Branch `feat/strava-smart-suggestions`: card laranja na aba Strava, sem nova aba, com indicação do estado e botão para revisar sugestão.
- Sugestão conservadora: atividades da mesma data e um único treino elegível sem resultado; agrupamento somente quando gravações forem próximas, sem misturar grupos separados por mais de 90 minutos. Ambiguidade exige seleção manual. Nenhum resultado é gravado sem confirmação no diálogo existente.
- Preservadas seleção manual, acesso individual e vínculo de até dez gravações. Nenhuma migração de banco ou credencial alterada.
- Status: implementação em branch; PR, CI, publicação e teste real em celulares devem ser registrados depois da confirmação, sem antecipar aprovação.
