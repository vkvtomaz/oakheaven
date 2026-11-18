import { Assets, Container, Graphics, Sprite, Texture } from 'pixi.js';
import { MAIN_ROAD_DRAW_POINTS, ROAD_WIDTH, distanceToMainRoad } from '../data/arena';
import type { SceneLayers } from './layers';
import { VISUAL_ASSETS } from './assets';

const keys = ['hero', 'scout', 'brute', 'alpha', 'arc_ballista', 'slag_forge',
  'repulsor', 'chitin_cannon', 'spike_barricade', 'stone', 'roof', 'bridge',
  'pad', 'wood', 'scrap', 'ore', 'crystal', 'sanctuary', 'forge'] as const;
export type ArtKey = typeof keys[number];
const urls = Object.fromEntries(keys.map(key => [key, `${import.meta.env.BASE_URL}art/${key}.png`])) as Record<ArtKey, string>;
const panorama = new URL('../../img/praca-de-oakheaven-2-5d.jfif', import.meta.url).href;
const woodland = new URL('../../img/exploracao-floresta.jpg', import.meta.url).href;
const props = new URL('../../img/itens-3d.jpg', import.meta.url).href;
const textures = new Map<ArtKey, Texture>();
let landscape: Texture;
let arenaFloor: Texture;
let forestFloor: Texture;
let traversalFloor: Texture;
let ready = false;

function canvas(width: number, height: number): HTMLCanvasElement {
  const result = document.createElement('canvas'); result.width = width; result.height = height; return result;
}
function imageSource(url: string): CanvasImageSource {
  return Assets.get<Texture>(url).source.resource as CanvasImageSource;
}

/** All decoding and terrain composition happens once, before the game loop starts. */
export async function loadGameArt(): Promise<void> {
  if (ready) return;
  await Assets.load([...Object.values(urls), { src: panorama, parser: 'texture' }, woodland, props,
    VISUAL_ASSETS.cover, VISUAL_ASSETS.kaelen, ...Object.values(VISUAL_ASSETS.towers)]);
  for (const key of keys) textures.set(key, Assets.get<Texture>(urls[key]));
  const sky = canvas(960, 455);
  // Only architecture/sky: excludes the painted character in the lower concept.
  sky.getContext('2d')!.drawImage(imageSource(panorama), 0, 0, 2752, 790, 0, 0, 1585, 455);
  landscape = Texture.from(sky);
  const tile = canvas(140, 70);
  tile.getContext('2d')!.drawImage(imageSource(props), 120, 220, 140, 70, 0, 0, 140, 70);
  const strip = canvas(960, 85); const stripContext = strip.getContext('2d')!;
  stripContext.fillStyle = stripContext.createPattern(tile, 'repeat')!;
  stripContext.fillRect(0, 0, 960, 85);
  stripContext.fillStyle = '#15201f55'; stripContext.fillRect(0, 0, 960, 85);
  traversalFloor = Texture.from(strip);
  for (const forest of [false, true]) {
    const floor = canvas(960, 540); const ctx = floor.getContext('2d')!;
    const moss = canvas(110, 90);
    moss.getContext('2d')!.drawImage(imageSource(woodland), 290, 335, 110, 90, 0, 0, 110, 90);
    ctx.fillStyle = ctx.createPattern(moss, 'repeat')!; ctx.fillRect(0, 0, 960, 540);
    ctx.fillStyle = forest ? '#132c27bb' : '#19251fe0'; ctx.fillRect(0, 0, 960, 540);
    const glow = ctx.createRadialGradient(340, 280, 20, 520, 300, 650);
    glow.addColorStop(0, '#54775b40'); glow.addColorStop(1, '#030912aa');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, 960, 540);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath();
    if (forest) {ctx.moveTo(0, 460); ctx.lineTo(960, 460); ctx.moveTo(465, 460); ctx.lineTo(465, 90);}
    else MAIN_ROAD_DRAW_POINTS.forEach((p, i) => i ? ctx.lineTo(p.x,p.y) : ctx.moveTo(p.x,p.y));
    ctx.strokeStyle = '#171813'; ctx.lineWidth = ROAD_WIDTH + 12; ctx.stroke();
    ctx.strokeStyle = ctx.createPattern(tile, 'repeat')!; ctx.lineWidth = ROAD_WIDTH; ctx.stroke();
    ctx.strokeStyle = '#63543c55'; ctx.lineWidth = ROAD_WIDTH - 5; ctx.stroke();
    if (forest) forestFloor = Texture.from(floor); else arenaFloor = Texture.from(floor);
  }
  ready = true;
}

export function artSprite(key: ArtKey, height: number): Sprite {
  const texture = textures.get(key);
  if (!texture) throw new Error(`Arte não carregada: ${key}`);
  const sprite = new Sprite(texture); sprite.anchor.set(0.5, 1);
  sprite.scale.set(height / texture.height); sprite.eventMode = 'none'; return sprite;
}

/** Visual extent is independent of the existing logical hitbox/radius. */
export function createActor(key: ArtKey, height: number, groundOffset = 8): Graphics {
  const root = new Graphics().ellipse(0, 0, Math.min(30, height * .36), height * .09)
    .fill({ color: 0x03070c, alpha: .52 });
  const sprite = artSprite(key, height); sprite.y = groundOffset;
  root.addChild(sprite); root.eventMode = 'none'; return root;
}

export function placeArt(parent: Container, key: ArtKey, x: number, y: number, height: number): Graphics {
  const actor = createActor(key, height); actor.position.set(x, y); actor.zIndex = y; parent.addChild(actor); return actor;
}

export function paintArena(layers: SceneLayers): void {
  layers.ground.addChild(new Sprite(arenaFloor));
  for (const [x,y,h,key] of [[420,150,75,'roof'],[550,495,64,'stone'],[825,485,100,'roof'],
    [880,145,64,'crystal'],[730,475,44,'ore'],[360,465,36,'scrap']] as const) {
    if (distanceToMainRoad(x,y)>65) placeArt(layers.entities,key,x,y,h);
  }
  placeArt(layers.entities, 'forge', 300, 185, 145);
  // Sparse, deterministic fragments on the verges, never logical obstacles.
  for (let i=0;i<20;i++) {
    const x=330+(i*137)%590, y=130+(i*89)%380;
    if(distanceToMainRoad(x,y)>75) placeArt(layers.groundDecals,i%3?'ore':'crystal',x,y,14+i%11);
  }
}

export function paintForest(layers: SceneLayers): void {
  layers.ground.addChild(new Sprite(forestFloor));
  for (const [x,y] of [[100,185],[285,160],[650,175],[915,365],[200,390],[715,510]])
    placeArt(layers.entities,'ore',x!,y!,35);
}

export function paintTraversal(layers: SceneLayers): void {
  const back = new Sprite(landscape); back.tint=0x8397ad; layers.ground.addChild(back);
  layers.ground.addChild(new Graphics().rect(0,0,960,455).fill({color:0x101021,alpha:.2}));
  const floor = new Sprite(traversalFloor); floor.position.set(0,455); layers.ground.addChild(floor);
  placeArt(layers.groundDecals, 'bridge', 190, 455, 100);
  placeArt(layers.groundDecals, 'bridge', 835, 455, 100);
  placeArt(layers.entities,'forge',38,455,140);
  placeArt(layers.entities,'sanctuary',930,455,140);
}

export function platformArt(parent: Container, x:number,y:number,width:number): void {
  const beam = artSprite('wood',width * 215 / 330); beam.position.set(x+width/2,y+22);
  parent.addChild(beam);
  parent.addChild(new Graphics().moveTo(x,y).lineTo(x+width,y).stroke({color:0xc6b78a,width:2}));
}
