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

## Ponto atual — publicado em 11/11/2026

**Versão 2.0.1 publicada e disponível em https://treinos.paceplus.app/.**

- PR integrado: https://github.com/dev-zeq/planilha-bruna/pull/1.
- Merge na main: https://github.com/dev-zeq/planilha-bruna/commit/7e478b780852a468e36c6d30c8525b40926b83ce.
- Código validado antes do merge: eb8fae7809e823cb9350d19525e05a8f0b54b26d. CI push e PR verdes: https://github.com/dev-zeq/planilha-bruna/actions/runs/43066178888 e https://github.com/dev-zeq/planilha-bruna/actions/runs/43066190957.
- CI da main: https://github.com/dev-zeq/planilha-bruna/actions/runs/43066359054; publicação GitHub Pages: https://github.com/dev-zeq/planilha-bruna/actions/runs/43066361410. Ambos aprovados.
- Resend com paceplus.app Verified e SMTP customizado salvo no Supabase dedicado. Confirmação de e-mail mantida.
- As três contas já aceitaram o convite: e-mails confirmados, senhas definidas e sessões Auth iniciadas. Todos vinculados ao mesmo grupo. Usuário Ezequiel gerencia as três contas; nenhuma senha foi lida ou registrada.
- Interface publicada carregou o login com SDK real e exibiu versão 2.0.1. Botão de atualização do PWA executado no navegador com sucesso.
- **Validação real realizada:** criação, edição, conclusão individual e persistência após recarregar pela sessão Ezequiel no domínio publicado; resultado não concluiu Bruna/Renato. Permissões conferidas com os três UUIDs reais no Postgres, em transação revertida. Ainda pendentes: sessões simultâneas em aparelhos diferentes, login por senha após sair/recuperação real e offline específico em Safari/iPhone e Android.
- **Migração realizada:** backup exportado/preservado; 8 treinos importados para Ezequiel e Bruna, 3 resultados (42,6 km) somente para Ezequiel. Bruna mantém resultados próprios; Renato continua no grupo, sem inclusão nesses treinos antigos. Reexecução idempotente confirmada.
- **Próximo passo:** integração individual com Strava, primeiro Ezequiel/Bruna e posteriormente Renato. Agenda migrada e teste técnico removido. Também faltam testes em aparelhos distintos, recuperação e offline móvel. Guia no README.md.

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
