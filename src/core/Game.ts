
import { Application } from 'pixi.js';

import { Input } from './Input';

import {
  createInitialState,
  type GameState,
} from './GameState';

import type { Scene } from './Scene';
import type { WaveSystem } from '../systems/WaveSystem';
import {
  getExpeditionReport,
  updateDaylight,
} from '../systems/ExpeditionSystem';
import { LastStandScene } from '../scenes/LastStandScene';
import { EnhancedPlatformScene } from '../scenes/EnhancedPlatformScene';
import { ForestScene } from '../scenes/ForestScene';
import { DefenseScene } from '../scenes/DefenseScene';
import { TitleScene } from '../scenes/TitleScene';
import { SoundFX } from '../audio/SoundFX';

export type SceneId =
  | 'title'
  | 'platform-out'
  | 'forest'
  | 'platform-back'
  | 'defense'
  | 'last-stand';

export class Game {
  readonly app: Application;
  readonly input = new Input();
  readonly audio = new SoundFX();

  state: GameState;

  private scene: Scene | null = null;
  private currentSceneId!: SceneId;

  constructor(app: Application, initialSceneId: SceneId = 'title') {
    this.app = app;
    this.state = createInitialState();

    this.changeScene(initialSceneId);

    this.app.ticker.add((ticker) => {
      const dt = Math.min(ticker.deltaTime, 2);

      if (this.input.wasPressed('KeyM')) {
        const muted = this.audio.toggleMute();
        console.info(`[OAKHEAVEN] Audio ${muted ? 'mutado' : 'ativado'}.`);
      }

      // Contagem de tempo durante toda a expedição
      if (
        this.currentSceneId !== 'title' &&
        this.currentSceneId !== 'defense' &&
        this.currentSceneId !== 'last-stand'
      ) {
        const elapsedSeconds = Math.min(
          ticker.deltaMS / 1000,
          0.1
        );

        const nightfall = updateDaylight(
          this.state,
          elapsedSeconds
        );

        if (nightfall) {
          console.info(
            '[OAKHEAVEN] Expedicao concluida:',
            getExpeditionReport(this.state)
          );
          this.changeScene('defense');
        }
      }

      this.scene?.update(this, dt);
      this.input.endFrame();
    });
  }

  changeScene(sceneId: SceneId, waves?: WaveSystem): void {
    this.scene?.exit?.(this);
    this.currentSceneId = sceneId;

    for (const child of this.app.stage.removeChildren()) {
      child.destroy({ children: true });
    }

    switch (sceneId) {
      case 'title':
        this.scene = new TitleScene();
        break;

      case 'platform-out':
        this.scene = new EnhancedPlatformScene(false);
        break;

      case 'forest':
        this.scene = new ForestScene();
        break;

      case 'platform-back':
        this.scene = new EnhancedPlatformScene(true);
        break;

      case 'defense':
        this.scene = new DefenseScene();
        break;

      case 'last-stand':
        if (!waves) {
          throw new Error(
            'A Ultima Linha precisa do WaveSystem existente.'
          );
        }

        this.scene = new LastStandScene(waves);
        break;
    }

    this.scene.enter(this);
  }

  restart(): void {
    this.state = createInitialState();
    this.changeScene('title');
  }
}
