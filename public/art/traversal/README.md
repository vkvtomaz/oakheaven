# Travessia — recursos de ambiente
Criados em 2026-11-19, a partir da direção textual da missão.
- dusk-environment.png: backplate de ambiente (1672×941), sem herói, plataformas ou HUD; ruínas, torre, incêndio, montanhas e raízes/cristais.
- foreground.png: camada RGBA separada (1672×941), detritos baixos nos cantos. Máscara runtime limita a y>=490 no mundo 960×540.
- As duas imagens foram geradas para esta cena. Não são screenshots de execução e não são a imagem-alvo fornecida pelo usuário.
- Integração: loadGameArt → prepareTraversalArt → paintTraversalScene → EnhancedPlatformScene.
- Materiais reutilizados: amostra interior de public/art/wood.png; Kaelen estático do atlas RGBA existente public/art/kaelen/kaelen-se.png e atlas.json.
- Sem alterações nos originais em img/ ou nos dados funcionais da travessia.
- Pendente: comparação visual real com referência 2, kit de arquitetura em camadas independentes e frames laterais de Kaelen.
