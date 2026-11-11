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
