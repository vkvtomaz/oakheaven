import { Assets, Container, Graphics, Sprite, Texture, Text } from 'pixi.js';
import type { TowerType } from '../core/GameState';
import { MAIN_ROAD_DRAW_POINTS, ROAD_WIDTH, SANCTUARY, distanceToMainRoad } from '../data/arena';
import type { SceneLayers } from './layers';
import { artSprite, createActor } from './art';

const arenaKeys = ['arc_ballista', 'slag_forge', 'repulsor', 'chitin_cannon', 'spike_barricade', 'scout', 'brute'] as const;
type ArenaKey = typeof arenaKeys[number];
const arenaUrls = Object.fromEntries(arenaKeys.map(key => [key, `${import.meta.env.BASE_URL}art/arena/${key}.png`])) as Record<ArenaKey, string>;
const forestSource = new URL('../../img/exploracao-floresta.jpg', import.meta.url).href;
const stoneSource = new URL('../../img/itens-3d.jpg', import.meta.url).href;
let floorTexture: Texture;
let loaded = false;

export const ARENA_TOWER_HEIGHT: Record<TowerType, number> = {
  arc_ballista: 76, slag_forge: 70, repulsor: 86, chitin_cannon: 56, spike_barricade: 40,
};
export const ARENA_TOWER_NAME: Record<TowerType, string> = {
  arc_ballista: 'Balesta voltaica', slag_forge: 'Forja de escória', repulsor: 'Monólito repulsor',
  chitin_cannon: 'Canhão de quitina', spike_barricade: 'Barricada',
};

function makeCanvas(width: number, height: number): HTMLCanvasElement {
  const result = document.createElement('canvas');
  result.width = width; result.height = height; return result;
}

/** Quiet, nonrepeating ground; the original route remains the only navigation source. */
function composeArenaFloor(): Texture {
  const result = makeCanvas(1920, 1080);
  const ctx = result.getContext('2d')!;
  ctx.scale(2, 2);
  let seed = 17041;
  const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  ctx.fillStyle = '#374436'; ctx.fillRect(0, 0, 960, 540);
  for (let i = 0; i < 95; i++) {
    const x = random() * 960, y = random() * 540, radius = 40 + random() * 115;
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, i % 3 ? '#69705255' : '#202f2c77');
    gradient.addColorStop(1, '#263b2c00');
    ctx.fillStyle = gradient; ctx.fillRect(x-radius, y-radius, radius*2, radius*2);
  }
  // Feathered, rotated material patches from the existing forest reference.
  // No HUD, character or resource label is copied into the terrain.
  const patch = makeCanvas(220, 180); const p = patch.getContext('2d')!;
  p.drawImage(Assets.get<Texture>(forestSource).source.resource as CanvasImageSource, 290, 335, 110, 90, 0, 0, 220, 180);
  p.globalCompositeOperation = 'destination-in';
  const feather = p.createRadialGradient(110, 90, 15, 110, 90, 108);
  feather.addColorStop(0, '#ffffffff'); feather.addColorStop(1, '#ffffff00');
  p.fillStyle = feather; p.fillRect(0, 0, 220, 180);
  ctx.globalAlpha = .13;
  for (let i = 0; i < 90; i++) {
    ctx.save(); ctx.translate(random()*960, random()*540); ctx.rotate(random()*Math.PI*2);
    ctx.drawImage(patch, -110, -90); ctx.restore();
  }
  ctx.globalAlpha = 1;
  for (let i = 0; i < 5500; i++) {
    const x = random()*960, y = random()*540;
    ctx.fillStyle = i % 3 ? '#a2a17a14' : '#111d2619';
    ctx.fillRect(x, y, .4+random()*1.8, .4+random());
  }
  const road = () => {
    ctx.beginPath(); MAIN_ROAD_DRAW_POINTS.forEach((point, i) => i ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y));
  };
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  road(); ctx.lineWidth = 86; ctx.strokeStyle = '#756a4d80';
  ctx.shadowColor='#9c885666'; ctx.shadowBlur=14;ctx.stroke();ctx.shadowColor='transparent';
  road();ctx.lineWidth=76;ctx.strokeStyle='#625f4cbb';ctx.stroke();
  const sample = makeCanvas(140, 70); const s = sample.getContext('2d')!;
  s.drawImage(Assets.get<Texture>(stoneSource).source.resource as CanvasImageSource, 120, 220, 140, 70, 0, 0, 140, 70);
  const stone = ctx.createPattern(sample, 'repeat')!;
  // Broken cobbles follow the road tangent; dirt shoulders keep the 78px route legible.
  for (let segment = 1; segment < MAIN_ROAD_DRAW_POINTS.length; segment++) {
    const a = MAIN_ROAD_DRAW_POINTS[segment-1]!, b = MAIN_ROAD_DRAW_POINTS[segment]!;
    const length = Math.hypot(b.x-a.x, b.y-a.y), angle = Math.atan2(b.y-a.y, b.x-a.x);
    for (let step = 2; step < length; step += 15) for (let row = -1; row <= 1; row++) {
      const t = Math.min(1, (step + (row % 2) * 6) / length);
      const offset = row*17 + (random()-.5)*3;
      const x = a.x+(b.x-a.x)*t-Math.sin(angle)*offset;
      const y = a.y+(b.y-a.y)*t+Math.cos(angle)*offset;
      ctx.save(); ctx.translate(x,y); ctx.rotate(angle+(random()-.5)*.15);
      ctx.beginPath(); ctx.moveTo(-6,-6); ctx.lineTo(4,-7); ctx.lineTo(7,-3); ctx.lineTo(6,6); ctx.lineTo(-4,7); ctx.lineTo(-7,3); ctx.closePath();
      ctx.shadowColor='#141a17aa'; ctx.shadowBlur=1; ctx.shadowOffsetY=1;
      ctx.fillStyle=stone; ctx.fill(); ctx.shadowColor='transparent';
      ctx.fillStyle='#59604c88'; ctx.fill();
      ctx.strokeStyle='#b5b39722'; ctx.lineWidth=.7; ctx.stroke(); ctx.restore();
    }
  }
  // Grit, grass tufts and broken verge fragments blend road edges into the meadow.
  for (let i=0;i<10000;i++) {
    const x=230+random()*730, y=90+random()*450, distance=distanceToMainRoad(x,y);
    if(distance<ROAD_WIDTH/2-9 || distance>ROAD_WIDTH/2+17) continue;
    ctx.fillStyle=distance<42 ? '#aaa08444':'#263e2a88';
    ctx.beginPath();ctx.ellipse(x,y,.5+random()*2,.4+random(),random()*3,0,Math.PI*2);ctx.fill();
    if(distance>37 && random()>.3) {
      ctx.strokeStyle=random()>.5?'#55684499':'#384d31bb';ctx.lineWidth=.7;
      ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-1+random()*3,y-2-random()*4);ctx.stroke();
    }
  }
  const clearing=ctx.createRadialGradient(SANCTUARY.x, SANCTUARY.y+8, 15, SANCTUARY.x,SANCTUARY.y+8,69);
  clearing.addColorStop(0,'#71674b99');clearing.addColorStop(1,'#766e4a00');
  ctx.fillStyle=clearing;ctx.fillRect(205,210,150,150);
  const shade=ctx.createRadialGradient(585,290,120,585,290,570);
  shade.addColorStop(0,'#08181500');shade.addColorStop(1,'#081518b0');
  ctx.fillStyle=shade;ctx.fillRect(0,0,960,540);
  return Texture.from({resource:result,resolution:2});
}

export async function loadArenaArt(): Promise<void> {
  if (loaded) return;
  await Assets.load([...Object.values(arenaUrls), forestSource, stoneSource]);
  floorTexture = composeArenaFloor(); loaded = true;
}

export function arenaSprite(key: ArenaKey, height: number): Sprite {
  const texture = Assets.get<Texture>(arenaUrls[key]);
  if (!texture) throw new Error(`Arena asset not loaded: ${key}`);
  const sprite = new Sprite(texture); sprite.anchor.set(.5,1); sprite.scale.set(height/texture.height);
  sprite.tint=0xe9e7d7; sprite.eventMode='none'; return sprite;
}

export function arenaActor(key: ArenaKey|'alpha', height?:number): Graphics {
  if(key==='alpha') return createActor('alpha',height??94);
  const size=height??ARENA_TOWER_HEIGHT[key as TowerType]??50;
  const width=key==='spike_barricade'?28:key==='scout'?19:17;
  const root=new Graphics().ellipse(6,6,width+5,8).fill({color:0x0d1815,alpha:.15})
    .ellipse(2,3,width,6).fill({color:0x08100d,alpha:.3});
  const body=arenaSprite(key,size);body.y=8;root.addChild(body);root.eventMode='none';return root;
}

export function paintMainArena(layers:SceneLayers):void {
  layers.ground.addChild(new Sprite(floorTexture));
  // Two low-profile clusters frame the battle, rather than a catalog of props.
  for(const [x,y,h,key] of [[392,475,23,'ore'],[418,482,15,'ore'],[881,457,21,'ore'],[904,464,12,'ore']] as const){
    const prop=artSprite(key,h);prop.position.set(x,y);prop.tint=0x9baf92;prop.alpha=.64;
    layers.groundDecals.addChild(prop);
  }
}

export function mainArenaSanctuary(parent:Container):void {
  const root=new Container();root.position.set(SANCTUARY.x,SANCTUARY.y);root.zIndex=SANCTUARY.y;
  root.addChild(new Graphics().ellipse(4,20,42,13).fill({color:0x090f0a,alpha:.28}));
  const tree=artSprite('sanctuary',145);tree.position.set(0,34);tree.tint=0xe9e3ce;root.addChild(tree);
  parent.addChild(root);
}

export function arenaPanel(parent:Container,x:number,y:number,width:number,height:number):Graphics {
  const panel=new Graphics().roundRect(x,y,width,height,5).fill({color:0x101c1a,alpha:.91})
    .stroke({color:0x646953,width:1,alpha:.55})
    .moveTo(x+12,y).lineTo(x+width-12,y).stroke({color:0xc6b67d,width:1,alpha:.5});
  panel.eventMode='none';parent.addChild(panel);return panel;
}

export function arenaText(parent:Container,content:string,x:number,y:number,size=14,color=0xe2dfcb):Text {
  const text=new Text({text:content,style:{fontFamily:'Alegreya Sans, Arial, sans-serif',fontSize:size < 14 ? size + 2 : size,fill:color,fontWeight:'400'}});
  text.position.set(x,y);text.eventMode='none';parent.addChild(text);return text;
}
