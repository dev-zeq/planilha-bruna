# Progresso do projeto — Planilha de Treinos

Atualizado em: 2026-11-11

## Visão geral

- **Repositório:** `dev-zeq/planilha-bruna`
- **Site/PWA:** https://treinos.paceplus.app
- **Objetivo:** planejamento de treinos compartilhado entre três atletas (Ezequiel, Bruna e Renato Cirino), com contas individuais e resultados separados.
- **Hospedagem:** GitHub Pages.
- **Backend dedicado:** Supabase, projeto `planilha-treinos` (referência `hzcqlygvzxxnvpywzppp`), região São Paulo, plano gratuito.
- **Integração futura:** Strava, usando autorização individual de cada atleta.
- **Aplicativo Pace Plus principal:** separado deste projeto; evitar mudanças nele sem necessidade.

## Concluído / confirmado nas conversas

- [x] Site da planilha publicado em `treinos.paceplus.app`.
- [x] Adaptação inicial a PWA (instalação na tela inicial, manifesto/ícone e suporte offline básico); instalação e reabertura testadas com sucesso pelo usuário.
- [x] Decisão de manter **uma conta por atleta** com **agenda compartilhada** e **resultados individuais**.
- [x] Supabase independente criado: `planilha-treinos`.
- [x] Migração inicial do banco aplicada, conforme confirmação da execução anterior.
- [x] Quatro conjuntos de dados confirmados: grupos de treino, membros, treinos planejados e resultados individuais.
- [x] Regras de acesso/RLS ativadas nas quatro tabelas, segundo verificação anterior.

## Ponto atual — 11/11/2026

**Implementação real concluída na branch `feat/supabase-shared-training`, em validação antes de produção.**

- PR draft: https://github.com/dev-zeq/planilha-bruna/pull/1.
- Código verificado: `511af6bfe06ef889117371fa1e93e21b2b66d268` (com commits anteriores de banco/UI/testes).
- CI final do código passou nas duas execuções (push e PR): https://github.com/dev-zeq/planilha-bruna/actions/runs/43061633392 e https://github.com/dev-zeq/planilha-bruna/actions/runs/43061623289.
- Banco dedicado atualizado e três e-mails autorizados, sem criação de senhas ou envio de mensagens.
- **Bloqueio:** escolher/configurar SMTP para confirmar os e-mails e recuperar senhas dos três atletas. O SMTP padrão do Supabase não atende usuários externos à equipe administrativa. Confirmação continua habilitada.
- **main ainda não alterada:** o domínio continua com a versão local anterior. Não afirmar que a nova sincronização já está disponível na raiz publicada.
- **Faltam testes reais:** cadastro, entrega de e-mail, login e recuperação nas três contas; instalação/atualização offline em Safari/iPhone e Android; importação confirmada dos dados dos aparelhos.
- **Próximo passo:** configurar SMTP com o usuário, validar os três acessos, promover/integrar PR e testar a versão publicada. Guia detalhado em README.md desta branch.

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
