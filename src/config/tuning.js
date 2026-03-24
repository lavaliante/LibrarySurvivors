export const WORLD = {
  width: 1280,
  height: 720,
  headerHeight: 92,
  margin: 28
};

export const RUN = {
  durationSeconds: 600,
  baseChaosPerSecond: 0.05,
  floorBookChaosWeight: 0.22,
  agedBookChaosWeight: 0.0025,
  lowMessChaosRecovery: 0.12,
  levelXpBase: 100,
  levelXpIncrement: 10,

  eventIntervalSeconds: 70
};

export const PLAYER_BASE = {
  speed: 195,
  sprintMultiplier: 1.6,
  staminaMax: 100,
  staminaDrainPerSecond: 34,
  staminaRecoveryDelay: 1.7,
  staminaRecoveryPerSecond: 26,
  pickupRadius: 52,
  shelfRadius: 62,
  shelfRatePerSecond: 2.6,
  capacity: 6,
  repelRadius: 104,
  repelDuration: 1.4,
  interceptRadius: 34,
  streakBonus: 0
};

export const KID_ARCHETYPES = {
  wanderer: {
    label: 'Wanderer',
    speed: 68,
    fleeSpeed: 118,
    shelfTime: 1.4,
    farCarryChance: 0.35,
    farCarryDistance: [120, 210],
    disruptCount: 1,
    tint: 0xf28c28
  },
  runner: {
    label: 'Runner',
    speed: 96,
    fleeSpeed: 168,
    shelfTime: 0.8,
    farCarryChance: 0.8,
    farCarryDistance: [220, 360],
    disruptCount: 1,
    tint: 0xef476f
  },
  stackToppler: {
    label: 'Stack Toppler',
    speed: 62,
    fleeSpeed: 104,
    shelfTime: 1.8,
    farCarryChance: 0.45,
    farCarryDistance: [140, 260],
    disruptCount: 2,
    tint: 0x7b2cbf
  }
};

export const SHELF_CATEGORIES = [
  { id: 'fiction', label: 'Fiction', color: 0xe76f51, zone: 'West Fiction' },
  { id: 'history', label: 'History', color: 0x457b9d, zone: 'East History' },
  { id: 'science', label: 'Science', color: 0x2a9d8f, zone: 'South Science' },
  { id: 'children', label: 'Children', color: 0xe9c46a, zone: 'North Children' }
];

export const UPGRADE_POOL = [
  {
    id: 'comfy-shoes',
    label: 'Comfy Shoes',
    description: '+5% movement speed',
    apply: (state) => {
      state.player.speed *= 1.05;
    }
  },
  {
    id: 'extendable-grabber',
    label: 'Extendable Grabber',
    description: '+8 pickup radius',
    apply: (state) => {
      state.player.pickupRadius += 8;
    }
  },
  {
    id: 'book-cart',
    label: 'Book Cart',
    description: '+1 carrying capacity',
    apply: (state) => {
      state.player.capacity += 1;
    }
  },
  {
    id: 'dewey-decimal-mastery',
    label: 'Dewey Decimal Mastery',
    description: '+5% shelving speed',
    apply: (state) => {
      state.player.shelfRatePerSecond *= 1.05;
    }
  },
  {
    id: 'shelf-whisperer',
    label: 'Shelf Whisperer',
    description: '+8 shelving radius',
    apply: (state) => {
      state.player.shelfRadius += 8;
    }
  },
  {
    id: 'stern-glare',
    label: 'Stern Glare',
    description: '+18 kid repulsion radius',
    apply: (state) => {
      state.player.repelRadius += 18;
    }
  },
  {
    id: 'quiet-zone-policy',
    label: 'Quiet Zone Policy',
    description: '-3% chaos gain',
    apply: (state) => {
      state.run.chaosMultiplier *= 0.97;
    }
  },
  {
    id: 'perfect-filing',
    label: 'Perfect Filing',
    description: '+1 streak score bonus',
    apply: (state) => {
      state.player.streakBonus += 1;
    }
  },
  {
    id: 'teacher-voice',
    label: 'Teacher Voice',
    description: 'Fleeing kids stay panicked slightly longer',
    apply: (state) => {
      state.player.repelDuration += 0.15;
    }
  }
];

export const EVENT_DEFS = [
  {
    id: 'field-trip',
    name: 'Field Trip',
    duration: 22,
    description: 'A sudden group arrives. Spawn pressure spikes.',
    start: (state) => {
      state.run.spawnMultiplier += 0.75;
    },
    end: (state) => {
      state.run.spawnMultiplier -= 0.75;
    }
  },
  {
    id: 'quiet-reading-hour',
    name: 'Quiet Reading Hour',
    duration: 16,
    description: 'The room settles down. Chaos gain eases.',
    start: (state) => {
      state.run.chaosMultiplier *= 0.72;
    },
    end: (state) => {
      state.run.chaosMultiplier /= 0.72;
    }
  }
];

