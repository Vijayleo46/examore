import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_core/firebase_core.dart';
import '../firebase_options.dart';

enum AppUserRole { student, admin }

class AuthSessionState {
  final User? user;
  final AppUserRole role;
  final bool isActive;
  final String username;
  final String displayName;

  const AuthSessionState({
    required this.user,
    required this.role,
    required this.isActive,
    required this.username,
    required this.displayName,
  });

  bool get isAdmin => user != null && role == AppUserRole.admin;
}

class AuthService {
  final FirebaseAuth _auth = FirebaseAuth.instance;
  final FirebaseFirestore _db = FirebaseFirestore.instanceFor(
    app: Firebase.app(),
    databaseId: DefaultFirebaseOptions.firestoreDatabaseId,
  );
  final FirebaseFunctions _functions = FirebaseFunctions.instance;

  static final RegExp _usernamePattern = RegExp(r'^[a-zA-Z0-9_-]{3,32}$');

  Stream<User?> get authStateChanges => _auth.authStateChanges();
  User? get currentUser => _auth.currentUser;

  bool isValidUsernameFormat(String raw) {
    return _usernamePattern.hasMatch(raw.trim());
  }

  Future<bool> checkUsernameAvailable(String username) async {
    final lower = username.trim().toLowerCase();
    if (!isValidUsernameFormat(lower)) return false;
    final snap = await _db.collection('usernames').doc(lower).get();
    return !snap.exists;
  }

  /// Server-verified authorization check: attempts to read /adminMeta/access
  /// which is strictly protected by Firestore Security Rules `isAdmin()`.
  Future<bool> verifyServerAdminAccess() async {
    final user = _auth.currentUser;
    if (user == null || !user.emailVerified) return false;
    try {
      await _db
          .collection('adminMeta')
          .doc('access')
          .get(const GetOptions(source: Source.server));
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<AuthSessionState> resolveCurrentSession() async {
    final user = _auth.currentUser;
    if (user == null) {
      return const AuthSessionState(
        user: null,
        role: AppUserRole.student,
        isActive: true,
        username: '',
        displayName: '',
      );
    }

    final isAdmin = await verifyServerAdminAccess();
    final userSnap = await _db.collection('users').doc(user.uid).get();
    final data = userSnap.data() ?? <String, dynamic>{};

    return AuthSessionState(
      user: user,
      role: isAdmin ? AppUserRole.admin : AppUserRole.student,
      isActive: data['isActive'] != false,
      username: (data['username'] ?? '').toString(),
      displayName: (data['displayName'] ?? user.displayName ?? 'Aspirant').toString(),
    );
  }

  /// Registers a student account with unique username validation.
  /// Always sets role = 'student' and isActive = true (never allows self-assigned admin).
  Future<UserCredential> registerStudent({
    required String username,
    required String fullName,
    required String email,
    required String password,
    String preferredLanguage = 'en',
  }) async {
    final cleanUsername = username.trim();
    final lowerUsername = cleanUsername.toLowerCase();

    if (!isValidUsernameFormat(cleanUsername)) {
      throw FirebaseAuthException(
        code: 'invalid-username',
        message: 'Username must be 3–32 characters using letters, numbers, _ or -.',
      );
    }

    final available = await checkUsernameAvailable(lowerUsername);
    if (!available) {
      throw FirebaseAuthException(
        code: 'username-already-in-use',
        message: 'This username is already taken. Please choose another.',
      );
    }

    final cred = await _auth.createUserWithEmailAndPassword(
      email: email.trim(),
      password: password,
    );

    final user = cred.user!;
    await user.updateDisplayName(fullName.trim());

    final nowIso = DateTime.now().toUtc().toIso8601String();
    final batch = _db.batch();

    // Reserve unique username without storing email PII
    batch.set(_db.collection('usernames').doc(lowerUsername), {
      'uid': user.uid,
      'username': cleanUsername,
      'createdAt': nowIso,
    });

    // Create student profile strictly with role: 'student'
    batch.set(_db.collection('users').doc(user.uid), {
      'uid': user.uid,
      'username': cleanUsername,
      'usernameLower': lowerUsername,
      'displayName': fullName.trim(),
      'fullName': fullName.trim(),
      'email': email.trim().toLowerCase(),
      'preferredLanguage': preferredLanguage,
      'targetPost': 'Income Tax Inspector (CBDT)',
      'dailyGoalMinutes': 90,
      'xp': 0,
      'totalPoints': 0,
      'coins': 50,
      'streak': 1,
      'dailyStreak': 1,
      'totalStudyHours': 0.0,
      'mockTestsCompleted': 0,
      'questionsAttempted': 0,
      'questionsCorrect': 0,
      'subjectStats': {
        'quant': {'attempted': 0, 'correct': 0},
        'reasoning': {'attempted': 0, 'correct': 0},
        'english': {'attempted': 0, 'correct': 0},
        'ga': {'attempted': 0, 'correct': 0},
        'computer': {'attempted': 0, 'correct': 0},
      },
      'completedLessons': <String>[],
      'earnedBadges': <String>[],
      'level': 'Beginner',
      'role': 'student',
      'isActive': true,
      'createdAt': nowIso,
      'lastLogin': nowIso,
      'updatedAt': nowIso,
    });

    await batch.commit();
    await user.sendEmailVerification();
    return cred;
  }

  /// Signs in using username (resolved via Cloud Function) or email + password.
  Future<UserCredential> signInWithUsernameOrEmail({
    required String identifier,
    required String password,
  }) async {
    final trimmed = identifier.trim();
    String emailToUse = trimmed;

    if (!trimmed.contains('@')) {
      final callable = _functions.httpsCallable('resolveUsernameEmail');
      final result = await callable.call({'username': trimmed.toLowerCase()});
      final data = Map<String, dynamic>.from(result.data as Map);
      emailToUse = (data['email'] ?? '').toString();
      if (emailToUse.isEmpty) {
        throw FirebaseAuthException(
          code: 'user-not-found',
          message: 'Invalid username or password.',
        );
      }
    }

    final cred = await _auth.signInWithEmailAndPassword(
      email: emailToUse,
      password: password,
    );

    if (cred.user != null) {
      await _db.collection('users').doc(cred.user!.uid).set({
        'lastLogin': DateTime.now().toUtc().toIso8601String(),
        'updatedAt': DateTime.now().toUtc().toIso8601String(),
      }, SetOptions(merge: true));
    }

    return cred;
  }

  Future<void> sendPasswordReset(String identifier) async {
    final trimmed = identifier.trim();
    String emailToUse = trimmed;
    if (!trimmed.contains('@')) {
      final callable = _functions.httpsCallable('resolveUsernameEmail');
      final result = await callable.call({'username': trimmed.toLowerCase()});
      final data = Map<String, dynamic>.from(result.data as Map);
      emailToUse = (data['email'] ?? '').toString();
    }
    if (emailToUse.isEmpty) {
      throw FirebaseAuthException(
        code: 'user-not-found',
        message: 'No account found for that username or email.',
      );
    }
    await _auth.sendPasswordResetEmail(email: emailToUse);
  }

  Future<void> signOut() async {
    await _auth.signOut();
  }
}
