# Words app (دورة قراءة الكلمات): UX and UI evaluation, round 2

**Lens:** adult A1 learners of English whose first language is Arabic, mostly on a phone, as in round 1
**Scope:** the interface as it is now, after the round-1 recommendations were implemented. Round 1 is [UX-EVALUATION.md](UX-EVALUATION.md); the teaching content is covered in [EVALUATION.md](EVALUATION.md).
**Reviewed:** 5 October 2026, `main` at `1cf47d2`

---

## How this review was done

- **Ran the app** in Chromium with its own fonts (Andika and Rubik):
  - every screen at phone size (390 × 844, touch) and desktop size (1280 × 800);
  - layout checks at 320 × 640, 360 × 740, 412 × 800 and 768 × 1024 (tablet).
- **Two learners:**
  - a new learner, starting from the start screen;
  - a returning learner with saved progress: one unit mastered, a lesson half done, review due, a 4-day streak.
- **Every screen and state:**
  - start screen, home, menu, a locked unit;
  - both Learn panels;
  - every activity type, answered right and wrong: read aloud, listen, read, fill (one and two letters), build, chain, sort, odd one out, sentence;
  - practice and test results, passed and failed;
  - the leave confirmation, review and placement;
  - the progress page, with and without the teacher settings;
  - the page for saving and moving progress;
  - the Sunset theme, and a failed course load.
- **Scripted checks:**
  - axe-core 4 on 13 screens;
  - the size of every visible control;
  - WCAG contrast of every colour token in all four themes;
  - Tab order, the focus trap and Escape;
  - looping animations;
  - where the answer buttons are before and after an answer;
  - whether the header title fits, on every page.
- **Read the code** behind these screens: `index.html`, `styles.css`, `js/main.js`, `js/router.js`, `js/dialogs.js`, `js/uiManager.js`, `js/gameEngine.js`, `js/questionRenderer.js`, `js/teacherDashboard.js`.
- **Not covered** (as in round 1): real phones, a screen reader, and real learners.
- **Screenshots** are in [`docs/ux-review/round-2/`](docs/ux-review/round-2/).

---

## 1. Summary verdict

**The round-1 work holds up.** Every round-1 fix that can be tested in a browser was confirmed (Section 2). The interface now does what round 1 asked for:
- **Getting around:**
  - home leads with one "continue" card;
  - every result screen's main button is the next step;
  - no screen traps the learner, and leaving a test asks first;
  - the phone's Back button and Escape work as expected.
- **Accessibility:**
  - the main text colours pass WCAG AA in all four themes;
  - every control checked is at least 44 × 44 px;
  - axe-core finds no violations.
- **Type:** English is set in Andika, where I and l look different.

**What is left is small.** Nothing blocks a learner. Four things are worth fixing:

1. **"ليس بعد" is treated as a wrong answer.** Read-aloud items ask the learner to judge their own reading, but an honest "not yet":
   - turns red with ✗;
   - plays the wrong-answer sound;
   - lowers the practice score.

   Learners will learn to always press ✅.
2. **Page titles are cut off on phones.** Once the 📚 and 🔥 chips appear in the header, the title has 145 px at 390 px wide:
   - six of the ten unit names end in "…";
   - so does the app name on home ("دورة قراءة الكل…").

   At 320 px the room is 75 px, and every title is cut.
3. **On tablets and computers, the activity dialog jumps after every answer.** It is centred, so it grows upwards when the feedback appears. The answer buttons move up about 140 px.
4. **A few labels and signals are unclear:**
   - step pills that look like buttons but do nothing;
   - numbers without units (🔥 4, 4/12);
   - faint empty letter slots;
   - a long Learn panel with no sign that it scrolls.

---

## 2. Round-1 fixes: what was checked

| Round-1 item | Result |
|---|---|
| F1: English kept in its own direction inside Arabic ("-ed" stays "-ed") | Confirmed in titles, prompts and tips |
| F2: one blank per missing letter | Confirmed for one- and two-letter items |
| F3: feedback scrolls into view above a fixed footer | Confirmed |
| F4: build items have «تحقّق», «ابدأ من جديد» and a tap-to-return hint | Confirmed; chain items explain how to change a letter |
| F5: ✕ on every activity; only «فهمت» completes Learn | Confirmed |
| F6: Back is "→"; the unit tree is a list | Confirmed |
| F7: hover styles only where a mouse can hover | Confirmed in `styles.css` (`@media (hover: hover) and (pointer: fine)`) |
| F8: contrast | Confirmed: the main text/background pairs are all at least 4.5:1, in all four themes (Appendix A1) |
| F9: ✓ and ✗ on options and built words | Confirmed |
| F10: a spinner while loading, then an error with «أعد المحاولة» | Confirmed with a failed (503) load |
| Home built on "continue"; locked units explain themselves | Confirmed |
| Steps lead into one another | Confirmed. «فهمت — ابدأ التمرين» → «ابدأ الاختبار» → «الدرس التالي»; a failed test → «📖 راجع الدرس» or «أعد الاختبار» |
| Routes, Back and the leave confirmation | Confirmed. Back from a unit returns home; ✕ or Escape after an answer asks first, and the safe choice is the default; a reload returns to the page under the activity |
| Accessibility basics | Confirmed. Units and theme swatches are buttons; focus stays inside dialogs (30 Tab presses, no escape); Escape closes; English has `lang="en"`; axe-core finds no violations on 13 screens |
| No looping animations; reduced motion honoured | Confirmed: no looping animations on home, and a `prefers-reduced-motion` rule is in place |
| Andika for English | Confirmed: I and l look different |
| Learn panels, progress page, teacher settings, calmer rewards, unit pictures with keywords | Confirmed |
| Installing, offline use, moving progress | Not re-tested. The service worker was switched off in this test setup; the save and open buttons are present |

---

## 3. Remaining issues

### R1. "ليس بعد" is treated as a wrong answer (medium)

([screenshot](docs/ux-review/round-2/01-not-yet.jpg))

**What happens.** In a read-aloud item the learner reads the word, taps 🔊 to check, then reports "✅ قرأتها صحيحة" or "🔁 ليس بعد". "ليس بعد" is handled exactly like a wrong answer (`js/gameEngine.js:284`, `:301`, `:306`):
- the button turns red and gets ✗;
- the wrong-answer sound plays;
- it counts against the practice score.

The text under it is kind ("لا بأس — ستعود هذه الكلمة في آخر التمرين"), so the screen says two things at once.

**Why it matters.**
- 105 of the 370 practice items (28%) are read-aloud, up to 4 in one set of 10.
- A learner who honestly answers "ليس بعد" four times can score at most 60%, the lowest score that still leads on to the test. One more mistake, and the result screen sends them back to the lesson instead (`js/gameEngine.js:558`).
- The progress page already leaves read-aloud items out of its accuracy figure (`js/teacherDashboard.js:82`). The practice score does not.
- Self-assessment only works if honesty costs nothing.

**Fix:**
- style "ليس بعد" neutrally: no red, no ✗, no buzzer;
- leave self-checks out of the practice score, or report them on their own line ("قرأتَ بنفسك 3 من 4 كلمات");
- keep sending the word back to the end of the set.

### R2. Page titles are cut off on phones (medium)

([screenshot](docs/ux-review/round-2/02-header-titles.jpg))

**What happens.** The header title is a single line that ends in "…" when it does not fit (`styles.css:207`). The 📚 and 🔥 chips beside it never shrink (`styles.css:213`).

Once a learner can read 5 words and has a two-day streak, both chips show. What fits then depends on the screen width:

| Screen width | Room for the title | Titles cut |
|---|---|---|
| 320 px | 75 px | all 10 unit names; the app name on home ("دورة ق…"); the save page |
| 360 px | 115 px | 9 of 10 unit names; the app name on home; the save page |
| 390 px | 145 px | 6 of 10 unit names (e.g. "أصوات أخرى لل…"); the app name on home; the save page |
| 412 px | 167 px | 5 of 10 unit names |
| 768 px and wider | 503 px or more | none |

The unit page itself names the unit only in English ("الوحدة 9 · More Vowel Sounds"). So on a phone, the full Arabic name of a unit appears nowhere on its own page.

**Fix** (any one is enough):
- let the title wrap to a second line;
- on narrow screens, move the chips out of the header (to home or the progress page);
- show the Arabic unit name in full in the unit page heading.

### R3. The activity dialog jumps after every answer on tablets and computers (low–medium)

([screenshot](docs/ux-review/round-2/03-dialog-resizes.jpg))

**What happens.** Above 520 px wide, the activity sheet is centred and only as tall as its content (`styles.css:361`, `:393`). When the feedback panel appears, the sheet grows both upwards and downwards. As a result:
- the answer buttons move up about 140 px: 519 → 379 px on a 768 px tablet held upright, and 534 → 393 px at 1280 × 800;
- «التالي» appears in a different place after each item.

Phones are not affected, because there the sheet fills the screen.

**Fix:** give the sheet a fixed height on wider screens, for example `height: min(760px, calc(100dvh - 24px))`, or anchor it to the top so that it only grows downwards.

### R4. Smaller things (low)

**Step pills that look like buttons** ([screenshot](docs/ux-review/round-2/04-home-continue.jpg)).
- On the "continue" card the steps (تعلّم ✓ · تمرين · اختبار) are rounded, filled pills.
- They look like the real step buttons on the unit page, but tapping them does nothing (`js/uiManager.js:148`).
- **Fix:** make them plainly informational (no fill, a ✓ or a dot), or make them links.

**Numbers without units.**
- The streak chip shows only "🔥 4". The word "أيام" is screen-reader text only (`index.html:55`).
- Unit rows show "4/12". "الخطوات المنجزة" is also screen-reader text only (`js/uiManager.js:179`).
- **Fix:** show "🔥 4 أيام" and "4/12 خطوة". The progress page already writes "4 من 12 خطوات".

**The practice total grows.**
- A missed item comes back at the end of the set, so the counter goes from "1 من 10" to "2 من 11" (`js/gameEngine.js:261`, `:297`).
- The finish line moves with every mistake.
- **Fix:** keep "من 10", and show the items that come back separately, for example "+1 في الآخر".

**Faint empty letter slots** ([screenshot](docs/ux-review/round-2/05-build-empty-slot.jpg)).
- In build items, an empty box is outlined in `#CBD5E0`, which is 1.5:1 on white (`styles.css:26`, `:520`).
- WCAG asks for 3:1 for the parts of a control that a learner needs to see. On a bright phone in daylight, the empty slot almost disappears.
- **Fix:** a darker or dashed outline.

**Long Learn panels give no sign that they scroll** ([screenshot](docs/ux-review/round-2/06-learn-rule-panel.jpg)).
- On a phone, the first panel of the first lesson is 868 px tall in a 673 px area.
- The cut falls on "انتبه: صوتا e و i متقاربان…", one of the most important lines. Meanwhile the button already offers «التالي: أمثلة».
- **Fix:** add a fade or a "↓" at the bottom of the panel while there is more to read.

---

## 4. What to keep

- The "continue" card and the one-line unit list: a returning learner is one tap from the next step.
- The full-screen activity sheet on phones:
  - the title, ✕ and progress always at the top;
  - one main button at the bottom.
- The answer feedback: ✓ and ✗ on the options, then a side-by-side comparison with sound and sounding out.
- Result screens:
  - the main button is the next step;
  - a failed test leads back to the lesson first.
- The leave confirmation, which defaults to staying.
- Colour tokens that pass AA in every theme, and themes that now recolour the whole app.

---

## 5. Recommendations

**Now (hours):**
- **R1:** a neutral "ليس بعد", left out of the practice score.
- **R2:** a title that can wrap, or chips moved out of the header on narrow screens.
- **R3:** a fixed-height activity sheet above 520 px.

**With the next UI change:** the items in R4.

**Still open from round 1** (see [UX-EVALUATION.md, "Still open"](UX-EVALUATION.md#still-open)):
- a usability test with five learners;
- a check on real iPhones and Android phones, with VoiceOver and TalkBack;
- the choice of the shape of "a".

---

## Appendix A: Measurements

### A1. Contrast (WCAG 2.x)

| Pair | Ratio |
|---|---|
| White on the action colour, default theme (`#5A67D8` → `#6B46C1`) | 4.81 → 6.42 |
| White on the action colour, Ocean / Forest / Sunset (start of the gradient) | 5.93 / 5.48 / 5.18 |
| White on right (`#2F855A`) / wrong (`#C53030`) | 4.54 / 5.47 |
| Taught letters `#B83280` on white / on their tint | 5.52 / 4.79 |
| Muted text `#5B6472` on white / on the grey surface | 5.98 / 5.64 |
| Action-coloured text `#4C51BF` on white / on its tint | 6.49 / 5.48 |
| Disabled main button `#4A5568` on `#CBD5E0` | 5.06 |
| Notice text `#7B341E` on `#FEF5E7` | 8.26 |
| Not text: empty letter slot, `#CBD5E0` on white | 1.49 |
| Not text: upcoming progress dot, `#E2E8F0` on white | 1.23 (the "N من M" count gives the same information) |

### A2. Answer buttons after a wrong answer

Top edge of the first answer button, in CSS px:

| Viewport | Before → after |
|---|---|
| 390 × 844 phone | 339 → 339 (no movement) |
| 360 × 740 phone | 257 → 257 (no movement) |
| 768 × 1024 tablet | 519 → 379 |
| 1280 × 800 | 534 → 393 (fill), 400 → 246 (odd one out) |

On a 320 × 640 phone the answer buttons do move (257 → 111), but for a different reason: the sheet scrolls so that the feedback is visible, which is intended.

### A3. Automated and keyboard checks

- **axe-core 4.** No violations on:
  - the start screen, home (new and returning) and the menu;
  - Learn, a practice item, a read-aloud item and the practice result;
  - the leave confirmation and the unit page;
  - the progress page, with and without the teacher settings;
  - the page for saving and moving progress.
- **Control sizes.** No visible control is smaller than 44 × 44 px on home, the menu, Learn, the unit page, build items or the page for saving and moving progress.
- **Tab order on home:** ☰ → «ابدأ التعلّم» → the placement link → unit rows 1, 2, 3 …
- **Focus in dialogs:** in an activity, 30 presses of Tab never left the dialog.
- **Escape:**
  - closes the menu;
  - after an answer, it asks before leaving;
  - on the confirmation, it returns to the activity.

## Appendix B: Screenshots

| File | Shows |
|---|---|
| [01-not-yet](docs/ux-review/round-2/01-not-yet.jpg) | A read-aloud item before and after "ليس بعد": red, ✗, and "لا بأس" |
| [02-header-titles](docs/ux-review/round-2/02-header-titles.jpg) | Headers with both chips: home at 320 px, then Unit 9 and the save page at 390 px |
| [03-dialog-resizes](docs/ux-review/round-2/03-dialog-resizes.jpg) | Desktop: the same item before and after a wrong answer |
| [04-home-continue](docs/ux-review/round-2/04-home-continue.jpg) | Home for a returning learner: step pills, "🔥 4", "4/12" |
| [05-build-empty-slot](docs/ux-review/round-2/05-build-empty-slot.jpg) | A build item with one empty slot |
| [06-learn-rule-panel](docs/ux-review/round-2/06-learn-rule-panel.jpg) | The first Learn panel on a phone, cut at "انتبه" |
