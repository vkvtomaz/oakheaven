---
name: oak-pixi-integration
description: Converter assets utilizáveis de img em sprites, cenários e efeitos no motor 2D existente de OAKHEAVEN, mantendo a lógica atual.
---

# Integração visual no jogo real

- Identifique versão da engine e de PixiJS no `package.json`; confirme API pelo código instalado. Se não for PixiJS, adapte ao renderer existente, sem trocar engine.
- Identifique entidades e representações temporárias nas cenas atuais. Associe asset concreto -> classe/objeto -> escala esperada -> z-order -> estado. Não renomeie APIs públicas sem necessidade.
- Integre assets pelos caminhos que o build de fato expõe. Em Vite, diretórios arbitrários na raiz não são necessariamente servidos: use diretório `public` ou imports gerenciados pelo bundler; prefira reaproveitar pipeline já existente. Cópias derivadas devem ficar separadas da fonte.
- Para PNG/JPEG/WebP, carregar texturas e usar sprites no runtime; `Sprite` e `Assets` são opções em PixiJS v8. Evite consultas síncronas ou carregamento por frame.
- Escala em unidades do mundo; `anchor` ou `pivot` coerente, normalmente bottom-center para entidades verticais. Manter hitboxes e posições independentes do tamanho visual; nunca redimensionar hitboxes sem evidência.
- Respeite perspectiva e ordenação entre terreno, caminhos, objetos, unidades, efeitos e UI; se houver y-sort no motor, reutilizar.
- Background completo de concept art não é textura repetível de chão; usar apenas como cenário/fundo se enquadramento e gameplay permitirem. Não esticar sem preservar proporção.
- Para imagens com fundo embutido, avaliar recorte/transparência. Prepare derivados sem alterar originais, documentando fonte e tratamento. Não invente frames que não existem.
- Mantenha trilha de fallback não destrutiva para arquivos ausentes no desenvolvimento, mas não esconda erros em produção. Fallback geométrico não é considerado arte pronta.
- Integre ao menos um efeito de combate com arte apropriada quando houver; não interrompa a física/mecânica.
- Verifique o diff e compile antes de avançar para outra cena. Se render não aparece, identifique o motivo em vez de marcar a tarefa concluída.
