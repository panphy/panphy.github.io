// story.js — the game's story, told at one quiet stop in each wave. Pure data: the
// people who tell it are built in storyteller.js. The land has been overrun by myths: monsters born of bad science,
// which only true physics words can destroy.
//
// In the meadow the player simply listens. In every later chapter the storyteller
// is first held by a myth, which the player frees them from by typing its word.
// name: who speaks. held: a myth holds them (later chapters only); they cry for help
// above their head until freed. lines: what they say once safe, shown one at a time.
// coat, hat: the colours that tell the five apart. voice: the pitch of their speech blips.
export const STORY_BEATS = [
  {
    name: 'Professor Ada', role: 'professor',
    coat: 0xf2f0e6, hat: 0x8a5a2b,
    voice: 0,
    lines: [
      "Oh, thank goodness, someone who knows their physics! I was starting to think nobody would come.",
      "These myths crawled out of every bad idea people ever believed. Type the truth at them and they fall apart.",
      "Mind the Colossus up ahead. It keeps telling everyone that heavy things fall faster. Honestly!",
    ],
  },
  {
    name: 'Tom the miller', role: 'miller',
    coat: 0xc98d4b, hat: 0x5b7f3a,
    held: true,
    voice: 1,
    lines: [
      "Phew, thanks! That thing never stopped talking. It kept saying my mill could turn for ever without the river.",
      "But you never get energy out of nothing, do you? Something always has to put it in.",
      "The Bulwark's on the far bank, selling free energy to anyone who'll listen. Go and spoil its day.",
    ],
  },
  {
    name: 'Mina the miner', role: 'miner',
    coat: 0xd8a23a, hat: 0xe0483a,
    held: true,
    voice: 2,
    lines: [
      "Ta very much! That one swore blind the cold was creeping into my bones. Cold doesn't creep anywhere!",
      "It's the heat that moves. Out of something hot and into something colder, every time.",
      "The Sovereign's deeper in. Thinks heat is some sort of liquid you can pour. Go and set it straight.",
    ],
  },
  {
    name: 'Captain Frost', role: 'captain',
    coat: 0x3f6fa8, hat: 0xf2f0e6,
    held: true,
    voice: 3,
    lines: [
      "Much obliged! It kept saying my boat ought to sink, as heavy things go to the bottom. She weighs a tonne and floats fine.",
      "It isn't the weight that matters, you see. It's how dense a thing is next to the water.",
      "The Titan out on the lake says ice sinks. It is standing on the stuff!",
    ],
  },
  {
    name: 'Astra the stargazer', role: 'stargazer',
    coat: 0xf0912e, hat: 0xf2c14e,
    held: true,
    voice: 4,
    lines: [
      "Oh, well done! It kept insisting the Earth is flat. From up here you can see the curve with your own eyes.",
      "There's only one myth left now. The Dreadnought says the stars decide our lives for us.",
      "They don't, you know. They're just very far away and very beautiful. Go and finish this.",
    ],
  },
];

export function storyBeatForWave(wave) {
  return STORY_BEATS[Math.min(STORY_BEATS.length, Math.max(1, Math.floor(wave))) - 1];
}

// What each boss says to the player as it lands, before its fight: it mocks them,
// and lets slip its myth as if everyone knew it. defeat: its last jibe as it falls,
// a sore loser to the end. voice: the pitch of its speech blips, below every
// storyteller's.
export const BOSS_SPEECHES = {
  'Verdant Colossus': {
    voice: -2.6,
    lines: [
      "Ha! They sent YOU? I've squashed pebbles with more fight in them.",
      "Heavy things fall faster. Everyone knows that. Everyone except you, it seems. Did you nap through school?",
      "Look at those shaking fingers! My boulders will land long before you can spell gravity.",
    ],
    defeat: [
      "Lucky shot! Pure luck! Heavy things still fall faster... don't they? DON'T THEY?",
    ],
  },
  'Crimson Bulwark': {
    voice: -1.6,
    lines: [
      "Oh look, a customer! Sorry, little one, no refunds for clumsy typists.",
      "My machine runs for ever on nothing at all. You're puffed out after three words. Pathetic!",
      "Go on then, bash those keys. I've got energy for ever, and you've got about a minute.",
    ],
    defeat: [
      "Out of energy? Me? Impossible! You cheated, you sneaky little typist!",
    ],
  },
  'Magma Sovereign': {
    voice: -3,
    lines: [
      "You crawled into my furnace? You're sweating already. How embarrassing.",
      "Heat is a liquid, peasant, and I have rivers of it. You have a keyboard and a lot of nerve.",
      "Type faster, little ember. Oh, you can't? Your words drip out slower than cold treacle.",
    ],
    defeat: [
      "You cooled me down? Enjoy it while it lasts. Your fingers will be sore for a week!",
    ],
  },
  'Glacial Titan': {
    voice: -2.2,
    lines: [
      "Shivering already, little hero? Your teeth are chattering louder than your keys.",
      "Ice sinks, everyone knows that. And so will you, the moment you trip over your first word.",
      "Take your time, slowcoach. You'll be frozen solid before you finish a sentence.",
    ],
    defeat: [
      "Fine. Ice floats. But you still type like a frozen snail, and don't you forget it!",
    ],
  },
  'Stellar Dreadnought': {
    voice: -3.2,
    lines: [
      "Ah, the little hero who keeps pressing Backspace. Yes, I saw every single one.",
      "The stars wrote your fate before you were born. They wrote that you lose. They even wrote your typos.",
      "Every hero ends up as a dot in my sky. You'll be a very small, very dim one. Go on, type.",
    ],
    defeat: [
      "This was not written! The stars swore you'd lose... they must have been watching your typing.",
    ],
  },
};
