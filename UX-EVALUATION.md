# Words app (دورة قراءة الكلمات): UX and UI evaluation

**Lens:** adult A1 learners of English whose first language is Arabic, mostly on a phone, often new to apps like this
**Scope:** the interface and interaction design: screens, flows, activity UI, feedback, audio controls, visual design, Arabic/English text, accessibility and robustness. The teaching content is covered in [EVALUATION.md](EVALUATION.md).
**Reviewed:** 4 October 2026, branch `claude/magical-brown-tswm5f` at `e8327d4`

> **Update, 4 October 2026: the recommendations below have now been implemented.**
> This document still describes the version reviewed (`e8327d4`). See
> [Section 0](#0-implementation-status) for what changed and what is still open.

---

## 0. Implementation status

What was changed after this review, how it was checked, and what is still open.
Screenshots of the new version are in [`docs/ux-review/after/`](docs/ux-review/after/).

### Fix now (Section 3)

All of F1–F10 are fixed:

| # | Fix | Where |
|---|---|---|
| F1 | Every English run inside Arabic text is isolated when it is shown (`ar()`, `arHtml()`), so "-ed" stays "-ed" in titles, prompts, tips and Learn texts, including any text added later. One tip whose arrows paired words across a "·" was reworded. | `js/textUtils.js`; `curriculum.json` (u5_a_i tip) |
| F2 | One blank per missing letter. | `js/questionRenderer.js` |
| F3 | The activity sheet has a fixed header and footer around a scrolling middle, so feedback scrolls into view above the footer. | `index.html`, `styles.css` |
| F4 | Build items have «تحقّق» (enabled once the word is full), «ابدأ من جديد», and a hint that tapping a letter sends it back. Chain items say how to change a letter. | `js/questionRenderer.js` |
| F5 | Every activity has ✕, Learn included; only «فهمت» completes Learn. | `index.html`, `js/gameEngine.js` |
| F6 | Back is "→" in the header. The unit tree, with its arrows, is replaced by a list. | `index.html`, `js/uiManager.js` |
| F7 | Hover styles apply only on devices that hover; touch gets press feedback. | `styles.css` |
| F8 | New colour tokens; every text/background pair passes AA (white on green 4.5:1, on red 5.5:1; secondary-button text 6.5:1). The gold badge is gone. | `styles.css` |
| F9 | ✓ and ✗ on options and on built words. | `styles.css` |
| F10 | A spinner until the course has loaded; an error message with «أعد المحاولة» if it cannot load. | `index.html`, `js/main.js`, `js/dataManager.js` |

### Recommendations (Section 5)

| Recommendation | Status | Where |
|---|---|---|
| Units numbered from 1; review only when due; "4 من 10" beside the dots; no looping animations; `prefers-reduced-motion` | Done | `js/uiManager.js`, `js/gameEngine.js`, `styles.css` |
| Home built on "continue" | Done. One main card for the next step (the rest of the last lesson, then its unit, then the next open unit); review when due; the placement link until a test is passed; one line per unit. A locked unit says how to open it. | `js/uiManager.js`, `js/stateManager.js` (`nextStep`) |
| Steps that lead into one another | Done. «فهمت» starts practice. Practice leads to «ابدأ الاختبار» (or «راجع الدرس» under 60%). A passed test leads to the next lesson or unit; a failed one to «راجع الدرس» or «أعد الاختبار». Results show in the same sheet. | `js/gameEngine.js` |
| Unit page | Done. The next step is the main button; done steps show ✓ and their score; locked steps say why. The three steps sit in one row on phones. | `js/uiManager.js` |
| Hash routes | Done. Back closes the activity or the menu, or goes up a level. A reload returns to the page under the activity. Leaving a test, practice or placement with answers asks first. | `js/router.js`, `js/main.js` |
| Accessibility basics | Done. Units and theme swatches are buttons. Dialogs have dialog roles; focus moves in and comes back, Tab stays inside, Escape closes, and the page behind is inert. English is marked `lang="en"`. | `js/dialogs.js`, `js/uiManager.js`, `index.html` |
| Audio states and preloading | Done. The button shows loading and playing; the next item's clips are downloaded in advance. | `js/audioManager.js` |
| One Latin font | Done. Andika for all English: I, l and 1 differ, and its single-storey a matches the old target-word font. | `index.html`, `styles.css` |
| Learn pages | Done. Two panels (the rule, then the examples); tap a word to hear it; magenta only for the letters taught; no "·" separators; ≠ is never rotated. | `js/textUtils.js`, `js/gameEngine.js` |
| Dashboard | Done. A page ("تقدّمي") with plain labels and a compact stats row; the settings show only in teacher mode. | `js/teacherDashboard.js` |
| Installable and offline | Done. A web-app manifest and icons. A service worker keeps the app and the course (network first) and the audio clips (cache first). Opening a unit downloads its clips in the background, except on data-saving or 2G connections. | `manifest.webmanifest`, `sw.js`, `icons/` |
| Moving progress to another device | Done, as a file. «احفظ نسخة من تقدّمك» downloads it (or shares it, where the phone can share files); «افتح نسخة محفوظة» restores it after a confirmation. | note page; `js/stateManager.js`, `js/main.js` |
| Calmer rewards | Done. No points. "📚 N كلمة" in the header; the streak shows from two days on, without pulsing. Celebrations only for passing a test or finishing a unit. | `js/uiManager.js`, `js/gameEngine.js`, `js/effectsManager.js` |
| Unit pictures with keywords | Done. Noto Emoji pictures (Apache 2.0) shipped in `img/units/`, each with its keyword ("ship", with sh highlighted), which plays when tapped. | `img/units/`, `curriculum.json` (`keyword`) |

Other changes from Section 4:
- Returning learners skip the start screen, and its button now says «ابدأ الدورة».
- The placement check says how long it takes and shows which unit it is on.
- Practice gives one attempt per item; missed items come back at the end.
- Odd-one-out feedback highlights the sound pattern.
- The 🐢 button is labelled «قطّع» for its first three uses.
- The course-update notice is a banner that can be closed.
- The note page is now about saving and moving progress.

### Done differently from the recommendation

- **Dialogs** use dialog roles and a small focus manager rather than `<dialog>`, which iPhones before iOS 15.4 don't support.
- **F1** isolates English when the text is shown, rather than adding a check to `npm run validate`, so it covers every string, including future ones. The validator now checks the unit keywords.
- **Progress** moves as a file, not a QR code: a learner's progress, with its review schedule and answers, is far too big for one.
- **Teacher mode:** open `#/progress/teacher`, or press and hold the title of the "تقدّمي" page for a second.

### How it was checked

- **A scripted walkthrough in Chromium** at 390 × 844 (touch) and 1280 × 800: 75 checks at each size, all passing. It covers:
  - routes, Back and reload;
  - the leave confirmation;
  - every item type;
  - results and their next steps;
  - placement and the dashboard;
  - export and import;
  - the keyboard;
  - a slow and a failed load;
  - offline use with the service worker.
- **Further checks:** audio states, touch hover, reduced motion, the review flow, and tap targets.
- **axe-core:** no violations on the start screen, home, unit, Learn, practice result, confirmation, menu, dashboard (with the teacher settings) or note page.
- **Size:** every visible control is at least 44 × 44 px, and nothing scrolls sideways at 320 px.
- **`npm run validate`:** 0 errors, 0 warnings.

### Still open

- The usability test in Section 6, with learners from the target group.
- A check on real iPhones and Android phones, and a screen-reader session (VoiceOver, TalkBack).
- Confirming the shape of "a" against the letter-recognition course. Andika's default is the single-storey a; if that course uses the double-storey a, change the font.

---

## How this review was done

- **Ran the app** in Chromium at phone size (390 × 844, touch) and desktop size (1280 × 800), with the real Rubik and Quicksand fonts.
  - Walked every screen: splash, home, unit, Learn, practice, test, results, placement, review, menu, dashboard and the note page.
  - Answered every activity type (fill, say, listen, read, build, sort, odd one out, sentence) both right and wrong, failed a test on purpose, and used "unlock all".
- **Automated checks:**
  - axe-core 4 on each screen;
  - WCAG contrast ratios of the main colour pairs;
  - tap-target sizes;
  - a keyboard Tab-order trace;
  - a slow (3 s) and a failed load of `curriculum.json`.
- **Read the code:** `index.html`, `styles.css` and everything in `js/`.
- **Not covered:** real iOS and Android devices, a screen-reader session, and real learners. This is an expert review, not a usability test. Section 6 proposes the test.

Screenshots of the version reviewed are in [`docs/ux-review/`](docs/ux-review/). Most of them pair two moments of one interaction, such as before and after an answer.

---

## 1. Summary verdict

**What the app gets right.** The core activity screen is good:
- one task per screen;
- a large word (42 px on phones, 51 px on wider screens);
- big answer buttons;
- a short Arabic instruction;
- an audio button where one is needed.

Feedback after a wrong answer is the best part of the interface. It replays both words, highlights the letters that differ, and sounds out the right word while its letters light up (screenshot 3). Layouts are right-to-left throughout, nothing scrolls sideways at phone width, and the app is light and fast: no framework, prebuilt CSS, fonts that don't block the page.

**Overall.** The activity screens are close to ready. The parts around them are not. A learner has to work out where they are, what to do next and how to get back. Some screens mislead or trap them. The six main problems are below.

1. **No "continue" path.**
   - Home is a 3,100-pixel-tall list of ten unit cards (on a phone), starting at "الوحدة 0", with no button for "your next step".
   - Inside a unit, completed steps are the most eye-catching thing on screen. The next step is a plain white button (screenshot 1).
   - Every result screen returns the learner to the unit list, never to the next step.

2. **Some screens trap or mislead.**
   - The Learn page has no exit. The only way out is "فهمت!", which marks it done and awards points.
   - After a wrong build-the-word answer in practice there is no Next button and no hint that tapping a letter removes it (screenshot 4).
   - The phone's Back button leaves the app altogether.
   - "خروج" ends a test without asking first.

3. **Text that shows the wrong thing.**
   - Suffixes appear reversed: "-ed" shows as "ed-" and "-ing" as "ing-" in 21 places. These include lesson titles, test prompts and tips (screenshot 2).
   - The fill-in blank is always two dashes (`__`), but 48 of the 53 fill items are missing one letter (screenshot 3).
   - On phones, the "right answer" line of the feedback slides under the sticky footer.

4. **Touch-screen side effects.**
   - Hover styles are not limited to devices with a mouse. On a phone, the option under the learner's last tap shows up blue and raised on the next item, as if already chosen (screenshot 3, left).
   - Build items check the word as soon as the last box is filled. One mis-tap counts as a wrong first attempt, with no way to undo.

5. **Accessibility is weak.**
   - Unit cards are `<div>`s, so the keyboard cannot open a unit at all. Tab instead moves through 7 invisible items in the closed side menu.
   - Dialogs have no dialog role, no focus handling and no Escape key.
   - English words are not marked `lang="en"`.
   - White text on the green, red, gold and pink buttons and badges has a contrast of 1.4–3.3:1. The minimum is 4.5:1.
   - Right and wrong answers are shown by colour only.
   - Eight animations loop forever, and `prefers-reduced-motion` is ignored.

6. **Rewards and settings that don't suit adults.**
   - Confetti and "رائع جداً!" for reading a page.
   - Points that buy nothing.
   - A streak pill that pulses all the time.
   - A settings panel that lets the learner lower the test pass mark to 50%.

**Outlook.** Most of the fixes are small and local: CSS, a few lines of JavaScript, and wrapping some strings. Section 3 lists ten that take hours. The bigger gains come from three structural changes, each a few days' work:
- a home screen built around "continue";
- lesson steps that lead straight into one another;
- hash-based routes, so the Back button works.

---

## 2. Scorecard

Each dimension is scored out of 5, for this learner group on a phone.

| Dimension | Score | Main reason |
|---|---|---|
| Activity screens | 4 | Clear, big, one task per screen. Let down by the blank, build auto-submit and sticky hover |
| Feedback after an answer | 4 | Compare-and-sound-out is excellent. On phones it is partly hidden under the footer |
| Lesson flow (Learn → Practice → Test) | 2.5 | The right skeleton, but each step is a dead end. Learn has no exit; results don't lead anywhere |
| Navigation and orientation | 2 | No "continue", unit 0, the Back button leaves the app, the splash on every visit, locked cards give no explanation |
| Visual design and hierarchy | 3 | Friendly and consistent, but too many accent colours, the next step is the least visible, and Learn pages are cluttered with buttons |
| Arabic/English text and fonts | 3 | Good right-to-left base, but reversed suffixes, two shapes of "a", and "I" and "l" look the same |
| Accessibility | 1.5 | Units unreachable by keyboard, no dialog semantics, contrast failures, colour-only states, no reduced motion |
| Robustness | 2 | Taps before loading are ignored; a failed load shows an empty course; no routes; no offline support; progress tied to one browser |
| Motivation design for adults | 2.5 | "Words you can read" is a good measure, but it is buried under points, streaks and confetti |

---

## 3. Fix now: issues that mislead or block

Each of these takes hours, not days.

| # | Problem | Where | Fix |
|---|---|---|---|
| F1 | "-ed", "-ing", "-s" and "-es" show as "ed-", "ing-" and so on wherever an English fragment sits in Arabic text (21 strings: 8 prompts, 4 lesson names, 4 tips, 3 intros, 2 Learn texts) | `curriculum.json`; lesson names and prompts are inserted as plain text in `js/gameEngine.js:59` and `js/questionRenderer.js:50` | Wrap each Latin fragment in `<bdi dir="ltr">` (the Learn markup already has `` `-ed` ``, which renders isolated). Add a check to `npm run validate` that rejects a bare Latin run next to Arabic |
| F2 | The fill-in blank is always two characters wide, so `s__x` reads as "two letters missing" | `js/questionRenderer.js:147` | Draw one box per missing letter (`correct.length`) |
| F3 | On phones, the "right answer" line of the feedback is hidden under the sticky footer | `js/gameEngine.js:278`; `#modal-footer` in `styles.css` | Give `#modal-feedback` a `scroll-margin-bottom` as tall as the footer and scroll to `block: 'end'`, or show feedback as a bottom sheet above the footer |
| F4 | A wrong build answer in practice leaves the learner stuck: no Next button, no "tap to remove" hint. One mis-tap is scored as wrong | `js/questionRenderer.js:198` | Add a "✓ تحقّق" button that appears when the boxes are full, and a "مسح" (clear) button. After a wrong answer, say "اضغط على حرف لإزالته" |
| F5 | The Learn page cannot be closed without marking it done | `js/gameEngine.js:43` (exit hidden, never shown for Learn) | Show "خروج" (or an ✕ in the corner) on Learn; only "فهمت!" completes it |
| F6 | The back arrow points the wrong way for right-to-left: "← رجوع" points left, the same way as "التالي ⬅️". On desktop the arrow between unit cards points from unit 2 back to unit 1 | `index.html:68,74`; `styles.css:126` | Use "→ رجوع". Flip the connector arrow under `[dir=rtl]` |
| F7 | Hover styles apply on touch screens, so an untouched option looks chosen | the 18 `:hover` rules in `styles.css` | Wrap hover rules in `@media (hover: hover)`; use `:active` for touch feedback |
| F8 | White text on light colours: the gold badge 1.4:1, the pink streak pill 2.0:1, the green right-answer state 2.4:1, the red wrong-answer state 2.4:1, the secondary button text 3.7:1 | `styles.css`: `.achievement-badge`, `.streak-counter`, `.option-button.correct` / `.incorrect`, `.btn-secondary` | Dark text on gold (`#2D3748`, 8.6:1); green `#276749` (6.7:1); red `#C53030` (5.5:1); secondary text `#4C51BF` (6.5:1) |
| F9 | Right and wrong are shown by colour only | `.option-button.correct` / `.incorrect` | Add ✓ / ✗ to the option itself |
| F10 | Tapping "أسس صح!" before `curriculum.json` has loaded does nothing (tested with a 3 s delay). If the load fails, the home screen shows an empty course with no message (screenshot 6) | `js/main.js:24–38`; `js/dataManager.js` | Disable the button and show a spinner until the data is ready. On failure, show "تعذّر تحميل الدورة" with a retry button |

---

## 4. Detailed findings

### 4.1 Navigation and orientation

- **The splash screen on every visit.** Returning learners see the same landing card and must tap "أسس صح!" each time (`index.html:21`).
  - The button's text is a slogan ("build it right!"), not an action.
  - The second button invites the learner to take the placement test again.
  - For returning learners, either skip the splash or turn it into "تابع: الوحدة 2 · الدرس 3".
- **No "continue".** Home shows a stats banner, then ten large cards in a tree (screenshot 1; 3,122 px tall on a phone). Nothing points to the next lesson step.
  - This is the most important missing element.
  - The learner should land on one primary card: lesson name, the step (Learn, Practice or Test) and a big "تابع" button.
- **Numbering starts at 0.** "الوحدة 0" is programmer numbering, and the placement result repeats it ("ننصحك بالبدء من الوحدة 0"). Number from 1, or call it "قبل البدء".
- **Locked units say nothing.** A locked card is faded with 🔒 and `pointer-events: none` (`styles.css:163`), so tapping it gives no response. The only explanation is small grey text at the top of the page.
  - Let the tap open a short message: "انجح في اختبارات الوحدة 1 لتفتحها، أو خذ اختبار تحديد المستوى".
- **"لا مراجعة اليوم" shown to new learners.** A disabled review button appears before anything has been learnt, next to "تستطيع الآن قراءة 0 كلمة".
  - Hide review until the deck has items.
  - Show the words-read count once it is above zero.
- **Back button and reload.** The app has no routes (`history.length` stays the same throughout).
  - On Android, the system Back gesture during an activity leaves the site and loses the session.
  - Reloading always returns to the splash screen.
  - Hash routes (`#/u1`, `#/u1/u1_a_i/drill`) would fix both. Back would close the modal or go up one level.
- **Header.** On phones the header takes about 140 px.
  - The title repeats what the page already says, for example "ملاحظة مهمة" twice on the note page.
  - Points and the streak sit in the header permanently.
  - A slimmer header would give the content room: back button, title and menu on one row.
- **Keyword pictures without their keywords.** The unit emoji are keyword pictures: 🐈 cat, 🚢 ship, 🛑 stop, 🍰 cake, 🌧️ rain, 🚗 car, 🌙 moon, 📞 phone. That is a good idea, but the word is never shown, so learners will read them as decoration.
  - Write the keyword under the picture ("🚢 ship"), with its sound pattern highlighted.
  - Emoji also look different on different phones; pictures shipped with the app would look the same everywhere.

### 4.2 Lesson flow

- **Every step ends with a modal and then a return to the unit page.** Learn → "رائع جداً! +2" → "استمر" → unit page → tap Practice. Practice → result → "استمر" → unit page → tap Test.
  - Each step costs two extra taps and breaks momentum.
  - Make the result screen's main button the next step: "ابدأ التمرين", "ابدأ الاختبار", "الدرس التالي".
- **Failed test: the wrong main action** (screenshot 5).
  - After "5 من 10 … تحتاج 80%", the big button is "استمر" and "📖 راجع الدرس" is secondary.
  - Make "راجع الدرس" the main button, and add "أعد الاختبار" as the second.
- **The unit page buries the next step** (screenshot 1, right).
  - Completed steps are solid green, the most eye-catching thing on the page. The step to do now is white. Locked steps are at 40% opacity, with no reason given.
  - Reverse this: the next step is the solid main button, completed steps get a small ✓, and locked steps say why ("بعد التمرين").
  - On phones the three steps stack into three full-width buttons, so a four-lesson unit needs 12 buttons and about 1,100 px. A row of three step chips fits at 390 px.
- **"Unlock all" opens the units but not the steps.** On a new device a learner can open unit 5 but must still do Learn and Practice before the Test unlocks (verified). The placement test behaves the same way.
  - Let the Test (or a "test out" option) open for any unlocked unit.
- **Leaving without warning.** "خروج" clears a practice session or test at once (`js/main.js:80`). Ask for confirmation once at least one item has been answered.
- **The placement test hides its length.** It shows four dots, then adds four more after each unit passed. Say "حتى 10 دقائق، توقّف متى شئت" at the start, and show "الوحدة 3 من 9" while it runs.

### 4.3 Activity screens

- **Strong basics.**
  - The prompt is always in Arabic.
  - The word is shown big in Quicksand.
  - Answers are big buttons: a column on phones, a row or a 2 × 2 grid where that fits.
  - The audio button is above the word only where it belongs.
  - Decoding items (read, sort, odd one out, sentence) play no audio before the answer, which is the right call.
- **Progress dots have no numbers.** In practice, missed items are added back at the end, so the row of dots grows and the dots shrink once there are more than 12. Add "4 / 10" next to the dots.
- **Practice shows the answer, then asks for it again.** After a wrong option, the feedback names the right word ("الصحيح: six"), the wrong option is disabled, and the learner must still tap the right one.
  - Either give a hint without the answer on the first miss, or show the answer and let "التالي" continue.
  - At the moment it is busywork.
- **Build and chain items** (96 build, 10 chain):
  - The word is checked the moment the last box is filled (F4).
  - Chain items start with the old word in the boxes. The prompt "غيّر حرفاً واحداً" doesn't say that the learner must tap a box to empty it first.
  - Tiles can only be tapped, not dragged. That is fine, and simpler for this group.
- **Self-check "say" items.** The two self-check buttons appear only after 🔊 is tapped, which nudges the learner to read first. That is good.
  - "✅ قرأتها صحيحة" and "🔁 ليس بعد" are clear.
  - When the answer is "ليس بعد", the word is sounded out with its letters lighting up. Excellent.
- **Odd-one-out feedback** compares the learner's choice with the right answer by letter difference (bird vs car). With two different words the whole word is highlighted, which adds nothing. For odd items, highlight the sound pattern instead (ir, ar).

### 4.4 Feedback and results

- **Keep the feedback design** (screenshots 3 and 4, right). It shows:
  - the chosen word and the right word, each with its meaning;
  - the differing letters highlighted;
  - both words played, the right one sounded out;
  - the lesson's rule as a tip.

  Few commercial apps do this well.
- **Tone.** "رائع جداً!" plus confetti for tapping "فهمت!" on a Learn page, "+2 نقطة", "محاولة جيدة" with a 💪 badge for a 50% test score. To adults this reads as written for children.
  - Keep the celebration for passing a test and finishing a unit.
  - Make the others a quiet toast or an inline line.
- **Points have no purpose.** They are added up and displayed but never used for anything. The app already has a better measure: "تستطيع الآن قراءة 152 كلمة".
  - Put that number in the header, and drop or hide points.
  - Keep the streak, but stop it pulsing.

### 4.5 Audio controls

- **Two audio buttons per word, with different icons.** Large items use an SVG speaker. Smaller places use the 🔊 emoji in a pink gradient circle, next to a teal 🐢 for "sound it out".
  - A turtle usually means "play slowly". The meaning is explained only in the Learn header, not where the button appears again in feedback.
  - Give it a short text label ("قطّع") the first few times, or a tooltip on long-press.
- **No "playing" or "loading" state.** Clips are fetched on demand. On a slow connection the first tap does nothing visible for a second, so learners tap again, which restarts the clip.
  - Animate the button while a clip is loading or playing.
  - Preload the next item's clips during the current item.
- **Too many speaker buttons on Learn pages.** The silent-e and -ed pages show 10–20 glowing pink circles (screenshot 8). They pull the eye away from the words and from the highlighted letters, which are also pink.
  - Make the word itself the button: tap the word to hear it.
  - Use a small, neutral icon.
  - Keep pink/magenta only for the letter pattern being taught.

### 4.6 Visual design

- **Palette.** Purple gradient background, frosted-glass cards, pink speaker buttons, green completed steps, gold badges, an orange-pink streak, teal turtle buttons and magenta letter highlights add up to seven accent colours. As a result nothing stands out.
  - Pick one action colour (the theme colour) and one teaching colour (the letter highlight).
  - Use green and red only for right and wrong.
- **Themes.** The sunset and ocean themes put white text on `#F59E0B` (2.2:1) and `#0EA5E9` (2.8:1). Either darken them or drop themes; they add little for this audience.
- **Learn pages.**
  - The page starts with a block of text.
  - Word lists use "·" separators, which end up stranded at line ends (screenshot 8, right).
  - The ≠ sign in pair cards is rotated 90° on narrow screens, where it turns into an unfamiliar symbol (screenshot 8, left). Rotate only the → arrow.
  - Use gaps instead of separators.
  - Long pages would read better split into two or three short panels ("the rule" → "listen" → "examples").
- **The sticky footer covers content.** The faded "فهمت!" footer sits over the last row of example cards on every Learn page. This is acceptable for long pages, but add bottom padding equal to the footer height so the last row can be scrolled clear.
- **Unit headings with English.** "الأصوات القصيرة: a e i o u" wraps the final "u" onto its own line on phones. Keep English inside headings in a no-wrap, isolated span.

### 4.7 Arabic and English text

- **Reversed suffixes** (F1).
- **Two shapes of "a".** Target words use Quicksand, whose "a" is single-storey (ɑ). Latin letters inside Arabic text and headings (for example "a e i o u" in a title, or "A · E · I · O · U") use Rubik, whose "a" is double-storey. Learners who have only just learnt the letters see both shapes on one screen.
  - Use one Latin font everywhere: apply `english-font` to all Latin text.
  - Choose the "a" shape to match the letter-recognition course.
- **"I" and "l" look the same** in both fonts (screenshot 9). This matters for a course that teaches the heart word *I* and words such as *lip*, *lid* and *ill*.
  - Consider Andika (SIL, designed for beginning readers, on Google Fonts) or Atkinson Hyperlegible. Both draw I, l and 1 differently.
- **Unmarked English.** The page is `lang="ar"`, and English words are not marked `lang="en"`. Screen readers will read *cat* with Arabic rules, and so might the browser's own text-to-speech tools.

### 4.8 Accessibility

| Issue | Evidence | Fix |
|---|---|---|
| Units cannot be opened by keyboard | Unit cards and theme swatches are `<div>`s (`tabIndex` −1); the Tab trace skips them | Use `<button>` (or `<a href="#/u1">`) |
| The closed side menu is still in the Tab order | 7 Tab stops land on menu items that are off screen | Add `inert` (or `visibility: hidden`) when the menu is closed |
| Dialogs | Activity, result and dashboard overlays have no `role="dialog"` or `aria-modal`, don't move focus in, don't trap focus, and Escape does nothing | Use `<dialog>` with `showModal()`, which gives all of this; return focus to the button that opened it |
| Contrast | See F8 and Appendix A; axe flags the dashboard close button (3.7:1) | Darker tokens |
| Colour-only states | Right and wrong options; completed steps | ✓ / ✗ icons; "✓ تمّ" on completed steps |
| Form labels | Dashboard sliders have no linked label (axe: critical) | `<label for>` |
| Motion | Eight animations loop forever: start-button pulse, streak pulse, title glow, badge glow, badge shine, mastered-card glow, progress shine, current-dot pulse. No `prefers-reduced-motion` rule | Stop the looping animations; honour reduced motion |
| Tap targets | 🔊 and 🐢 in Learn and feedback are 34 px; the menu ✕ is 41 × 36; theme swatches are 30 px. These pass WCAG 2.2 AA (24 px) but are below the 44–48 px platform guidance | Grow them to 44 px |
| Headings | h1 → h3 with no h2 on home and unit pages (axe) | Fix the heading levels |
| Language | English is not marked `lang="en"` | Mark it |
| Live feedback | `#modal-feedback` is `aria-live="polite"`, which is good | Keep it |

### 4.9 Robustness and performance

- **Good:**
  - small JavaScript, no framework;
  - prebuilt Tailwind (13 KB);
  - fonts that don't block the page;
  - Web Audio playback with the iOS unlock handled;
  - `localStorage` wrapped in try/catch;
  - no sideways scrolling on any screen at 390 px.
- **Start-up race** (F10). Event listeners are attached only after `curriculum.json` (176 KB) has loaded, yet the start button pulses from the first frame.
- **Offline.** There is no service worker, so a lost connection in the middle of a lesson breaks audio. Precaching the app shell, the curriculum and the current unit's clips would make it work on patchy mobile data. A web-app manifest would also let it be installed on the home screen.
- **Progress lives in one browser.** The note page explains this honestly. The fix is product-level: an export/import code or QR code ("انقل تقدّمك") would cover changing phones without needing accounts.
- **The note page** keeps a "تحديث الدورة" notice permanently. Show it once, as a dismissible banner, and keep the note page for contact and privacy.

### 4.10 Learning dashboard

- **Clear and honest.** It shows words readable, first-try accuracy, words due for review, accuracy per lesson with a 60% warning, and the most-confused pairs.
- **Settings for teachers, inside the learner's app** (screenshot 6, left). The learner can lower the pass mark to 50%, which undoes the mastery gate that the content review asked for.
  - Move the settings behind a teacher switch (for example a long-press, or a PIN), or remove them.
- **Mixed audience.** The panel speaks about "المتعلّم" (the learner, in the third person), while the rest of the app speaks to "أنت". "دقّة المحاولة الأولى" is jargon.
  - Use "أجبت صحيحاً من أول مرة: 57%".
- **Phone layout.** On a phone the four stat tiles take more than half the first screen before any per-lesson detail appears. Use one compact row.

### 4.11 What to keep

- The activity screen pattern: Arabic prompt, big word, big answers, audio only where it is allowed.
- The comparison feedback, with letter-difference highlighting and sounding out.
- Sounding out with letters lighting up, on Learn pages, in feedback and on "ليس بعد".
- Honest scores: "9 من 10 صحيحة من المحاولة الأولى".
- The sticky footer, so "التالي" is always reachable.
- "📖 راجع الدرس" after a failed test.
- Right-to-left done properly almost everywhere, with English isolated in `dir="ltr"` spans.
- "تستطيع الآن قراءة N كلمة" as the headline measure of progress.

---

## 5. Recommendations

### 5.1 Priority 0: hours

All of Section 3 (F1–F10), plus:
- start numbering units at 1;
- hide the review button until there is something to review;
- add "N / M" next to the progress dots;
- stop the looping animations and honour `prefers-reduced-motion`.

### 5.2 Priority 1: days

1. **A home screen built on "continue"** (sketch below). One main card for the next step; then review, if any is due; then the unit list, with finished units collapsed.
2. **Steps that lead into one another.** Each result screen's main button starts the next step. A failed test leads to "راجع الدرس", then "أعد الاختبار".
3. **Unit page:** the next step is the main button, completed steps show ✓, locked steps show why, and the three steps sit in one row on phones.
4. **Hash routes:** the Back button closes the modal or goes up one level; a reload returns to the same place. Ask before leaving a test.
5. **Accessibility basics:** buttons instead of divs, `<dialog>`, `inert` on the closed menu, `lang="en"`, ✓ / ✗ icons.
6. **Audio states:** loading and playing animations; preload the next item's clips.
7. **Fonts:** one Latin font for all English, with distinct I and l and a deliberate choice of "a" shape.
8. **Learn pages:** tap the word to hear it; pink only for the letter pattern; no rotated ≠; no "·" separators; two or three short panels instead of one long one.
9. **Dashboard:** move the settings behind a teacher switch; plain-language labels.

### 5.3 Priority 2: one release

- **Make it installable and work offline:** a web-app manifest and a service worker that caches the app shell, the curriculum and audio by unit.
- **Transfer progress** between devices with a code or QR code.
- **Calmer rewards:** "words you can read" in the header; celebrations only for tests and units; no points, or points with a purpose.
- **Pictures shipped with the app** for the unit keywords, each labelled with its word.

### 5.4 Sketch: home screen on a phone

```
┌──────────────────────────────────┐
│ ☰   دورة قراءة الكلمات   📚 152 │  ← one row: menu, title, words you can read
├──────────────────────────────────┤
│  تابع من حيث توقّفت               │
│  ┌────────────────────────────┐  │
│  │ 🚢 ship   الوحدة 2 · sh ch │  │
│  │ ● تعلّم ✓  ● تمرين ✓  ○ اختبار │  │
│  │      [  ابدأ الاختبار  ]     │  │  ← the one main button on the page
│  └────────────────────────────┘  │
│  🔁 مراجعة اليوم (8 كلمات)  ›    │  ← only when review is due
├──────────────────────────────────┤
│  الوحدات                          │
│  ✓ 1  أصوات الحروف        9/9    │  ← finished units collapsed to one line
│  ✓ 2  الكلمات القصيرة    12/12   │
│  ▸ 3  حرفان بصوت واحد     8/12   │
│  🔒 4  حرفان ساكنان متجاوران      │  ← tap: "انجح في اختبار الوحدة 3"
│  …                               │
└──────────────────────────────────┘
```

---

## 6. Next step: a small usability test

Five learners from the target group, 30 minutes each, on their own phones, thinking aloud in Arabic. Five learners find most problems of this size.

| Task | Success means |
|---|---|
| First visit: "ابدأ الدورة من المكان المناسب لك" | Chooses placement or unit 1 without help |
| Do the first lesson's Learn step, then leave it without finishing | Finds a way out (today there is none: F5) |
| Do one practice session | Completes it; note every hesitation at build and chain items |
| "سمعت كلمة لا تعرفها، كيف تسمعها مرة أخرى؟ وكيف تسمعها صوتاً صوتاً؟" | Finds 🔊 and 🐢 |
| Close the app, reopen it: "تابع من حيث توقّفت" | Time and taps to reach the next step |
| Fail a test (with a seeded item): "ماذا تفعل الآن؟" | Chooses to review the lesson |

Measure task success, time on task, taps to the next step and wrong turns, and ask afterwards: "what did 🐢 mean?" and "what are the points for?"

---

## Appendix A: Measurements

### A1. Contrast (WCAG 2.x; normal text needs 4.5:1)

| Element | Colours | Ratio | |
|---|---|---|---|
| Achievement badge ("+14 نقطة", "لا تستسلم!") | white on `#FFD700`–`#FFA500` | 1.4–2.0 | fails |
| Streak pill | white on `#F093FB`–`#F5576C` | 2.0–3.3 | fails |
| Right-answer option, completed step | white on `#48BB78`–`#38B2AC` | 2.4–2.6 | fails |
| Wrong-answer option | white on `#FC8181`–`#F56565` | 2.4–3.0 | fails |
| Secondary buttons (رجوع, خروج, حدّد مستواي, إغلاق) | `#667EEA` on white | 3.7 | fails |
| Main button, start of gradient | white on `#667EEA` | 3.7 | fails (6.4 at the end of the gradient) |
| Sunset / ocean theme main button | white on `#F59E0B` / `#0EA5E9` | 2.2 / 2.8 | fails |
| Fill-in blank | `#9F7AEA` on white | 3.3 | passes for non-text only |
| Highlighted letters | `#D53F8C` on white | 4.3 | passes only because the words are large |
| Meanings, unit numbers | `#718096` on white | 4.0 | fails at 14–15 px |
| Body text, prompts | `#4A5568` / `#2D3748` on white | 7.5+ | passes |

### A2. axe-core results (violations)

- **Splash:** heading order; no main landmark; content outside landmarks.
- **Home and unit:** heading order (h1 → h3).
- **Learn and activities:** heading order; content outside landmarks (the modal is outside `<main>`).
- **Dashboard:** two sliders without labels (critical); close button contrast (serious); heading order.

### A3. Tab order on home (first 10 stops)

menu ☰ → "حدّد مستواي" → ✕ (hidden) → 6 hidden menu items → body → menu ☰ … No unit card is ever reached.

### A4. Network

| Case | Result |
|---|---|
| `curriculum.json` delayed 3 s, start tapped at 0.5 s | The tap is ignored; the learner must tap again after loading |
| `curriculum.json` fails (503) | The app opens to "اختر وحدة لتبدأ التعلّم" with no units and no error |

## Appendix B: Screenshots

| File | Shows |
|---|---|
| [01-home-and-unit](docs/ux-review/01-home-and-unit.jpg) | Home for a new learner (no "continue", unit 0, disabled review); unit page after practice (completed steps louder than the next step; "← رجوع") |
| [02-bidi-suffixes](docs/ux-review/02-bidi-suffixes.jpg) | "ing- و ed-" in the Learn title and text; a sort item's tip with mixed-direction lines |
| [03-fill-item](docs/ux-review/03-fill-item.jpg) | Option "u" looks chosen before any tap (sticky hover); two-dash blank for one letter; the right answer under the footer |
| [04-build-item](docs/ux-review/04-build-item.jpg) | Build item before and after a wrong answer: no Next, no hint how to fix |
| [05-results](docs/ux-review/05-results.jpg) | Practice result; failed-test result with "استمر" as the main button and a low-contrast badge |
| [06-dashboard-and-load-error](docs/ux-review/06-dashboard-and-load-error.jpg) | Learner-editable pass mark; empty course after a failed load |
| [07-desktop-home](docs/ux-review/07-desktop-home.jpg) | Desktop unit tree; the arrow between units points from 2 to 1 |
| [08-learn-page](docs/ux-review/08-learn-page.jpg) | Rotated ≠ in the pen/pin card; stranded "·" separators and many pink speaker buttons |
| [09-font-glyphs](docs/ux-review/09-font-glyphs.jpg) | Quicksand and Rubik: I and l identical; single- and double-storey "a" |

Screenshots 03 (left), 04 and 08 were taken before the web fonts loaded, so they use the system fallback font. The layout is the same.
