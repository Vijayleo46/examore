# Changelog

All notable changes to **Examora (SSC CGL AI Academy)** are documented in this file.

## [1.1.0+2] — Release Readiness & Full Integration Update

### Added
- **Complete SSC CGL Master Syllabus & Progress Tracking**: All 6 SSC CGL subjects (Quantitative Aptitude, General Intelligence & Reasoning, English Language, General Awareness, Computer Knowledge Tier 2, Statistics JSO Paper II) with live syllabus completion percentage, per-topic completion toggles persisted to `userProgress/{uid}`, and `Weak · Needs Revision` mastery badges.
- **Topic-Filtered Practice, Daily Quiz & Revision Queue**:
  - Dedicated **Daily Quiz** mode (10 questions, timed, `+2 / -0.5` SSC CGL scoring, speed `sec/Q`, and review sheet).
  - Topic dropdown filter combining master syllabus topics and archive topics.
  - **Wrong-Answer Revision Queue** filter & automatic persistence of missed questions from Practice, Daily Quiz, Mock Tests, and AI Tutor checks.
- **Offline-Resilient Instant PYQ Mock Generator**: Launch balanced 25-question Tier 1 and 30-question Tier 2 mocks directly from bundled 2016–2026 PYQs anytime, alongside teacher-published Firestore mock tests.
- **Persistent AI Personal Teacher**:
  - Added **Manglish** language support alongside English, Malayalam, Hindi, and Tamil across Profile settings, Firestore rules/schema, Cloud Functions, and AI Tutor.
  - Persisted AI chat history (`aiTutorChats/{uid}/messages` + local cache), inline interactive Quick Check MCQ card, automatic wrong-answer **Mistake Analysis** (`revision` mode), and adaptive difficulty progression (`Easy -> Medium -> Exam Level`).
- **Release Android Build Configuration**:
  - Configured ProGuard/R8 optimization (`isMinifyEnabled = true`, `isShrinkResources = true`), core library desugaring for `flutter_local_notifications`, notification/boot permissions in `AndroidManifest.xml`, `MainActivity.kt`, and optional release `key.properties` signing.

### Fixed
- **Verified Account Registration Flow**: Resolved unverified registration `PERMISSION_DENIED` issues by reserving `/usernames/{username}`, persisting pending profile setup, enforcing email verification before completing `/users/{uid}`, `/userProgress/{uid}`, and `/leaderboards/{uid}`, and providing user-friendly auth error messages.
- **Verified Question Bank Integrity**: Deduplicated 324 authentic PYQs (`sourceType == 'PYQ'`) by ID and normalized question text, and strictly separated `AI_GENERATED` expected practice items into `assets/data/ai_generated_practice.json`.
- **Clean Account Switch & Draft Persistence**: Reset user-scoped cached state cleanly on sign-out/UID change and persisted in-progress mock test drafts to `SharedPreferences`.
