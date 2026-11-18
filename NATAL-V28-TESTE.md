# Atualização de Natal — testes da interface v28

Esta branch não altera `mini-fazenda/mini-fazenda` nem a `main` deste repositório.

## Integração de interface
- `natal-runtime.js` já é compatível com as exportações do Ateliê v28 (600 × 560) e tenta carregar `natal-layout-v28.json`.
- Se o novo JSON ainda não tiver sido publicado, o runtime utiliza `natal-layout-v21.json` como fallback.
- Os 48 arquivos de mídia e o layout v28 são distribuídos no pacote de publicação separado, pois o ZIP exportado do Ateliê contém cerca de 115 MB de imagens/áudio embutidos no JSON. **Sem enviar esses arquivos ao repositório, a nova arte não aparece.**
- O renderizador solicita somente ações `craft`, `claim`, `buy-level`, `buy-premium` e `donate`; nenhuma recompensa é concedida pela interface.

## Limitação para desbloqueio
A trava antes de 19/11/2026 05:10:30 UTC−03:00 está no repositório do jogo, em `public/events/seasons/natal/adapter.js` (`EVENT_RELEASE_AT`, `untilRelease`, `canPlay` e `showReleaseMessage`). Mudar apenas `Eventos` não libera o ícone no jogo. Para testar a interação real, é preciso desbloquear o adaptador **num ambiente de homologação do jogo**, sem publicar na `main` de produção.

O GitHub Pages de produção normalmente publica `main`; uma branch de desenvolvimento não muda o site publicado automaticamente.
