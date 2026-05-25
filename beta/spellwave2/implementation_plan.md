# Spellwave 2 Planning Notes

## Completed Interim Difficulty Pass

The beta build now includes a first difficulty-curve correction pass in `beta/spellwave2/src/main.js`. The goal was to address the hidden workload increase where later waves were not only adding more enemies, but also requiring more typed characters per enemy as medium, hard, and boss vocabulary entered the pools.

Completed changes:

1. Normal waves now use a typed-workload budget as an additional completion condition, not only the normal enemy count target.
2. Active normal-wave spawns are gated by a visible typing-pressure cap so long unresolved prompts do not stack too aggressively on screen.
3. Wave speed and spawn-rate growth were reduced to avoid compounding enemy count, word length, speed, and spawn cadence at the same time.
4. Long boss vocabulary phrases can use a one-keyword prompt limit, while equation bosses keep the existing two-word limit.
5. Normal-wave progress is displayed as a percentage because completion may now be driven by enemy count or typing budget.

Design intent:

- Early waves should feel close to the previous version.
- Medium/hard vocabulary should add educational complexity without multiplying total typed workload too sharply.
- Later waves should still increase pressure, but more through controlled pacing than through abrupt phrase-length jumps.

Playtest focus:

- Whether waves 3 and 5 still feel like meaningful difficulty steps without becoming workload spikes.
- Whether one-keyword long boss vocabulary prompts still feel educational enough.
- Whether percentage progress is clear enough during normal waves.
- Whether the active typing-pressure cap makes late waves feel too quiet or appropriately manageable.

# Campaign Mode & Science Subject/Curriculum Selection Design

This plan outlines the design and implementation of a 5-Wave Campaign Mode for Spellwave 2. Instead of infinite waves, the game progresses through 5 waves, each focusing on a specific GCSE science topic selected by the player via a Slay the Spire-style path interface. Before starting a run, players select their Subject (Physics, Chemistry, Biology) and Curriculum Tier (Combined vs. Separate Science). Defeating the Wave 5 boss triggers a proper ending and victory summary.

## User Review Required

> [!IMPORTANT]
> **NO EMOJIS ALLOWED**:
> Do not use emojis in the game UI (e.g., in the subject select, topic map cards, or victory badge displays). All iconography must be implemented as clean, high-performance inline SVGs, styled and animated with CSS.
>
> **Locked Subject Placeholders**:
> Chemistry and Biology buttons will be rendered as greyed-out, disabled buttons with an elegant custom lock SVG. The question banks for these will not be created in this phase, but the core engine will be structured to dynamically receive them when unlocked.
>
> **Curriculum Tagging Rules**:
> 1. In AQA GCSE, "Separate Science" (Triple) contains extra topics and terms compared to "Combined Science" (Double). E.g., the *Space Physics* topic in Physics is entirely Separate-only.
> 2. We will tag specific topics or individual words/equations with `separateOnly: true`. If "Combined Science" is selected, these topics/terms will be filtered out of the draft options and spawning pools.

## Open Questions

> [!NOTE]
> **Setup UX Transition Flow**:
> We propose a two-step state machine inside the message panel to avoid clutter:
> * **State 1 (Main Menu)**: Shows "Spellwave", high score, tutorial copy, and a `[ Play Campaign ]` button.
> * **State 2 (Setup Screen)**: Clicking Play transitions the panel text to show:
>   * **Subject grid**: Physics (Active), Chemistry (Locked), Biology (Locked) - utilizing custom inline SVGs.
>   * **Curriculum Toggle**: Combined vs Separate.
>   * **Launch Button**: `[ Begin Run ]` (which then closes the setup panel and slides in the Wave 1 Path Selection Modal).
> 
> *Does this two-step transition align with the premium feel you want, or would you prefer all selectors directly visible on the initial screen?*

## Proposed Changes

### [Spellwave2]

#### [MODIFY] [question-bank.js](file:///Users/ypleung/Library/CloudStorage/Dropbox/Work_in_Progress/My_Projects/PanPhy%20Labs/GitHub/panphy.github.io/beta/spellwave2/src/question-bank.js)
1. **Restructure Data Model for Multi-Subject Support**:
   - Organize all question banks under a top-level `SUBJECTS` configuration containing keys for `physics`, `chemistry`, and `biology`.
   - Physics will contain the full topics list; Chemistry and Biology will remain empty/stubbed.
2. **Add Curriculum Tier Support**:
   - Add `separateOnly: true` tags to individual terms or equations (e.g., Space Physics vocabulary or primary/secondary transformer formulas).
   - Filter words based on chosen curriculum during wave initialization.
3. **Backward Compatibility**:
   - Maintain the exports `EASY_WORDS`, `MEDIUM_WORDS`, `HARD_WORDS`, `ALL_WORDS`, and `EQUATION_WORDS` (defaulting to Physics) so that existing game code or debug functions do not break.

#### [MODIFY] [main.js](file:///Users/ypleung/Library/CloudStorage/Dropbox/Work_in_Progress/My_Projects/PanPhy%20Labs/GitHub/panphy.github.io/beta/spellwave2/src/main.js)
1. **Add Start Setup State**:
   - Track `selectedSubject` (`physics`) and `selectedCurriculum` (`combined`, `separate`).
   - Modify the start panel HTML/CSS to render Subject Buttons (Physics, Chemistry (🔒), Biology (🔒)) and a toggle for Combined Science vs Separate Science. Use SVG icons for all subjects.
   - Implement the Setup transition states (Main Menu -> Setup Screen -> Launch).
2. **Campaign State tracking**:
   - Track campaign progress variables: `activeTopic`, `completedTopics` (array), `campaignCompleted` (boolean).
   - Cap the game at `waveSet === 5`.
3. **Word Pooling Logic**:
   - Modify `currentKeywordPool()` to return words matching the `selectedSubject`, `activeTopic`, `selectedCurriculum` requirements, and the difficulty appropriate for the current wave level.
   - Modify `chooseEquationWord()` to pull from the active topic's equations.
4. **Map/Path Selection Overlay**:
   - Design and render a modal overlay between waves when the current wave is cleared.
   - Present 3 randomized remaining topics as choice cards (filtering out any `separateOnly: true` topics if Combined is selected).
   - Use custom SVG iconography for topics on cards.
   - Highlight the reward/modifiers and node progression tracker (e.g. `Wave 1 ➔ Wave 2 ➔ Wave 3 ➔ Wave 4 ➔ Wave 5 (Final Exam)`).
5. **Victory Screen**:
   - On defeating the third boss of Wave 5, transition to a beautiful victory screen instead of advancing to Wave 6.
   - Calculate and display final stats: GCSE Grade (1-9), Score, Time, WPM, Accuracy, badges for the 5 selected topics (using custom badge SVGs), and a restart button.

#### [MODIFY] [styles.css](file:///Users/ypleung/Library/CloudStorage/Dropbox/Work_in_Progress/My_Projects/PanPhy%20Labs/GitHub/panphy.github.io/beta/spellwave2/src/styles.css)
1. **Setup Controls**:
   - Add glassmorphic segmented controls, toggle buttons, and grid layouts for selecting subject and curriculum tier in the start panel.
2. **Map Overlay & Choice Cards**:
   - Add glassmorphic styling, hover transitions, and badge styling for the topic selector screen.
3. **Victory Overlay**:
   - Add gold/glowing themes, certificate styles, and badge grids for the final graduation screen.
4. **Custom SVG Animations**:
   - Add pulse, rotate, or glow keyframe animations for setup icons, badges, and topic selectors.

## Verification Plan

### Automated Tests
- Test using `http://localhost:8000/beta/spellwave2.html`.

### Manual Verification
1. Verify Subject / Curriculum options appear at start, and selecting Combined Science hides separate-only options (like Space Physics in Physics).
2. Complete Wave 1 and verify path choice card screen opens with new options.
3. Reach Wave 5, defeat the final boss, and verify transition to the Victory screen with the correct grade and topic badges.
