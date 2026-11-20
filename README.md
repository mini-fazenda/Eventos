## Novos conjuntos de roupas — cadastro sem atualizar a main do jogo

O Ateliê de Personagens publica os sprites e IDs das peças no repositório `Atelie-minifazenda`. Para usá-los no Passe de Natal, abra o editor online em https://mini-fazenda.github.io/Eventos/ e clique em **＋ Novo conjunto de roupas**. Informe o nome e os IDs de peças já publicados pelo Ateliê, separados por vírgula. O novo conjunto aparece na seleção de **Níveis e prêmios**.

Ao clicar em **Publicar online**, o editor grava o conjunto em `rewards-library.json` e em `event.json.rewardDefinitions`, junto com a distribuição dos níveis. O jogo consulta o manifesto publicado e reconhece **novos conjuntos cosméticos** sem commits adicionais em `mini-fazenda/main`. Cada recompensa continua tendo um ID permanente, único, e o servidor confere progresso, posse e peças desbloqueadas.

**Limites e segurança:** esse fluxo novo é somente para roupas/acessórios já presentes no Ateliê. Animais, decorações e regras de produção ainda exigem cadastro no jogo. O editor não publica sprites do Ateliê nem verifica automaticamente a existência de cada ID nos pacotes do Ateliê: confira se as peças foram realmente publicadas. A integração exige que a VPS esteja usando a versão do jogo com suporte a `rewardDefinitions`; depois dessa atualização única, as próximas adições cosméticas são feitas apenas em Eventos.

---

## 🎄 Editor online — publicar direto do GitHub Pages

> **Estado em 18/11/2026:** o editor está publicado; a configuração atual de `event.json` tem metas de 1 a 10 estrelas e nove IDs posicionados no passe. Valores do evento são editáveis: não presuma que exemplos antigos deste documento continuam atuais. Os oito itens novos ainda dependem de seus arquivos em `mini-fazenda/mini-fazenda`, branch `atualizacao-de-natal`, pasta `public/assets/rewards/natal/`. O menu pode mostrar os nomes antes de esses arquivos estarem disponíveis, mas o recebimento visual completo depende da implantação do jogo com as artes.



**Editor completo:** https://mini-fazenda.github.io/Eventos/  
**Menu usado pelo jogo:** https://mini-fazenda.github.io/Eventos/menu.html

O index.html publica o **Ateliê de Natal v28** com composição global dos prêmios, camadas, GIFs, fundos, materiais, receitas, música, prévia e as ferramentas da versão local. O editor carrega sempre a configuração publicada em Eventos/main pela API do GitHub: natal-layout-v28.json, event.json e rewards-library.json.

### Edição e publicação

1. Entre no editor online e altere layout, imagens, estrelas, receitas ou escolha os IDs cadastrados em **🎁 Níveis e prêmios**.
2. Confira o resultado na prévia. O nível 1 gratuito já está configurado com **4 estrelas** e o ID natal-2026-roupas-nivel-1.
3. Clique em **☁ Publicar online (GitHub)**. Informe um fine-grained PAT de validade curta com Contents: Read and write, limitado **somente a mini-fazenda/Eventos**.
4. O navegador separa os PNGs/GIFs/áudios novos em assets/editor/<hash>.<ext> e grava tudo em **um único commit** em Eventos/main: mídia, layout, event.json e biblioteca.
5. Após o deploy do GitHub Pages, o jogo consulta o event.json publicado quando o jogador abre o evento. **Não é preciso alterar a branch do jogo para editar menu, metas ou mover IDs já cadastrados.**

O token não é salvo em armazenamento persistente nem enviado para o repositório. A publicação é restrita ao endereço oficial https://mini-fazenda.github.io/Eventos/. O editor detecta modificações concorrentes na main e interrompe a publicação para evitar perda de dados. Se houver erro, o ZIP continua sendo a opção de backup e migração.

O cadastro de **novos** prêmios, suas artes permanentes, regras de produção e entrega continuam em mini-fazenda/mini-fazenda, branch atualizacao-de-natal. **Não alterar a main do jogo.** A validação do jogo/servidor usa o catálogo permanente para descrever o prêmio, e event.json para localizar nível, trilha e quantidade de estrelas. Resgates são armazenados por ID permanente.

**Atenção à implantação:** o GitHub Pages não publica a branch da VPS. Atualizações exclusivas no jogo exigem implantar atualizacao-de-natal no ambiente que executa o jogo/servidor. Os oito prêmios novos estão cadastrados no catálogo, mas as artes correspondentes ainda precisam ser incluídas em public/assets/rewards/natal/ nessa branch antes de serem oferecidos aos jogadores. Não atribua um desses IDs sem as artes.

---

# Eventos — Mini Fazenda / Vila da Colheita

## Passe e recompensas permanentes

`event.json` contém `pass.rewards.free` e `pass.rewards.premium`, com dez IDs ou `null` em cada trilha. **Teste do nível 1 (18/11/2026): 4 estrelas**, recompensa gratuita `natal-2026-roupas-nivel-1`, que desbloqueia dois IDs de peças no Ateliê. Os outros 19 espaços mostram **Em preparação**, sem resgate; níveis 2–10 permanecem com as metas anteriores. O jogo confere o ID no catálogo permanente e devolve nome, disponibilidade e situação do resgate para o menu.

O catálogo permanente e as artes de animais/decorações ficam no jogo, na branch `atualizacao-de-natal`, em `public/rewards/catalog.json` e `public/assets/rewards/`. Roupas são publicadas no Ateliê como **Somente recompensa (desbloqueável)**. O recibo privado de resgate desbloqueia as peças, sem compra.

Para adicionar prêmios, seguir [o guia no jogo](https://github.com/mini-fazenda/mini-fazenda/blob/atualizacao-de-natal/docs/recompensas-permanentes.md). Não renomear IDs após resgates. Não guardar artes permanentes neste pacote temporário. A main do jogo não foi alterada.

## Biblioteca de recompensas do Natal (18/11/2026)

A biblioteca `rewards-library.json` agora identifica **oito novos prêmios permanentes por ID estável**, além do conjunto de roupas do nível 1. São seis animais (cavalo cosplay de rena, gatinho bege, porquinho saxofonista, urso polar, elfo e elfa) e duas decorações (poço e trenó). Todos os novos prêmios começam **sem atribuição**; portanto, `event.json` continua concedendo somente a roupa gratuita do nível 1 por quatro estrelas.

O editor de eventos atualizado permite escolher os IDs na biblioteca visual e exporta **dois arquivos sincronizados**: `event.json` para este repositório (main) e `catalog-recompensas-jogo.json` para o arquivo `public/rewards/catalog.json` do jogo (exclusivamente na branch `atualizacao-de-natal`). É necessário publicar os dois juntos, com suas mídias em `public/assets/rewards/natal/`, para habilitar o resgate. Nunca atribua o mesmo prêmio a dois slots.

A `main` do jogo não deve receber essas alterações. O Ateliê só requer atualização quando novas roupas forem cadastradas; os oito prêmios listados aqui não são peças do Ateliê.

## Histórico e demais sistemas

As notas abaixo sobre prêmios SVG provisórios e roupas futuras descrevem o protótipo anterior; o guia acima substitui esse cadastro.

# Eventos — Mini Fazenda / Vila da Colheita

Repositório público de **interface e missões configuráveis** para eventos sazonais da Mini Fazenda. A lógica de persistência e o catálogo permanente de prêmios ficam no [jogo principal](https://github.com/mini-fazenda/mini-fazenda/tree/evento-de-natal), **não** neste repositório.

## Evento atual: Oficina do Fazendeiro Noel 🎄

- `menu.html`, `menu.css`, `menu.js`: interface carregada em um iframe dentro da fazenda, com duas abas: **Fábrica de Presentes** e **Passe de Natal**.
- `event.json`: missões de fabricação, probabilidades de recebimento de materiais e limiares dos 10 níveis do passe.
- `.github/workflows/pages.yml`: publica este repositório em GitHub Pages, sem mexer no repositório do jogo.
- A fábrica oferece **3 pedidos simultâneos**. Ao concluir um, outro é selecionado.
- O jogo principal recebe e valida solicitações via `postMessage` e faz o save no servidor. O menu isolado nunca concede recursos.

## Publicação necessária

1. Acesse **Settings → Pages** deste repositório e escolha **GitHub Actions** em Build and deployment.
2. Vá a **Actions → Publicar menu de eventos** e reexecute o fluxo se a primeira tentativa falhou.
3. Confirme estas URLs:
   - https://mini-fazenda.github.io/Eventos/event.json
   - https://mini-fazenda.github.io/Eventos/menu.html
4. Para testar a integração com uma fazenda, execute a **branch de testes** `evento-de-natal` do jogo em um ambiente de homologação (não substitua a produção).
5. As doações entre contas requerem que `database.rules.json` da branch de testes esteja aplicado no servidor desse ambiente.

O fluxo do GitHub Actions falha com **Get Pages site failed / Not Found** enquanto GitHub Pages não estiver configurado. Sem essa configuração, o jogo preserva o progresso da fazenda e oferece uma tela de coleção/indisponibilidade.

## Onde salvar os prêmios?

Sempre no repositório do jogo: `eventRewardsOwned`, `eventProgress` e os objetos já guardados em `storedObjects` ficam no save privado do jogador. Desligar, trocar ou excluir o evento não deve afetar prêmios resgatados.

Não insira caminhos de imagens de recompensas permanentes em um pacote temporário que será removido no fim da temporada. Por enquanto, todas as decorações usam um sprite SVG genérico mantido no repositório do jogo.

**Estado:** protótipo funcional de mecânicas e interface; publicação do Pages, teste de duas contas e teste integrado na VPS de homologação ainda pendentes. Não há cobrança real do Premium nem prêmio animal mecânico neste estágio.


## 🎅 Salão de Natal (branch de desenvolvimento)

A interface social foi separada da Fábrica e do Passe, nos arquivos:
- `salao-entry.js`: adiciona o terceiro botão ao menu existente;
- `salao.html`, `salao.css`, `salao.js`: cenário 2D navegável, chat, movimento, assentos e animações;
- `assets/natal/`: GIFs e presentes existentes, reutilizados no salão.

O repositório **não contém credenciais Firebase, acesso ao SQLite ou código do servidor**. O jogo principal valida a sessão Google, emite um ingresso descartável por meio do servidor Node da VPS e o entrega ao iframe com `postMessage` e origem restrita. O cliente do salão conecta-se à API WebSocket da Vila da Colheita, sem gravar mensagens ou posições no banco.

**Primeira versão:** sala social, sem recompensas, missões ou minigames. Papai Noel, lareira, árvore e presentes são decorativos/interativos.

**Teste:** clone este repositório na branch `feature/salao-de-natal-multiplayer` ao lado do repositório `mini-fazenda` na branch `feature/integracao-salao-natal`; no repositório do jogo execute `Testar-Salao-Natal.bat` (Windows) ou `bash Testar-Salao-Natal.sh` (Linux). O teste local usa um servidor falso isolado e não acessa dados de produção.

**Atenção:** GitHub Pages publica a branch configurada para Pages (hoje `main`); criar esta branch não torna seu `salao.html` disponível publicamente na URL de produção. Fazer integração e publicar somente após homologação.
