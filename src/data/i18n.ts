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
    en: 'General Intelligence & Reasoning',
    ml: 'യുക്തിചിന്ത (Reasoning)',
    hi: 'सामान्य बुद्धिमत्ता (Reasoning)',
    ta: 'தர்க்க அறிவு (Reasoning)',
  },
  english: {
    en: 'English Comprehension',
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
  navPractice: string;
  navPyqs: string;
  navRepeats: string;
  navPredictor: string;
  navAnalytics: string;
  navProfile: string;
  tagline: string;
  welcomeSub: string;
  currentXp: string;
  streakDays: string;
  dailyGoal: string;
  continueLearning: string;
  resumeVideo: string;
  dailyQuiz: string;
  quickPractice: string;
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
  gamesTab: string;
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
    navPractice: 'Practice',
    navPyqs: 'Previous Year Questions',
    navRepeats: '10-Year Repeats',
    navPredictor: 'Future Exam Predictor',
    navAnalytics: 'Analytics',
    navProfile: 'Profile',
    tagline: 'Learn Smart. Play Hard. Rank Higher.',
    welcomeSub: 'Your calm, focused SSC CGL Tier 1 & Tier 2 study space',
    currentXp: 'Total Points',
    streakDays: 'Day Streak',
    dailyGoal: "Today's Study Goal",
    continueLearning: 'Continue Learning',
    resumeVideo: 'Resume Last Lesson',
    dailyQuiz: 'Daily 10Q Challenge',
    quickPractice: 'Quick Practice',
    aiTutorShortcut: 'Ask Examora AI',
    tier1Progress: 'Tier 1 Readiness',
    tier2Progress: 'Tier 2 Readiness',
    latestMockScore: 'Upcoming & Latest Mock',
    subjectPerformance: 'Subject Progress',
    todaysPlan: "Today's Learning Plan",
    leaderboardPreview: 'Top Scholars',
    videosTab: 'Video Lessons',
    syllabusTab: 'Syllabus',
    pyqTab: 'Previous Year Qs',
    practiceTab: 'Topic Practice',
    mockTestsTab: 'Mock Tests',
    gamesTab: 'Learning Games',
    gameCenterTitle: 'SSC CGL Learning Games',
    gameCenterSub: 'Build speed, recall, and reasoning confidence through friendly exam challenges.',
    tutorTitle: 'Examora AI Tutor',
    tutorPlaceholder: 'Ask any SSC CGL doubt in simple words, or upload a question...',
    sendBtn: 'Send',
    clearChat: 'Clear Chat',
    studyPlanner: 'Smart Study Planner',
    analyticsTitle: 'Performance Analytics',
    adminPanel: 'Admin Console',
    settingsTitle: 'Preferences & Notifications',
    languageLabel: 'Learning Language',
    themeLabel: 'Appearance',
    signInGoogle: 'Continue with Google',
    signOut: 'Sign Out',
    postVideoPrompt: 'Great job! Let us check what you learned.',
    originalQuestionLabel: 'Official English Question',
    explanationLabel: 'Step-by-Step Explanation',
  },
  ml: {
    navHome: 'ഹോം',
    navLearn: 'പഠനം',
    navPractice: 'പരിശീലനം',
    navPyqs: 'മുൻവർഷ ചോദ്യങ്ങൾ',
    navRepeats: '10 വർഷ ആവർത്തനങ്ങൾ',
    navPredictor: 'ഭാവി പരീക്ഷ പ്രവചനം',
    navAnalytics: 'വിശകലനം',
    navProfile: 'പ്രൊഫൈൽ',
    tagline: 'Learn Smart. Play Hard. Rank Higher.',
    welcomeSub: 'നിങ്ങളുടെ SSC CGL ടയർ 1 & ടയർ 2 പഠന കേന്ദ്രം',
    currentXp: 'ആകെ പോയിന്റ്',
    streakDays: 'ദിവസത്തെ സ്ട്രീക്ക്',
    dailyGoal: 'ഇന്നത്തെ പഠന ലക്ഷ്യം',
    continueLearning: 'പഠനം തുടരുക',
    resumeVideo: 'അവസാന പാഠം തുടരുക',
    dailyQuiz: 'പ്രതിദിന ക്വിസ്',
    quickPractice: 'വേഗ പരിശീലനം',
    aiTutorShortcut: 'Examora AI-യോട് ചോദിക്കുക',
    tier1Progress: 'ടയർ 1 പുരോഗതി',
    tier2Progress: 'ടയർ 2 പുരോഗതി',
    latestMockScore: 'അവസാന മോക്ക് സ്കോർ',
    subjectPerformance: 'വിഷയങ്ങളിലെ പ്രകടനം',
    todaysPlan: 'ഇന്നത്തെ പഠന പദ്ധതി',
    leaderboardPreview: 'മികച്ച വിദ്യാർത്ഥികൾ',
    videosTab: 'വീഡിയോ പാഠങ്ങൾ',
    syllabusTab: 'സിലബസ്',
    pyqTab: 'PYQ ബാങ്ക്',
    practiceTab: 'പരിശീലനം',
    mockTestsTab: 'മോക്ക് ടെസ്റ്റുകൾ',
    gamesTab: 'പഠന ഗെയിമുകൾ',
    gameCenterTitle: 'SSC CGL പഠന ഗെയിമുകൾ',
    gameCenterSub: 'കളികളിലൂടെ വേഗതയും കൃത്യതയും യുക്തിചിന്തയും മെച്ചപ്പെടുത്തൂ.',
    tutorTitle: 'Examora AI ട്യൂട്ടർ',
    tutorPlaceholder: 'ഏത് SSC CGL സംശയവും മലയാളത്തിലോ ഇംഗ്ലീഷിലോ ചോദിക്കാം...',
    sendBtn: 'അയയ്ക്കുക',
    clearChat: 'ചാറ്റ് മായ്ക്കുക',
    studyPlanner: 'സ്മാർട്ട് സ്റ്റഡി പ്ലാനർ',
    analyticsTitle: 'പ്രകടന വിശകലനം',
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
    navPractice: 'अभ्यास',
    navPyqs: 'पिछले वर्ष के प्रश्न',
    navRepeats: '10-वर्षीय दोहराव',
    navPredictor: 'भविष्य परीक्षा पूर्वानुमान',
    navAnalytics: 'विश्लेषण',
    navProfile: 'प्रोफ़ाइल',
    tagline: 'Learn Smart. Play Hard. Rank Higher.',
    welcomeSub: 'आपका SSC CGL टियर 1 और टियर 2 तैयारी केंद्र',
    currentXp: 'कुल अंक',
    streakDays: 'दैनिक स्ट्रीक',
    dailyGoal: 'आज का अध्ययन लक्ष्य',
    continueLearning: 'अध्ययन जारी रखें',
    resumeVideo: 'पिछला पाठ देखें',
    dailyQuiz: 'दैनिक क्विज़',
    quickPractice: 'त्वरित अभ्यास',
    aiTutorShortcut: 'Examora AI से पूछें',
    tier1Progress: 'टियर 1 तैयारी',
    tier2Progress: 'टियर 2 तैयारी',
    latestMockScore: 'नवीनतम मॉक स्कोर',
    subjectPerformance: 'विषयवार प्रदर्शन',
    todaysPlan: 'आज की अध्ययन योजना',
    leaderboardPreview: 'शीर्ष अभ्यर्थी',
    videosTab: 'वीडियो पाठ',
    syllabusTab: 'पाठ्यक्रम',
    pyqTab: 'पिछले वर्ष के प्रश्न',
    practiceTab: 'टॉपिक अभ्यास',
    mockTestsTab: 'मॉक टेस्ट',
    gamesTab: 'लर्निंग गेम्स',
    gameCenterTitle: 'SSC CGL लर्निंग गेम्स',
    gameCenterSub: 'इंटरैक्टिव परीक्षा खेलों के साथ गति और सटीकता बढ़ाएँ।',
    tutorTitle: 'Examora AI ट्यूटर',
    tutorPlaceholder: 'SSC CGL का कोई भी प्रश्न हिंदी या अंग्रेज़ी में पूछें...',
    sendBtn: 'भेजें',
    clearChat: 'चैट साफ़ करें',
    studyPlanner: 'स्मार्ट स्टडी प्लानर',
    analyticsTitle: 'प्रदर्शन विश्लेषण',
    adminPanel: 'एडमिन पैनल',
    settingsTitle: 'सेटिंग्स और सूचनाएँ',
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
    navPractice: 'பயிற்சி',
    navPyqs: 'முந்தைய ஆண்டு வினாக்கள்',
    navRepeats: '10 ஆண்டு வினாக்கள்',
    navPredictor: 'எதிர்காலத் தேர்வு கணிப்பு',
    navAnalytics: 'பகுப்பாய்வு',
    navProfile: 'சுயவிவரம்',
    tagline: 'Learn Smart. Play Hard. Rank Higher.',
    welcomeSub: 'உங்கள் SSC CGL Tier 1 & Tier 2 தயாரிப்பு மையம்',
    currentXp: 'மொத்த புள்ளிகள்',
    streakDays: 'தொடர் நாட்கள்',
    dailyGoal: 'இன்றைய படிப்பு இலக்கு',
    continueLearning: 'தொடர்ந்து கற்க',
    resumeVideo: 'கடைசி பாடத்தைத் தொடரவும்',
    dailyQuiz: 'தினசரி வினாடி வினா',
    quickPractice: 'விரைவு பயிற்சி',
    aiTutorShortcut: 'Examora AI-யிடம் கேட்க',
    tier1Progress: 'Tier 1 தயார்நிலை',
    tier2Progress: 'Tier 2 தயார்நிலை',
    latestMockScore: 'சமீபத்திய மாதிரி மதிப்பெண்',
    subjectPerformance: 'பாடவாரியான செயல்திறன்',
    todaysPlan: 'இன்றைய படிப்புத் திட்டம்',
    leaderboardPreview: 'முன்னணி மாணவர்கள்',
    videosTab: 'வீடியோ பாடங்கள்',
    syllabusTab: 'பாடத்திட்டம்',
    pyqTab: 'முந்தைய ஆண்டு வினாக்கள்',
    practiceTab: 'தலைப்பு பயிற்சி',
    mockTestsTab: 'மாதிரி தேர்வுகள்',
    gamesTab: 'கற்றல் விளையாட்டுகள்',
    gameCenterTitle: 'SSC CGL கற்றல் விளையாட்டுகள்',
    gameCenterSub: 'விளையாட்டுகள் மூலம் வேகத்தையும் துல்லியத்தையும் உயர்த்துங்கள்.',
    tutorTitle: 'Examora AI ஆசிரியர்',
    tutorPlaceholder: 'SSC CGL சந்தேகங்களைத் தமிழிலோ ஆங்கிலத்திலோ கேளுங்கள்...',
    sendBtn: 'அனுப்பு',
    clearChat: 'அரட்டையை அழி',
    studyPlanner: 'ஸ்மார்ட் படிப்புத் திட்டம்',
    analyticsTitle: 'செயல்திறன் பகுப்பாய்வு',
    adminPanel: 'நிர்வாகப் பலகம்',
    settingsTitle: 'அமைப்புகள் & அறிவிப்புகள்',
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
