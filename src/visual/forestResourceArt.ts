import { Graphics, Sprite, Texture } from 'pixi.js';
import type { ResourceNodeKind } from '../data/expedition';

const textures = new Map<ResourceNodeKind, Texture>();
const widths: Record<ResourceNodeKind, number> = {
  tree: 104, scrap: 79, crystal: 66, remains: 76,
};

/** Prepare static scenery fragments from the already loaded forest concept.
 * These outlined cutouts retain a small soil fringe, not a perfect alpha mask.
 * No dependency on the unfinished /art/forest-resources export folder.
 */
export function prepareForestResourceArt(source: CanvasImageSource, iron: Texture): void {
  if (textures.size === 4) return;
  const outlines: Partial<Record<ResourceNodeKind, number[][]>> = {
    // Fallen oak with moss and a broken end, away from the source labels.
    tree: [[558,270],[568,251],[599,243],[633,255],[666,271],[704,283],
      [727,295],[715,313],[699,318],[704,339],[674,330],[659,317],[618,306],[579,289]],
    crystal: [[820,478],[824,448],[831,432],[844,442],[846,425],[868,405],
      [877,437],[888,432],[891,452],[879,472],[866,483],[838,488]],
    // Static shed shell/carcass; never reuse the upright scout enemy portrait.
    remains: [[1014,594],[1041,569],[1077,554],[1097,563],[1094,544],
      [1127,550],[1138,520],[1151,516],[1158,540],[1190,531],[1239,533],
      [1264,550],[1276,578],[1260,603],[1295,620],[1303,635],[1261,624],
      [1230,614],[1212,634],[1196,654],[1151,699],[1164,663],[1177,636],
      [1158,625],[1137,648],[1120,650],[1100,637],[1074,645],[1073,630],
      [1090,610],[1080,592],[1047,593],[1022,602]],
  };
  for (const [kind, points] of Object.entries(outlines)) {
    const minX = Math.min(...points.map(p => p[0]!)) - 2;
    const minY = Math.min(...points.map(p => p[1]!)) - 2;
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(...points.map(p => p[0]!)) - minX + 2;
    canvas.height = Math.max(...points.map(p => p[1]!)) - minY + 2;
    const ctx = canvas.getContext('2d')!;
    ctx.beginPath();
    points.forEach(([x, y], i) => i ? ctx.lineTo(x! - minX, y! - minY) : ctx.moveTo(x! - minX, y! - minY));
    ctx.closePath(); ctx.clip();
    ctx.drawImage(source, minX, minY, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
    textures.set(kind as ResourceNodeKind, Texture.from(canvas));
  }
  textures.set('scrap', iron);
}

/** Root stays exactly at the original harvesting position; only art varies. */
export function createForestResource(kind: ResourceNodeKind, x: number, y: number): Graphics {
  const texture = textures.get(kind);
  if (!texture) throw new Error(`Forest resource art not loaded: ${kind}`);
  const variation = ((x * 17 + y * 31) % 19) / 19;
  const width = widths[kind] * (.94 + variation * .12);
  const root = new Graphics()
    .ellipse(0, 0, width * .45, width * .13).fill({ color: 0x111914, alpha: .12 })
    .ellipse(0, -2, width * .30, width * .08).fill({ color: 0x050b0b, alpha: .24 });
  const sprite = new Sprite(texture);
  sprite.anchor.set(.5, 1);
  sprite.scale.set(width / texture.width);
  // The tiny soil fringe sinks into the terrain; no floating inventory shadow.
  sprite.y = 6;
  sprite.rotation = (variation - .5) * .08;
  sprite.tint = x > 700 ? 0xb6b6c8 : 0xcbd0b8;
  sprite.eventMode = 'none';
  root.addChild(sprite);
  root.position.set(x, y); root.zIndex = y; root.eventMode = 'none';
  return root;
}
