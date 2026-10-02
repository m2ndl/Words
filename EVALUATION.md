# Words app (دورة قراءة الكلمات): content evaluation

**Lens:** teaching English word reading to adult A1 EFL learners whose first language is Arabic, after letter recognition
**Scope:** the Words app only: `curriculum.json` and the activity engine in `js/` that presents it
**Reviewed:** 1 October 2026, `main` at `3794fc4`

> **Update, 2 October 2026: the recommendations below have now been implemented.**
> This document still describes the version reviewed (`3794fc4`). See
> [Section 0](#0-implementation-status) for what changed and what is still open.


---

## How this review was done

- **Every item read.** All 7 units and 22 sub-skills: each Learn text, example, drill and quiz item (646 word tokens, 339 distinct words).
- **Scripted checks** (method in Appendix A):
  - answer keys and option order;
  - a sound-by-sound comparison of every quiz option pair, using the CMU Pronouncing Dictionary;
  - word frequency (wordfreq, Zipf scale) and word level (CEFR-J Wordlist 1.5);
  - spelling patterns each unit uses before, or without, teaching them.
- **Ran the app** in Chromium at phone size, with the speech engine instrumented. This showed exactly what a learner sees and hears, and how answers are scored.
- **Benchmarked** against reading research and against published courses and frameworks for adult and Arabic-speaking beginning readers (Section 6 and References).

---

## 0. Implementation status

What was changed after this review, and what still needs work.

### Errors (Section 3)

All of E1–E10 are fixed:
- The old items were rewritten.
- The morph drills were removed.
- Options are shuffled.
- Scoring uses first attempts only.
- The dashboard text is cleaned.

`npm run validate` now rejects a reversed answer key or an answer missing from its options.

### Recommendations (Section 5)

| Recommendation | Status | Where |
|---|---|---|
| First-attempt scoring; tests without retries; a pass mark that works | Done | `js/gameEngine.js` |
| Shuffle options in every item | Done | `js/questionRenderer.js` |
| No audio before the learner answers a decoding item | Done. Read, sort, odd-one-out, sentence and read-aloud items show print only; the audio follows the answer | `js/questionRenderer.js` |
| Log every first attempt | Done | `js/stateManager.js` |
| Rewrite the Learn texts | Done. Each text covers: the vowel says its name, the e is silent, position rules, exception words; it uses no IPA and no Arabic letters for vowels | `curriculum.json` |
| A1–A2 words, each with a meaning | Done. All 823 words have an Arabic gloss; only one target word is rarer than Zipf 3.3 (*napkin*, which CEFR-J lists as A2) | `curriculum.json` |
| Distractors that test the target | Done. 611 of 636 option pairs are at most two sounds apart; the rest are exception words or longer words | `curriculum.json` |
| Real tests: 8–10 items, 3 options, at least half new words, pass at 80% | Done for every lesson. A failed test offers "📖 راجع الدرس" | `curriculum.json`, `js/gameEngine.js` |
| Feedback that teaches | Done. It replays both words, highlights the letters that differ and shows the lesson's rule | `js/gameEngine.js` |
| Recorded audio | **Partly.** See "Audio" below | `js/audioManager.js`, `audio/` |
| Dashboard: accuracy per lesson and most-confused words | Done | `js/teacherDashboard.js` |
| New scope and sequence | Done. Ten units, 0–9 as in 5.4, with 37 lessons and 727 items (previously at most ~200 responses per pass) | `curriculum.json` |
| Spelling in every unit | Done. Build-the-word with sound tiles and extra tiles, word chains, fill-the-letters | `curriculum.json` |
| Heart words and sentences in every unit | Done. 63 heart words and 86 sentences, each read and checked for meaning | `curriculum.json` |
| Read aloud, then check | Done. 105 self-check items, retried at the end of the practice set if missed | `curriculum.json` |
| Spaced review | Done. Passed test items come back after 1, 3, 7, 14 and 30 days | `js/stateManager.js` |
| Placement check | Done. It unlocks the units a learner already reads | `js/gameEngine.js` |
| p/b, f/v, e/i and consonant clusters | Done. Unit 0 covers the contrasts; Unit 3 covers clusters | `curriculum.json` |
| Adult framing | Done. "Silent E" replaces "Magic E", and key-word pictures replace decorative icons | `curriculum.json` |

**Audio.** What is done:
- The app now plays a recording whenever a word or sentence is listed in `audio/manifest.json`.
- It no longer picks novelty voices.
- It rotates up to three US voices in listening items.

What is still needed:
- Recordings, especially of sounded-out words.
- Device speech is still the fallback.

### Still open

- **Sounded-out audio** ("sh–i–p … ship") needs recordings.
- **Speech recognition.** Reading aloud is self-checked.
- **Outcome data from a pilot with real learners.** Measure:
  - reading of untrained words;
  - vowel contrasts;
  - spelling;
  - reading of sentences.

**Validation used while writing the new content.** Every word was checked against:
- the CMU Pronouncing Dictionary, so it is decodable with the patterns taught by that point (plus taught heart words);
- word frequency;
- CEFR-J level.

Every item was also checked for answer-key consistency and distractor closeness.


---

## 1. Summary verdict

**What the app gets right.** It is built on a sound idea:
- it teaches English sound–spelling patterns explicitly;
- it explains them in Arabic;
- it gives an audio model for every example;
- it uses contrasting pairs such as *hat/hate*, *chip/ship* and *think/sink*.

The interface is clean and friendly and works well on a phone. The Learn → Practice → Test structure is the right skeleton.

**Overall.** As a course in **word reading after letter recognition for adult A1 learners**, it is not yet fit for purpose. There are six main problems.

1. **It starts in the middle.**
   - After letter recognition, learners need, in this order:
     - letter–sound knowledge;
     - blending of short-vowel, consonant–vowel–consonant (CVC) words;
     - consonant digraphs;
     - consonant blends.
   - The app opens with silent e and assumes all of these.
   - It puts CVC words last ("Production Drills").

2. **Learners are rarely made to decode.** The learner almost never has to turn print into sound alone:
   - sort drills say the word aloud before the learner answers;
   - "morph" drills need no answer at all;
   - most odd-one-out items can be solved by spotting letters.

3. **Tests cannot be failed, and they are easy to game.**
   - Only a correct answer moves the learner on, so every quiz ends at 100%.
   - Answer options are never shuffled. In Units 5–7 the right answer is always the top option (56 of 56 items).
   - So the 80% pass mark, the unit locks and the "متقن!" badge say nothing about what the learner knows.

4. **The words don't fit A1 adults.**
   - About a quarter of the words learners must read are above A2 or rare, for example *pane, glob, rook, fern, dime, cod, robe, gem*.
   - Names, made-up words and misspellings appear as answer options.
   - Word meanings are never given.
   - Only about 30 of the 100 most frequent English words appear anywhere.

5. **Some content is wrong.**
   - One answer key is reversed (*tub/tube*).
   - In the R unit, the button says "Add the magic E".
   - The example given for *ay* actually uses *ai*.
   - "Long vowel" is explained as a longer sound, and Arabic speakers will take that literally.

6. **It stops at single words.**
   - There are no high-frequency "heart words" (common words with irregular spellings), no phrases, no sentences, no texts and no spaced review.
   - The whole course gives a learner at most about 200 responses.

**Outlook.** Most of these are fixable in `curriculum.json`, plus a few small changes to the activity engine (Section 5). The bigger gains need new content: a proper starting sequence, sentences and review. Section 5 gives a blueprint.

---

## 2. Scorecard

Each dimension is scored out of 5, against what research and leading adult courses do for this learner group.

| Dimension | Score | Main reason |
|---|:-:|---|
| Scope and sequence (after letter recognition, A1) | 1.5 | Foundations missing; digraphs late; soft c/g early; CVC last |
| Accuracy and clarity of explanations | 3 | Clear, friendly Arabic, but "long = longer", silent e never called silent, several wrong examples |
| Fit for Arabic-speaking learners | 3 | Strong consonant anchors (ش ث ذ تش) and a vowel focus; nothing on p/b, f/v, e/i or consonant clusters |
| Word choice and meaning | 2 | A quarter of target words above A2 or rare; no pictures or glosses; names and made-up words |
| Practice design (does the learner decode?) | 1.5 | Audio before the answer; drills with no answer; letter-spotting |
| Assessment and mastery | 1 | Cannot be failed; unshuffled 2-option items; 82% of quiz words already practised |
| Feedback | 1 | Only "حاول مرة أخرى" (try again) |
| Audio model | 2 | Device speech: voice and quality vary by device; no sounding-out |
| Beyond single words (common words, sentences, fluency) | 1 | None |
| Review and retention | 1 | No spaced or cumulative review |
| Adult-appropriateness and motivation | 3 | Respectful Arabic and light gamification, but child-phonics metaphors and icons |
| Usability (right-to-left/left-to-right text, mobile, ease of starting) | 4 | Clean and quick; small display bugs |

---

## 3. Fix now: errors that teach the wrong thing

| # | Where | Problem | Fix |
|---|---|---|---|
| E1 | `u_e` quiz, item 5 | The audio says **tub** but the answer key is **tube**. A learner who hears "tub" and picks *tub* is told to try again, then rewarded for *tube*. (Confirmed in the browser.) | Set `answer` to `"tub"` |
| E2 | `a_with_r` drill | The button reads **"✨ أضف E السحري"** ("Add the magic E") while *cat* turns into *car*: `renderMorph` ignores the unit's `buttonText`. The display `cat ➡️ cat_` also suggests adding a letter, but none of the 6 pairs is made by adding *r*: each replaces a letter (cat→car, back→bark, stat→star, fat→far…). | Use `data.buttonText`. Use true "add r" pairs: cat→cart, had→hard, ham→harm, pat→part |
| E3 | Every quiz, odd-one-out and fill-in item | Options are never shuffled. The quiz answer is the top option in 74 of 106 items, including all 56 items in Units 5–7. The odd-one-out answer is the last option in 21 of 24 items. | Shuffle options when each item is shown |
| E4 | All drills and quizzes | Only correct answers count, and retries are unlimited, so every session scores 100%. (Confirmed: a wrong first answer on all 5 items still gave "نجحت في الاختبار!" ("You passed the test!").) | Score the first attempt (see 4.5) |
| E5 | `ai_ay` Learn text | *plan → plain* is given as the example for **ay**, but *plain* is spelled with *ai*. | e.g. "ai in the middle: rain, wait · ay at the end: day, play, say" |
| E6 | `ai_ay` examples | *mad → may* is not a vowel-team pair: the *d* is replaced by *y*. | *pad → paid* or *pan → pain* |
| E7 | `a_e` drill | *sam → same*: *Sam* is a name, shown in lowercase as if it were a word. | *mad → made* or *at → ate* |
| E8 | `ch` Learn text | Literal asterisks show on screen: "(\*school\*)", "(\*chef\*)". Mixed IPA and Arabic also display in the wrong order. | Plain English words in left-to-right spans, no IPA |
| E9 | `th_voiceless` Learn text | Typo "ينطلق" (should be يُنطق) and colloquial grammar ("حتى يكونوا… يجمعوا"). | See Appendix B |
| E10 | Learning dashboard | The text "// NEW CODE" is shown to users (`js/teacherDashboard.js:73`). | Delete the line |

Section 7 lists the remaining item-level problems: rare words, weak distractors and untaught patterns.

---

## 4. Detailed findings

### 4.0 Who the learners are, and what follows from that

**The learners.** They are Arabic-speaking adults at A1 who know the English letters. They are almost certainly fluent readers of Arabic: the app's own interface is written Arabic.

**What that means for the evidence.** They are not "emergent readers" in the LESLLA sense of adults learning to read for the first time (Bigelow & Vinogradov, 2011). They already know what reading is. What they lack is:
- English sound–spelling knowledge, above all for vowels;
- spoken English vocabulary;
- habits suited to a writing system that, unlike Arabic, spells every vowel but spells them inconsistently.

Research on Arabic readers of English shows exactly this profile:
- weaker processing of vowel letters (Ryan & Meara, 1991; Hayes-Harb, 2006);
- more trouble with short vowels and wrong-vowel spellings (Saigh & Schmitt, 2012);
- slower recognition of single words (Fender, 2003);
- weak knowledge of basic syllable spelling patterns (Fender, 2008).

An eye-tracking study suggests the problem is weak knowledge of vowel spellings rather than literally not looking at vowels (Alhazmi, Milton & Johnston, 2019).

**Three consequences for the app:**
1. Letter–sound and CVC basics can move quickly, but they cannot be skipped. Vowel spelling needs sustained, cumulative practice.
2. Arabic is the right language for explanations. Using the first language for clarification was linked to greater reading growth in the US "What Works" study (Condelli, Wrigley & Yoon, 2009).
3. Meaning must be supplied, because learners' spoken vocabulary is small.

### 4.1 Scope and sequence

**What the app teaches, in order**

| Unit | Content |
|---|---|
| 1 Magic E | a_e, i_e, o_e, u_e |
| 2 Team Sounds | ee/ea, ai/ay |
| 3 Soft Sounds | soft c, soft g |
| 4 R-Controlled Vowels | ar, or, er/ir/ur |
| 5 Consonant Digraphs | sh, ch, th (ث), th (ذ), wh, ph |
| 6 Advanced Vowel Teams | oo (two sounds), oi/oy and ow/ou, au/aw |
| 7 Production Drills | spelling CVC words; spelling mixed words |

**What normally comes first after letter recognition**

The adult and remedial programmes in Section 6 agree on a broad order. So do the adult frameworks (LASLLIAM; the UK Adult ESOL Core Curriculum).

1. letter → sound
2. blending short-vowel CVC words
3. sh / ch / th (plus ck, ng)
4. consonant blends
5. silent e and open syllables (go, me)
6. vowel teams, r-controlled vowels, other vowels
7. alternative consonant spellings (soft c/g, ph)
8. word endings and two-syllable words

High-frequency irregular words are taught alongside, throughout. The research case for this order:
- Systematic, cumulative phonics improves word reading and spelling (National Reading Panel, 2000; Ehri et al., 2001; Rose, 2006; Castles, Rastle & Nation, 2018).
- Simple, frequent, reliable patterns should come before rarer, less reliable ones.

**Gaps**

- **Missing foundation.**
  - There is no letter–sound step and no teaching of short-vowel blending, yet Unit 1 depends on both: to read *hat → hate*, the learner must first read *hat*.
  - CVC words appear only in Unit 7, as spelling, with no Learn step.
- **Patterns used but never taught:**
  - consonant blends (plan, flute, train, three, spoon — in every unit);
  - ck; ng/nk; double letters (ff, ll, ss);
  - open syllables (go, me, she, hi);
  - y as a vowel (my, try, city, gym);
  - oa; ow as in *snow*; igh; ew/ue; ea as in *bread*;
  - air/are/ear/ere (chair, there, where, hair); al/all;
  - word endings (-s, -ed, -ing);
  - two-syllable words; silent letters.
- **No high-frequency word strand.**
  - Only about 30 of the 100 most frequent English words occur anywhere in the app.
  - Missing words include *to, and, of, is, you, it, was, are, have, he, we, my, do, one, two*.

**Order problems**

- **Digraphs come too late.** sh, ch and th occur in the most frequent words (*the, this, that, they, with, she*), so programmes teach them right after CVC. Here they are Unit 5, and Unit 4 has already used *north, short* and *porch*.
- **Soft c/g come too early.** Programmes teach them late (Wilson Step 7, Letters and Sounds Phase 5, Laubach Book 4), because the g rule is unreliable.
  - In Clymer's classic analysis of phonics rules, the soft-c rule held about 96% of the time but the soft-g rule only about 64% (Clymer, 1963/1996).
  - Many A1 words break it: *get, give, girl, begin, together*.
  - The app's own Unit 4 then uses *girl* and *gill* with a hard g, without comment.
- **Spelling is separated from reading.** Spelling and encoding instruction improves reading as well as spelling (Graham & Santangelo, 2014; Weiser & Mathes, 2011). That is why programmes put it in every lesson (Wilson's spelling block; Laubach's writing step), not in a final unit.

**Decodability**

Every unit uses spelling patterns it has not yet taught (Appendix A3). For example:
- Unit 3 uses *goal* (oa), *city/gym/cycle* (y) and *gentle* (-le).
- Unit 4 uses *north, short, porch* before th, sh and ch are taught.
- Unit 5 uses *chair, share, there, where* (air/ere), and *tooth* and *mouse* before oo and ou.
- Unit 7 uses *boat* and *moan*; oa is never taught.

### 4.2 The Learn explanations

**What works**
- Short, friendly Arabic.
- Each text gives a rule, two contrasting examples, then more examples with audio.
- Arabic consonant anchors (ش، ث، ذ، تش) give instant positive transfer.
- The *wh* text flags *who* as an exception.
- *th* (ذ) lists exactly the right "important words": *the, this, that, then, they, there*.

**Problems**

1. **"Long" and "short" will be read as length.**
   - In Arabic, vowel length is a difference in duration (a/aː, i/iː, u/uː). Arabic listeners are tuned to that difference (Tsukada, 2011) and exaggerate it in English (Munro, 1993).
   - In phonics, "long a" means a different vowel: the letter's name, /eɪ/.
   - The texts reinforce the length idea ("حرف e في النهاية **يمد** صوت o" — "a final e **stretches** the o"), so learners are likely to say a longer /æ/ instead of /eɪ/.
   - Better: **"the e makes the vowel say its name"** (A says /eɪ/, I says /aɪ/, O says /oʊ/, U says /juː/). This links directly to the letter names learners have just learned.
2. **The e is never said to be silent.** Arabic readers expect every written letter to be pronounced. State it: "الـ e تُكتب ولا تُنطق" ("the e is written but not pronounced").
3. **The conditions and exceptions are missing.**
   - The pattern is vowel + one consonant + e.
   - It holds less reliably than the text implies. In Clymer's analysis it worked in under two-thirds of primary-reader words (Clymer, 1963/1996), largely because some of the most frequent words break it: *have, give, live, come, some, done, one, love, were, are, there, where*.
   - Teach these as exception words. Otherwise learners will misread them by the rule.
4. **u_e has two sounds.**
   - /juː/ as in *cute, cube, use*.
   - /uː/ as in *June, rule, rude, flute*, and *tube* in the app's American voice.
   - The drill asks "long u like *cute*?" and expects *yes* for *flute, June, rude, tube*, which do not sound like *cute*.
5. **ee/ea** is fine as a first rule. Note later that *ea* is also /e/ in common A1 words (*bread, head, breakfast, weather, ready*).
6. **ai/ay** has a wrong example (E5), and its most useful rule is missing: **ai in the middle, ay at the end** (*rain* vs *day*). The same position rule governs oi/oy, ou/ow and au/aw. The app pairs these spellings but never says when to use which, which is also what learners need for spelling.
7. **Soft c/g**
   - The rule is stated as absolute.
   - *cycle* (a soft and a hard c, y as /aɪ/, and -le) and *giant* (ia) are poor first examples.
   - "مثل ج" (like ج) means /dʒ/ in Gulf Arabic but /g/ in Egyptian Arabic.
8. **or** is explained as "R changes the long O" (*hope → horse, note → north*). That is not how *or* works, and the pairs don't match. Contrast short o with *or* instead: *spot → sport, shot → short, pot → port*.
9. **Common r-exceptions are missing**: *word, work, world* (or = /ɜːr/); *war, warm* (ar = /ɔːr/); *four, door, your* (= or).
10. **th** has two separate lessons, but the real reading problem is never addressed: when you see *th*, which sound is it?
    - A reliable rule for beginners: small function words (*the, this, that, they, them, there, then, than*) use ذ; most other words use ث (*think, three, thank, month, birthday*).
    - The two sounds are never contrasted with each other.
11. **Unit 6** has the hardest content but one-line explanations.
    - *oo*: "learn which by looking at the whole word" gives no strategy.
    - *ow* as in *snow, know, show, slow, yellow* is never taught, though it is tested (Section 7).
    - "الأصوات المنزلقة" ("glide sounds") is technical jargon.
12. **Notation and language**
    - IPA symbols (/w/, /f/, /uː/, /k/, /ʃ/) are used but never taught.
    - Arabic letters are used for English vowels ("هات" → "هيت"), and "هيت" can be read as *heat*. Arabic script has three vowel qualities, so it cannot show the very distinctions being taught.
    - Use Arabic anchors for consonants only, and audio for vowels.

### 4.3 Word choice and meaning

| Measure | Result |
|---|---|
| Distinct words | 339; of these, 253 are target or model words the learner must read |
| Target words at A1–A2 (CEFR-J) | 75% |
| Target words above A2, or not in CEFR-J | 25% (64 words) |
| Names, made-up words or misspellings used as options | *sam, tim, pla, tun, poto, alfabet*; *june* in lowercase |
| Of the 100 most frequent English words, number present | about 30 |
| Words with any meaning support | 16 (emoji, in Unit 7 only) |

**Rare target words** (Zipf below 4, i.e. fewer than about 10 per million words) include *glob, pane, rook, fern, cub, robe, claw, fuse, dime, fin, cane, hawk, cube, cone, porch, tub, gem, cod* and *mat*. Many Learn models are like this: *cub → cube, dim → dime, rob → robe, cod → code, pin → pine, can → cane, mat → mar, pole → porch, term, fern*.

**Why it matters**
- **Strong word representations.** A word is read quickly and reliably when its spelling, sound and meaning are all well stored (Perfetti & Hart, 2002; Perfetti, 2007).
- **What the learner already knows.** Knowing a word's spoken form and meaning makes its printed form easier to learn (McKague, Pratt & Johnston, 2001; Ouellette & Fraser, 2009).
- **Unknown words.** When an adult decodes a word they don't know, they cannot check the attempt against a word in memory, so the spelling does not settle into a meaningful sight word.
- **Frequency.** For second-language beginners, frequency is the main criterion for which words to teach first (Nation, 2006; Webb & Nation, 2017).
- **What courses do.** Unlock Basic Literacy, the one major course built for Arabic-speaking beginners, chooses its words from a corpus of what Arabic speakers "use and need".

**Better words exist.** Adult-relevant A1 words are available for every pattern (listed in 5.4), for example:
- *name, late, make, time, nine, five, like, home, note, use*
- *see, meet, week, street, eat, rain, train, wait, day, pay*
- *car, park, for, short, her, first, shirt, nurse*
- *she, shop, chair, lunch, this, they, thank, three, what, when*
- *food, room, book, good, out, house, now, boy, saw*

### 4.4 Practice: does the learner actually decode?

| Activity (units) | What the learner does | What it really trains | Main issue |
|---|---|---|---|
| Morph (a_e, o_e, a_with_r) | Presses one button; always "correct" | Watching a demonstration | No answer at all; wrong label in the R unit |
| Yes/no sort (i_e, u_e, soft c, or, ch, th ×2, oo, au/aw) | The word appears **and is spoken automatically**; learner taps yes or no | Listening judgement, or letter-spotting | The voice does the decoding. In 8 of 9 sorts the answer can be seen from the letters alone. The au/aw sort asks whether the word is *written* with au/aw |
| Odd one out (ai/ay, soft g, er/ir/ur, sh, wh, ph, oi/ow) | Tap the word that is different; audio plays on tap | Sorting by sound, when the spelling doesn't give it away | 15 of 24 items can be solved by spotting a shared letter pair. The answer is the last option in 21 of 24 |
| Fill the blank (ee/ea) | Hear the word; choose the letters | Spelling from sound (good) | Only 4 items in the whole course |
| Listen and choose (every quiz) | Hear a word; choose between 2 written words | Matching sound to print (a good task type, but not decoding) | 2 options, unlimited retries, no shuffling. About 30 of 106 items can be answered without the target pattern, e.g. *food/foot* from the final d/t, *horn/home*, *goal/cage* (Appendix A2) |
| Build the word (Unit 7) | Hear the word and see an emoji; arrange the word's own letters | Spelling as an anagram | No extra letters. One box per letter, not per sound (*fish*: 4 boxes, 3 sounds). On phones the boxes wrap onto a second line |

**The core problem.** Learning to read words depends on the learner's own attempt to turn letters into sounds. That attempt is what fixes a word's spelling in memory: Share's self-teaching hypothesis and Ehri's account of orthographic mapping (Share, 1995, 1999; Ehri, 2005, 2014). When the app says the word first, the learner gets the answer before doing the work.

There is computer-based evidence. Beginners who read on their own and could *ask* the computer to pronounce a word improved more than beginners who read while listening (Reitsma, 1988). So the audio should come **after** the attempt, as a check, not before it.

**Missing activity types** that are standard in published courses:
- blending: see the word sounded out, then blended (*sh–i–p → ship*);
- segmenting with sound boxes;
- word chains in which one letter changes at a time, often the vowel (*cat → cap → map → mop*; McCandliss et al., 2003);
- reading aloud with a self-check (record, then compare);
- matching a word to its meaning;
- reading phrases and sentences;
- dictation.

### 4.5 Tests, mastery and progress data

- **Cannot be failed.** The learner retries until correct, and only correct answers count, so the score is 100% every time.
- **Can be guessed.**
  - There are two options (a 50% chance), always in the same order (E3).
  - Even with first-try scoring, two options are weak. A learner who knows 60% of the items and guesses the rest expects 80%, the pass mark. Pure guessing gets 4 or 5 out of 5 about 19% of the time.
  - With three options, guessing 8 or more out of 10 drops to about 0.3%. Three options are as good as four or five (Rodriguez, 2005), and few options plus guessing make short tests unreliable (Burton, 2001).
- **Tests memory more than transfer.**
  - 87 of 106 quiz words (82%) were already shown in the same sub-skill's Learn or Drill step.
  - Adult literacy learners already lean on memorised spellings more than children reading at the same level (Greenberg, Ehri & Perin, 1997).
  - A mastery check should therefore mostly use new words with the same pattern.
- **Mastery learning works only when mastery is real.** Mastery programmes raise achievement (Kulik, Kulik & Bangert-Drowns, 1990), but only if moving on depends on a check the learner can fail.
- **Small and random.**
  - Each session samples 5 items from a pool of 3 to 16.
  - A sort session can hold 4 "no" items and only 1 "yes".
- **No diagnostic data.**
  - Errors are not recorded, so neither the learner nor a teacher can see which patterns are weak.
  - The dashboard shows only points, streak and step counts.
  - Its "pass mark" slider has no effect.

### 4.6 Feedback

**What happens now**
- A wrong answer shows "حاول مرة أخرى 💪" ("Try again") and plays a tone.
- There is no replay of the word the learner chose, no contrast with the target and no reminder of the rule.

**What research says**
- Feedback works when it addresses the task and how to do it better, not when it is praise or a bare right/wrong signal. This matters most for beginners (Hattie & Timperley, 2007; Shute, 2008).
- Multiple-choice items can also leave learners remembering the wrong options; feedback reduces this effect (Butler & Roediger, 2008). That is another reason not to show beginners misspellings such as *poto* or *alfabet*.

**What to do instead.** For decoding, the most useful feedback is a model:
- play both words;
- highlight the letters that differ (kit / kit**e**);
- give one line of explanation in Arabic.

### 4.7 Audio

**How it works now**
- All audio comes from the device's built-in text-to-speech, forced to US English at 0.9 speed.
- The voice is the first "Google" English voice if there is one, otherwise the first US English voice.
- So the voice, its quality and even its accent differ between Android, iPhone and Windows. Some devices have no English voice at all.

**Text-to-speech itself is not the problem.**
- Language learners rate modern synthetic voices about as comprehensible as human ones (Bione & Cardoso, 2020).
- Text-to-speech has been used successfully for listening training with Kuwaiti adult learners (Al-Shami & Cardoso, 2025).

**The problems are:**
1. **No control.** The app cannot choose or check the voice on each device.
2. **Isolated items.** Synthetic voices handle single sounds, slow sounded-out words, nonsense words and some isolated words poorly. Those are exactly what phonics modelling needs.
3. **One voice.** Listening practice transfers better with several voices and many words (Thomson, 2018; Uchihara, Karas & Thomson, 2025). The gain from varied voices is real but modest (Brekelmans et al., 2022).
4. **Accent.** US English is a reasonable model: the *r* is pronounced, so ar, or and er are audible. But many American voices say *caught* and *cot* with the same vowel, which weakens the au/aw unit (*sauce/socks*, *saw*).

**Recommendation**
- Ship pre-generated audio files: a human voice, or two or three high-quality synthetic voices, recorded once and checked word by word.
- Include slow sounded-out versions ("sh–i–p … ship").
- Use device speech only as a fallback.

### 4.8 Needs specific to Arabic speakers

**Already handled well**
- Most units focus on vowels, the weakest area for Arabic readers of English (4.0).
- sh, ch and th are anchored to Arabic letters.
- Minimal pairs (pairs of words that differ in one sound) target real confusions: ch/sh and th/t/s (*chip/ship, chop/shop, chin/shin, think/sink, three/tree, thin/tin*).

**Not handled**
- **p/b and f/v.** Arabic has no /p/ and no /v/.
  - Saudi university students replace /p, v, e/ with [b, f, i] (Altaha, 1995).
  - b/p and f/v spelling confusions persist from grade 4 to grade 10 in Arabic-speaking learners (Allaith & Joshi, 2011).
  - Of the consonants studied, only /p/, which Arabic lacks, caused real difficulty (Flege & Port, 1981).
  - Unlock Basic Literacy's first unit opens with p/b and short vowels. The app does not cover these contrasts.
- **Short vowels.** e/i (*pen/pin, bed/bid*) and a/u/o (*cap/cup/cop*) get only 4 items, in the last unit. Some English vowels stay hard for Saudi learners even at advanced levels (Evans & Alshangiti, 2018).
- **Consonant clusters.**
  - Saudi learners simplify clusters, most often by inserting a vowel (Al-Yami & Al-Athwary, 2021).
  - Word-initial clusters are harder than final ones, both to pronounce and to spell (Altakhaineh, AL-Junaid & Younes, 2024).
  - LASLLIAM gives clusters their own level. The app has none.
- **Highlighting vowels.** Highlighting vowel letters in text reduced vowel errors in Arabic-speaking ESL beginners (Alsadoon & Heift, 2015). The app only colours the whole "after" word.
- **Dialect.** Gulf speakers already have /θ/ and /ð/, so two th lessons may be more than they need. p/b and v/f are problems for every Arabic speaker.

### 4.9 Beyond single words

**What A1 reading means.** At A1, CEFR reading means understanding familiar words and very simple sentences: signs, notices, short messages and forms.

**What the adult frameworks expect**
- LASLLIAM's top level, which leads into A1, expects learners to read short phrases fluently and a short, simple text phrase by phrase.
- The UK Adult ESOL Core Curriculum pairs decoding with social sight words, signs and personal key words from Entry 1.

**What the app has.** No phrases, sentences or texts, no high-frequency exception words, and no meaning.

**Why this matters especially for adults**
- **Phonics alone gives small gains.** In randomised trials with adult learners, structured decoding curricula gave small, narrow effects (Alamprese et al., 2011) or none (Condelli et al., 2010, with low-literate adult ESL learners).
- **What works with it.** In the US "What Works" study, reading grew more in classes that connected to learners' lives outside class and used their first language for clarification (Condelli, Wrigley & Yoon, 2009).
- **So phonics is necessary but not sufficient.** It needs meaningful words and connected text around it.
- **Decodable text helps beginners.** Texts built from words the learner can sound out give beginners immediate accuracy gains, as long as they are also meaningful (Mesmer, 2001; Cheatham & Allor, 2012).

### 4.10 Amount of practice and review

- **Practice is thin.** One complete pass gives at most about 200 scored responses, or about 9 per pattern. Fourteen of those are "morph" button presses that need no answer.
- **Nothing comes back.** Once a unit is done, its words never return for review. Retrieval practice and spaced practice are among the most robust findings in learning research (Roediger & Karpicke, 2006; Cepeda et al., 2006; Dunlosky et al., 2013), and adults with little study time benefit most.
- **Fix:**
  - Open each session with 3–5 items from earlier units on a widening schedule: next day, 3 days, a week, three weeks.
  - Add a cumulative check at the end of each unit.

### 4.11 Adult-appropriateness and motivation

- **Positive**
  - The Arabic is respectful.
  - Light gamification (points, streak) is not childish in itself. A meta-analysis found small positive effects of gamification on learning (g = .49), motivation (g = .36) and behaviour (g = .25) (Sailer & Homner, 2020).
- **Concerns**
  - **Child-phonics framing and decoration.** "Magic E / حرف E السحري", 🦄 unicorn, 🎪 circus, 🎩 top hat and 🎭 masks carry no meaning.
  - **Icons.** They should be key-word pictures for the pattern, as in Laubach's charts and English File's "sound pictures": 🍰 *cake* for a_e, 🪁 *kite* for i_e, 🏠 *home* for o_e.
  - **Words.** They are not drawn from adult life: work, shopping, health, transport, family, phone, forms.
  - **Progress.** Report what the learner can now read ("you can read 40 new words"; "unit 3 sentences unlocked"), not only points.

### 4.12 What to keep

- The Learn → Practice → Test flow and the unit map.
- Arabic explanations and Arabic consonant anchors.
- Minimal-pair contrasts: 62 of 106 quiz pairs differ by exactly one sound.
- Mixing in earlier patterns, e.g. *cake* in the ai/ay items, and *face, rice, nice* for soft c.
- The *ch/sh* quiz (*chair/share, chip/ship, chop/shop, chin/shin*) and the er/ir/ur odd-one-out items. These are the best-designed items in the app.
- The th (ذ) list of function words.
- Low friction:
  - no login;
  - built for phones;
  - English words shown left-to-right inside the right-to-left Arabic interface.

---

## 5. Recommendations

### 5.1 Priority 0: errors and scoring (days)

1. Fix E1–E10 (Section 3).
2. **Score the first attempt.** Keep retries for learning, but base pass/fail on first answers only.
3. **Shuffle the options** in every item type.
4. **Don't say the word before the learner answers.** This applies to sorts and fill-in items. Odd-one-out already gets this right. Offer the speaker as a "check" after the answer.
5. **Record every response** in local storage: item, pattern, correct on first try or not, and the option chosen.

Engine changes this needs (all small):
- `renderMorph`: use `data.buttonText`.
- `renderQuiz`, `renderOddOneOut`, `renderFillInBlank`: shuffle `options`.
- `handleAnswer`: keep a `firstTry` flag per question and count only first-try correct answers.
- `renderSort`: remove the automatic `speak(word)` and play the word after the answer.
- `teacherDashboard.js:73`: delete the stray text.

### 5.2 Priority 1: content quality (weeks)

1. **Rewrite the Learn texts.** Suggested Arabic is in Appendix B. Each text should:
   - say "the vowel says its name";
   - say the e is silent;
   - give the position rules (ai/ay, oi/oy, ou/ow, au/aw);
   - name the common exception words.
2. **Replace weak words.** Swap rare words, names, made-up words and misspellings for A1–A2 words (Section 7 gives replacements). Give every target word a picture or an Arabic gloss, shown on tap.
3. **Rebuild the distractors** so each item tests the target contrast. Examples:
   - ai/ay: *pan/pain*, *play/plan*.
   - or: *spot/sport*, *shot/short*.
   - ph: *phone/bone*, *graph/grab* (this also practises p/b/f).
   - oo: use print-to-sound items: "Which is the right way to say *book*?" with two recorded pronunciations.
4. **Make the tests real.**
   - 8–10 items with 3 options, or a build/spell task.
   - At least half the words not seen before.
   - Pass at 80% or more on first tries.
   - A failed test sends the learner back to the Learn step.
5. **Give feedback that teaches.** After each answer:
   - play both words;
   - highlight the letters that differ;
   - show a one-line rule.
6. **Add recorded audio**, including sounded-out versions.
7. **Improve the dashboard.** Show accuracy per pattern and the pairs the learner confuses most.

### 5.3 Priority 2: course structure (one release)

1. Restructure the course along the sequence in 5.4.
2. Put spelling into every unit.
3. Add a heart-word strand and decodable sentences to each unit.
4. Add spaced review.
5. Add a 10-minute placement check, so learners who can already blend CVC words can start later.

### 5.4 Proposed scope and sequence

Each unit uses only patterns and heart words taught by that point. This holds for its example words and its sample sentence.

| # | Unit | Patterns | New heart words | Adult A1 words | Sample sentence |
|---|---|---|---|---|---|
| 0 | Letter → sound (bridge; skip if the letters course already secures sounds) | One sound per letter, with a key-word picture. Contrasts p/b, f/v, e/i | — | — | — |
| 1 | Short vowels | Blend and segment CVC words; word chains | I, a, the, is, my, you, to | bus, bag, map, pen, bed, sit, six, hot, job, cup, run, ten | The bus is at ten. |
| 2 | Digraphs | sh, ch, th (ذ/ث), wh, ck, ng | of, was, what, who, are | shop, fish, chip, much, this, that, thin, with, back, sing | This is my shop. |
| 3 | Blends | st, sp, sl, pl, bl, cl, fl, gr, tr, dr, br, fr; -nd, -nt, -st, -mp, -nk | have, said, do, one, two | stop, step, plan, black, from, drink, hand, test, help, bank | Stop at the bank. |
| 4 | Word endings | -s/-es, -ed (3 sounds), -ing | come, some, does | shops, buses, helped, wanted, packing | I packed the bags and the boxes. |
| 5 | Silent e and open syllables | a_e, i_e, o_e, u_e (2 sounds), e_e; go, me, he, she, we, hi; y as /aɪ/ (my, by, why) | give, live, love, were | name, late, make, time, nine, five, like, home, note, use, these | My name is Kate. I like my job. |
| 6 | Long-vowel teams | ee/ea (+ ea as /e/: bread, head); ai/ay (by position); oa/ow (snow); igh/ie; ew/ue | again, any, many | see, meet, week, street, eat, team, rain, wait, day, pay, coat, slow, night, new | Meet me at the train at night. |
| 7 | R-controlled vowels | ar; or/ore; er/ir/ur; air/are/ear/ere; w + or/ar | four, door, your, word, work | car, park, start, for, short, more, her, first, shirt, nurse, hair, here | The nurse works in the morning. |
| 8 | Other vowel teams | oo (2 sounds); ou/ow (2 sounds); oi/oy; au/aw; al/all | could, would, should, because | food, room, soon, book, good, out, house, now, how, town, boy, oil, saw, ball, walk | The boys are out in the town. |
| 9 | Alternative spellings, longer words | Soft c/g; ph; kn, wr; -le; ch as /k/; two-syllable words | people, school | city, face, rice, age, page, orange, phone, photo, know, write, table, sister, number | Write your phone number on the page. |

How this order compares with published courses:
- Units 1–3 and 6–8 follow the consensus order (Section 6).
- **Endings come early (Unit 4).** Adults need -s, -ed and -ing to read real sentences; Wilson also teaches -s/-es in Step 1.
- **Soft c/g and ph come late (Unit 9).** This follows Wilson, Letters and Sounds and Laubach.
- **Contrasts for Arabic speakers** (p/b, f/v, e/i) start in Unit 0. Unlock Basic Literacy does the same.

### 5.5 Model lesson: silent e with a

1. **Review (2 min).** Read 4 CVC words from earlier units, then tap to check.
2. **Teach.**
   - Rule: "When a word ends in e, the e is silent and the a says its name, /eɪ/."
   - Key-word picture: 🍰 *cake*.
   - Pairs with audio: *hat → hate, plan → plane, mad → made, cap → cape, tap → tape*.
3. **Read, then check.**
   - Eight words, one at a time: *name, make, late, game, take, gate, plate, same*.
   - The learner reads each word (aloud or silently), then taps the speaker to check.
   - The learner marks "I was right" or "not yet".
4. **Hear and choose.**
   - Eight sets with 3 options, e.g. *hat / hate / hot*.
   - Both words replay after the answer.
5. **Build.**
   - Hear *made* and build it from tiles that include extras: m, a, d, e, t, i.
   - Word chain: *cap → cape → tape → tap → map*.
6. **Phrases and sentences.** *make a cake*, *same name*, *My name is Kate.*, *I am late.* An Arabic gloss appears on tap.
7. **Exit check.**
   - 10 items, at least 5 of them new words (*gate, lake, safe, wave, plane*).
   - Scored on first tries; pass at 80% or more.
8. **Review.** Three items come back tomorrow, in 3 days and in a week.
9. **Heart words.** Contrast with *have, come, some, give*: "they look like silent-e words but aren't".

### 5.6 Item-writing checklist

- [ ] The target word is A1–A2 (or Zipf 4 or above), and is not a name, made-up word or misspelling.
- [ ] The word uses only patterns already taught, plus heart words already taught.
- [ ] Its meaning is available (picture or Arabic gloss).
- [ ] The distractor differs from the target **only** in the pattern being taught.
- [ ] The answer cannot be found by spotting letters or by its position.
- [ ] Audio plays after the learner answers, unless the task is listening or spelling.
- [ ] Tests include words not seen before, and the first attempt is scored.
- [ ] Feedback replays both words and names the rule.

---

## 6. Benchmarks: published courses and frameworks

**About the sources.** Course details come from publisher pages, contents lists and scope-and-sequence documents. Several publisher sites could not be opened in full from the review environment, so treat unit-level details as indicative, especially for Unlock Basic Literacy.

| Course or framework | Who it is for | Word-reading sequence after letters | What it has that Words lacks |
|---|---|---|---|
| **Unlock Basic Literacy** (E. Pathare & G. Pathare, CUP, 2017) | Pre-A1 Arabic-speaking learners new to the Roman alphabet. Words chosen from a corpus of what Arabic speakers "use and need" | Starter: consonant and vowel sounds → Unit 1: p/b, short vowels, a spelling challenge → Unit 2: digraphs (th, sh, ch) and silent e → Unit 4: e/ee/ea, wh | p/b and short vowels first; sight words and word shapes; copying → sentences → texts; a teacher's section on helping Arabic speakers develop English literacy |
| **LASLLIAM** reference guide (Council of Europe, 2022) | Adult migrants with limited literacy, up to A1 | Level 1: whole-word sight words → Level 2: short words, one letter per sound → Level 3: complex spellings and clusters → Level 4: automatic word recognition (reads *shirts*-type words and short phrases fluently, short texts phrase by phrase) | Fluent phrase reading as the A1 goal; clusters as their own stage |
| **UK Adult ESOL Core Curriculum** (DfES, 2001) | Adult ESOL learners (Entry 1 ≈ A1) | Entry 1: social sight words and signs; sound–letter correspondence to sound out words; upper/lower case. Entry 2: familiar words and common spelling patterns; phonics plus context; -ing/-ed | Daily-life sight words; endings by Entry 2 |
| **Laubach Way to Reading** (New Readers Press) | Adults with little or no reading ability | Book 1: letter names and one sound each, on key-word picture charts → Book 2: short vowels → Book 3: long vowels, syllables, endings → Book 4: other vowels (oo, ou/ow, au/aw, ew) and consonant spellings | A story and writing in every lesson; picture charts; check-ups |
| **Wilson Reading System** | Grade 2 to adult | Step 1: closed syllables incl. sh/ch/th/wh/ck, -s/-es → 2: blends → 3: two-syllable words → 4: silent e → 5: open syllables → 6: suffixes, -le → 7: soft c/g, ph → 8: r-controlled → 9: vowel teams | Real- and nonsense-word lists; dictation; passages using only taught patterns |
| **Reading Horizons Elevate** | Grade 4 to adult, including ESL | 42 sounds → five phonetic skills (short in VC and VCC, long when open, silent e, two vowels) → syllable division; "Most Common Words" routine | Explicit short-vowel rules first; directions in 80+ languages including Arabic; chapter tests |
| **English Unlocked** (Literacy Minnesota) | Adult English learners new to print | Book 1: 13 letters/sounds incl. a, i, o → 2: the rest plus sh, ch, th, qu, wh → 3: blends → 4: ang/ank/ing/ink → 5: silent e and sight words | Digraphs and blends before silent e |
| **Read Write Inc. Fresh Start** (OUP) | Older struggling readers (9–13+) | Set 1: single sounds plus sh, th, ch, qu, ng, nk → Set 2: ay ee igh ow oo ar or air ir ou oy → Set 3: alternative spellings | "Green" (decodable) and "Red" (tricky) words; texts matched to the learner's phonics level; age-appropriate design |
| **Letters and Sounds** (DfES, 2007) | Children (UK); a common sequence reference | Phase 2: single letters and CVC → 3: digraphs and long-vowel spellings → 4: clusters → 5: alternatives incl. a-e, i-e → 6: suffixes | Tricky words taught alongside |
| **English File Beginner**, 4th ed. (OUP) | Adult A1 EFL | Sound Bank: one "sound picture" per sound (fish, tree, cat, car, clock, horse…), with usual spellings and common exceptions | A key-word picture per sound; spelling tables |
| **Tree or Three?** (Baker, CUP, 2006) | Elementary learners | Minimal pairs, one sound per unit, with picture key words (three, sheep, ship, fish, van, pen, book) | f/v and p/b contrasts |

**Where Words departs from these benchmarks**

| Feature | Benchmarks | Words |
|---|---|---|
| Starts with letter–sound and CVC blending | All the phonics programmes and frameworks above | No; starts with silent e |
| Digraphs taught right after CVC | Letters and Sounds, RWI, Wilson, English Unlocked, Unlock | Unit 5 of 7 |
| A separate consonant-cluster stage | Letters and Sounds, Wilson, English Unlocked, LASLLIAM | None |
| Soft c/g taught late | Wilson (Step 7), Letters and Sounds (Phase 5), Laubach (Book 4) | Unit 3 |
| A tricky/heart-word strand | Letters and Sounds, RWI, Reading Horizons, Unlock, ESOL curriculum | None |
| Decodable sentences and texts | Wilson, RWI, Laubach | None |
| Spelling or dictation in every lesson | Wilson, Laubach, Unlock | Unit 7 only |
| A key-word picture per sound | Laubach, Wilson, RWI, English File | Decorative emoji |
| A p/b contrast for Arabic speakers | Unlock | None |
| Mastery checks and cumulative review | Laubach, Reading Horizons, Wilson | Cannot be failed; no review |
| Functional print (signs, forms) | ESOL curriculum, LASLLIAM | None |

---

## 7. Item-level changes by sub-skill

These are in addition to E1–E10.

| Sub-skill | Problems | Suggested change |
|---|---|---|
| a_e | Rare models: *mat→mate, can→cane, cap→cape, pan→pane, fat→fate* | *hat→hate, plan→plane, mad→made, tap→tape, at→ate, rat→rate*; new quiz words *snack/snake, back/bake* |
| i_e | *dim→dime* (both rare), *pin→pine*, *fin→fine* | *kit→kite, bit→bite, hid→hide, rid→ride*; in the sort, *five* or *bike* for *dime* |
| o_e | *rob→robe, cod→code, glob→globe, rod→rode* | Keep *hop→hope, not→note*; add reading items *home, nose, close, joke, stone* |
| u_e | E1; *cub→cube*; mixes /juː/ and /uː/ under "like *cute*" | Teach both sounds; *cut→cute, us→use*; /uː/: *June, rule, flute* |
| ee_ea | Quiz options *tim* (a name) and *try* (y not taught) | *seat/sit, eat/it, sleep/slip* |
| ai_ay | E5, E6; made-up option *pla*; *bay* (rare) | *play/plan, pan/pain, wait/wet*; odd-one-out *may, say, way, bad* |
| soft_c | *cup→cycle* as a model; quiz pairs that don't test c (*rice/rock, cold/city*) | Two columns ("c = /k/" and "c + e/i/y = /s/") instead of arrows; pairs *face/fake, race/rake, city/kitty* |
| soft_g | Models *go→gem, gas→gym, got→giant*; quiz *page/cage* (both soft g), *goal* (oa) | *page, age, large, orange, gym*; pairs *huge/hug, gem/game*; name the exceptions *get, give, girl* |
| a_with_r | E2; *hat→hard, mat→mar, stat→star* | *cat→cart, had→hard, ham→harm, pat→part*; quiz *far/fat, park/pack, had/hard* |
| o_with_r | Framed as a change to long o; *home→horn, rose→more, pole→porch, bone→born* | *spot→sport, shot→short, pot→port*; quiz *short/shot, port/pot, born/bone* |
| eiu_with_r | *term, fern* (rare); quiz *her/hair* (air not taught), *turn/tun* (archaic), *girl/gill* (rare, hard g) | *her/he, turn/torn, first/fist, shirt/short*; add *word, work, world* |
| sh | *shoe* (irregular) as a model; odd-one-out solvable by letters; *sheep/weep* (rare), *cash/case* | *sip/ship, sell/shell, see/she, save/shave* |
| ch | E8 | Keep the quiz (the best in the app) but shuffle it |
| th_voiceless | E9; *tooth/tool* is not a minimal pair | *path/pat, bath/bat*; add a mixed ث/ذ sort |
| th_voiced | *mother/mutter* (rare) | *they/day, then/ten, there/dare*; mixed ث/ذ sort |
| wh | *who/woo* (*woo* rare) | *who/how* |
| ph | Made-up spellings *poto, alfabet*; *phone/fine*; *elephant/elegant* | *phone/bone, graph/grab*; never show misspellings to beginners |
| oo_sounds | Quiz solvable from the final consonant (*food/foot, cool/cook, shoot/shook, root/rook*); *rook* (rare) | Print-to-sound items; the tip "oo before k is short" (*book, look, cook*) |
| diphthongs | *ow* as in *snow* tested but not taught; *boy/buy* (irregular *uy*); *coo, ought* (rare) | Teach both sounds of *ow*; *now/no, loud/load, boy/bay* |
| au_aw | Sort asks about spelling, not sound; *August/against*; *claw, haunt, hawk* rare; US *caught/cot* merger | *saw, draw, law, August, author*; position rule (aw at the end) |
| build_a_word_1 | Good CVC set and quiz (*cup/cap, pin/pen, hot/hat, big/bag*), but placed last with no Learn step | Move to the start of the course and expand |
| build_a_word_2 | *boat, moan* (oa never taught); one tile per letter | Use only taught patterns; tiles for sounds (sh, ee, ai as single tiles) plus extra tiles |

---

## Appendix A: Method and data

**Tools**
- *CMU Pronouncing Dictionary* (`cmudict` package): sound-by-sound comparison of quiz options and checks of sort categories.
- *wordfreq*: word frequency on the Zipf scale, where 3 = one occurrence per million words and 4 = ten per million.
- *CEFR-J Wordlist 1.5*: word level. Irregular forms were mapped to their base words by hand (made → make, feet → foot…).

**How the app was run.** Playwright drove Chromium at a 414 × 896 screen size. The browser's speech engine was replaced with a logger, so every utterance and its trigger could be recorded.

**Scripts.** The analysis scripts were run outside the repository; they can be added on request.

### A1. Word levels

| | Distinct words (339) | Target/model words (253) |
|---|:-:|:-:|
| A1 | 56% | 59% |
| A2 | 16% | 15% |
| B1 | 12% | 11% |
| B2 | 6% | 7% |
| Not in CEFR-J | 8% | 7% |
| Name, made-up word or misspelling | 2% | 0.4% |

Target words above A2 or not in CEFR-J, rarest first:
glob, pane, rook, fern, paws, cub, curl, flute, robe, haunt, claw, dim, fuse, dime, dolphin, alphabet, fin, cane, chop, crawl, peach, hawk, cube, cone, mat, bark, porch, tub, gem, cod, stat, whale, fur, graph, pine, horn, rod, mar, pole, pat, pin, cape, seal, chip, fate, pace, hop, gym, plain, hip, gap, rid, mate, cycle, giant, sam, van, bet, cell, foot, feet, beat, term, main.

Some of these, such as *foot, feet, main, van, cell*, are everyday words that CEFR-J happens to place at B1. The problem cases are the rare ones at the start of the list.

### A2. Quiz items that can be answered without the target pattern

About 30 of the 106 items fall into this group.

| Sub-skill | Items (answer / distractor) | Why |
|---|---|---|
| ai_ay | day / dad | The final /d/ gives it away |
| soft_c | rice / rock, cold / city, city / cat | Whole words differ |
| soft_g | page / cage, goal / cage, giant / gate | Both words in *page/cage* have soft g; the others are whole-word differences |
| a_with_r | hat / hard | The final /d/ gives it away |
| o_with_r | horn / home, more / rose, north / note | The final or initial consonant gives it away |
| eiu_with_r | turn / tun, fur / fun | *tun* is archaic; the final /n/ gives it away |
| sh | cash / case, shop / job | The vowel or another consonant also differs |
| ch | rich / rush | The vowel differs |
| wh | what / want | The /n/ gives it away |
| ph | photo / poto, alphabet / alfabet, graph / giraffe | Made-up spellings; whole-word difference |
| oo_sounds | food/foot, foot/food, cool/cook, cook/cool, shoot/shook, shook/shoot, root/rook, rook/root | The final consonant gives it away in every item |
| au_aw | August / against, sauce / socks | Whole-word difference; the final /ks/ |

### A3. Spelling patterns used before, or without, being taught

| Unit | Patterns used before they are taught, or never taught at all |
|---|---|
| 1 Magic E | Blends (*plan, plane, flute, glob, globe*); ck (*duck*) |
| 2 Team Sounds | Blends (*play, train, tree, try*); y as a vowel (*try*) |
| 3 Soft Sounds | oa (*goal*); y (*city, cycle, gym*); -le (*cycle, gentle*); blends (*cold, gold, stage*); ck (*rock*); ll (*call, cell*) |
| 4 R-Controlled | sh, ch, th before Unit 5 (*short, porch, north*); air (*hair*); blends (*sport, spot, star, first*); ck (*back, pack*); silent l (*folk*) |
| 5 Digraphs | air/ere (*chair, share, there, where*); oo, ou, ow before Unit 6 (*tooth, tool, mouse, how, throw*); blends (*brush, crush, trust, three, free, desk, shelf, thank, think*); ng/-ing (*washing*); two-syllable words (*elephant, alphabet, dolphin, teacher, mother, brother, photo*); y (*why*) |
| 6 Advanced Teams | igh (*tight*); ew (*jewel*); ch as /k/ (*school*); blends (*bloom, claw, crawl, draw, dry, snow, spoon*); ck (*hack, socks*); two-syllable words (*August, author, against, other*) |
| 7 Production | oa (*boat, moan*); blend (*star*) |

### A4. Items per sub-skill

| Sub-skill | Learn examples | Drill type (items) | Quiz items | Seen per session | Quiz words already met in Learn/Drill |
|---|:-:|---|:-:|:-:|:-:|
| a_e | 4 | morph (6) | 5 | 10 | 4/5 |
| i_e | 4 | sort (12) | 5 | 10 | 5/5 |
| o_e | 2 | morph (4) | 4 | 8 | 4/4 |
| u_e | 2 | sort (12) | 5 | 10 | 5/5 |
| ee_ea | 2 | fill-in (4) | 4 | 8 | 2/4 |
| ai_ay | 2 | odd one out (3) | 4 | 7 | 3/4 |
| soft_c | 1 | sort (12) | 4 | 9 | 4/4 |
| soft_g | 1 | odd one out (3) | 4 | 7 | 3/4 |
| a_with_r | 4 | morph (6) | 5 | 10 | 5/5 |
| o_with_r | 4 | sort (16) | 5 | 10 | 5/5 |
| eiu_with_r | 6 | odd one out (4) | 5 | 9 | 5/5 |
| sh | 6 | odd one out (4) | 5 | 9 | 5/5 |
| ch | 6 | sort (13) | 5 | 10 | 2/5 |
| th_voiceless | 6 | sort (14) | 5 | 10 | 5/5 |
| th_voiced | 6 | sort (13) | 5 | 10 | 5/5 |
| wh | 6 | odd one out (3) | 5 | 8 | 4/5 |
| ph | 6 | odd one out (3) | 5 | 8 | 5/5 |
| oo_sounds | 10 | sort (14) | 8 | 10 | 4/8 |
| diphthongs | 8 | odd one out (4) | 5 | 9 | 5/5 |
| au_aw | 6 | sort (16) | 5 | 10 | 4/5 |
| build_a_word_1 | — | build (8) | 4 | 9 | 1/4 |
| build_a_word_2 | — | build (8) | 4 | 9 | 2/4 |
| **Total** | | | **106** | **≈200** | **87/106 (82%)** |

---

## Appendix B: Suggested Arabic wording for the Learn texts

These are drafts for the `learn_info` fields. They:
- avoid "long/short" for silent e;
- state that the e is silent;
- add position rules and exception words;
- keep English examples in left-to-right spans with audio buttons, as now.

**Silent e with a (a_e)**
> **القاعدة:** إذا انتهت الكلمة بحرف **e** بعد حرفٍ ساكنٍ واحد، فإن **e لا تُنطق**، لكنها تجعل الحرف المتحرك الذي قبلها **يُنطق باسمه** كما في الأبجدية.
> hat → hate: صارت **a** تُنطق مثل اسم الحرف **A**.
> plan → plane · mad → made · tap → tape
> **كلمات شائعة لا تتبع القاعدة، احفظها:** have · come · some · give · live · one · done

**Silent e with i (i_e)**
> ومع **i** أيضاً: الـ e في آخر الكلمة صامتة، و**i** تُنطق مثل اسم الحرف **I**.
> kit → kite · bit → bite · hid → hide · time · nine · five

**Silent e with o (o_e)**
> ومع **o**: تُنطق مثل اسم الحرف **O**.
> hop → hope · not → note · home · close

**Silent e with u (u_e)**
> لِـ **u** مع الـ e الصامتة صوتان، وكلاهما صحيح:
> ١) مثل اسم الحرف **U**: cut → cute · us → use
> ٢) صوت «أو» طويل: June · rule · flute
> استمع إلى الكلمة لتعرف صوتها.

**ee / ea**
> **ee** و **ea** تُنطقان مثل اسم الحرف **E**: see · meet · eat · team
> **ملاحظة:** في كلمات قليلة شائعة تُنطق **ea** مثل e في bed: bread · head · breakfast

**ai / ay**
> **ai** و **ay** تُنطقان مثل اسم الحرف **A**.
> **ai في وسط الكلمة:** rain · wait · train
> **ay في آخر الكلمة:** day · play · say
> هذه القاعدة تساعدك في الكتابة أيضاً.

**Soft c**
> لحرف **c** صوتان: **ك** قبل a و o و u: cat · cup · come
> و**س** قبل e و i و y: city · face · rice

**Soft g**
> حرف **g** يُنطق **ج** (كالجيم الفصيحة) **غالباً** قبل e و i و y: page · age · orange · gym
> **انتبه:** كلمات شائعة كثيرة لا تتبع القاعدة: get · give · girl · begin

**or**
> عندما يأتي **r** بعد **o** يتغيّر صوتها: spot → sport · shot → short · for · more · morning

**th (ث), corrected text**
> لا يوجد في الإنجليزية حرفٌ خاص لصوت **ث**، لذلك يُكتب بحرفين معاً: **T + H**، مثل: think · three · thank

**th (ذ), plus how to tell the two apart**
> ولصوت **ذ** أيضاً يُستعمل الحرفان **th**: the · this · that
> **كيف تعرف أيّ الصوتين؟** في الكلمات الصغيرة الشائعة مثل the · this · that · they · there · then يكون **ذ**، وفي أغلب الكلمات الأخرى يكون **ث**: think · three · thank · month

**oo**
> لِـ **oo** صوتان: **طويل** كما في moon · food · school، و**قصير** كما في book · look · good
> **نصيحة:** oo قبل k تكون غالباً قصيرة: book · look · cook. وإن لم تعرف الكلمة، جرّب الصوت الطويل أولاً.

**ou / ow**
> **ou** و **ow** تُنطقان «او» كما في كلمة «يَوْم» بالفصحى: out · house · now · how
> **انتبه:** ow تُنطق أحياناً مثل اسم الحرف **O**: snow · know · show · slow

**au / aw**
> **au** و **aw** تُكتبان لصوتٍ واحد غالباً: saw · draw · August
> **aw** في آخر الكلمة (saw · law)، و**au** في وسطها (August · sauce).

---

## References

### Research

- Alamprese, J. A., MacArthur, C. A., Price, C., & Knight, D. (2011). Effects of a structured decoding curriculum on adult literacy learners' reading development. *Journal of Research on Educational Effectiveness, 4*(2), 154–172. https://doi.org/10.1080/19345747.2011.555294
- Alhazmi, K., Milton, J., & Johnston, S. (2019). Examining "vowel blindness" among native Arabic speakers reading English words from the perspective of eye-tracking. *System, 80*, 235–245. https://doi.org/10.1016/j.system.2018.12.005
- Allaith, Z. A., & Joshi, R. M. (2011). Spelling performance of English consonants among students whose first language is Arabic. *Reading and Writing, 24*, 1089–1110. https://doi.org/10.1007/s11145-010-9294-3
- Alsadoon, R., & Heift, T. (2015). Textual input enhancement for vowel blindness: A study with Arabic ESL learners. *The Modern Language Journal, 99*(1), 57–79. https://doi.org/10.1111/modl.12188
- Al-Shami, F., & Cardoso, W. (2025). Exploring text-to-speech technology as a tool for high-variability phonetic training: A study on Arabic speakers' acquisition of English pronunciation. *Canadian Journal of Applied Linguistics, 28*(3), 142–168. https://journals.lib.unb.ca/index.php/CJAL/article/view/35910
- Altaha, F. M. (1995). Pronunciation errors made by Saudi university students learning English: Analysis and remedy. *ITL – International Journal of Applied Linguistics, 109–110*, 110–123. https://doi.org/10.1075/itl.109-110.05alt
- Altakhaineh, A. R., AL-Junaid, N. A., & Younes, A. S. (2024). Pronunciation and spelling accuracy in English words with initial and final consonant clusters by Arabic-speaking EFL learners. *Languages, 9*(12), 356. https://doi.org/10.3390/languages9120356
- Al-Yami, E. M., & Al-Athwary, A. A. H. (2021). Phonological analysis of errors in the consonant cluster system encountered by Saudi EFL learners. *Theory and Practice in Language Studies, 11*(10), 1237–1248.
- Bigelow, M., & Vinogradov, P. (2011). Teaching adult second language learners who are emergent readers. *Annual Review of Applied Linguistics, 31*, 120–136. https://doi.org/10.1017/S0267190511000109
- Bione, T., & Cardoso, W. (2020). Synthetic voices in the foreign language context. *Language Learning & Technology, 24*(1), 169–186. https://www.lltjournal.org/item/10125-44715/
- Brekelmans, G., Lavan, N., Saito, H., Clayards, M., & Wonnacott, E. (2022). Does high variability training improve the learning of non-native phoneme contrasts over low variability training? A replication. *Journal of Memory and Language, 126*, 104352. https://doi.org/10.1016/j.jml.2022.104352
- Burt, M., Peyton, J. K., & Adams, R. (2003). *Reading and adult English language learners: A review of the research*. Center for Applied Linguistics. https://eric.ed.gov/?id=ED482785
- Burton, R. F. (2001). Quantifying the effects of chance in multiple choice and true/false tests: Question selection and guessing of answers. *Assessment & Evaluation in Higher Education, 26*(1), 41–50. https://doi.org/10.1080/02602930020022273
- Butler, A. C., & Roediger, H. L. (2008). Feedback enhances the positive effects and reduces the negative effects of multiple-choice testing. *Memory & Cognition, 36*(3), 604–616. https://doi.org/10.3758/MC.36.3.604
- Castles, A., Rastle, K., & Nation, K. (2018). Ending the reading wars: Reading acquisition from novice to expert. *Psychological Science in the Public Interest, 19*(1), 5–51. https://doi.org/10.1177/1529100618772271
- Cepeda, N. J., Pashler, H., Vul, E., Wixted, J. T., & Rohrer, D. (2006). Distributed practice in verbal recall tasks: A review and quantitative synthesis. *Psychological Bulletin, 132*(3), 354–380. https://doi.org/10.1037/0033-2909.132.3.354
- Cheatham, J. P., & Allor, J. H. (2012). The influence of decodability in early reading text on reading achievement: A review of the evidence. *Reading and Writing, 25*, 2223–2246. https://doi.org/10.1007/s11145-011-9355-2
- Clymer, T. (1963). The utility of phonic generalizations in the primary grades. *The Reading Teacher, 16*, 252–258. Reprinted in *The Reading Teacher* (1996).
- Condelli, L., Cronen, S., Bos, J., Tseng, F., & Altuna, J. (2010). *The impact of a reading intervention for low-literate adult ESL learners* (NCEE 2011-4003). Institute of Education Sciences. https://files.eric.ed.gov/fulltext/ED514093.pdf
- Condelli, L., Wrigley, H. S., & Yoon, K. S. (2009). "What works" for adult literacy students of English as a second language. In S. Reder & J. Bynner (Eds.), *Tracking adult literacy and numeracy skills* (pp. 132–159). Routledge. https://doi.org/10.4324/9780203888889-14
- Dunlosky, J., Rawson, K. A., Marsh, E. J., Nathan, M. J., & Willingham, D. T. (2013). Improving students' learning with effective learning techniques. *Psychological Science in the Public Interest, 14*(1), 4–58. https://doi.org/10.1177/1529100612453266
- Ehri, L. C. (2005). Learning to read words: Theory, findings, and issues. *Scientific Studies of Reading, 9*(2), 167–188. https://eric.ed.gov/?id=EJ683147
- Ehri, L. C. (2014). Orthographic mapping in the acquisition of sight word reading, spelling memory, and vocabulary learning. *Scientific Studies of Reading, 18*(1), 5–21. https://doi.org/10.1080/10888438.2013.819356
- Ehri, L. C., Nunes, S. R., Stahl, S. A., & Willows, D. M. (2001). Systematic phonics instruction helps students learn to read: Evidence from the National Reading Panel's meta-analysis. *Review of Educational Research, 71*(3), 393–447. https://doi.org/10.3102/00346543071003393
- Evans, B. G., & Alshangiti, W. (2018). The perception and production of British English vowels and consonants by Arabic learners of English. *Journal of Phonetics, 68*, 15–31. https://doi.org/10.1016/j.wocn.2018.01.002
- Fender, M. (2003). English word recognition and word integration skills of native Arabic- and Japanese-speaking learners of English as a second language. *Applied Psycholinguistics, 24*(2), 289–315. https://doi.org/10.1017/S014271640300016X
- Fender, M. (2008). Spelling knowledge and reading development: Insights from Arab ESL learners. *Reading in a Foreign Language, 20*(1), 19–42.
- Flege, J. E., & Port, R. (1981). Cross-language phonetic interference: Arabic to English. *Language and Speech, 24*(2), 125–146.
- Graham, S., & Santangelo, T. (2014). Does spelling instruction make students better spellers, readers, and writers? A meta-analytic review. *Reading and Writing, 27*, 1703–1743. https://doi.org/10.1007/s11145-014-9517-0
- Greenberg, D., Ehri, L. C., & Perin, D. (1997). Are word-reading processes the same or different in adult literacy students and third–fifth graders matched for reading level? *Journal of Educational Psychology, 89*(2), 262–275.
- Hattie, J., & Timperley, H. (2007). The power of feedback. *Review of Educational Research, 77*(1), 81–112. https://doi.org/10.3102/003465430298487
- Hayes-Harb, R. (2006). Native speakers of Arabic and ESL texts: Evidence for the transfer of written word identification processes. *TESOL Quarterly, 40*(2), 321–339. https://doi.org/10.2307/40264525
- Kulik, C.-L. C., Kulik, J. A., & Bangert-Drowns, R. L. (1990). Effectiveness of mastery learning programs: A meta-analysis. *Review of Educational Research, 60*(2), 265–299.
- McCandliss, B., Beck, I. L., Sandak, R., & Perfetti, C. (2003). Focusing attention on decoding for children with poor reading skills: Design and preliminary tests of the word building intervention. *Scientific Studies of Reading, 7*(1), 75–104. https://doi.org/10.1207/S1532799XSSR0701_05
- McKague, M., Pratt, C., & Johnston, M. B. (2001). The effect of oral vocabulary on reading visually novel words. *Cognition, 80*(3), 231–262.
- Mesmer, H. A. E. (2001). Decodable text: A review of what we know. *Reading Research and Instruction, 40*(2), 121–142.
- Munro, M. J. (1993). Productions of English vowels by native speakers of Arabic: Acoustic measurements and accentedness ratings. *Language and Speech, 36*, 39–66.
- Nation, I. S. P. (2006). How large a vocabulary is needed for reading and listening? *Canadian Modern Language Review, 63*(1), 59–82.
- National Institute of Child Health and Human Development. (2000). *Report of the National Reading Panel: Teaching children to read* (NIH Publication No. 00-4769). https://www.nichd.nih.gov/publications/pubs/nrp/smallbook
- Ouellette, G., & Fraser, J. R. (2009). What exactly is a yait anyway: The role of semantics in orthographic learning. *Journal of Experimental Child Psychology, 104*(2), 239–251.
- Perfetti, C. (2007). Reading ability: Lexical quality to comprehension. *Scientific Studies of Reading, 11*(4), 357–383. https://doi.org/10.1080/10888430701530730
- Perfetti, C. A., & Hart, L. (2002). The lexical quality hypothesis. In L. Verhoeven, C. Elbro, & P. Reitsma (Eds.), *Precursors of functional literacy* (pp. 189–213). John Benjamins. https://doi.org/10.1075/swll.11.14per
- Reitsma, P. (1988). Reading practice for beginners: Effects of guided reading, reading-while-listening, and independent reading with computer-based speech feedback. *Reading Research Quarterly, 23*(2), 219–235. https://www.jstor.org/stable/747803
- Rodriguez, M. C. (2005). Three options are optimal for multiple-choice items: A meta-analysis of 80 years of research. *Educational Measurement: Issues and Practice, 24*(2), 3–13. https://doi.org/10.1111/j.1745-3992.2005.00006.x
- Roediger, H. L., & Karpicke, J. D. (2006). Test-enhanced learning: Taking memory tests improves long-term retention. *Psychological Science, 17*(3), 249–255. https://doi.org/10.1111/j.1467-9280.2006.01693.x
- Rose, J. (2006). *Independent review of the teaching of early reading: Final report*. Department for Education and Skills. https://dera.ioe.ac.uk/id/eprint/5551/2/report.pdf
- Ryan, A., & Meara, P. (1991). The case of the invisible vowels: Arabic speakers reading English words. *Reading in a Foreign Language, 7*(2), 531–540.
- Saigh, K., & Schmitt, N. (2012). Difficulties with vocabulary word form: The case of Arabic ESL learners. *System, 40*(1), 24–36.
- Sailer, M., & Homner, L. (2020). The gamification of learning: A meta-analysis. *Educational Psychology Review, 32*, 77–112.
- Share, D. L. (1995). Phonological recoding and self-teaching: Sine qua non of reading acquisition. *Cognition, 55*(2), 151–218. https://doi.org/10.1016/0010-0277(94)00645-2
- Share, D. L. (1999). Phonological recoding and orthographic learning: A direct test of the self-teaching hypothesis. *Journal of Experimental Child Psychology, 72*(2), 95–129. https://doi.org/10.1006/jecp.1998.2481
- Shute, V. J. (2008). Focus on formative feedback. *Review of Educational Research, 78*(1), 153–189. https://doi.org/10.3102/0034654307313795
- Thomson, R. I. (2018). High variability [pronunciation] training (HVPT): A proven technique about which every language teacher and learner ought to know. *Journal of Second Language Pronunciation, 4*(2), 208–231. https://doi.org/10.1075/jslp.17038.tho
- Tsukada, K. (2011). The perception of Arabic and Japanese short and long vowels by native speakers of Arabic, Japanese, and Persian. *Journal of the Acoustical Society of America, 129*(2), 989ff.
- Uchihara, T., Karas, M., & Thomson, R. I. (2025). High variability phonetic training (HVPT): A meta-analysis of L2 perceptual training studies. *Studies in Second Language Acquisition, 47*(3), 794–827.
- Webb, S., & Nation, P. (2017). *How vocabulary is learned*. Oxford University Press.
- Weiser, B., & Mathes, P. (2011). Using encoding instruction to improve the reading and spelling performances of elementary students at risk for literacy difficulties: A best-evidence synthesis. *Review of Educational Research, 81*(2), 170–200. https://doi.org/10.3102/0034654310396719

### Courses and frameworks

- Baker, A. (2006). *Tree or three?* (2nd ed.). Cambridge University Press. https://www.cambridge.es/en/catalogue/grammar-vocabulary-and-pronunciation/pronunciation/tree-or-three
- Council of Europe. (2022). *Literacy and second language learning for the linguistic integration of adult migrants (LASLLIAM): Reference guide*. https://www.leslla.org/latest-news/2022/7/15/new-reference-guide-on-literacy-and-second-language-learning-for-the-linguistic-integration-of-adult-migrants-laslliam-available
- Department for Education and Skills. (2001). *Adult ESOL core curriculum*. https://www.london.gov.uk/sites/default/files/adult_esol_core_curriculum_v1.pdf
- Department for Education and Skills. (2007). *Letters and sounds: Principles and practice of high quality phonics*. https://assets.publishing.service.gov.uk/media/5a7aa7b6e5274a34770e630c/Letters_and_Sounds_-_DFES-00281-2007.pdf
- Latham-Koenig, C., Oxenden, C., & Lambert, J. (2019). *English File Beginner* (4th ed.). Oxford University Press. https://elt.oup.com/catalogue/items/global/adult_courses/english_file_fourth_edition/english_file_fourth_edition_beginner/9780194837637
- Laubach Way to Reading, Skill Books 1–4. New Readers Press / ProLiteracy. https://www.newreaderspress.com/LWR-skillbook-1; series overview: https://readnb.ca/uploads/1/4/8/1/148119356/lwr_series_overview.pdf
- Literacy Minnesota. *English Unlocked* phonics workbooks. https://www.literacymn.org/english-unlocked-phonics-workbooks
- Miskin, R. *Read Write Inc. Fresh Start*. Oxford University Press. https://www.ruthmiskin.com/fresh-start/
- Pathare, E., & Pathare, G. (2017). *Unlock Basic Literacy*. Cambridge University Press. https://www.cambridge.org/cambridgeenglish/catalog/english-academic-purposes/unlock-2nd-edition/unlock-basic-literacy-students-book-downloadable-audio; contents: https://www.cambridge.org/bs/files/8315/3717/4801/Unlock_Basic_Literacy_Students_Book_Contents.pdf
- Reading Horizons. *Reading Horizons Elevate* product guide. https://readinghorizons.com/wp-content/uploads/2024/04/RHElevateProductGuide.pdf
- Wilson Language Training. *Wilson Reading System* scope and sequence. https://www.ohioaspire.org/files/Low%20Level%20Learners/Scope%20and%20Sequence%20for%20teaching%20phonics.pdf

### Data sources

- CMU Pronouncing Dictionary, Carnegie Mellon University (`cmudict` Python package).
- Speer, R. *wordfreq* (Python package): Zipf-scale word frequencies.
- Tono Laboratory, Tokyo University of Foreign Studies. *CEFR-J Wordlist* version 1.5, via Open Language Profiles: https://github.com/openlanguageprofiles/olp-en-cefrj
