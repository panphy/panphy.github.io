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
      'You came! The myths have broken loose.',
      'They are born of bad science, and they feed on doubt.',
      'True physics words destroy them. Type well.',
      'Ahead waits the Colossus. It swears heavy things fall faster.',
    ],
  },
  {
    name: 'Tom the miller',
    coat: 0xc98d4b, hat: 0x5b7f3a,
    plea: 'Help! It will not stop talking nonsense!',
    lines: [
      'Thank you! It said my mill could run for ever on nothing.',
      'No machine gives out more energy than it takes in.',
      'The Bulwark holds the far bank. It promises free energy.',
    ],
  },
  {
    name: 'Mina the miner',
    coat: 0xd8a23a, hat: 0xe0483a,
    plea: 'Over here! It keeps telling me cold creeps in!',
    lines: [
      'Much obliged. Cold is not a thing that creeps in.',
      'Heat flows out, from hot to cold. That is all.',
      'The Sovereign below says heat is a liquid. Prove it wrong.',
    ],
  },
  {
    name: 'Captain Frost',
    coat: 0x3f6fa8, hat: 0xf2f0e6,
    plea: 'Ahoy! This one says my boat must sink!',
    lines: [
      'Bless you. It swore that heavy things can never float.',
      'A ship floats because it is less dense than water, hull and air together.',
      'The Titan claims ice sinks. Look around you: it floats.',
    ],
  },
  {
    name: 'Astra the stargazer',
    coat: 0x6d4fb3, hat: 0xf2c14e,
    plea: 'Quickly! It insists the Earth is flat!',
    lines: [
      'At last. From up here you can see the curve for yourself.',
      'One myth is left: the Dreadnought, who says the stars rule our lives.',
      'End it, and the sky is ours to study again.',
    ],
  },
];

export function storyBeatForWave(wave) {
  return STORY_BEATS[Math.min(STORY_BEATS.length, Math.max(1, Math.floor(wave))) - 1];
}
