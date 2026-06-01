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
  skyTop: "#7dd3fc",
  skyBottom: "#bae6fd",
  ground: "#6b4f2a",
  groundHighlight: "#8b6f3d",
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
};

export const ECONOMY = {
  enemyMinerInterval: 11,
  enemySoldierInterval: 8,
  enemyWaveInterval: 45,
  enemyWaveDuration: 18,
};
