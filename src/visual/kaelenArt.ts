import { Assets, Rectangle, Texture, type Graphics, type Sprite } from 'pixi.js';
import { createKaelenAnimation, type KaelenAnimation, type KaelenAnimationClips, type KaelenAnimationState } from './kaelenAnimation';

interface AtlasRect { x: number; y: number; width: number; height: number }
interface KaelenAtlas {
  image: string;
  cell: { width: number; height: number };
  pivot: { x: number; y: number };
  bodyHeight: number;
  clips: Record<KaelenAnimationState, { frameTicks: number; frames: AtlasRect[] }>;
}
const base = import.meta.env.BASE_URL + 'art/kaelen/';
let atlas: KaelenAtlas | undefined;
let clips: KaelenAnimationClips;

/** Decode once; every animation texture shares one atlas source. */
export async function loadKaelenArt(): Promise<void> {
  if (atlas) return;
  const manifest = await Assets.load<KaelenAtlas>(base + 'atlas.json');
  if (manifest.image !== 'kaelen-se.png' || !(manifest.bodyHeight > 0)
    || !(manifest.cell.width > 0) || !(manifest.cell.height > 0)) {
    throw new Error('Atlas de Kaelen inválido: imagem ou dimensões.');
  }
  const sheet = await Assets.load<Texture>(base + manifest.image);
  const prepared: KaelenAnimationClips = {};
  for (const state of ['idle', 'walk', 'attack', 'hurt'] as const) {
    const clip = manifest.clips[state];
    if (!clip || !clip.frames.length || !(clip.frameTicks > 0)) {
      throw new Error('Clip de Kaelen ausente/inválido: ' + state);
    }
    prepared[state] = {
      frameTicks: clip.frameTicks,
      frames: clip.frames.map(rect => {
        if (rect.x < 0 || rect.y < 0 || rect.width !== manifest.cell.width
          || rect.height !== manifest.cell.height || rect.x + rect.width > sheet.width
          || rect.y + rect.height > sheet.height) {
          throw new Error('Recorte fora do atlas de Kaelen: ' + state);
        }
        return new Texture({ source: sheet.source,
          frame: new Rectangle(rect.x, rect.y, rect.width, rect.height) });
      }),
    };
  }
  clips = prepared;
  atlas = manifest;
}

/** Retains the scene's existing root, shadow, hitbox and ground offset. */
export function animateKaelenActor(actor: Graphics, bodyHeight = 58): KaelenAnimation {
  if (!atlas) throw new Error('Atlas de Kaelen ainda não carregado.');
  const sprite = actor.children[0] as Sprite;
  sprite.anchor.set(atlas.pivot.x / atlas.cell.width, atlas.pivot.y / atlas.cell.height);
  sprite.scale.set(bodyHeight / atlas.bodyHeight);
  return createKaelenAnimation(sprite, clips);
}
