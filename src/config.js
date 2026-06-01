export const SCREEN = {
  minWidth: 960,
  minHeight: 540,
};

export const WORLD = {
  widthMultiplier: 3,
  groundRatio: 0.78,
  statueHp: 2000,
  playerGold: 500,
  enemyGold: 500,
};

export const CAMERA = {
  edgeSize: 64,
  scrollSpeed: 850,
};

export const COLORS = {
  skyTop: "#5fb7f3",
  skyBottom: "#dff7ff",
  mountainBack: "#7aa6a8",
  mountainFront: "#587c6a",
  ground: "#5f3f22",
  groundHighlight: "#9f7a3d",
  grass: "#2f7d32",
  playerBase: "#2563eb",
  enemyBase: "#dc2626",
  gold: "#facc15",
  playerUnit: "#1d4ed8",
  enemyUnit: "#b91c1c",
  hp: "#22c55e",
  hpBack: "#7f1d1d",
};

export const FACTIONS = {
  player: "player",
  enemy: "enemy",
};

export const COMMANDS = {
  defend: "defend",
  hold: "hold",
  attack: "attack",
};

export const UNIT_TYPES = {
  miner: {
    label: "Minero",
    cost: 150,
    hp: 90,
    speed: 82,
    damage: 0,
    attackRange: 0,
    visionRange: 0,
    attackInterval: 1,
    width: 22,
    height: 46,
    mineDuration: 3,
    carriedGold: 100,
  },
  clubman: {
    label: "Swordwrath",
    cost: 125,
    hp: 230,
    speed: 92,
    damage: 28,
    attackRange: 34,
    visionRange: 120,
    attackInterval: 0.9,
    width: 26,
    height: 58,
  },
  archer: {
    label: "Archidon",
    cost: 300,
    hp: 120,
    speed: 78,
    damage: 34,
    attackRange: 285,
    visionRange: 320,
    attackInterval: 1.45,
    projectileSpeed: 520,
    width: 24,
    height: 56,
  },
  mamon: {
    label: "Mamon",
    cost: 600,
    hp: 240,
    speed: 78,
    damage: 34,
    attackRange: 285,
    visionRange: 320,
    attackInterval: 0.725,
    projectileSpeed: 520,
    width: 28,
    height: 60,
    uniqueForPlayer: true,
  },
  squire: {
    label: "Escudero",
    cost: 200,
    hp: 360,
    speed: 64,
    damage: 18,
    attackRange: 38,
    visionRange: 130,
    attackInterval: 0.75,
    width: 30,
    height: 58,
    shield: true,
  },
  cavalry: {
    label: "Caballeria",
    cost: 450,
    hp: 420,
    speed: 150,
    damage: 42,
    attackRange: 48,
    visionRange: 180,
    attackInterval: 1.05,
    width: 58,
    height: 66,
    mounted: true,
  },
  dragon: {
    label: "Dragon",
    cost: 800,
    hp: 650,
    speed: 72,
    damage: 58,
    attackRange: 265,
    visionRange: 330,
    attackInterval: 1.8,
    projectileSpeed: 430,
    width: 76,
    height: 92,
    flying: true,
  },
  giant: {
    label: "Gigante",
    cost: 1000,
    hp: 1100,
    speed: 42,
    damage: 95,
    attackRange: 64,
    visionRange: 175,
    attackInterval: 2.2,
    width: 66,
    height: 122,
    giant: true,
  },
};

export const ECONOMY = {
  enemyMinerInterval: 11,
  enemySoldierInterval: 8,
  enemyWaveInterval: 45,
  enemyWaveDuration: 18,
};

export const DIFFICULTIES = {
  easy: {
    label: "Facil",
    enemyGoldMultiplier: 0.75,
    enemySpawnMultiplier: 1.35,
    enemyDamageMultiplier: 0.85,
    enemyHpMultiplier: 0.9,
    enemyPassiveGoldPerSecond: 5,
  },
  normal: {
    label: "Normal",
    enemyGoldMultiplier: 1,
    enemySpawnMultiplier: 1,
    enemyDamageMultiplier: 1,
    enemyHpMultiplier: 1,
    enemyPassiveGoldPerSecond: 8,
  },
  hard: {
    label: "Dificil",
    enemyGoldMultiplier: 1.35,
    enemySpawnMultiplier: 0.72,
    enemyDamageMultiplier: 1.15,
    enemyHpMultiplier: 1.15,
    enemyPassiveGoldPerSecond: 12,
  },
};
