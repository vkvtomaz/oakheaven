# OAKHEAVEN — diretrizes para fazer o jogo parecer um jogo

## O que sabemos (contexto inicial; confirmar no repositório)
- OAKHEAVEN é um tower defense 2D com vila/forja de Kaelen, santuário e ameaça alienígena.
- As torres incluem **Balesta de Arco Voltaico**, **Forja de Escória** e **Monólito Repulsor**, evoluindo em tiers; torres combinam madeira, ferro e tecnologia alienígena.
- Existem imagens previamente criadas em uma pasta chamada `img`, que devem ter prioridade sobre desenhos genéricos.
- A engine presumida é PixiJS com TypeScript; detectar a stack real antes de editar.
- O jogo pode conter múltiplas áreas/atos. Primeiro finalizar a cena/fase jogável existente, depois aplicar a mesma linguagem às outras.

## Não tomar como fato sem ver as imagens
A perspectiva (top-down ortográfico, 3/4, isométrico), paleta, resolução, estilo 2D, sprite proportions, disponibilidade de transparência, localização exata dos arquivos e o número de animações são decisões dependentes de evidência real.

## Visual mínimo digno de entrega
- Um mapa com terreno/caminho claramente detalhados e legíveis; sem chão chapado como única solução.
- Arquitetura, vegetação e props usando elementos visuais reais quando disponíveis.
- Entidades principais com silhuetas coerentes: herói, inimigos, torres; contrastando com cenário.
- Efeitos de ataque/impacto que comuniquem feedback; preservar performance.
- HUD funcional e visualmente consistente; sem interferir com controles.
- Arte integrada ao runtime, não apenas em pastas e documentação.

## Material de origem vs asset de jogo
- `reference-only`: ilustração grande de conceito, cena completa, mockup ou imagem com vários elementos não separáveis.
- `needs-prep`: pode ser recortado, limpo, ter transparência melhorada, ou receber padronização de escala sem deformar.
- `ready`: sprite, fundo, tile, UI ou textura aplicável diretamente; ainda precisa de escala e integração.
- `unknown`: precisa avaliação visual adicional.

## Diretrizes de recorte
- Preserve originais e atribua nome inequívoco para derivados.
- Não remova fundo com recortes automáticos se isso destruir silhueta, sombras e detalhes importantes.
- Evite esticar personagem ou cenário em proporção errada; use escala uniforme e enquadramento.
- Não force loop de animação a partir de uma imagem estática.
- Não tratar figuras renderizadas em perspectiva diferente como se compartilhassem um mesmo piso.

## Evidências e documentação
- Criar quando útil `docs/visual/asset-map.md` com arquivo, papel e status; não é pré-requisito para começar implementação.
- Guardar screenshots em `docs/visual/screenshots/` apenas se capturados de verdade. Se não conseguir navegador, orientar teste manual.
- Sempre explicar exatamente o que mudou no código e o que permaneceu incompleto.

## Fontes técnicas (consultar versão instalada)
- https://pixijs.com/8.x/guides/components/assets
- https://pixijs.com/8.x/guides/components/scene-objects/sprite
- https://developers.openai.com/codex/subagents
- https://developers.openai.com/codex/skills
