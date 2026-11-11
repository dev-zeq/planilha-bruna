# Strava — integração individual

Estado em 11/11/2026: cadastro do aplicativo preparado no navegador, ainda não submetido. Integração OAuth ainda não implementada nem publicada. Nenhum token ou segredo foi copiado do Pace Plus.

## Cadastro preparado

| Campo | Valor |
| --- | --- |
| Conta aberta | Bruna, assinante, sem aplicação API cadastrada |
| Nome | Treinos Pace Plus |
| Categoria | Treinamento |
| Site | https://treinos.paceplus.app |
| Domínio de callback | treinos.paceplus.app |

O responsável precisa aceitar o Acordo da API e concluir **Criar** no Strava. Não submeter automaticamente esse aceite. Depois conferir Client ID, capacidade de atletas e configuração; não publicar Client Secret ou tokens.

## Requisitos para a implementação

- Aplicação OAuth exclusiva do Treinos. Não alterar cadastro, callback ou tokens do Pace Plus principal.
- Cada conta Supabase autoriza seu próprio atleta Strava. Ezequiel recebe atividades via Zepp/Amazfit → Strava; Bruna via Garmin → Strava. Renato permanece no grupo, mas será conectado posteriormente.
- Callback no domínio do aplicativo, com código temporário e state; troca pelo servidor após validar usuário autenticado, vínculo ao grupo, state aleatório de uso único, expiração e conta que iniciou o fluxo. Remover código/state da barra de endereço após capturar; não registrar URLs com tokens.
- Client Secret em secrets da Edge Function. Tokens de acesso/refresh cifrados no Vault, associados ao UUID do usuário, fora de tabelas legíveis pelo frontend. Vault disponível no projeto; nenhuma tabela de tokens criada até esta etapa.
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

As páginas atuais informam capacidade inicial de um atleta e expansão pelo painel; confirmar a capacidade exibida após o cadastro, antes de conectar Ezequiel e Bruna.
