---
name: oak-visual-qa
description: Validar se os assets do overhaul do OAKHEAVEN aparecem no jogo rodando e se as mecânicas continuam funcionais.
---

# QA do overhaul visual

1. Inspecione comandos existentes. Execute build, testes, lint conforme repositório. Não invente nomes de comandos.
2. Se possível rode servidor local e abra no navegador com a ferramenta disponível. Conferir console, caminhos de assets, PNGs, transparências, ordem de desenho e layout no tamanho de tela do projeto.
3. Se capture screenshot, use o jogo realmente executado; compare com imagens da pasta `img` e com screenshots anteriores, se existirem.
4. Faça smoke-test de gameplay: iniciar fase, inimigos atravessarem caminhos, torres atacarem, saúde/recursos mudarem, input e HUD reagirem; registre o que foi testado automaticamente versus manualmente.
5. Revise se o visual não cobre botões, tira legibilidade ou altera colisões. Indique arquivos, sintomas e correção mínima.
6. Retorne um relatório sucinto: OK / parcialmente verificado / bloqueado, assets carregados, falhas, validações executadas, diferenças restantes. Não invente sucesso.
