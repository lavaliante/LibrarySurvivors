import { SHELF_CATEGORIES, WORLD } from '../config/tuning.js';

const SHELF_CAPACITY = 6;

export function createLibraryLayout() {
  const [fiction, history, science, children] = SHELF_CATEGORIES;
  const worldWidth = 2240;
  const worldHeight = 1440;
  const topOffset = WORLD.headerHeight + 80;

  const shelfRows = [
    { y: topOffset + 40, items: [fiction, children, history, science, fiction, children, history] },
    { y: topOffset + 260, items: [children, fiction, science, history, children, science, fiction] },
    { y: topOffset + 480, items: [history, science, fiction, children, history, fiction, science] },
    { y: topOffset + 700, items: [science, children, fiction, history, science, children, fiction] },
    { y: topOffset + 920, items: [fiction, history, science, children, fiction, history, science] }
  ];

  const columns = [220, 470, 720, 970, 1220, 1470, 1720];
  const shelves = [];

  shelfRows.forEach((row) => {
    row.items.forEach((category, index) => {
      shelves.push(shelf(columns[index], row.y, 64, 100, category, SHELF_CAPACITY));
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
    zones: [
      { x: worldWidth / 2, y: topOffset - 36, width: worldWidth - 180, height: 120, label: 'North Wing' },
      { x: worldWidth / 2, y: topOffset + 184, width: worldWidth - 180, height: 120, label: 'Story Walk' },
      { x: worldWidth / 2, y: topOffset + 404, width: worldWidth - 180, height: 120, label: 'Study Loop' },
      { x: worldWidth / 2, y: topOffset + 624, width: worldWidth - 180, height: 120, label: 'Archive Row' },
      { x: worldWidth / 2, y: topOffset + 844, width: worldWidth - 180, height: 120, label: 'South Wing' }
    ],
    shelves,
    playerSpawn: { x: worldWidth / 2, y: topOffset + 460 },
    kidSpawns: [
      { x: 88, y: topOffset + 180 },
      { x: worldWidth - 88, y: topOffset + 180 },
      { x: 88, y: topOffset + 620 },
      { x: worldWidth - 88, y: topOffset + 620 },
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

