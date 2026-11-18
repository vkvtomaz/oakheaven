import type { Game } from './Game';

export interface Scene {
  enter(game: Game): void;
  update(game: Game, dt: number): void;
  exit?(game: Game): void;
}
