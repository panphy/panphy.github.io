// story.js — the game's story, told at one quiet stop in each wave. Pure data: the
// people who tell it are built in storyteller.js. The land has been overrun by myths: monsters born of bad science,
// which only true physics words can destroy.
//
// In the meadow the player simply listens. In every later chapter the storyteller
// is first held by a myth, which the player frees them from by typing its word.
// name: who speaks. plea: what they call out while held (later chapters only).
// lines: what they say once safe, shown one at a time.
// coat, hat: the colours that tell the five apart.
export const STORY_BEATS = [
  {
    name: 'Professor Ada',
    coat: 0xf2f0e6, hat: 0x8a5a2b,
    lines: [
      "You came! The myths are loose.",
      "Bad science made them. True words break them.",
      "The Colossus says heavy things fall faster. Go!",
    ],
  },
  {
    name: 'Tom the miller',
    coat: 0xc98d4b, hat: 0x5b7f3a,
    plea: "Help! It won't stop talking nonsense!",
    lines: [
      "Thanks! It said my mill runs on nothing.",
      "Nothing runs for free. Energy in, energy out.",
      "The Bulwark sells free energy. Shut it down.",
    ],
  },
  {
    name: 'Mina the miner',
    coat: 0xd8a23a, hat: 0xe0483a,
    plea: 'Over here! It says cold creeps in!',
    lines: [
      "Cheers! Cold doesn't creep in.",
      "Heat flows out. Hot to cold. Always.",
      "The Sovereign says heat is a liquid. Melt that idea.",
    ],
  },
  {
    name: 'Captain Frost',
    coat: 0x3f6fa8, hat: 0xf2f0e6,
    plea: 'Ahoy! It says my boat must sink!',
    lines: [
      "Bless you! It said heavy things can't float.",
      "Density decides, not weight.",
      "The Titan says ice sinks. Look around you!",
    ],
  },
  {
    name: 'Astra the stargazer',
    coat: 0x6d4fb3, hat: 0xf2c14e,
    plea: 'Quick! It says the Earth is flat!',
    lines: [
      "At last! Look, you can see the curve.",
      "One myth left: the stars rule our lives.",
      "End the Dreadnought. Give us back the sky.",
    ],
  },
];

export function storyBeatForWave(wave) {
  return STORY_BEATS[Math.min(STORY_BEATS.length, Math.max(1, Math.floor(wave))) - 1];
}
