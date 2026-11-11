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

## Ponto atual

**Etapa seguinte: conectar o site/PWA ao Supabase e implementar autenticação das três contas (Ezequiel, Bruna e Renato Cirino).**

A experiência instalada foi testada, mas **a sincronização entre celulares não está pronta**. A planilha ainda utilizava armazenamento local na última verificação. Não assumir que treinos registrados em um aparelho aparecem no outro.

## Próximas etapas (ordem sugerida)

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
