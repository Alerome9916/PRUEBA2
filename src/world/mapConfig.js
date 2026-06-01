import { WORLD } from "../config.js";

export function createBattlefield(viewportWidth, viewportHeight) {
  const width = viewportWidth * WORLD.widthMultiplier;
  const groundY = Math.floor(viewportHeight * WORLD.groundRatio);
  const baseWidth = 96;
  const statueHeight = 190;

  return {
    width,
    height: viewportHeight,
    groundY,
    centerX: width / 2,
    playerBase: {
      x: 80,
      y: groundY - statueHeight,
      width: baseWidth,
      height: statueHeight,
      hp: WORLD.statueHp,
    },
    enemyBase: {
      x: width - 80 - baseWidth,
      y: groundY - statueHeight,
      width: baseWidth,
      height: statueHeight,
      hp: WORLD.statueHp,
    },
    playerMine: {
      x: 230,
      y: groundY - 58,
      width: 120,
      height: 58,
      workX: 290,
    },
    enemyMine: {
      x: width - 350,
      y: groundY - 58,
      width: 120,
      height: 58,
      workX: width - 290,
    },
  };
}
