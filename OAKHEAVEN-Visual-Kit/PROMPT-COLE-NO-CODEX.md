# Cole SOMENTE o texto abaixo na conversa do Codex (aberta na raiz do OAKHEAVEN)

Use `$oak-ship-visual` e leia o `AGENTS.md` + `docs/OAK-VISUAL-PLAYBOOK.md`.

**EXECUTE AGORA, NÃO APENAS PLANEJE.** O objetivo é transformar o visual do OAKHEAVEN usando as imagens reais que já existem em `img/` (ou o caminho equivalente encontrado no projeto), preservando a jogabilidade existente. Não faça mockup separado, não recrie o projeto e não substitua imagens aplicáveis por círculos/retângulos por comodidade.

Trabalhe neste fluxo, sem me interromper por decisões pequenas e reversíveis:

1. Inspecione brevemente o projeto, o motor/render loop, o `package.json`, o estado do git e as imagens de `img`. Classifique os arquivos como sprites prontos, arte que requer preparo e referências de estilo. Se possível, use `python tools/oak_asset_inventory.py --root . --output docs/visual` para inventário e contact sheets. **Olhe as imagens**, não só seus nomes.
2. Se disponível, delegue para `oak_asset_curator` e `oak_art_director` uma análise rápida em paralelo (somente leitura). O coordenador ou `oak_pixi_artist` deve fazer a integração com propriedade exclusiva dos arquivos de código. Sem subagentes? Execute sequencialmente, sem interromper.
3. **Implemente o visual diretamente na primeira fase JOGÁVEL do jogo:** chão, caminhos, vegetação/construções, herói, torres, inimigos, efeitos básicos e HUD, usando o máximo de assets coerentes de `img`. Prepare recortes/transparências sem alterar os originais. Respeite perspectiva, escala, ordenação de camadas, sprites e performance.
4. Preserve movimentação, ondas, ataques, pathfinding, dano, economia, input e progressão. Não reescreva engine nem substitua arquitetura por uma demo. Evite dependências novas desnecessárias.
5. Depois de tornar a primeira fase apresentável, aplique componentes reutilizáveis às outras fases viáveis. Não pare para redigir um plano extenso ou pedir autorização para cada arquivo.
6. Rode os comandos reais de build/testes. Se tiver navegador/ferramenta, abra o jogo e confira os sprites, o console e screenshots reais; corrija erros encontrados. Se não puder abrir, diga isso expressamente, sem afirmar visual pronto.
7. Ao final, mostre (a) quais imagens foram usadas e onde aparecem, (b) arquivos alterados, (c) testes executados e resultado, (d) o que ainda é placeholder e por quê, (e) comando para eu jogar imediatamente.

**Prioridade: uma versão jogável visualmente convincente, não uma documentação bonita.** Tome as melhores decisões seguras com o material existente. Não comite, dê push ou faça deploy.
