export const VISUAL_ASSETS = {
  cover: new URL('../../img/capa=oakheaven.jpg', import.meta.url).href,
  kaelen: new URL('../../img/kaelen3.jpg', import.meta.url).href,
  towers: {
    arc_ballista: new URL(
      '../../img/balesta-arco-voltaico.jpg',
      import.meta.url
    ).href,
    slag_forge: new URL(
      '../../img/forja-escoria.jpg',
      import.meta.url
    ).href,
    repulsor: new URL(
      '../../img/monolito-repulsor.jpg',
      import.meta.url
    ).href,
    chitin_cannon: new URL(
      '../../img/canhao-de-quitina.jpg',
      import.meta.url
    ).href,
    spike_barricade: new URL(
      '../../img/barricada-espinhos.jpg',
      import.meta.url
    ).href,
  },
} as const;
