import { Assets, Container, Graphics, Sprite, Texture } from 'pixi.js';
import { MAIN_ROAD_DRAW_POINTS, ROAD_WIDTH, distanceToMainRoad } from '../data/arena';
import type { SceneLayers } from './layers';
import { VISUAL_ASSETS } from './assets';
import { loadKaelenArt } from './kaelenArt';
import { prepareForestEnvironment, paintForestEnvironment } from './forestEnvironment';
import { prepareForestResourceArt } from './forestResourceArt';
import { prepareTraversalArt } from './traversalArt';

const keys = ['hero', 'scout', 'brute', 'alpha', 'arc_ballista', 'slag_forge',
  'repulsor', 'chitin_cannon', 'spike_barricade', 'stone', 'roof', 'bridge',
  'pad', 'wood', 'scrap', 'ore', 'crystal', 'sanctuary', 'forge'] as const;
export type ArtKey = typeof keys[number];
const urls = Object.fromEntries(keys.map(key => [key, `${import.meta.env.BASE_URL}art/${key}.png`])) as Record<ArtKey, string>;
const panorama = new URL('../../img/praca-de-oakheaven-2-5d.jfif', import.meta.url).href;
const woodland = new URL('../../img/exploracao-floresta.jpg', import.meta.url).href;
const props = new URL('../../img/itens-3d.jpg', import.meta.url).href;
const traversalEnvironment = `${import.meta.env.BASE_URL}art/traversal/dusk-environment.png`;
const traversalForeground = `${import.meta.env.BASE_URL}art/traversal/foreground.png`;
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
    traversalEnvironment, traversalForeground,
    VISUAL_ASSETS.cover, VISUAL_ASSETS.kaelen, ...Object.values(VISUAL_ASSETS.towers)]);
  await loadKaelenArt();
  prepareTraversalArt(imageSource(traversalEnvironment), imageSource(urls.wood), imageSource(urls.stone),
    { foreground: imageSource(traversalForeground) });
  prepareForestResourceArt(imageSource(woodland), Assets.get<Texture>(urls.ore));
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
  const depth = stripContext.createLinearGradient(0, 0, 0, 85);
  depth.addColorStop(0, '#b3a17c22'); depth.addColorStop(.18, '#302e2466');
  depth.addColorStop(1, '#080f13ee');
  stripContext.fillStyle = depth; stripContext.fillRect(0, 0, 960, 85);
  for (let i=0;i<550;i++) {
    const x=(i*137)%960, y=(i*47)%85;
    stripContext.fillStyle=i%3?'#14211c66':'#bfac7933';
    stripContext.fillRect(x,y,1+i%4,1+i%2);
  }
  traversalFloor = Texture.from(strip);
  // Arena generation stays unchanged; forest has its own material/composition.
  for (const forest of [false]) {
    const floor = canvas(1920, 1080); const ctx = floor.getContext('2d')!;
    ctx.scale(2, 2);
    let seed = 4317;
    const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
    ctx.fillStyle = forest ? '#263d30' : '#26362c'; ctx.fillRect(0, 0, 960, 540);
    // Feather a material-only sample: no painted labels, characters or map geometry.
    const moss = canvas(220, 180); const material = moss.getContext('2d')!;
    material.drawImage(imageSource(woodland), 290, 335, 110, 90, 0, 0, 220, 180);
    material.globalCompositeOperation = 'destination-in';
    const feather = material.createRadialGradient(110, 90, 12, 110, 90, 108);
    feather.addColorStop(0, '#ffffff'); feather.addColorStop(1, '#ffffff00');
    material.fillStyle = feather; material.fillRect(0, 0, 220, 180);
    ctx.globalAlpha = .22;
    for (let i = 0; i < 150; i++) {
      ctx.save(); ctx.translate(random() * 960, random() * 540); ctx.rotate(random() * Math.PI * 2);
      ctx.drawImage(moss, -110, -90); ctx.restore();
    }
    ctx.globalAlpha = 1;
    for (let i = 0; i < 5500; i++) {
      const x = random() * 960, y = random() * 540;
      ctx.fillStyle = i % 3 ? '#89936a22' : '#081b1a33';
      ctx.fillRect(x, y, .6 + random() * 2, .5 + random());
    }
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath();
    if (forest) {ctx.moveTo(0, 460); ctx.lineTo(960, 460); ctx.moveTo(465, 460); ctx.lineTo(465, 90);}
    else MAIN_ROAD_DRAW_POINTS.forEach((p, i) => i ? ctx.lineTo(p.x,p.y) : ctx.moveTo(p.x,p.y));
    ctx.strokeStyle = '#15261e66'; ctx.lineWidth = ROAD_WIDTH + 22; ctx.stroke();
    ctx.strokeStyle = '#71644b55'; ctx.lineWidth = ROAD_WIDTH + 8; ctx.stroke();
    ctx.strokeStyle = '#615a43aa'; ctx.lineWidth = ROAD_WIDTH - 8; ctx.stroke();
    // Broken stones leave dirt between them; samples retain their natural scale.
    const segments = forest ? [[0,460,960,460],[465,460,465,90]] :
      MAIN_ROAD_DRAW_POINTS.slice(1).map((p,i) => [MAIN_ROAD_DRAW_POINTS[i]!.x,MAIN_ROAD_DRAW_POINTS[i]!.y,p.x,p.y]);
    for (const [ax,ay,bx,by] of segments) {
      const length = Math.hypot(bx!-ax!,by!-ay!), angle = Math.atan2(by!-ay!,bx!-ax!);
      for (let step=0;step<length;step+=17) for(let row=-1;row<=1;row++) {
        const d=step+random()*7, offset=row*17+(random()-.5)*5;
        ctx.save(); ctx.translate(ax!+Math.cos(angle)*d-Math.sin(angle)*offset,ay!+Math.sin(angle)*d+Math.cos(angle)*offset);
        ctx.rotate(angle+(random()-.5)*.25);
        ctx.fillStyle=ctx.createPattern(tile,'repeat')!;ctx.fillRect(-5,-5,10+random()*3,9+random()*3);
        ctx.fillStyle='#4c574077';ctx.fillRect(-5,-5,13,12);ctx.restore();
      }
    }
    const glow = ctx.createRadialGradient(300, 270, 70, 520, 300, 650);
    glow.addColorStop(0, '#76936518'); glow.addColorStop(1, '#030912bb');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, 960, 540);
    const texture = Texture.from({ resource: floor, resolution: 2 });
    arenaFloor = texture;
  }
  forestFloor = prepareForestEnvironment(imageSource(woodland));
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
  paintForestEnvironment(layers);
}

export function paintTraversal(layers: SceneLayers): void {
  const back = new Sprite(landscape); back.tint=0x8397ad; layers.ground.addChild(back);
  layers.ground.addChild(new Graphics().rect(0,0,960,455).fill({color:0x101021,alpha:.2}));
  const floor = new Sprite(traversalFloor); floor.position.set(0,455); layers.ground.addChild(floor);
  placeArt(layers.groundDecals, 'bridge', 190, 455, 100);
  placeArt(layers.groundDecals, 'bridge', 835, 455, 100);
  placeArt(layers.entities,'forge',38,455,110).tint=0x969b8a;
  placeArt(layers.entities,'sanctuary',930,455,110).tint=0x969b8a;
}

export function platformArt(parent: Container, x:number,y:number,width:number): void {
  // Short timber segments keep their authored proportions and exact landing edge.
  const support = new Graphics().moveTo(x+9,y+9).lineTo(x+25,y+29)
    .moveTo(x+width-9,y+9).lineTo(x+width-25,y+29)
    .stroke({color:0x282b25,width:5});
  parent.addChild(support);
  const count = Math.ceil(width / 25);
  for (let index=0;index<count;index++) {
    const beam = artSprite('wood', 18);
    beam.position.set(x + (index+.5)*width/count, y+17);
    beam.tint=0xb3ac89; parent.addChild(beam);
  }
  parent.addChild(new Graphics().moveTo(x,y).lineTo(x+width,y)
    .stroke({color:0xc6b78a,width:2,alpha:.8}));
}
