import { Container } from 'pixi.js';

export interface SceneLayers {
  ground: Container;
  groundDecals: Container;
  entities: Container;
  vfx: Container;
  worldUi: Container;
  hud: Container;
}

export function createSceneLayers(root: Container): SceneLayers {
  const layers: SceneLayers = {
    ground: new Container(),
    groundDecals: new Container(),
    entities: new Container(),
    vfx: new Container(),
    worldUi: new Container(),
    hud: new Container(),
  };

  root.addChild(
    layers.ground,
    layers.groundDecals,
    layers.entities,
    layers.vfx,
    layers.worldUi,
    layers.hud
  );
  return layers;
}
