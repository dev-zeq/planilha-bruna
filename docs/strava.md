# Strava — integração individual

Estado em 11/11/2026: versão 2.2.0 publicada; Ezequiel e Bruna conectados individualmente. Webhook oficial ativo e fila/Cron/API verificados em produção com uma releitura real, sem duplicação. Agrupamento confirmado de aquecimento, principal e desaquecimento validado no treino real do responsável. Capacidade de 10 atletas; Renato será conectado posteriormente. Credenciais exclusivamente no servidor/Vault; nenhum token ou segredo do Pace Plus foi utilizado.

## Cadastro preparado

| Campo | Valor |
| --- | --- |
| Conta aberta | Bruna, assinante, aplicação exclusiva do Treinos |
| Nome | Treinos Pace Plus |
| Categoria | Treinamento |
| Site | https://treinos.paceplus.app |
| Domínio de callback | treinos.paceplus.app |

Cadastro e aceite concluídos pelo responsável. Client ID 296243, capacidade exibida de 10 atletas. Client Secret salvo exclusivamente nos secrets de servidor do projeto Treinos, com autorização; não publicar segredos ou tokens.

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
- Sincronização manual: corridas dos últimos 7 dias (Política da API 6.2, cache de até sete dias). Uma rotina diária apaga atividades com mais de 7 dias que não estejam vinculadas a um treino; as vinculadas permanecem porque sustentam o resultado do atleta.
- Aparelho: o detalhe de cada atividade informa o aparelho de gravação, que é exibido na atividade e no resultado vinculado (Política da API 4.4, atribuição a dados de origem Garmin).
- Compartilhamento: resultados vindos do Strava só aparecem para o grupo com o consentimento registrado do próprio atleta (Política da API 5.13). Cada vínculo exige confirmação e compara a versão do resultado.
- Revogação detectada ao usar a API remove dados importados; saída do último grupo também limpa dados e Vault. Webhooks de criação/alteração/exclusão/revogação implementados e assinatura ativada; aguarda-se a próxima corrida nova externa para observar esse evento real.
- Casal validado em produção: Bruna 43 atividades e Ezequiel 36, sem duplicação ao repetir; um vínculo individual persistente em cada conta e isolamento com UUIDs reais. Credenciais configuradas exclusivamente no servidor. Pendentes: conferência nos celulares e primeira nova corrida pelo webhook externo. Renato depois, conforme instrução do responsável.

## Ativação pelo responsável

1. No projeto hzcqlygvzxxnvpywzppp → Edge Functions → Secrets, salvar STRAVA_CLIENT_ID=296243 e STRAVA_CLIENT_SECRET do aplicativo Treinos Pace Plus. Nunca colar o segredo em chat, repositório, frontend ou SQL público.
2. Conferir que a função strava responde status configurado para membro autenticado. O endpoint usa validação interna de JWT; sem usuário válido não deve retornar dados.
3. Publicar a interface validada pelo PR #2. Abrir Treinos → Meu Strava. Antes de conectar, conferir a conta do aplicativo e a conta do Strava: ambas precisam ser da mesma pessoa.
4. Bruna autoriza Bruna; Ezequiel autoriza Ezequiel. É preciso trocar a sessão Strava quando a outra pessoa for conectar. Não reutilizar tokens de uma conta para outra.
5. Sincronizar, repetir e conferir ausência de duplicações. Vincular uma corrida ao próprio treino; conferir que os outros atletas não foram concluídos e não veem os dados da API.
6. Testar em celular e computador. Registrar o resultado real em progress.md; não marcar concluído só pelo CI simulado.

Credenciais salvas em 11/11/2026 após autorização explícita do responsável. O responsável confirmou as permissões de Ezequiel e Bruna com contas correspondentes. Renato fará sua própria autorização posteriormente.

## Versão 2.2.0 — automação e atividades separadas (publicada)

O PR #3 adiciona webhook oficial para os atletas já conectados. Novas corridas e alterações chegam a uma fila privada persistente. O callback confirma rapidamente; o processamento consulta o Strava com os tokens do próprio atleta. Falhas/limites voltam à fila; um Cron verifica trabalho pendente a cada minuto, sem chamadas HTTP quando a fila está vazia. Exclusões e revogações removem dados da API, preservando a agenda e resultados manuais. Eventos de uma autorização antiga não podem apagar uma conexão nova.

Ativar uma vez na conta Ezequiel em **Meu Strava → Ativar sincronização automática**. A ação é verificada no servidor e registra somente a assinatura do Client ID 296243, sem tocar em outra aplicação ou nos tokens do Pace Plus. O cadastro envia uma verificação ao callback; capacidades e URL do worker ficam no servidor/Vault e nunca chegam à interface. Após ativar, o servidor agenda a releitura de uma atividade própria existente para verificar fila/Cron sem criar treinos falsos.

**Aquecimento + principal + desaquecimento:** marque as atividades em Meu Strava e use **Vincular atividades selecionadas**. Revise a soma e escolha o treino da agenda. Até dez gravações do mesmo atleta podem formar um único resultado. Quilômetros são somados a partir dos metros originais; duração soma apenas tempo em movimento; pace = tempo total / distância total. A mesma atividade não pode ser contabilizada em dois treinos. Um evento novo importa uma corrida, mas não escolhe nem conclui automaticamente o treino da agenda.

Vínculos anteriores de uma atividade são preservados. O servidor antigo e a PWA 2.1.0 continuam compatíveis durante a atualização. Correções/exclusões de componentes atualizam o total já vinculado; métricas ajustadas manualmente pelo usuário não são sobrescritas silenciosamente. Dados e vínculos da API permanecem privados por atleta.

Validação: testes de servidor/webhook, SQL com fixtures revertidas e CI com seleção de três gravações e resultado único. Assinatura oficial e processamento real pela fila/Cron confirmados na etapa 20 de progress.md; receber a próxima corrida real do Strava é um teste adicional distinto.
