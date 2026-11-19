import { SubjectId, TeachingLanguageStyle } from '../types/examverse';

export interface CompleteSyllabusTopic {
  id: string;
  subject: SubjectId;
  tier: 'Tier 1' | 'Tier 2' | 'Both';
  tierNote?: string;
  isJsoOnly?: boolean;
  title: string;
  weightage: string;
  keySubtopics: string[];
  pyqTopicKeywords: string[];
}

export const TEACHING_LANGUAGES: Array<{
  code: TeachingLanguageStyle;
  label: string;
  nativeLabel: string;
  description: string;
}> = [
  {
    code: 'manglish',
    label: 'Manglish',
    nativeLabel: 'Manglish (Malayalam + English)',
    description: 'Malayalam explanation + English exam terms',
  },
  {
    code: 'en',
    label: 'English',
    nativeLabel: 'English',
    description: 'Simple clear English coaching',
  },
  {
    code: 'ml',
    label: 'Malayalam',
    nativeLabel: 'മലയാളം',
    description: 'Malayalam script + English terms',
  },
  {
    code: 'hi',
    label: 'Hindi',
    nativeLabel: 'हिन्दी',
    description: 'Clear Hindi + SSC terms',
  },
  {
    code: 'ta',
    label: 'Tamil',
    nativeLabel: 'தமிழ்',
    description: 'Clear Tamil + SSC terms',
  },
];

export const MANGLISH_WELCOME_GREETING = `Hi! Njan ninte SSC CGL personal AI teacher aanu.
Nammal syllabus-inte ororo topic-um step-by-step aayi simple aayi padikkum.
Aadyam oru subject select cheyyam — Maths (Quant), Reasoning, English, GA, allenkil Computer (Tier 2).
Nee Malayalam/Manglish-il padikkan aano, English-il aano prefer cheyyunnathu?`;

export const SSC_PERSONAL_TEACHER_SYSTEM_PROMPT = `SSC CGL AI PERSONAL TEACHER — MASTER SYSTEM PROMPT

You are an expert SSC CGL exam coach, personal tutor, mentor, and adaptive learning assistant inside Examora, an SSC CGL preparation app.

Your mission is NOT merely to give questions and answers. Your mission is to teach the student the complete SSC CGL syllabus step by step, make difficult concepts easy, help the student understand WHY an answer is correct, remember concepts, improve accuracy and speed, and prepare systematically for the exam.

1. SYLLABUS-FIRST RULE
Organize content strictly under the official SSC CGL Tier 1 & Tier 2 syllabus:
- Quantitative Aptitude: Number System, Simplification, Percentage, Ratio and Averages, Age, SI/CI, Profit and Loss, Partnership, Mixture and Alligation, Time and Work, Speed, Time and Distance, Algebra, Geometry and Mensuration, Trigonometry, Co-ordinate Geometry, Data Interpretation and Statistics (Tier 2 adds Mean, Median, Mode, Standard Deviation, Probability).
- General Intelligence & Reasoning: Analogies, Classification, Series, Coding-Decoding, Syllogism, Venn Diagram, Blood Relations, Order and Ranking, Word Formation, Seating Arrangement, Statement and Conclusion, Distance and Direction, Dice and Cube, Calendar, Clock, Odd One Out, Inequalities, Non-Verbal Reasoning, Logical Reasoning, Puzzle, Data Sufficiency, Critical Thinking (Tier 2 adds Emotional Intelligence & Social Intelligence).
- English Language: Error Spotting, Fill in the Blanks, Synonyms & Antonyms, One-word Substitution, Idioms & Proverbs, Cloze Test, Reading Comprehension, Sentence Correction / Rearrangement, Homonyms, Homophones, Voice, Narration.
- General Awareness: Current Affairs, History, Geography, Polity, Economy, General Science, Static GK, Art and Culture (Tier 1 & Tier 2 Section II Module 2).
- Computer Knowledge (Tier 2 Section III Module 1 — Qualifying): Operating Systems, Computer Abbreviations, Storage, Internet, Keyboard Shortcuts, Hardware and Software, Memory, Networking, Computer Fundamentals and Terminology, Technological Advancement, DBMS, Microsoft Office, Computer Languages, CPU and Components, Microsoft Windows, Types of Malicious Software (Malware & Cybersecurity Basics), Input and Output Devices. (Only provide DEST typing practice if the student asks.)
- Statistics (JSO Paper II — Tier 2, ONLY for Junior Statistical Officer candidates): Collection, Classification and Presentation of Statistical Data, Measures of Central Tendency, Measures of Dispersion, Correlation and Regression, Probability Theory, Sampling Theory, Statistical Inference, Analysis of Time Series, Index Numbers. Do NOT assume the user is a JSO or AAO candidate unless they select or ask about it.

2. ROLE & TEACHING PERSONALITY
- Be friendly, patient, encouraging, structured, and clear. Never robotic.
- Explain concepts in very simple language so even an average student understands on the first read.
- Do not dump large walls of text. Teach in small digestable steps.
- Adapt to beginner, intermediate, or advanced level automatically.
- If the student prefers Malayalam/Manglish, explain warmly in natural Manglish while keeping official SSC English technical terms (like Percentage, Profit, Marked Price, Subject-Verb Agreement, Syllogism, OSI Layer) intact and crystal clear.
- Always check if the student understood before rushing ahead.

3. ADAPTIVE LEARNING LOOP
Guide the student through:
Step 1: Choose Subject
Step 2: Choose Topic
Step 3: AI Teacher Lesson (easy explanation + rule/formula)
Step 4: Worked Example (step-by-step)
Step 5: Practice Question (1 question at a time, 4 options)
Step 6: Mistake Analysis (when wrong, explain why the chosen distractor trapped them, how to avoid it, and give a memory trick)
Step 7: Next Level Progression: Level 1 Easy -> Level 2 Medium -> Level 3 SSC Exam Level
Step 8: Automatic Weak Topic Revision

4. STANDARD TEACHING LESSON FORMAT
Keep every lesson structured and concise:
- Topic
- Easy Explanation
- Rule / Formula
- Worked Example (step by step)
- Exam Shortcut (PLUS clearly warn when NOT to use the shortcut)
- Common Mistake to Avoid
- Check Question ("Try this one now to check understanding:")

5. STRICT PROVENANCE & HONESTY RULES
- Priority 1: Use authentic verified archive PYQs whenever available and label them AUTHENTIC_PYQ with real exam year, tier, date, shift, and verification status.
- Priority 2: When generating original practice questions, label them clearly as GENERATED_PRACTICE (AI-generated SSC-pattern practice, NOT an official SSC PYQ).
- NEVER invent a PYQ, NEVER guess or fabricate a question ID, exam year, shift, or verification status, and NEVER claim to predict exact future exam questions.
- Verify all arithmetic, formulas, reasoning chains, and grammar rules before responding. Never silently change a user's answer or pretend an uncertain fact is verified.

6. GENERAL AWARENESS FRESHNESS
- For Current Affairs / recent schemes / appointments / sports / indices, clearly separate static evergreen GK facts from time-sensitive updates, and never state unverified 2026+ events as confirmed facts unless verified.

7. TOPIC MASTERY TRACKING
Track mastery across topics: Not Started, Learning, Practicing, Strong, Revision Needed. When the student makes mistakes, mark that topic for Revision Needed and resurface targeted practice.`;

export const COMPLETE_SSC_SYLLABUS: CompleteSyllabusTopic[] = [
  // ================= QUANTITATIVE APTITUDE (16) =================
  {
    id: 'syl-quant-number-system',
    subject: 'quant',
    tier: 'Both',
    title: 'Number System',
    weightage: '2–3 Qs',
    keySubtopics: ['Divisibility rules (72, 88, 99)', 'Remainder theorem & cyclicity', 'Unit digit & factors'],
    pyqTopicKeywords: ['Number System', 'Divisibility', 'HCF', 'LCM', 'Remainder'],
  },
  {
    id: 'syl-quant-simplification',
    subject: 'quant',
    tier: 'Both',
    title: 'Simplification',
    weightage: '1–2 Qs',
    keySubtopics: ['VBODMAS fractions', 'Surds & indices', 'Algebraic simplification'],
    pyqTopicKeywords: ['Simplification', 'BODMAS', 'Surds'],
  },
  {
    id: 'syl-quant-percentage',
    subject: 'quant',
    tier: 'Both',
    title: 'Percentage',
    weightage: '1–2 Qs',
    keySubtopics: ['Fraction-to-percentage table', 'Successive % change', 'Consumption & election problems'],
    pyqTopicKeywords: ['Percentage'],
  },
  {
    id: 'syl-quant-ratio-averages',
    subject: 'quant',
    tier: 'Both',
    title: 'Ratio and Averages',
    weightage: '2–3 Qs',
    keySubtopics: ['Compound & mean proportion', 'Weighted average', 'Replacement & batting average'],
    pyqTopicKeywords: ['Ratio', 'Proportion', 'Average'],
  },
  {
    id: 'syl-quant-age',
    subject: 'quant',
    tier: 'Both',
    title: 'Age',
    weightage: '1 Q',
    keySubtopics: ['Constant age difference method', 'Present vs future ratio shifts'],
    pyqTopicKeywords: ['Age', 'Ages'],
  },
  {
    id: 'syl-quant-si-ci',
    subject: 'quant',
    tier: 'Both',
    title: 'SI / CI (Simple & Compound Interest)',
    weightage: '1–2 Qs',
    keySubtopics: ['Tree & effective rate method', '2-yr & 3-yr CI − SI difference', 'Installments'],
    pyqTopicKeywords: ['Simple Interest', 'Compound Interest', 'SI', 'CI', 'Interest'],
  },
  {
    id: 'syl-quant-profit-loss',
    subject: 'quant',
    tier: 'Both',
    title: 'Profit and Loss',
    weightage: '2–3 Qs',
    keySubtopics: ['CP / SP / MP & discount chains', 'Faulty weights & dishonest dealer', 'Successive discounts'],
    pyqTopicKeywords: ['Profit', 'Loss', 'Discount'],
  },
  {
    id: 'syl-quant-partnership',
    subject: 'quant',
    tier: 'Both',
    title: 'Partnership',
    weightage: '1 Q',
    keySubtopics: ['Capital × Time profit split', 'Working vs sleeping partner ratio'],
    pyqTopicKeywords: ['Partnership'],
  },
  {
    id: 'syl-quant-mixture',
    subject: 'quant',
    tier: 'Both',
    title: 'Mixture and Alligation',
    weightage: '1–2 Qs',
    keySubtopics: ['Cross-alligation rule', 'Repeated dilution & replacement'],
    pyqTopicKeywords: ['Mixture', 'Alligation'],
  },
  {
    id: 'syl-quant-time-work',
    subject: 'quant',
    tier: 'Both',
    title: 'Time and Work',
    weightage: '1–2 Qs',
    keySubtopics: ['LCM efficiency method', 'MDH wages formula', 'Pipes & cisterns alternate hours'],
    pyqTopicKeywords: ['Time and Work', 'Time & Work', 'Pipes', 'Work'],
  },
  {
    id: 'syl-quant-tsd',
    subject: 'quant',
    tier: 'Both',
    title: 'Speed, Time and Distance',
    weightage: '1–2 Qs',
    keySubtopics: ['Relative speed & trains', 'Boats & streams', 'Circular tracks & linear races'],
    pyqTopicKeywords: ['Speed', 'Distance', 'Train', 'Boat'],
  },
  {
    id: 'syl-quant-algebra',
    subject: 'quant',
    tier: 'Both',
    title: 'Algebra',
    weightage: '2–4 Qs',
    keySubtopics: ['x + 1/x & cubic identities', 'Symmetric expressions', 'Linear & quadratic roots'],
    pyqTopicKeywords: ['Algebra'],
  },
  {
    id: 'syl-quant-geometry-mensuration',
    subject: 'quant',
    tier: 'Both',
    title: 'Geometry & Mensuration',
    weightage: '4–6 Qs',
    keySubtopics: ['Triangle centres & similarity', 'Circle tangents & chords', '2D area & 3D prism/pyramid/frustum'],
    pyqTopicKeywords: ['Geometry', 'Mensuration', 'Triangle', 'Circle'],
  },
  {
    id: 'syl-quant-trigonometry',
    subject: 'quant',
    tier: 'Both',
    title: 'Trigonometry',
    weightage: '2–3 Qs',
    keySubtopics: ['Pythagorean & complementary identities', 'Max/min values', 'Heights & distances'],
    pyqTopicKeywords: ['Trigonometry', 'Heights'],
  },
  {
    id: 'syl-quant-coordinate',
    subject: 'quant',
    tier: 'Tier 2',
    tierNote: 'Higher focus in Tier 2 Paper I',
    title: 'Co-ordinate Geometry',
    weightage: '1 Q (Tier 2)',
    keySubtopics: ['Distance & section formula', 'Slope & intercept of straight line', 'Reflection of points'],
    pyqTopicKeywords: ['Coordinate', 'Co-ordinate'],
  },
  {
    id: 'syl-quant-di-statistics',
    subject: 'quant',
    tier: 'Both',
    tierNote: 'Tier 2 adds Mean, Median, Mode, Std. Deviation & Probability',
    title: 'Data Interpretation & Statistics',
    weightage: '3–5 Qs',
    keySubtopics: ['Pie, bar, line & table DI', 'Mean, Median, Mode & Empirical rule', 'Standard deviation & Probability (Tier 2)'],
    pyqTopicKeywords: ['Data Interpretation', 'DI', 'Statistics', 'Probability', 'Mean'],
  },

  // ================= GENERAL INTELLIGENCE & REASONING (22) =================
  {
    id: 'syl-reas-analogies',
    subject: 'reasoning',
    tier: 'Both',
    title: 'Analogies',
    weightage: '2–3 Qs',
    keySubtopics: ['Number-set & triad analogies', 'Word semantic pairs', 'Letter-cluster shifts'],
    pyqTopicKeywords: ['Analogy', 'Analogies'],
  },
  {
    id: 'syl-reas-classification',
    subject: 'reasoning',
    tier: 'Both',
    title: 'Classification',
    weightage: '1–2 Qs',
    keySubtopics: ['Semantic grouping', 'Numeric & letter cluster classification'],
    pyqTopicKeywords: ['Classification'],
  },
  {
    id: 'syl-reas-series',
    subject: 'reasoning',
    tier: 'Both',
    title: 'Series',
    weightage: '2–3 Qs',
    keySubtopics: ['Number difference & multiplication series', 'Letter & alphanumeric series', 'Continuous pattern'],
    pyqTopicKeywords: ['Series'],
  },
  {
    id: 'syl-reas-coding',
    subject: 'reasoning',
    tier: 'Both',
    title: 'Coding-Decoding',
    weightage: '2–3 Qs',
    keySubtopics: ['Positional shifts & opposite pairs (EJOTY)', 'Vowel/consonant rules', 'Number & Chinese coding'],
    pyqTopicKeywords: ['Coding'],
  },
  {
    id: 'syl-reas-syllogism',
    subject: 'reasoning',
    tier: 'Both',
    title: 'Syllogism',
    weightage: '1–2 Qs',
    keySubtopics: ['Venn diagram overlap rules', 'Either-or complementary pairs', 'Possibility cases (Tier 2)'],
    pyqTopicKeywords: ['Syllogism'],
  },
  {
    id: 'syl-reas-venn',
    subject: 'reasoning',
    tier: 'Both',
    title: 'Venn Diagram',
    weightage: '1 Q',
    keySubtopics: ['Logical set relations', 'Geometric figure region counting'],
    pyqTopicKeywords: ['Venn'],
  },
  {
    id: 'syl-reas-blood-relations',
    subject: 'reasoning',
    tier: 'Both',
    title: 'Blood Relations',
    weightage: '1–2 Qs',
    keySubtopics: ['Coded symbol equations', 'Pointing-to-person family trees'],
    pyqTopicKeywords: ['Blood Relation'],
  },
  {
    id: 'syl-reas-order-ranking',
    subject: 'reasoning',
    tier: 'Both',
    title: 'Order and Ranking',
    weightage: '1 Q',
    keySubtopics: ['Left + Right − 1 rule', 'Overlap & minimum total cases'],
    pyqTopicKeywords: ['Ranking', 'Order'],
  },
  {
    id: 'syl-reas-word-formation',
    subject: 'reasoning',
    tier: 'Both',
    title: 'Word Formation & Dictionary Order',
    weightage: '1 Q',
    keySubtopics: ['Dictionary sequencing', 'Alphabetical sorting & meaning arrangement'],
    pyqTopicKeywords: ['Dictionary', 'Alphabetical', 'Word Formation'],
  },
  {
    id: 'syl-reas-seating',
    subject: 'reasoning',
    tier: 'Both',
    title: 'Seating Arrangement',
    weightage: '1–2 Qs (High Tier 2)',
    keySubtopics: ['Linear single/double row', 'Circular facing centre/outside'],
    pyqTopicKeywords: ['Seating'],
  },
  {
    id: 'syl-reas-statement-conclusion',
    subject: 'reasoning',
    tier: 'Both',
    title: 'Statement and Conclusion',
    weightage: '1–2 Qs (Tier 2)',
    keySubtopics: ['Direct inference vs assumption', 'Course of action & arguments'],
    pyqTopicKeywords: ['Statement', 'Conclusion'],
  },
  {
    id: 'syl-reas-direction',
    subject: 'reasoning',
    tier: 'Both',
    title: 'Distance and Direction',
    weightage: '1 Q',
    keySubtopics: ['Right/Left 90° turns', 'Pythagorean shortest distance & shadow problems'],
    pyqTopicKeywords: ['Direction', 'Distance'],
  },
  {
    id: 'syl-reas-dice-cube',
    subject: 'reasoning',
    tier: 'Both',
    title: 'Dice and Cube',
    weightage: '1–2 Qs',
    keySubtopics: ['1-common & 2-common face rules', 'Open unfolded cube nets'],
    pyqTopicKeywords: ['Dice', 'Cube'],
  },
  {
    id: 'syl-reas-calendar',
    subject: 'reasoning',
    tier: 'Both',
    title: 'Calendar',
    weightage: '1 Q',
    keySubtopics: ['Odd days & leap year exceptions', 'Day of week & calendar repetition'],
    pyqTopicKeywords: ['Calendar'],
  },
  {
    id: 'syl-reas-clock',
    subject: 'reasoning',
    tier: 'Both',
    title: 'Clock',
    weightage: '0–1 Q',
    keySubtopics: ['Angle formula |30H − 11M/2|', 'Mirror image & faulty clock gain/loss'],
    pyqTopicKeywords: ['Clock'],
  },
  {
    id: 'syl-reas-odd-one-out',
    subject: 'reasoning',
    tier: 'Both',
    title: 'Odd One Out',
    weightage: '1–2 Qs',
    keySubtopics: ['Letter gap oddity', 'Numeric prime/square/cube oddity'],
    pyqTopicKeywords: ['Odd One Out'],
  },
  {
    id: 'syl-reas-inequalities',
    subject: 'reasoning',
    tier: 'Tier 2',
    tierNote: 'Frequently tested in Tier 2',
    title: 'Inequalities',
    weightage: '1–2 Qs (Tier 2)',
    keySubtopics: ['Priority gate > ≥ =', 'Coded inequalities & either-or conditions'],
    pyqTopicKeywords: ['Inequalit'],
  },
  {
    id: 'syl-reas-non-verbal',
    subject: 'reasoning',
    tier: 'Both',
    title: 'Non-Verbal Reasoning',
    weightage: '3–4 Qs',
    keySubtopics: ['Mirror & water images', 'Paper folding/cutting', 'Embedded figures & counting triangles'],
    pyqTopicKeywords: ['Mirror', 'Paper', 'Embedded', 'Figure', 'Counting'],
  },
  {
    id: 'syl-reas-logical',
    subject: 'reasoning',
    tier: 'Both',
    title: 'Logical Reasoning & Mathematical Operations',
    weightage: '2–3 Qs',
    keySubtopics: ['BODMAS sign interchange', 'Logical sequence & cause-effect'],
    pyqTopicKeywords: ['Mathematical', 'Logical'],
  },
  {
    id: 'syl-reas-puzzle',
    subject: 'reasoning',
    tier: 'Tier 2',
    title: 'Puzzle',
    weightage: '1–2 Qs (Tier 2)',
    keySubtopics: ['Floor & box puzzles', 'Comparison & scheduling grids'],
    pyqTopicKeywords: ['Puzzle'],
  },
  {
    id: 'syl-reas-data-sufficiency',
    subject: 'reasoning',
    tier: 'Tier 2',
    title: 'Data Sufficiency',
    weightage: '1–2 Qs (Tier 2)',
    keySubtopics: ['Evaluating Statement I alone vs II alone vs both'],
    pyqTopicKeywords: ['Data Sufficiency'],
  },
  {
    id: 'syl-reas-critical-thinking',
    subject: 'reasoning',
    tier: 'Tier 2',
    tierNote: 'Tier 2 adds Emotional Intelligence & Social Intelligence',
    title: 'Critical, Emotional & Social Thinking',
    weightage: '1–2 Qs (Tier 2)',
    keySubtopics: ['Critical evaluation', 'Emotional & Social Intelligence situational reasoning'],
    pyqTopicKeywords: ['Critical', 'Emotional', 'Social'],
  },

  // ================= ENGLISH LANGUAGE (12) =================
  {
    id: 'syl-eng-error-spotting',
    subject: 'english',
    tier: 'Both',
    title: 'Error Spotting',
    weightage: '2–3 Qs',
    keySubtopics: ['Subject-verb agreement', 'Tenses & conditionals', 'Prepositions & modifiers'],
    pyqTopicKeywords: ['Error Spotting', 'Grammar'],
  },
  {
    id: 'syl-eng-fill-blanks',
    subject: 'english',
    tier: 'Both',
    title: 'Fill in the Blanks',
    weightage: '1–2 Qs',
    keySubtopics: ['Fixed prepositions & phrasal verbs', 'Contextual vocabulary & connectors'],
    pyqTopicKeywords: ['Fill in'],
  },
  {
    id: 'syl-eng-syn-ant',
    subject: 'english',
    tier: 'Both',
    title: 'Synonyms & Antonyms',
    weightage: '3–4 Qs',
    keySubtopics: ['Root words, prefixes & suffixes', 'Tone elimination', 'High-frequency SSC register'],
    pyqTopicKeywords: ['Synonym', 'Antonym'],
  },
  {
    id: 'syl-eng-ows',
    subject: 'english',
    tier: 'Both',
    title: 'One-word Substitution',
    weightage: '2 Qs',
    keySubtopics: ['Phobias, manias & governance terms', 'Root-based deduction'],
    pyqTopicKeywords: ['One-Word', 'One Word'],
  },
  {
    id: 'syl-eng-idioms',
    subject: 'english',
    tier: 'Both',
    title: 'Idioms & Proverbs',
    weightage: '2 Qs',
    keySubtopics: ['Figurative idioms', 'Contextual sentence usage'],
    pyqTopicKeywords: ['Idiom', 'Proverb'],
  },
  {
    id: 'syl-eng-cloze',
    subject: 'english',
    tier: 'Both',
    title: 'Cloze Test',
    weightage: '5 Qs (Tier 1) / 4–8 Qs (Tier 2)',
    keySubtopics: ['Passage tone & tense continuity', 'Collocations & grammatical fit'],
    pyqTopicKeywords: ['Cloze'],
  },
  {
    id: 'syl-eng-rc',
    subject: 'english',
    tier: 'Both',
    tierNote: 'Very high weightage in Tier 2 Paper I (12–15 Qs)',
    title: 'Reading Comprehension',
    weightage: 'High Tier 2 Weightage',
    keySubtopics: ['Main idea, tone & inference', 'Eliminating extreme options'],
    pyqTopicKeywords: ['Comprehension', 'Passage'],
  },
  {
    id: 'syl-eng-sentence-correction',
    subject: 'english',
    tier: 'Both',
    title: 'Sentence Correction / Rearrangement',
    weightage: '2–5 Qs',
    keySubtopics: ['Phrase improvement', 'PQRS para-jumbles via pronoun & connector links'],
    pyqTopicKeywords: ['Sentence', 'Rearrangement', 'Para Jumble', 'Improvement'],
  },
  {
    id: 'syl-eng-homonyms',
    subject: 'english',
    tier: 'Both',
    title: 'Homonyms',
    weightage: '1 Q (Tier 2)',
    keySubtopics: ['Same spelling/sound, distinct contextual meanings'],
    pyqTopicKeywords: ['Homonym'],
  },
  {
    id: 'syl-eng-homophones',
    subject: 'english',
    tier: 'Both',
    title: 'Homophones',
    weightage: '1 Q (Tier 2)',
    keySubtopics: ['Affect/Effect, Compliment/Complement, Stationary/Stationery'],
    pyqTopicKeywords: ['Homophone', 'Spelling'],
  },
  {
    id: 'syl-eng-voice',
    subject: 'english',
    tier: 'Both',
    title: 'Voice (Active / Passive)',
    weightage: '1–3 Qs',
    keySubtopics: ['Be + V3 tense-preserving chart', 'Modals, imperatives & interrogatives'],
    pyqTopicKeywords: ['Voice', 'Active', 'Passive'],
  },
  {
    id: 'syl-eng-narration',
    subject: 'english',
    tier: 'Both',
    title: 'Narration (Direct / Indirect)',
    weightage: '1–3 Qs',
    keySubtopics: ['Reporting verb backshift rules', 'Pronoun, time-word & question conversion'],
    pyqTopicKeywords: ['Narration', 'Direct', 'Indirect'],
  },

  // ================= GENERAL AWARENESS (8) =================
  {
    id: 'syl-ga-current-affairs',
    subject: 'ga',
    tier: 'Both',
    title: 'Current Affairs',
    weightage: '4–6 Qs',
    keySubtopics: ['Government schemes & budgets', 'Awards, appointments, summits & sports'],
    pyqTopicKeywords: ['Current Affairs', 'Scheme', 'Award', 'Sports'],
  },
  {
    id: 'syl-ga-history',
    subject: 'ga',
    tier: 'Both',
    title: 'History',
    weightage: '3–4 Qs',
    keySubtopics: ['Indus & Vedic age', 'Delhi Sultanate & Mughals', '1857–1947 Freedom Movement'],
    pyqTopicKeywords: ['History'],
  },
  {
    id: 'syl-ga-geography',
    subject: 'ga',
    tier: 'Both',
    title: 'Geography',
    weightage: '2–3 Qs',
    keySubtopics: ['Indian river basins & tributaries', 'Monsoon, soils, passes & national parks'],
    pyqTopicKeywords: ['Geography'],
  },
  {
    id: 'syl-ga-polity',
    subject: 'ga',
    tier: 'Both',
    title: 'Polity',
    weightage: '3–4 Qs',
    keySubtopics: ['Fundamental Rights, DPSP & Duties', 'Schedules, Amendments & Parliament'],
    pyqTopicKeywords: ['Polity', 'Constitution'],
  },
  {
    id: 'syl-ga-economy',
    subject: 'ga',
    tier: 'Both',
    title: 'Economy',
    weightage: '2–3 Qs',
    keySubtopics: ['RBI monetary tools', 'Five-Year Plans, fiscal deficit & GDP indices'],
    pyqTopicKeywords: ['Economy', 'Economics'],
  },
  {
    id: 'syl-ga-science',
    subject: 'ga',
    tier: 'Both',
    title: 'General Science',
    weightage: '4–5 Qs',
    keySubtopics: ['Physics SI units & optics', 'Chemistry acids/alloys', 'Biology vitamins, cells & diseases'],
    pyqTopicKeywords: ['Science', 'Physics', 'Chemistry', 'Biology'],
  },
  {
    id: 'syl-ga-static-gk',
    subject: 'ga',
    tier: 'Both',
    title: 'Static GK',
    weightage: '3–4 Qs',
    keySubtopics: ['Books & authors, UNESCO sites', 'UN headquarters, instruments & boundary lines'],
    pyqTopicKeywords: ['Static GK', 'Static'],
  },
  {
    id: 'syl-ga-art-culture',
    subject: 'ga',
    tier: 'Both',
    title: 'Art and Culture',
    weightage: '2–3 Qs',
    keySubtopics: ['8 Classical dances & exponents', 'Folk festivals, temples & gharanas'],
    pyqTopicKeywords: ['Art', 'Culture', 'Dance'],
  },

  // ================= COMPUTER KNOWLEDGE — TIER 2 ONLY (17) =================
  {
    id: 'syl-comp-os',
    subject: 'computer',
    tier: 'Tier 2',
    title: 'Operating Systems',
    weightage: '2 Qs (Tier 2)',
    keySubtopics: ['Process scheduling, kernel & deadlocks', 'GUI vs CLI, Unix/Linux & Android'],
    pyqTopicKeywords: ['Operating System'],
  },
  {
    id: 'syl-comp-abbreviations',
    subject: 'computer',
    tier: 'Tier 2',
    title: 'Computer Abbreviations',
    weightage: '1–2 Qs (Tier 2)',
    keySubtopics: ['BIOS, UEFI, ASCII, HTTP, SMTP, EEPROM, RAID'],
    pyqTopicKeywords: ['Abbreviation'],
  },
  {
    id: 'syl-comp-storage',
    subject: 'computer',
    tier: 'Tier 2',
    title: 'Storage',
    weightage: '1–2 Qs (Tier 2)',
    keySubtopics: ['HDD vs SSD, optical discs & cloud drives', 'KB → MB → GB → TB → PB units'],
    pyqTopicKeywords: ['Storage'],
  },
  {
    id: 'syl-comp-internet',
    subject: 'computer',
    tier: 'Tier 2',
    title: 'Internet',
    weightage: '2 Qs (Tier 2)',
    keySubtopics: ['URLs, DNS, HTTP/HTTPS, Email (SMTP/IMAP/POP3)', 'Browsers, cookies & search engines'],
    pyqTopicKeywords: ['Internet'],
  },
  {
    id: 'syl-comp-shortcuts',
    subject: 'computer',
    tier: 'Tier 2',
    title: 'Keyboard Shortcuts',
    weightage: '2–3 Qs (Tier 2)',
    keySubtopics: ['Windows Ctrl/Alt/Win keys', 'Word, Excel & PowerPoint function shortcuts'],
    pyqTopicKeywords: ['Shortcut', 'Keyboard'],
  },
  {
    id: 'syl-comp-hw-sw',
    subject: 'computer',
    tier: 'Tier 2',
    title: 'Hardware and Software',
    weightage: '1–2 Qs (Tier 2)',
    keySubtopics: ['System vs application software', 'Motherboard, buses & firmware'],
    pyqTopicKeywords: ['Hardware', 'Software'],
  },
  {
    id: 'syl-comp-memory',
    subject: 'computer',
    tier: 'Tier 2',
    title: 'Memory',
    weightage: '2 Qs (Tier 2)',
    keySubtopics: ['Registers, L1/L2/L3 Cache, SRAM vs DRAM', 'PROM/EPROM/EEPROM & Virtual memory'],
    pyqTopicKeywords: ['Memory', 'RAM', 'ROM', 'Cache'],
  },
  {
    id: 'syl-comp-networking',
    subject: 'computer',
    tier: 'Tier 2',
    title: 'Networking',
    weightage: '2–3 Qs (Tier 2)',
    keySubtopics: ['OSI 7 layers & TCP/IP ports', 'Router, Switch, Hub, Gateway & topologies'],
    pyqTopicKeywords: ['Network', 'OSI'],
  },
  {
    id: 'syl-comp-fundamentals',
    subject: 'computer',
    tier: 'Tier 2',
    title: 'Computer Fundamentals and Terminology',
    weightage: '1–2 Qs (Tier 2)',
    keySubtopics: ['Computer generations I–V', 'Binary/Hex conversions & booting sequence'],
    pyqTopicKeywords: ['Fundamental', 'Generation', 'Binary'],
  },
  {
    id: 'syl-comp-tech-adv',
    subject: 'computer',
    tier: 'Tier 2',
    title: 'Technological Advancement',
    weightage: '1 Q (Tier 2)',
    keySubtopics: ['AI, IoT, Cloud computing & Supercomputers'],
    pyqTopicKeywords: ['Advancement', 'Cloud'],
  },
  {
    id: 'syl-comp-dbms',
    subject: 'computer',
    tier: 'Tier 2',
    title: 'DBMS',
    weightage: '1 Q (Tier 2)',
    keySubtopics: ['Primary & Foreign keys', 'RDBMS basics & SQL terms'],
    pyqTopicKeywords: ['DBMS', 'Database'],
  },
  {
    id: 'syl-comp-ms-office',
    subject: 'computer',
    tier: 'Tier 2',
    title: 'Microsoft Office',
    weightage: '2–3 Qs (Tier 2)',
    keySubtopics: ['MS Word formatting & mail merge', 'Excel formulas (VLOOKUP/SUMIF)', 'PowerPoint views'],
    pyqTopicKeywords: ['Office', 'Word', 'Excel', 'PowerPoint'],
  },
  {
    id: 'syl-comp-languages',
    subject: 'computer',
    tier: 'Tier 2',
    title: 'Computer Languages',
    weightage: '1 Q (Tier 2)',
    keySubtopics: ['Machine, Assembly & High-level languages', 'Compiler vs Interpreter vs Assembler'],
    pyqTopicKeywords: ['Language', 'Compiler'],
  },
  {
    id: 'syl-comp-cpu',
    subject: 'computer',
    tier: 'Tier 2',
    title: 'CPU and Components',
    weightage: '1–2 Qs (Tier 2)',
    keySubtopics: ['ALU, Control Unit & Program Counter', 'Instruction fetch-decode-execute cycle'],
    pyqTopicKeywords: ['CPU', 'ALU'],
  },
  {
    id: 'syl-comp-windows',
    subject: 'computer',
    tier: 'Tier 2',
    title: 'Microsoft Windows',
    weightage: '1 Q (Tier 2)',
    keySubtopics: ['Task Manager, File Explorer, Control Panel', 'Windows shortcuts & file extensions'],
    pyqTopicKeywords: ['Windows'],
  },
  {
    id: 'syl-comp-malware',
    subject: 'computer',
    tier: 'Tier 2',
    title: 'Types of Malicious Software & Cybersecurity',
    weightage: '2 Qs (Tier 2)',
    keySubtopics: ['Virus, Worm, Trojan, Ransomware, Spyware', 'Phishing, Firewall & encryption'],
    pyqTopicKeywords: ['Malware', 'Virus', 'Cyber', 'Security'],
  },
  {
    id: 'syl-comp-io',
    subject: 'computer',
    tier: 'Tier 2',
    title: 'Input and Output Devices',
    weightage: '1 Q (Tier 2)',
    keySubtopics: ['OCR, OMR, MICR, Trackball & Joystick', 'Impact vs Non-impact printers & plotters'],
    pyqTopicKeywords: ['Input', 'Output', 'Printer'],
  },

  // ================= STATISTICS — JSO PAPER II (TIER 2 ONLY) (9) =================
  {
    id: 'syl-stat-collection',
    subject: 'statistics',
    tier: 'Tier 2',
    tierNote: 'JSO Paper II only',
    isJsoOnly: true,
    title: 'Collection, Classification & Presentation of Data',
    weightage: '10–12 Qs (JSO)',
    keySubtopics: ['Primary vs secondary data', 'Frequency tables, histograms & ogives'],
    pyqTopicKeywords: ['Data Collection', 'Presentation'],
  },
  {
    id: 'syl-stat-central-tendency',
    subject: 'statistics',
    tier: 'Tier 2',
    tierNote: 'JSO Paper II only',
    isJsoOnly: true,
    title: 'Measures of Central Tendency',
    weightage: '10–12 Qs (JSO)',
    keySubtopics: ['AM, GM, HM properties', 'Median, Mode, Quartiles & Deciles'],
    pyqTopicKeywords: ['Central Tendency', 'Mean', 'Median', 'Mode'],
  },
  {
    id: 'syl-stat-dispersion',
    subject: 'statistics',
    tier: 'Tier 2',
    tierNote: 'JSO Paper II only',
    isJsoOnly: true,
    title: 'Measures of Dispersion',
    weightage: '10–12 Qs (JSO)',
    keySubtopics: ['Range, Quartile & Mean Deviation', 'Variance, Standard Deviation & CV'],
    pyqTopicKeywords: ['Dispersion', 'Variance', 'Standard Deviation'],
  },
  {
    id: 'syl-stat-correlation',
    subject: 'statistics',
    tier: 'Tier 2',
    tierNote: 'JSO Paper II only',
    isJsoOnly: true,
    title: 'Correlation and Regression',
    weightage: '10–12 Qs (JSO)',
    keySubtopics: ['Karl Pearson r & Spearman rank correlation', 'Regression lines & bxy × byx = r²'],
    pyqTopicKeywords: ['Correlation', 'Regression'],
  },
  {
    id: 'syl-stat-probability',
    subject: 'statistics',
    tier: 'Tier 2',
    tierNote: 'JSO Paper II only',
    isJsoOnly: true,
    title: 'Probability Theory & Random Variables',
    weightage: '12–15 Qs (JSO)',
    keySubtopics: ['Bayes theorem & conditional probability', 'Binomial, Poisson & Normal distributions'],
    pyqTopicKeywords: ['Probability', 'Random Variable'],
  },
  {
    id: 'syl-stat-sampling',
    subject: 'statistics',
    tier: 'Tier 2',
    tierNote: 'JSO Paper II only',
    isJsoOnly: true,
    title: 'Sampling Theory',
    weightage: '10 Qs (JSO)',
    keySubtopics: ['Simple random, stratified & systematic sampling', 'Sampling errors & finite population'],
    pyqTopicKeywords: ['Sampling'],
  },
  {
    id: 'syl-stat-inference',
    subject: 'statistics',
    tier: 'Tier 2',
    tierNote: 'JSO Paper II only',
    isJsoOnly: true,
    title: 'Statistical Inference',
    weightage: '10 Qs (JSO)',
    keySubtopics: ['Point & interval estimation', 't, z, Chi-square & F tests, Type I & II errors'],
    pyqTopicKeywords: ['Inference', 'Hypothesis', 'Chi-square'],
  },
  {
    id: 'syl-stat-time-series',
    subject: 'statistics',
    tier: 'Tier 2',
    tierNote: 'JSO Paper II only',
    isJsoOnly: true,
    title: 'Analysis of Time Series',
    weightage: '8–10 Qs (JSO)',
    keySubtopics: ['Secular trend, seasonal & cyclical variations', 'Moving averages & least squares'],
    pyqTopicKeywords: ['Time Series'],
  },
  {
    id: 'syl-stat-index-numbers',
    subject: 'statistics',
    tier: 'Tier 2',
    tierNote: 'JSO Paper II only',
    isJsoOnly: true,
    title: 'Index Numbers',
    weightage: '8–10 Qs (JSO)',
    keySubtopics: ['Laspeyres, Paasche & Fisher ideal index', 'Time & Factor reversal tests'],
    pyqTopicKeywords: ['Index Number'],
  },
];

export const SSC_TIER1_PATTERN = [
  { section: 'A. General Intelligence & Reasoning', questions: 25, marks: 50, duration: '15 Mins' },
  { section: 'B. General Awareness', questions: 25, marks: 50, duration: '15 Mins' },
  { section: 'C. Quantitative Aptitude', questions: 25, marks: 50, duration: '15 Mins' },
  { section: 'D. English Comprehension', questions: 25, marks: 50, duration: '15 Mins' },
];

export const SSC_TIER2_PATTERN = [
  {
    paper: 'Paper I · Session I · Section I',
    module: 'Module I: Mathematical Abilities + Module II: Reasoning & General Intelligence',
    questions: '30 + 30 = 60 Qs',
    marks: '90 + 90 = 180 Marks',
    duration: '1 Hour (30m + 30m)',
    note: 'Merit-deciding (-1 negative mark)',
  },
  {
    paper: 'Paper I · Session I · Section II',
    module: 'Module I: English Language (45 Qs) + Module II: General Awareness (25 Qs)',
    questions: '45 + 25 = 70 Qs',
    marks: '135 + 75 = 210 Marks',
    duration: '1 Hour (40m + 20m)',
    note: 'Merit-deciding (-1 negative mark)',
  },
  {
    paper: 'Paper I · Session I · Section III',
    module: 'Module I: Computer Knowledge Test (20 Qs)',
    questions: '20 Qs',
    marks: '60 Marks',
    duration: '15 Mins',
    note: 'Mandatory Qualifying (-1 negative mark)',
  },
  {
    paper: 'Paper I · Session II · Section III',
    module: 'Module II: Data Entry Speed Test (DEST)',
    questions: '1 Data Entry Task',
    marks: '2000 key depressions',
    duration: '15 Mins',
    note: 'Mandatory Qualifying',
  },
  {
    paper: 'Paper II (JSO Only)',
    module: 'Statistics (Junior Statistical Officer candidates only)',
    questions: '100 Qs',
    marks: '200 Marks',
    duration: '2 Hours',
    note: '-0.50 negative mark per wrong answer',
  },
];

export const SSC_CUTOFF_TRENDS = {
  tier1AllOtherPostsOutOf200: [
    { category: 'UR', y2023: 149.78, y2024: 148.27, y2025: 136.83 },
    { category: 'OBC', y2023: 145.22, y2024: 144.89, y2025: 130.36 },
    { category: 'EWS', y2023: 146.13, y2024: 145.65, y2025: 127.41 },
    { category: 'SC', y2023: 129.67, y2024: 128.31, y2025: 114.97 },
    { category: 'ST', y2023: 118.76, y2024: 117.23, y2025: 106.36 },
  ],
  tier2Final2024OutOf450: [
    { category: 'UR', cutoff: 322.77 },
    { category: 'OBC', cutoff: 306.28 },
    { category: 'EWS', cutoff: 300.04 },
    { category: 'SC', cutoff: 285.46 },
    { category: 'ST', cutoff: 266.50 },
  ],
};

export function getTopicsBySubject(subject: SubjectId): CompleteSyllabusTopic[] {
  return COMPLETE_SSC_SYLLABUS.filter((t) => t.subject === subject);
}
