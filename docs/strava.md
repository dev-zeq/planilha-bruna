# Strava — integração individual

Estado em 11/11/2026: aplicativo cadastrado; capacidade confirmada de 10 atletas. OAuth, sincronização manual e interface implementados no PR #2. Função strava v1 publicada no projeto Treinos, ainda sem credenciais configuradas; produção aguarda publicação da interface e autorização real. Nenhum token ou segredo foi copiado do Pace Plus.

## Cadastro preparado

| Campo | Valor |
| --- | --- |
| Conta aberta | Bruna, assinante, aplicação exclusiva do Treinos |
| Nome | Treinos Pace Plus |
| Categoria | Treinamento |
| Site | https://treinos.paceplus.app |
| Domínio de callback | treinos.paceplus.app |

Cadastro e aceite concluídos pelo responsável. Client ID 296243, capacidade exibida de 10 atletas. Client Secret deve ser salvo exclusivamente nos secrets de servidor do projeto Treinos, após autorização; não publicar segredos ou tokens.

## Requisitos para a implementação

- Aplicação OAuth exclusiva do Treinos. Não alterar cadastro, callback ou tokens do Pace Plus principal.
- Cada conta Supabase autoriza seu próprio atleta Strava. Ezequiel recebe atividades via Zepp/Amazfit → Strava; Bruna via Garmin → Strava. Renato permanece no grupo, mas será conectado posteriormente.
- Callback no domínio do aplicativo, com código temporário e state; troca pelo servidor após validar usuário autenticado, vínculo ao grupo, state aleatório de uso único, expiração e conta que iniciou o fluxo. Remover código/state da barra de endereço após capturar; não registrar URLs com tokens.
- Client Secret em secrets da Edge Function. Tokens de acesso/refresh cifrados no Vault, associados ao UUID do usuário, fora de tabelas legíveis pelo frontend. Vault e tabelas privadas implementados, com testes de isolamento e limpeza.
- Escopos somente de leitura necessários. Nunca solicitar activity:write para importar distância/tempo. Validar os escopos efetivamente autorizados antes de sincronizar.
- Dados obtidos da API devem ser mostrados exclusivamente ao atleta que os autorizou. A agenda e os resultados manuais já compartilhados não concedem permissão para expor atividades Strava entre contas.
- Antes de copiar métricas Strava para training_results, criar identificação de origem e política de leitura que preserve essa restrição. Resultados manuais e do backup permanecem compartilhados conforme as regras existentes.
- Importar com unicidade por usuário/atividade, limites de paginação, tratamento de 429 e renovação serializada de tokens. Não concluir automaticamente todos os atletas.
- Vincular atividade a treino somente após confirmação do dono; proteger contra sobrescrever resultado mais recente por comparação de versão.
- Desconectar/revogar deve remover tokens e dados provenientes da API sem apagar a agenda ou resultados manuais. Prever notificações de revogação/alteração de atividades antes de considerar a integração completa.
- Testar dois atletas autorizados de forma independente e o terceiro sem conexão. Não considerar a sincronização pronta só pela criação do cadastro.

## Fontes oficiais consultadas

- OAuth: https://developers.strava.com/docs/authentication/
- Cadastro e pré-requisitos: https://developers.strava.com/docs/getting-started/
- Capacidade e limites: https://developers.strava.com/docs/rate-limits/
- API Agreement: https://www.strava.com/legal/api
- Secrets de funções: https://supabase.com/docs/guides/functions/secrets
- Vault: https://supabase.com/docs/guides/database/vault

O painel deste aplicativo confirmou capacidade para 10 atletas. A conexão inicial do criador no dashboard não significa autorização OAuth já gravada pelo Treinos.

## Validação e limites atuais

- Testes de servidor, RLS real em transação revertida, Deno e interface no CI passaram no commit 6e4fb3fefaab8acbd0abbca2e2cdaa18c3110a2b. Testes adicionais do painel privado serão validados no próximo commit.
- Sincronização manual: corridas dos últimos 30 dias, até 300 atividades consultadas. Cada vínculo exige confirmação e compara a versão do resultado.
- Revogação detectada ao usar a API remove dados importados; saída do último grupo também limpa dados e Vault. Webhooks para revogação/alteração remota imediata ainda pendentes: esta é uma versão inicial em validação, não uma integração automática completa.
- Pendentes: credenciais de servidor, OAuth real de Bruna/Ezequiel, repetição da sincronização e conferência nos celulares. Renato depois, conforme instrução do responsável.

## Ativação pelo responsável

1. No projeto hzcqlygvzxxnvpywzppp → Edge Functions → Secrets, salvar STRAVA_CLIENT_ID=296243 e STRAVA_CLIENT_SECRET do aplicativo Treinos Pace Plus. Nunca colar o segredo em chat, repositório, frontend ou SQL público.
2. Conferir que a função strava responde status configurado para membro autenticado. O endpoint usa validação interna de JWT; sem usuário válido não deve retornar dados.
3. Publicar a interface validada pelo PR #2. Abrir Treinos → Meu Strava. Antes de conectar, conferir a conta do aplicativo e a conta do Strava: ambas precisam ser da mesma pessoa.
4. Bruna autoriza Bruna; Ezequiel autoriza Ezequiel. É preciso trocar a sessão Strava quando a outra pessoa for conectar. Não reutilizar tokens de uma conta para outra.
5. Sincronizar, repetir e conferir ausência de duplicações. Vincular uma corrida ao próprio treino; conferir que os outros atletas não foram concluídos e não veem os dados da API.
6. Testar em celular e computador. Registrar o resultado real em progress.md; não marcar concluído só pelo CI simulado.

As credenciais ainda não foram salvas. É necessária autorização específica do responsável para transferir o Client Secret do Strava para os secrets deste projeto Supabase. O responsável também confirma as permissões de leitura no fluxo OAuth de cada atleta.
