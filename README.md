# Treinos

PWA estático em https://treinos.paceplus.app, GitHub Pages, backend exclusivo Supabase `hzcqlygvzxxnvpywzppp`. O registro de execução fica em [progress.md](./progress.md).

## Acesso

Versão 2.2.1 publicada em 11/11/2026, com Strava individual, importação automática e agrupamento de gravações por treino. SMTP Resend configurado no projeto dedicado, usando domínio verificado paceplus.app e remetente treinos@paceplus.app. Credencial exclusiva limitada a envio, guardada somente na configuração protegida do Supabase.

1. Os três convites individuais já foram enviados e constam como Delivered no Resend. Procure “You've been invited”, inclusive na pasta de spam.
2. Abra o convite do respectivo e-mail. O aplicativo abrirá **Definir nova senha**. Escolha e salve uma senha com pelo menos oito caracteres. Não compartilhe senhas no chat.
3. Depois, entre em https://treinos.paceplus.app com esse e-mail e senha. A associação ao grupo exige o e-mail confirmado e sua autorização privada.
4. Repita nas três contas. Se o link tiver expirado ou já sido usado, utilize **Esqueci a senha** com o e-mail correspondente e o link mais recente recebido.

A opção **Criar conta** também está disponível; o cadastro sozinho não dá acesso ao grupo. Não desativar confirmação de e-mail nem adicionar atletas como administradores da organização Supabase.

Site URL e único redirect do Auth: `https://treinos.paceplus.app/`. Cadastro e confirmação por e-mail habilitados, login anônimo desabilitado. As senhas são definidas diretamente pelos usuários.

## Testar nos celulares

- Antes de migrar, abra o aparelho que contém os treinos antigos e toque em **Exportar dados antigos**.
- Entre nas três contas em aparelhos ou perfis diferentes. Após os três terem entrado, os nomes aparecem nos filtros e na seleção de atletas.
- Crie um treino para todos em uma conta. Confirme o aviso de sincronização. Nas outras, toque **Atualizar** ou aguarde até 20 segundos com o app aberto.
- Toque **Concluir treino** como Ezequiel, registre distância/tempo/observações. Bruna e Renato devem continuar como planejados, até registrarem seus próprios resultados.
- Edite em duas contas antes de uma delas sincronizar: a edição com versão antiga deve ficar pendente com aviso de conflito. Exporte as pendências, descarte a operação e refaça com os dados atuais.
- Em modo avião, crie um treino: deve aparecer como pendente, nunca confirmado. Reabra o app com a sessão ainda válida; a pendência deve continuar. Volte à internet e confira a confirmação e a outra conta.
- Teste **Esqueci a senha** e o link recebido após configurar SMTP. Não compartilhe senhas.
- No PWA instalado, use **Nova versão disponível — atualizar** quando aparecer. Os dados locais e a fila não são apagados na atualização. Após longo período offline com sessão expirada, o login pode exigir internet novamente.

## Migração e backups

`ez_bruna_treinos_v1` permanece intacto. A migração usa UUID determinístico por grupo e ID legado. Não substitui a agenda remota. A confirmação informa quantos treinos e resultados próprios serão enviados. “Ambos” no backup antigo continua significando Ezequiel e Bruna; não inclui Renato automaticamente. Espere os dois entrarem no grupo para mapear os respectivos UUIDs.

A mesma sessão legada tem a mesma identidade nos dois aparelhos. Resultado legado só é atribuído à conta que confirma a importação; resultados já existentes são preservados. Backups divergentes com IDs iguais exigem revisão, não uma sobrescrita automática.

**Exportar agenda e pendências** gera um backup v2 com sessões, resultados e operações ainda não enviadas. A importação automática nesta versão aceita o formato antigo v1; a restauração de um backup v2 deve ser revisada por responsável para preservar IDs, membros e conflitos. Não apagar recibos ou recriar IDs para forçar uma importação.

## Segurança e modelo

- `training_groups`, `training_members`, `training_sessions`, `training_results` e `training_operations` com RLS; `anon` não lê a agenda.
- Membros do mesmo grupo leem agenda e resultados. Os três podem alterar planejamento; cada um só escreve seu próprio resultado. Novos atletas são linhas de membros, sem mudança de esquema.
- Autorizações por e-mail ficam em `training_private.authorizations`, fora da API, sem grants de tabela para clientes. Para adicionar alguém, o responsável registra e-mail/nome/grupo nessa tabela pelo servidor. A pessoa confirma sua própria conta.
- Funções privilegiadas somente no schema privado: lookup não recursivo de associação e reivindicação por `auth.uid()`/e-mail confirmado. Nunca usam `user_metadata` para autorizar acesso. Os wrappers públicos são `SECURITY INVOKER` e têm execução revogada de anon/PUBLIC.
- Frontend contém somente URL do projeto e chave publicável. Nenhuma chave administrativa. SDK Supabase fixado em 2.81.1 no CDN; shell e SDK são armazenados para abertura offline após instalação bem-sucedida.
- Escritas pela RPC transacional com UUID da operação e comparação de versão. Exclusão da UI é lógica. Conflitos não sobrescrevem automaticamente o servidor. Fila e cópia local são separadas por conta; sair remove a cópia da agenda, preserva as pendências daquela conta e esvazia a tela.
- Não guardar dispositivos compartilhados com sessão aberta: a sessão e dados offline usam armazenamento do navegador.
- Atualização automática usa polling de 20 s e eventos de foco/conexão. Não depende de habilitar Realtime no projeto.

## Strava individual

OAuth individual validado para Ezequiel (Zepp/Amazfit → Strava) e Bruna (Garmin → Strava); Renato posteriormente. Tokens de acesso/refresh ficam cifrados no Vault; Client Secret somente nos secrets do servidor. Atividades e vínculos recebidos da API são privados por atleta. A relação training_strava_result_activities permite várias gravações em um resultado e impede dupla contagem. Nenhum segredo do Pace Plus foi copiado. Veja docs/strava.md e progress.md.

## Desenvolvimento e validação

Sem build nem dependências npm. `npm test` executa os testes unitários; `npm run check` verifica sintaxe. Em ambiente que permita sockets e tenha Chrome instalado: `node tests/browser-smoke.mjs`. O harness usa backend em memória e perfis isolados, sem contas reais. Gera DOM e capturas mobile/desktop em `test-results/`.

`tests/rls.sql` é uma suíte transacional no projeto dedicado, usa identidades sintéticas e papéis Postgres reais, e encerra com ROLLBACK. Precisa de acesso administrativo para preparar os fixtures; não é enviado ao navegador. Isso valida RLS e RPC, mas não comprova entrega de e-mail, login Auth real ou comportamento específico do Safari/Android.

As fontes SQL em `supabase/` registram as migrações aplicadas pelo conector no projeto remoto. Não reaplicar indiscriminadamente nem executar em outro projeto. Conferir `supabase_migrations.schema_migrations` antes de qualquer retomada.

CI em `.github/workflows/tests.yml`. Publicação permanece por main no GitHub Pages e `CNAME` permanece `treinos.paceplus.app`. Atualizações de app devem incrementar o nome do cache em `sw.js` para instalar um shell novo e consistente.

### Strava automático e gravações separadas — versão 2.2.0

Sincronização automática ativada pelo responsável: corridas novas/alterações no Strava serão recebidas pelo servidor, mesmo com o Treinos fechado. Aguarde o relógio/Zepp/Garmin terminar de enviar ao Strava. O processamento pode levar alguns minutos e depende da disponibilidade/limites do Strava; o botão de sincronização manual continua disponível.

Se o relógio gravou aquecimento, treino principal e desaquecimento separadamente, marque todas as partes em **Meu Strava**, toque em **Vincular atividades selecionadas**, confira os totais e confirme o treino da agenda. O resultado reúne distância e tempo em movimento, com pace calculado pelos totais. Não há agrupamento automático de sessões diferentes nem conclusão dos outros atletas.
