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
