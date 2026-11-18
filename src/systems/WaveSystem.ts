
export type WaveNumber = 1 | 2 | 3;

export type WavePhase =
  | 'preparation'
  | 'combat'
  | 'victory'
  | 'defeat';

export type EnemyKind =
  | 'scout'
  | 'brute'
  | 'alpha';

export interface WaveConfig {
  name: string;
  enemyCount: number;
  spawnInterval: number;
  woodReward: number;
  schedule?: readonly EnemyKind[];
  spawnDelays?: readonly number[];
}


export const WAVES: Record<WaveNumber, WaveConfig> = {
  // WAVE 1 — Primeira incursão
  1: {
    name: 'A Incursao',
    enemyCount: 8,
    spawnInterval: 48,
    woodReward: 2,
  },

  // WAVE 2 — Inimigos mais numerosos
  2: {
    name: 'O Cerco',
    enemyCount: 12,
    spawnInterval: 40,
    woodReward: 3,
  },

  // WAVE 3 — Ataque decisivo
  3: {
    name: 'A Ultima Linha',
    enemyCount: 16,
    spawnInterval: 34,
    woodReward: 0,
    schedule: [
      'scout', 'scout', 'scout',
      'scout', 'brute', 'scout',
      'scout', 'scout', 'scout',
      'scout', 'brute', 'scout',
      'scout', 'scout', 'brute',
      'alpha',
    ],
    spawnDelays: [
      70, 28, 28,
      58, 28, 28,
      68, 28, 28,
      58, 28, 28,
      78, 28, 34,
      110,
    ],
  },
};


export class WaveSystem {
  phase: WavePhase = 'preparation';
  currentWave: WaveNumber = 1;
  spawned = 0;

  private timer = 0;
  private schedule: EnemyKind[] = [];

  get config(): WaveConfig {
    return WAVES[this.currentWave];
  }

  startWave(): boolean {
    if (this.phase !== 'preparation') {
      return false;
    }

    this.phase = 'combat';
    this.spawned = 0;
    this.timer = 0;
    this.schedule = [];

    if (this.config.schedule) {
      this.schedule = [...this.config.schedule];
      return true;
    }

    for (let i = 0; i < this.config.enemyCount; i++) {
      let kind: EnemyKind = 'scout';

      if (
        this.currentWave === 3 &&
        i === this.config.enemyCount - 1
      ) {
        kind = 'alpha';
      } else if (
        this.currentWave >= 2 &&
        i % 3 === 2
      ) {
        kind = 'brute';
      }

      this.schedule.push(kind);
    }

    return true;
  }

  update(dt: number): EnemyKind[] {
    if (this.phase !== 'combat') {
      return [];
    }

    this.timer += dt;

    const toSpawn: EnemyKind[] = [];

    while (
      this.spawned < this.schedule.length &&
      this.timer >= this.getNextSpawnDelay()
    ) {
      this.timer -= this.getNextSpawnDelay();

      toSpawn.push(this.schedule[this.spawned]);
      this.spawned++;
    }

    return toSpawn;
  }

  private getNextSpawnDelay(): number {
    return this.config.spawnDelays?.[this.spawned] ??
      this.config.spawnInterval;
  }

  isComplete(activeEnemies: number): boolean {
    return (
      this.phase === 'combat' &&
      this.spawned === this.config.enemyCount &&
      activeEnemies === 0
    );
  }

  completeWave(): {
    finishedNight: boolean;
    woodReward: number;
  } {
    if (this.currentWave === 3) {
      this.phase = 'victory';

      return {
        finishedNight: true,
        woodReward: 0,
      };
    }

    const reward = this.config.woodReward;

    this.currentWave =
      (this.currentWave + 1) as WaveNumber;

    this.phase = 'preparation';
    this.spawned = 0;
    this.timer = 0;

    return {
      finishedNight: false,
      woodReward: reward,
    };
  }

  lose(): void {
    this.phase = 'defeat';
  }
}
