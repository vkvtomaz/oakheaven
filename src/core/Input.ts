
export class Input {
  private down = new Set<string>();
  private pressed = new Set<string>();

  constructor() {
    window.addEventListener('keydown', (event) => {
      const blocked = [
        'Space',
        'ArrowUp',
        'ArrowDown',
        'ArrowLeft',
        'ArrowRight',
      ];

      if (blocked.includes(event.code)) {
        event.preventDefault();
      }

      if (!this.down.has(event.code)) {
        this.pressed.add(event.code);
      }

      this.down.add(event.code);
    });

    window.addEventListener('keyup', (event) => {
      this.down.delete(event.code);
    });

    window.addEventListener('blur', () => {
      this.down.clear();
      this.pressed.clear();
    });
  }

  isDown(...codes: string[]): boolean {
    return codes.some((code) => this.down.has(code));
  }

  wasPressed(code: string): boolean {
    return this.pressed.has(code);
  }

  endFrame(): void {
    this.pressed.clear();
  }
}
