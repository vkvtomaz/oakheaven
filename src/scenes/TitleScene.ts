import { Graphics, Sprite } from 'pixi.js';

import type { Game } from '../core/Game';
import type { Scene } from '../core/Scene';
import { drawText } from '../core/draw';
import { VISUAL_ASSETS } from '../visual/assets';
import { THEME } from '../visual/theme';
import { drawHudPanel } from '../visual/ui';

export class TitleScene implements Scene {
  enter(game: Game): void {
    const stage = game.app.stage;
    const background = Sprite.from(VISUAL_ASSETS.cover);
    background.width = 960;
    background.height = 540;
    stage.addChild(background);

    stage.addChild(
      new Graphics()
        .rect(0, 0, 960, 540)
        .fill({ color: 0x080a11, alpha: 0.42 })
        .rect(0, 0, 960, 120)
        .fill({ color: THEME.colors.slate, alpha: 0.72 })
    );

    drawText(stage, 'OAKHEAVEN', 38, 24, 48, THEME.colors.sanctuaryGlow);
    drawText(
      stage,
      'A ULTIMA LINHA',
      43,
      78,
      19,
      THEME.colors.textMuted
    );

    drawHudPanel(stage, 35, 350, 465, 150, 0.88);
    drawText(
      stage,
      'Proteja onde Elena, Toren e Lyra descansam.',
      58,
      372,
      20,
      THEME.colors.sanctuaryGlow
    );
    drawText(
      stage,
      'Colete antes do anoitecer. Erga as defesas.\nQuando a ultima linha cair, empunhe o martelo.',
      58,
      410,
      16,
      THEME.colors.text
    );
    drawText(
      stage,
      'ENTER ou ESPACO — INICIAR EXPEDICAO',
      58,
      467,
      17,
      THEME.colors.voltaicGlow
    );
    drawText(stage, 'M — ATIVAR/DESATIVAR AUDIO', 584, 498, 14, THEME.colors.textMuted);
  }

  update(game: Game): void {
    if (
      game.input.wasPressed('Enter') ||
      game.input.wasPressed('Space')
    ) {
      game.audio.initialize();
      game.audio.play('uiStart');
      game.changeScene('platform-out');
    }
  }
}
