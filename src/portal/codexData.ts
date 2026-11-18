import { ENEMY_STATS, getLastStandHpMultiplier } from '../data/enemies';
import { TOWERS, formatTowerCost, type TowerDefinition } from '../data/towers';

const asset = (path: string): string => path;

export const PORTAL_ASSETS = {
  cover: asset(new URL('../../img/capa=oakheaven.jpg', import.meta.url).href),
  kaelen: asset(new URL('../../img/kaelen3.jpg', import.meta.url).href),
  elena: asset(new URL('../../img/elena-img.jpg', import.meta.url).href),
  toren: asset(new URL('../../img/toren-img.jpg', import.meta.url).href),
  lyra: asset(new URL('../../img/lyra-img.jpg', import.meta.url).href),
  forge: asset(new URL('../../img/forja-do-kaelen.jpg', import.meta.url).href),
  sanctuary: asset(new URL('../../img/tumulo-familia-kaelen.jpg', import.meta.url).href),
  ballista: asset(new URL('../../img/balesta-arco-voltaico.jpg', import.meta.url).href),
  slagForge: asset(new URL('../../img/forja-escoria.jpg', import.meta.url).href),
  repulsor: asset(new URL('../../img/monolito-repulsor.jpg', import.meta.url).href),
  cannon: asset(new URL('../../img/canhao-de-quitina.jpg', import.meta.url).href),
  barricade: asset(new URL('../../img/barricada-espinhos.jpg', import.meta.url).href),
  scout: asset(new URL('../../img/rastejador-de-eter.jpg', import.meta.url).href),
  brute: asset(new URL('../../img/golias-de-obsidiana.jpg', import.meta.url).href),
  alpha: asset(new URL('../../img/alpha-boss.jpg', import.meta.url).href),
  plasmaRay: asset(new URL('../../img/arraia-de-plasma.jpg', import.meta.url).href),
  parasite: asset(new URL('../../img/parasita-esporo.jpg', import.meta.url).href),
  sentinel: asset(new URL('../../img/sentinela-prismatica.jpg', import.meta.url).href),
  carrion: asset(new URL('../../img/carrion-boss.jpg', import.meta.url).href),
  weaver: asset(new URL('../../img/tecela-das-cinzas.jpg', import.meta.url).href),
  executor: asset(new URL('../../img/executor-boss.jpg', import.meta.url).href),
  oakBefore: asset(new URL('../../img/oakheaven-antes.jpg', import.meta.url).href),
  oakAfter: asset(new URL('../../img/oakheaven-depois.jpg', import.meta.url).href),
} as const;

export interface CharacterEntry {
  id: string;
  name: string;
  epithet: string;
  image: string;
  quote: string;
  description: string;
}

export const CHARACTERS: CharacterEntry[] = [
  {
    id: 'kaelen',
    name: 'Kaelen',
    epithet: 'Ferreiro · Último defensor',
    image: PORTAL_ASSETS.kaelen,
    quote: 'O metal lembra cada golpe. Eu também.',
    description: 'Ferreiro de OakHeaven e guardião da colina. Kaelen coleta, constrói e entra pessoalmente na arena quando as torres já não bastam.',
  },
  {
    id: 'elena',
    name: 'Elena',
    epithet: 'A voz junto à forja',
    image: PORTAL_ASSETS.elena,
    quote: 'Uma casa não é a madeira. É quem espera por você.',
    description: 'Esposa de Kaelen. Sua memória é representada por um dos três ecos dourados que cercam a árvore petrificada.',
  },
  {
    id: 'toren',
    name: 'Toren',
    epithet: 'O herdeiro do martelo',
    image: PORTAL_ASSETS.toren,
    quote: 'Quando eu crescer, a bigorna será minha.',
    description: 'Filho de Kaelen. Toren via na forja um futuro; agora seu túmulo é uma das razões para que a linha jamais recue.',
  },
  {
    id: 'lyra',
    name: 'Lyra',
    epithet: 'A luz da colina',
    image: PORTAL_ASSETS.lyra,
    quote: 'As estrelas também parecem cristais de Éter.',
    description: 'Filha mais nova de Kaelen. O brilho dourado do santuário preserva sua lembrança contra a energia violeta dos invasores.',
  },
  {
    id: 'forge',
    name: 'A Forja Intacta',
    epithet: 'Oficina · Arsenal',
    image: PORTAL_ASSETS.forge,
    quote: 'Enquanto houver fogo, ainda existe escolha.',
    description: 'A oficina sobreviveu à queda. Nela, materiais humanos e quitina inimiga tornam-se as cinco estruturas que protegem o santuário.',
  },
  {
    id: 'sanctuary',
    name: 'O Santuário',
    epithet: 'Árvore petrificada · Três lápides',
    image: PORTAL_ASSETS.sanctuary,
    quote: 'Aqui termina a estrada. Aqui começa o juramento.',
    description: 'Sob a colina existe um núcleo cobiçado pelos Ceifadores. Acima dele descansam Elena, Toren e Lyra.',
  },
];

const TOWER_IMAGES: Record<TowerDefinition['type'], string> = {
  arc_ballista: PORTAL_ASSETS.ballista,
  slag_forge: PORTAL_ASSETS.slagForge,
  repulsor: PORTAL_ASSETS.repulsor,
  chitin_cannon: PORTAL_ASSETS.cannon,
  spike_barricade: PORTAL_ASSETS.barricade,
};

const TOWER_ROLES: Record<TowerDefinition['type'], string> = {
  arc_ballista: 'Precisão de longo alcance; o Tier 2 encadeia energia em um segundo alvo.',
  slag_forge: 'Controla grupos próximos com dano contínuo e lentidão de movimento.',
  repulsor: 'Compra tempo ao deslocar inimigos; brutos e Alpha oferecem maior resistência.',
  chitin_cannon: 'Rajada pesada contra até três alvos dentro de um alcance curto.',
  spike_barricade: 'Ocupa a estrada, absorve ataques e pune contato direto.',
};

export interface TowerCodexEntry {
  definition: TowerDefinition;
  image: string;
  cost: string;
  role: string;
}

export const TOWER_CODEX: TowerCodexEntry[] = TOWERS.map((definition) => ({
  definition,
  image: TOWER_IMAGES[definition.type],
  cost: formatTowerCost(definition),
  role: TOWER_ROLES[definition.type],
}));

export type BestiaryCategory = 'active' | 'expansion';

export interface BestiaryEntry {
  id: string;
  name: string;
  designation: string;
  category: BestiaryCategory;
  image: string;
  summary: string;
  tactic: string;
  stats: Array<{ label: string; value: string }>;
}

const scout = ENEMY_STATS.scout;
const brute = ENEMY_STATS.brute;
const alpha = ENEMY_STATS.alpha;

export const BESTIARY: BestiaryEntry[] = [
  {
    id: 'scout',
    name: 'Rastejador de Éter',
    designation: 'Scout · Invasor de rota',
    category: 'active',
    image: PORTAL_ASSETS.scout,
    summary: 'Predador veloz que pressiona a rota e também assume o papel de flanqueador em parte da Última Linha.',
    tactic: 'Intercepte a marca ciano com Kaelen: a variante de flanco recebe somente 45% do dano das torres.',
    stats: [
      { label: 'HP base', value: String(scout.hp) },
      { label: 'HP rota W3', value: String(Math.ceil(scout.hp * getLastStandHpMultiplier('scout', 'route'))) },
      { label: 'HP flanco W3', value: String(Math.ceil(scout.hp * getLastStandHpMultiplier('scout', 'flanker'))) },
      { label: 'Velocidade', value: scout.speed.toFixed(2) },
    ],
  },
  {
    id: 'brute',
    name: 'Golias de Obsidiana',
    designation: 'Bruto · Rompedor',
    category: 'active',
    image: PORTAL_ASSETS.brute,
    summary: 'Massa de quitina e rocha, lenta o bastante para parecer segura e resistente o bastante para romper uma defesa negligenciada.',
    tactic: 'Use controle de rota e concentre dano. Golias resiste mais ao empurrão do Monólito e ao Quebra-Terra.',
    stats: [
      { label: 'HP base', value: String(brute.hp) },
      { label: 'HP rota W3', value: String(Math.ceil(brute.hp * getLastStandHpMultiplier('brute', 'route'))) },
      { label: 'HP flanco W3', value: String(Math.ceil(brute.hp * getLastStandHpMultiplier('brute', 'flanker'))) },
      { label: 'Dano', value: String(brute.damage) },
    ],
  },
  {
    id: 'alpha',
    name: 'Alpha',
    designation: 'Chefe · Comandante da investida',
    category: 'active',
    image: PORTAL_ASSETS.alpha,
    summary: 'Comandante da investida final. Seu Rugido Supressor silencia torres próximas e a Postura de Obsidiana exige o Quebra-Terra.',
    tactic: 'Leve o Alpha a 35%, carregue o martelo e rompa a postura antes que sua fase final alcance o santuário.',
    stats: [
      { label: 'HP base', value: String(alpha.hp) },
      { label: 'HP na W3', value: String(Math.ceil(alpha.hp * getLastStandHpMultiplier('alpha', 'route'))) },
      { label: 'Dano', value: String(alpha.damage) },
      { label: 'Marcos', value: '70% / 35%' },
    ],
  },
  {
    id: 'plasma-ray',
    name: 'Arraia de Plasma',
    designation: 'Unidade aérea · Ameaça do vale',
    category: 'expansion',
    image: PORTAL_ASSETS.plasmaRay,
    summary: 'Unidade aérea de reconhecimento que desliza sobre barricadas e rastreia fontes de energia.',
    tactic: 'Conceito futuro: tornaria o alcance da Balesta mais valioso sem invalidar defesas terrestres.',
    stats: [{ label: 'Estado', value: 'Conceito' }, { label: 'Papel previsto', value: 'Aéreo' }],
  },
  {
    id: 'spore-parasite',
    name: 'Parasita Esporo',
    designation: 'Assédio biológico · Ameaça do vale',
    category: 'expansion',
    image: PORTAL_ASSETS.parasite,
    summary: 'Organismo aderente atraído por madeira viva e mecanismos aquecidos.',
    tactic: 'Conceito futuro: ameaça de assédio, não implementada como sabotador no protótipo atual.',
    stats: [{ label: 'Estado', value: 'Conceito' }, { label: 'Papel previsto', value: 'Assédio' }],
  },
  {
    id: 'prismatic-sentinel',
    name: 'Sentinela Prismática',
    designation: 'Suporte prismático · Ameaça do vale',
    category: 'expansion',
    image: PORTAL_ASSETS.sentinel,
    summary: 'Construto que refrata Éter em placas cristalinas e observa a arena à distância.',
    tactic: 'Conceito futuro: uma ameaça de apoio que exigiria prioridade de alvo clara.',
    stats: [{ label: 'Estado', value: 'Conceito' }, { label: 'Papel previsto', value: 'Suporte' }],
  },
  {
    id: 'carrion',
    name: 'O Carrion',
    designation: 'Chefe do vale',
    category: 'expansion',
    image: PORTAL_ASSETS.carrion,
    summary: 'Uma carcaça de guerra coberta por raízes, troféus e cristais cultivados durante campanhas antigas.',
    tactic: 'Conceito de ato futuro. Não substitui o Alpha na noite atual.',
    stats: [{ label: 'Estado', value: 'Conceito' }, { label: 'Escala', value: 'Chefe' }],
  },
  {
    id: 'ash-weaver',
    name: 'A Tecelã das Cinzas',
    designation: 'Chefe ritual',
    category: 'expansion',
    image: PORTAL_ASSETS.weaver,
    summary: 'Presença ritualística associada a cinzas suspensas e caminhos obscurecidos.',
    tactic: 'Conceito de ato futuro para uma batalha baseada em leitura de arena.',
    stats: [{ label: 'Estado', value: 'Conceito' }, { label: 'Escala', value: 'Chefe' }],
  },
  {
    id: 'orbital-executor',
    name: 'O Executor Orbital',
    designation: 'Ameaça orbital',
    category: 'expansion',
    image: PORTAL_ASSETS.executor,
    summary: 'Máquina distante demais para pertencer ao vale e precisa demais para ser confundida com uma fera.',
    tactic: 'Conceito reservado para atos posteriores; não integra o escopo da primeira noite.',
    stats: [{ label: 'Estado', value: 'Conceito' }, { label: 'Escala', value: 'Ato futuro' }],
  },
];

