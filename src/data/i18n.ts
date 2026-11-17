import { LanguageCode, SubjectId } from '../types/examverse';

export interface LanguageMeta {
  code: LanguageCode;
  name: string;
  nativeName: string;
  greeting: string;
}

export const LANGUAGES: LanguageMeta[] = [
  { code: 'en', name: 'English', nativeName: 'English', greeting: 'Welcome back, Aspirant' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', greeting: 'സ്വാഗതം, ഉദ്യോഗാർത്ഥി' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', greeting: 'स्वागत है, अभ्यर्थी' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', greeting: 'நல்வரவு, தேர்வாளர்' },
];

export const SUBJECT_NAMES: Record<SubjectId, Record<LanguageCode, string>> = {
  quant: {
    en: 'Quantitative Aptitude',
    ml: 'ഗണിതശാസ്ത്രം (Quant)',
    hi: 'मात्रात्मक अभिरुचि (गणित)',
    ta: 'கணிதத் திறன் (Quant)',
  },
  reasoning: {
    en: 'Reasoning',
    ml: 'യുക്തിചിന്ത (Reasoning)',
    hi: 'सामान्य बुद्धिमत्ता (Reasoning)',
    ta: 'தர்க்க அறிவு (Reasoning)',
  },
  english: {
    en: 'English',
    ml: 'ഇംഗ്ലീഷ് (English)',
    hi: 'अंग्रेज़ी (English)',
    ta: 'ஆங்கிலம் (English)',
  },
  ga: {
    en: 'General Awareness',
    ml: 'പൊതുവിജ്ഞാനം (GA)',
    hi: 'सामान्य जागरूकता (GA)',
    ta: 'பொது அறிவு (GA)',
  },
  computer: {
    en: 'Computer Knowledge',
    ml: 'കമ്പ്യൂട്ടർ പരിജ്ഞാനം',
    hi: 'कंप्यूटर ज्ञान',
    ta: 'கணினி அறிவு',
  },
};

export interface UIStrings {
  navHome: string;
  navLearn: string;
  navPlay: string;
  navTutor: string;
  navProfile: string;
  tagline: string;
  welcomeSub: string;
  currentXp: string;
  streakDays: string;
  dailyGoal: string;
  continueLearning: string;
  resumeVideo: string;
  dailyQuiz: string;
  quickPlay: string;
  aiTutorShortcut: string;
  tier1Progress: string;
  tier2Progress: string;
  latestMockScore: string;
  subjectPerformance: string;
  todaysPlan: string;
  leaderboardPreview: string;
  videosTab: string;
  syllabusTab: string;
  pyqTab: string;
  practiceTab: string;
  mockTestsTab: string;
  gameCenterTitle: string;
  gameCenterSub: string;
  tutorTitle: string;
  tutorPlaceholder: string;
  sendBtn: string;
  clearChat: string;
  studyPlanner: string;
  analyticsTitle: string;
  adminPanel: string;
  settingsTitle: string;
  languageLabel: string;
  themeLabel: string;
  signInGoogle: string;
  signOut: string;
  postVideoPrompt: string;
  originalQuestionLabel: string;
  explanationLabel: string;
}

export const UI_TEXT: Record<LanguageCode, UIStrings> = {
  en: {
    navHome: 'Home',
    navLearn: 'Learn',
    navPlay: 'Play',
    navTutor: 'AI Tutor',
    navProfile: 'Profile',
    tagline: 'Learn. Play. Practice. Achieve.',
    welcomeSub: 'Your SSC CGL Tier 1 & Tier 2 mission control',
    currentXp: 'Total XP',
    streakDays: 'Day Streak',
    dailyGoal: 'Daily Goal',
    continueLearning: 'Continue Learning',
    resumeVideo: 'Resume Last Video',
    dailyQuiz: 'Daily 10Q Quiz',
    quickPlay: 'Quick Play Arena',
    aiTutorShortcut: 'Ask ExamVerse AI',
    tier1Progress: 'Tier 1 Readiness',
    tier2Progress: 'Tier 2 Readiness',
    latestMockScore: 'Latest Mock Score',
    subjectPerformance: 'Subject Mastery',
    todaysPlan: "Today's Learning Plan",
    leaderboardPreview: 'Top Scholars',
    videosTab: 'Videos',
    syllabusTab: 'Syllabus',
    pyqTab: 'PYQ Bank',
    practiceTab: 'Practice',
    mockTestsTab: 'Mock Tests',
    gameCenterTitle: 'SSC CGL Game Arena',
    gameCenterSub: 'Master speed, accuracy, and reasoning through interactive exam challenges.',
    tutorTitle: 'ExamVerse AI Tutor',
    tutorPlaceholder: 'Ask any SSC CGL doubt, paste a question, or request a shortcut...',
    sendBtn: 'Send',
    clearChat: 'Clear Chat',
    studyPlanner: 'Smart Study Planner',
    analyticsTitle: 'Progress Analytics',
    adminPanel: 'Admin Console',
    settingsTitle: 'Preferences & Account',
    languageLabel: 'Learning Language',
    themeLabel: 'Appearance',
    signInGoogle: 'Continue with Google',
    signOut: 'Sign Out',
    postVideoPrompt: 'Great! Now test what you learned.',
    originalQuestionLabel: 'Official English Question',
    explanationLabel: 'Step-by-Step Explanation',
  },
  ml: {
    navHome: 'ഹോം',
    navLearn: 'പഠിക്കുക',
    navPlay: 'കളിക്കുക',
    navTutor: 'AI ട്യൂട്ടർ',
    navProfile: 'പ്രൊഫൈൽ',
    tagline: 'പഠിക്കുക. കളിക്കുക. പരിശീലിക്കുക. വിജയിക്കുക.',
    welcomeSub: 'നിങ്ങളുടെ SSC CGL ടയർ 1 & ടയർ 2 തയ്യാറെടുപ്പ് കേന്ദ്രം',
    currentXp: 'ആകെ XP',
    streakDays: 'ദിവസത്തെ സ്ട്രീക്ക്',
    dailyGoal: 'ദൈനംദിന ലക്ഷ്യം',
    continueLearning: 'പഠനം തുടരുക',
    resumeVideo: 'അവസാന വീഡിയോ തുടരുക',
    dailyQuiz: 'പ്രതിദിന ക്വിസ്',
    quickPlay: 'ഗെയിം അരീന',
    aiTutorShortcut: 'AI ട്യൂട്ടറോട് ചോദിക്കുക',
    tier1Progress: 'ടയർ 1 പുരോഗതി',
    tier2Progress: 'ടയർ 2 പുരോഗതി',
    latestMockScore: 'അവസാന മോക്ക് സ്കോർ',
    subjectPerformance: 'വിഷയങ്ങളിലെ പ്രകടനം',
    todaysPlan: 'ഇന്നത്തെ പഠന പദ്ധതി',
    leaderboardPreview: 'മികച്ച വിദ്യാർത്ഥികൾ',
    videosTab: 'വീഡിയോകൾ',
    syllabusTab: 'സിലബസ്',
    pyqTab: 'PYQ ബാങ്ക്',
    practiceTab: 'പരിശീലനം',
    mockTestsTab: 'മോക്ക് ടെസ്റ്റുകൾ',
    gameCenterTitle: 'SSC CGL ഗെയിം അരീന',
    gameCenterSub: 'കളികളിലൂടെ വേഗതയും കൃത്യതയും യുക്തിചിന്തയും മെച്ചപ്പെടുത്തൂ.',
    tutorTitle: 'ExamVerse AI ട്യൂട്ടർ',
    tutorPlaceholder: 'ഏത് SSC CGL സംശയവും മലയാളത്തിലോ ഇംഗ്ലീഷിലോ ചോദിക്കാം...',
    sendBtn: 'അയയ്ക്കുക',
    clearChat: 'ചാറ്റ് മായ്ക്കുക',
    studyPlanner: 'സ്മാർട്ട് സ്റ്റഡി പ്ലാനർ',
    analyticsTitle: 'പുരോഗതി വിശകലനം',
    adminPanel: 'അഡ്മിൻ പാനൽ',
    settingsTitle: 'ക്രമീകരണങ്ങൾ',
    languageLabel: 'പഠന ഭാഷ',
    themeLabel: 'തീം',
    signInGoogle: 'Google വഴി ലോഗിൻ ചെയ്യുക',
    signOut: 'ലോഗ് ഔട്ട്',
    postVideoPrompt: 'മികച്ചത്! ഇനി പഠിച്ച കാര്യങ്ങൾ പരീക്ഷിക്കൂ.',
    originalQuestionLabel: 'ഔദ്യോഗിക ഇംഗ്ലീഷ് ചോദ്യം',
    explanationLabel: 'വിശദീകരണം (മലയാളത്തിൽ)',
  },
  hi: {
    navHome: 'होम',
    navLearn: 'अध्ययन',
    navPlay: 'खेलें',
    navTutor: 'AI ट्यूटर',
    navProfile: 'प्रोफ़ाइल',
    tagline: 'सीखें. खेलें. अभ्यास करें. सफल हों.',
    welcomeSub: 'आपका SSC CGL टियर 1 और टियर 2 तैयारी केंद्र',
    currentXp: 'कुल XP',
    streakDays: 'दैनिक स्ट्रीक',
    dailyGoal: 'दैनिक लक्ष्य',
    continueLearning: 'अध्ययन जारी रखें',
    resumeVideo: 'पिछला वीडियो देखें',
    dailyQuiz: 'दैनिक क्विज़',
    quickPlay: 'गेम एरीना',
    aiTutorShortcut: 'AI ट्यूटर से पूछें',
    tier1Progress: 'टियर 1 तैयारी',
    tier2Progress: 'टियर 2 तैयारी',
    latestMockScore: 'नवीनतम मॉक स्कोर',
    subjectPerformance: 'विषयवार प्रदर्शन',
    todaysPlan: 'आज की अध्ययन योजना',
    leaderboardPreview: 'शीर्ष अभ्यर्थी',
    videosTab: 'वीडियो',
    syllabusTab: 'पाठ्यक्रम',
    pyqTab: 'PYQ बैंक',
    practiceTab: 'अभ्यास',
    mockTestsTab: 'मॉक टेस्ट',
    gameCenterTitle: 'SSC CGL गेम एरीना',
    gameCenterSub: 'इंटरैक्टिव परीक्षा खेलों के साथ गति और सटीकता बढ़ाएँ।',
    tutorTitle: 'ExamVerse AI ट्यूटर',
    tutorPlaceholder: 'SSC CGL का कोई भी प्रश्न हिंदी या अंग्रेज़ी में पूछें...',
    sendBtn: 'भेजें',
    clearChat: 'चैट साफ़ करें',
    studyPlanner: 'स्मार्ट स्टडी प्लानर',
    analyticsTitle: 'प्रगति विश्लेषण',
    adminPanel: 'एडमिन पैनल',
    settingsTitle: 'सेटिंग्स और खाता',
    languageLabel: 'अध्ययन भाषा',
    themeLabel: 'थीम',
    signInGoogle: 'Google से साइन इन करें',
    signOut: 'साइन आउट',
    postVideoPrompt: 'बहुत बढ़िया! अब सीखे हुए का परीक्षण करें।',
    originalQuestionLabel: 'आधिकारिक अंग्रेज़ी प्रश्न',
    explanationLabel: 'चरण-दर-चरण व्याख्या',
  },
  ta: {
    navHome: 'முகப்பு',
    navLearn: 'கற்க',
    navPlay: 'விளையாடு',
    navTutor: 'AI ஆசிரியர்',
    navProfile: 'சுயவிவரம்',
    tagline: 'கற்க. விளையாடு. பயிற்சி செய். வெல்வாய்.',
    welcomeSub: 'உங்கள் SSC CGL Tier 1 & Tier 2 தயாரிப்பு மையம்',
    currentXp: 'மொத்த XP',
    streakDays: 'தொடர் நாட்கள்',
    dailyGoal: 'தினசரி இலக்கு',
    continueLearning: 'தொடர்ந்து கற்க',
    resumeVideo: 'கடைசி வீடியோவைத் தொடரவும்',
    dailyQuiz: 'தினசரி வினாடி வினா',
    quickPlay: 'விளையாட்டு அரங்கம்',
    aiTutorShortcut: 'AI ஆசிரியரிடம் கேட்க',
    tier1Progress: 'Tier 1 தயார்நிலை',
    tier2Progress: 'Tier 2 தயார்நிலை',
    latestMockScore: 'சமீபத்திய மாதிரி மதிப்பெண்',
    subjectPerformance: 'பாடவாரியான செயல்திறன்',
    todaysPlan: 'இன்றைய படிப்புத் திட்டம்',
    leaderboardPreview: 'முன்னணி மாணவர்கள்',
    videosTab: 'வீடியோக்கள்',
    syllabusTab: 'பாடத்திட்டம்',
    pyqTab: 'PYQ வங்கி',
    practiceTab: 'பயிற்சி',
    mockTestsTab: 'மாதிரி தேர்வுகள்',
    gameCenterTitle: 'SSC CGL விளையாட்டு அரங்கம்',
    gameCenterSub: 'விளையாட்டுகள் மூலம் வேகத்தையும் துல்லியத்தையும் உயர்த்துங்கள்.',
    tutorTitle: 'ExamVerse AI ஆசிரியர்',
    tutorPlaceholder: 'SSC CGL சந்தேகங்களைத் தமிழிலோ ஆங்கிலத்திலோ கேளுங்கள்...',
    sendBtn: 'அனுப்பு',
    clearChat: 'அரட்டையை அழி',
    studyPlanner: 'ஸ்மார்ட் படிப்புத் திட்டம்',
    analyticsTitle: 'முன்னேற்றப் பகுப்பாய்வு',
    adminPanel: 'நிர்வாகப் பலகம்',
    settingsTitle: 'அமைப்புகள்',
    languageLabel: 'கற்றல் மொழி',
    themeLabel: 'தோற்றம்',
    signInGoogle: 'Google மூலம் உள்நுழையவும்',
    signOut: 'வெளியேறு',
    postVideoPrompt: 'சிறப்பு! இப்போது கற்றதைச் சோதித்துப் பாருங்கள்.',
    originalQuestionLabel: 'அதிகாரப்பூர்வ ஆங்கில வினா',
    explanationLabel: 'படிப்படியான விளக்கம்',
  },
};

export const SUGGESTED_PROMPTS: Record<LanguageCode, string[]> = {
  en: [
    'Solve a percentage successive discount question step by step',
    'Teach me SSC CGL Coding-Decoding shortcuts',
    'Give me 5 high-frequency English Idioms for Tier 2',
    'Explain Article 32 & Constitutional Remedies for General Awareness',
  ],
  ml: [
    'Percentage engane solve cheyyam? Malayalam-il explain cheyyuka',
    'SSC CGL Maths Time & Work shortcut tricks padippikkuka',
    'Coding-Decoding reasoning questions engane vegam cheyyam?',
    'Indian Constitution-le Fundamental Rights Malayalam-il vishadeekarikkuka',
  ],
  hi: [
    'प्रतिशत (Percentage) के सवालों की सबसे तेज़ शॉर्टकट ट्रिक समझाएँ',
    'SSC CGL के लिए Profit & Loss का एक कठिन PYQ हल करें',
    'Reasoning में Number Series पहचानने के आसान नियम बताएँ',
    'अंग्रेज़ी Grammar के Subject-Verb Agreement के 5 नियम समझाएँ',
  ],
  ta: [
    'Percentage கணக்குகளை எளிதாகத் தீர்ப்பது எப்படி? தமிழில் விளக்குக',
    'SSC CGL Coding-Decoding குறுக்குவழிகளைக் கற்றுக்கொடுங்கள்',
    'Active & Passive Voice விதிகளை எடுத்துக்காட்டுடன் விளக்குக',
    'இந்திய அரசியலமைப்பின் அடிப்படை உரிமைகளை சுருக்கமாக விளக்குக',
  ],
};
