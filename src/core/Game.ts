
import { Application } from 'pixi.js';

import { Input } from './Input';

import {
  createInitialState,
  type GameState,
} from './GameState';

import type { Scene } from './Scene';
import type { WaveSystem } from '../systems/WaveSystem';
import { updateDaylight } from '../systems/ExpeditionSystem';
import { LastStandArenaScene } from '../scenes/LastStandArenaScene';
import { PlatformScene } from '../scenes/PlatformScene';
import { ForestScene } from '../scenes/ForestScene';
import { DefenseScene } from '../scenes/DefenseScene';

export type SceneId =
  | 'platform-out'
  | 'forest'
  | 'platform-back'
  | 'defense'
  | 'last-stand';

export class Game {
  readonly app: Application;
  readonly input = new Input();

  state: GameState;

  private scene: Scene | null = null;
  private currentSceneId!: SceneId;

  constructor(app: Application) {
    this.app = app;
    this.state = createInitialState();

    this.changeScene('platform-out');

    this.app.ticker.add((ticker) => {
      const dt = Math.min(ticker.deltaTime, 2);

      // Contagem de tempo durante toda a expedição
      if (
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
      case 'platform-out':
        this.scene = new PlatformScene(false);
        break;

      case 'forest':
        this.scene = new ForestScene();
        break;

      case 'platform-back':
        this.scene = new PlatformScene(true);
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

        this.scene = new LastStandArenaScene(waves);
        break;
    }

    this.scene.enter(this);
  }

  restart(): void {
    this.state = createInitialState();
    this.changeScene('platform-out');
  }
}
