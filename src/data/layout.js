import { SHELF_CATEGORIES, WORLD } from '../config/tuning.js';

const SHELF_CAPACITY = 6;

export function createLibraryLayout() {
  const [fiction, history, science, children] = SHELF_CATEGORIES;
  const worldWidth = 2240;
  const worldHeight = 1440;
  const topOffset = WORLD.headerHeight + 100;

  const shelfRows = [
    { y: topOffset + 30, items: [fiction, children, history, science, fiction] },
    { y: topOffset + 285, items: [children, fiction, science, history, children] },
    { y: topOffset + 540, items: [history, science, fiction, children, history] },
    { y: topOffset + 795, items: [science, children, fiction, history, science] },
    { y: topOffset + 1050, items: [fiction, history, science, children, fiction] }
  ];

  const columns = [360, 720, 1080, 1440, 1800];
  const shelves = [];

  shelfRows.forEach((row) => {
    row.items.forEach((category, index) => {
      shelves.push(shelf(columns[index], row.y, 88, 132, category, SHELF_CAPACITY));
    });
  });

  return {
    worldWidth,
    worldHeight,
    walls: [
      { x: worldWidth / 2, y: WORLD.headerHeight + 18, width: worldWidth - 40, height: 22 },
      { x: worldWidth / 2, y: worldHeight - 18, width: worldWidth - 40, height: 22 },
      { x: 18, y: worldHeight / 2, width: 22, height: worldHeight - WORLD.headerHeight - 20 },
      { x: worldWidth - 18, y: worldHeight / 2, width: 22, height: worldHeight - WORLD.headerHeight - 20 }
    ],
    zones: [],
    shelves,
    playerSpawn: { x: 1260, y: topOffset + 668 },
    kidSpawns: [
      { x: 110, y: topOffset + 150 },
      { x: worldWidth - 110, y: topOffset + 150 },
      { x: 110, y: topOffset + 780 },
      { x: worldWidth - 110, y: topOffset + 780 },
      { x: worldWidth / 2, y: worldHeight - 120 }
    ],
    bounds: {
      x: WORLD.margin + 18,
      y: WORLD.headerHeight + WORLD.margin,
      width: worldWidth - WORLD.margin * 2 - 36,
      height: worldHeight - WORLD.headerHeight - WORLD.margin * 2 - 24
    }
  };
}

function shelf(x, y, width, height, category, slots) {
  return {
    x,
    y,
    width,
    height,
    categoryId: category.id,
    label: category.label,
    color: category.color,
    zone: category.zone,
    totalSlots: slots
  };
}

