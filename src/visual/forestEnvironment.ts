import { Graphics, Sprite, Texture } from 'pixi.js';
import { EXPEDITION_NODES } from '../data/expedition';
import type { SceneLayers } from './layers';

// Forest-only presentation. None of these props participate in input or collision.
const details = new Map<string, Texture>();
function surface(width: number, height: number): HTMLCanvasElement {
  const result = document.createElement('canvas');
  result.width = width; result.height = height;
  return result;
}

/** Hand outlined pieces of exploracao-floresta.jpg, excluding its labels and UI.
 * These are scenery fragments, not a complete tree or a new animation sheet.
 */
export function prepareForestEnvironment(source: CanvasImageSource): Texture {
  const outlines: Record<string, number[][]> = {
    fern: [[521,357],[533,342],[525,326],[546,334],[551,310],[565,332],
      [589,310],[581,337],[610,326],[597,346],[620,351],[594,358],[601,372],[569,362],[550,374]],
    rock: [[912,314],[928,293],[940,258],[957,231],[980,235],[1003,258],
      [1009,281],[1033,309],[1020,330],[979,341],[945,331]],
    log: [[558,270],[568,251],[599,243],[633,255],[666,271],[704,283],
      [727,295],[715,313],[699,318],[704,339],[674,330],[659,317],[618,306],[579,289]],
    foliage: [[1192,739],[1204,715],[1224,718],[1215,692],[1242,706],
      [1254,675],[1270,694],[1293,668],[1290,700],[1327,687],[1313,715],
      [1350,711],[1332,737],[1360,750],[1315,763],[1250,765],[1206,757]],
  };
  for (const [name, points] of Object.entries(outlines)) {
    const minX = Math.min(...points.map(p => p[0]!)) - 2;
    const minY = Math.min(...points.map(p => p[1]!)) - 2;
    const width = Math.max(...points.map(p => p[0]!)) - minX + 2;
    const height = Math.max(...points.map(p => p[1]!)) - minY + 2;
    const cutout = surface(width, height), ctx = cutout.getContext('2d')!;
    ctx.beginPath();
    points.forEach(([x,y], i) => i ? ctx.lineTo(x! - minX, y! - minY) : ctx.moveTo(x! - minX,y! - minY));
    ctx.closePath(); ctx.clip();
    ctx.drawImage(source, minX, minY, width, height, 0, 0, width, height);
    details.set(name, Texture.from(cutout));
  }

  const floor = surface(1920, 1080), ctx = floor.getContext('2d')!;
  ctx.scale(2, 2);
  let seed = 4317;
  const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  ctx.fillStyle = '#26372a'; ctx.fillRect(0,0,960,540);
  const patch = (x:number,y:number,rx:number,ry:number,color:string) => {
    ctx.save(); ctx.translate(x,y); ctx.scale(rx,ry);
    const gradient = ctx.createRadialGradient(0,0,0,0,0,1);
    gradient.addColorStop(0,color); gradient.addColorStop(1,'#00000000');
    ctx.fillStyle=gradient; ctx.fillRect(-1,-1,2,2); ctx.restore();
  };
  // Reuse the material-only ground sample already selected by the previous pass.
  // Feather its perimeter so the painted source never becomes a rectangular tile.
  const moss=surface(110,90), material=moss.getContext('2d')!;
  material.drawImage(source,290,335,110,90,0,0,110,90);
  material.globalCompositeOperation='destination-in';
  const feather=material.createRadialGradient(55,45,9,55,45,54);
  feather.addColorStop(0,'#ffffff'); feather.addColorStop(1,'#ffffff00');
  material.fillStyle=feather; material.fillRect(0,0,110,90);
  ctx.globalAlpha=.28;
  for(let i=0;i<180;i++) {
    ctx.save(); ctx.translate(random()*960,95+random()*445);
    ctx.rotate(random()*Math.PI*2); ctx.drawImage(moss,-55,-45); ctx.restore();
  }
  ctx.globalAlpha=1;
  // Broad humus/moss variation follows clearings rather than a regular tile grid.
  for (let i=0;i<180;i++) {
    patch(random()*960,95+random()*445,30+random()*110,15+random()*42,
      i%3 ? '#59603b66' : '#101f1c99');
  }
  const trail = () => {
    ctx.beginPath(); ctx.moveTo(-30,480);
    ctx.bezierCurveTo(185,425,290,478,470,449);
    ctx.bezierCurveTo(660,416,780,494,990,452);
    ctx.moveTo(470,449); ctx.bezierCurveTo(428,350,503,244,459,87);
  };
  ctx.lineCap='round'; ctx.lineJoin='round';
  for (const [width,color] of [[76,'#1a271c33'],[61,'#71604322'],[45,'#89704d33'],[27,'#a18a5a22']] as const) {
    trail(); ctx.strokeStyle=color; ctx.lineWidth=width; ctx.stroke();
  }
  // Worn collection clearings retain every original resource coordinate.
  for (const node of EXPEDITION_NODES) {
    patch(node.x,node.y,52,25,'#9c80514d');
    patch(node.x+5,node.y+3,28,10,'#151b1c88');
  }
  // Fine leaf litter and grass: a static baked texture, no per-frame objects.
  for(let i=0;i<6500;i++) {
    const x=random()*960,y=90+random()*450;
    ctx.fillStyle=i%3 ? '#a2925b33' : '#07191855';
    ctx.save(); ctx.translate(x,y); ctx.rotate(random()*Math.PI);
    ctx.fillRect(0,0,1+random()*3,.5+random()); ctx.restore();
  }
  // Cool, darker depths and edge shade; the central playable area stays readable.
  const depths=ctx.createLinearGradient(300,0,960,0);
  depths.addColorStop(0,'#18232700'); depths.addColorStop(1,'#10132480');
  ctx.fillStyle=depths; ctx.fillRect(0,90,960,450);
  patch(470,110,650,110,'#081416dd');
  patch(500,563,650,70,'#081416cc');
  return Texture.from({resource:floor,resolution:2});
}

export function paintForestEnvironment(layers: SceneLayers): void {
  const place = (key:string,x:number,y:number,width:number,tint=0xffffff) => {
    const texture=details.get(key);
    if (!texture) throw new Error(`Forest scenery not prepared: ${key}`);
    const sprite=new Sprite(texture); sprite.anchor.set(.5,1);
    sprite.scale.set(width/texture.width); sprite.position.set(x,y);
    sprite.tint=tint; sprite.eventMode='none'; sprite.zIndex=y;
    const shadow=new Graphics().ellipse(x,y-1,width*.4,width*.09)
      .fill({color:0x050d10,alpha:.38});
    shadow.eventMode='none'; layers.groundDecals.addChild(shadow);
    layers.entities.addChild(sprite);
  };
  // Clustered verges, with space around all harvest points and the return portal.
  for(const [x,y,w] of [[40,160,110],[270,119,130],[565,125,115],[750,104,125],
    [943,170,120],[38,300,105],[118,270,82],[285,265,72],[570,315,68],
    [705,365,78],[945,370,100],[390,520,110],[685,533,130],[938,530,130]] as const) {
    place('foliage',x,y,w,x>700 ? 0x9396ad : 0xb6c8a4);
    place('fern',x-24,y+9,w*.43,x>700 ? 0x9d91b2 : 0xc3cb9e);
  }
  for(const [x,y,w] of [[97,208,72],[277,361,61],[710,220,65],[779,342,72],[915,462,59]] as const) {
    place('rock',x,y,w,0xa6b4a4); place('fern',x+27,y+4,43,0xb5c393);
  }
  place('log',282,226,115,0xb3ba95);
  place('log',642,384,105,0x9ca697);
  place('log',735,501,112,0x8b8c9d);
}
