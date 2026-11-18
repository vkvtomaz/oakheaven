# OAKHEAVEN — Codex Visual Kit (pacote rápido)

Este kit acrescenta instruções, agentes e Skills ao **OAKHEAVEN que você já possui**. Não contém os arquivos de código do jogo nem as imagens. Não requer Claude. Ele não pode melhorar o jogo até que você o instale no repositório real e mande o Codex executar o prompt.

## Instalação mais fácil (Windows)

1. Coloque o ZIP **dentro da pasta RAIZ do seu projeto OAKHEAVEN** (a pasta que contém `package.json`, `.git` ou `src`).
2. Extraia o ZIP **aqui**, de forma que surja a subpasta `OAKHEAVEN-Visual-Kit` dentro da pasta do projeto.
3. Abra a subpasta extraída e **execute `INSTALAR.bat`** (duplo clique). O instalador copia os arquivos para a pasta PAI (o projeto). Confirme na janela o caminho-alvo antes de continuar.
4. Se aparecer erro de permissão do Windows ou preferir instalar manualmente, copie o conteúdo de `.codex/`, `.agents/` e `docs/` e `tools/` para a **raiz do projeto**. Para `AGENTS.md`, adicione o bloco do kit ao final do seu arquivo, sem apagar instruções já existentes. Para `.codex/config.toml`, mantenha o que você já tem, sem sobrescrever.
5. Abra o Codex na **pasta do jogo**, não na pasta do kit. Inicie uma conversa NOVA (ou reinicie o Codex se a Skill não aparecer). Cole o texto dentro de `PROMPT-COLE-NO-CODEX.md`.

## Instalação pelo terminal (alternativa)

Estando no terminal aberto na pasta `OAKHEAVEN-Visual-Kit`, execute:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\INSTALAR.ps1 -Projeto ..
```

Se extraiu o pacote fora do projeto, substitua `..` pelo caminho da raiz do OAKHEAVEN, entre aspas.

## Como confirmar que funcionou

- Na raiz real do jogo devem existir `.agents/skills/oak-ship-visual/SKILL.md`, `.codex/agents/oak-pixi-artist.toml` e `docs/OAK-VISUAL-PLAYBOOK.md`.
- Na conversa Codex, mencione `$oak-ship-visual` (se necessário, reinicie a conversa).
- Você pode perguntar "leia AGENTS.md e confirme se reconheceu $oak-ship-visual", mas o melhor é colar logo o prompt de execução.

## O que esperar / limites

- Este kit foi validado quanto à estrutura, aos formatos TOML e aos arquivos. **Não foi executado no OAKHEAVEN real** (não recebemos a pasta do projeto nesta conversa).
- Referências visuais podem NÃO ser sprites recortados e prontos. O Codex deve aproveitar tudo que for tecnicamente viável e declarar lacunas, sem inventar que gerou frames/arte que não possui.
- A versão visual depende do código, da qualidade das imagens, do acesso do Codex ao projeto e da sua capacidade de executar e testar o jogo.
- Agentes definidos no kit são especialistas de instrução; não modelos independentes nem produção artística garantida.
- Caso você já tenha instalado o starter/v2 anterior, esta versão utiliza nomes novos e instala sem apagar os arquivos anteriores. O instalador acrescenta uma seção ao `AGENTS.md` existente (com marcador para não repetir).
- Scripts Python são opcionais. O inventário funciona sem pacotes de terceiros; contact sheets necessitam Pillow já instalado (o script não instala dependências).

## Se Codex disser que a pasta img só tem concepts

Peça: "Use o máximo de referências como fundos e elementos compatíveis, prepare recortes seguros dos objetos quando possível e faça a melhor versão realista. Não finja sprites ou animações inexistentes."

## Arquivos importantes

- `AGENTS.md` — regras fixas do Codex para o projeto.
- `.codex/agents/*.toml` — cinco especialistas opcionais.
- `.agents/skills/oak-ship-visual/SKILL.md` — orquestração de entrega.
- `.agents/skills/oak-asset-audit/SKILL.md` — leitura e mapeamento de imagens.
- `.agents/skills/oak-pixi-integration/SKILL.md` — implementação de texturas/sprites.
- `.agents/skills/oak-visual-qa/SKILL.md` — validação visual e regressões.
- `docs/OAK-VISUAL-PLAYBOOK.md` — guia de critérios de arte.
- `tools/oak_asset_inventory.py` — inventário opcional e contact sheets.
- `PROMPT-COLE-NO-CODEX.md` — comando único para executar a transformação.

Docs oficiais: https://developers.openai.com/codex/subagents · https://developers.openai.com/codex/skills
