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

// What each boss says as it lands, before its fight: its myth, said with total
// confidence. voice: the pitch of its speech blips, below every storyteller's.
export const BOSS_SPEECHES = {
  'Verdant Colossus': {
    voice: -2.6,
    lines: [
      "Another little typist, come to argue with me? How adorable.",
      "Heavy things fall faster. Drop a boulder and a pebble together, and the boulder wins every time!",
      "Shall we test it? I'll drop the heaviest rocks I have, right on your head.",
    ],
  },
  'Crimson Bulwark': {
    voice: -1.6,
    lines: [
      "Roll up, roll up! Energy for nothing, and plenty of it!",
      "My marvellous machine turns for ever and never needs a push. Free power, for ever and ever!",
      "And you'd spoil it all with your dreary sums? Then I'll spend a little of my endless energy on you.",
    ],
  },
  'Magma Sovereign': {
    voice: -3,
    lines: [
      "Kneel. You stand in the furnace of the Magma Sovereign.",
      "Heat is a liquid, fool. I keep it in my veins and pour it wherever I please.",
      "Come closer, and I shall pour every last drop of it over you!",
    ],
  },
  'Glacial Titan': {
    voice: -2.2,
    lines: [
      "So. A warm little creature has wandered onto my lake.",
      "Ice is hard and heavy, so ice must sink. Nobody looks beneath the water to check. Nobody ever will.",
      "Stay a while. I'll freeze you solid, and then we shall see which of us sinks.",
    ],
  },
  'Stellar Dreadnought': {
    voice: -3.2,
    lines: [
      "I have watched you since the night you were born, little one.",
      "The stars wrote your whole life before it began. Every step that brought you here was already written.",
      "And it is written that you fall tonight. Go on, type. It changes nothing.",
    ],
  },
};
