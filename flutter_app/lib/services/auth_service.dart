import 'dart:convert';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:shared_preferences/shared_preferences.dart';
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
  static String _pendingRegKey(String uid) => 'examora_pending_reg_$uid';

  Stream<User?> get authStateChanges => _auth.authStateChanges();
  User? get currentUser => _auth.currentUser;

  bool isValidUsernameFormat(String raw) {
    return _usernamePattern.hasMatch(raw.trim());
  }

  String friendlyErrorMessage(Object error) {
    if (error is FirebaseAuthException) {
      switch (error.code) {
        case 'email-already-in-use':
          return 'This email is already registered. Please sign in instead.';
        case 'invalid-email':
          return 'Please enter a valid email address.';
        case 'weak-password':
          return 'Password is too weak. Use at least 6 characters.';
        case 'user-not-found':
        case 'wrong-password':
        case 'invalid-credential':
          return 'Invalid username/email or password. Please check and try again.';
        case 'username-already-in-use':
          return 'This username is already taken. Please choose another.';
        case 'invalid-username':
          return error.message ??
              'Username must be 3–32 characters using letters, numbers, _ or -.';
        case 'too-many-requests':
          return 'Too many attempts. Please wait a moment and try again.';
        case 'network-request-failed':
          return 'Network issue detected. Please check your internet connection and retry.';
        default:
          return error.message ?? 'Authentication failed. Please try again.';
      }
    }
    if (error is FirebaseFunctionsException) {
      return error.message ?? 'Unable to verify username right now.';
    }
    return error.toString().replaceFirst('Exception: ', '');
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

  Future<void> _savePendingProfile({
    required String uid,
    required String username,
    required String fullName,
    required String email,
    required String preferredLanguage,
  }) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(
        _pendingRegKey(uid),
        jsonEncode({
          'username': username,
          'fullName': fullName,
          'email': email,
          'preferredLanguage': preferredLanguage,
        }),
      );
    } catch (_) {}
  }

  Future<Map<String, dynamic>?> _readPendingProfile(String uid) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(_pendingRegKey(uid));
      if (raw != null && raw.isNotEmpty) {
        final decoded = jsonDecode(raw);
        if (decoded is Map) {
          return Map<String, dynamic>.from(decoded);
        }
      }
    } catch (_) {}
    return null;
  }

  Future<void> _clearPendingProfile(String uid) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(_pendingRegKey(uid));
    } catch (_) {}
  }

  /// Ensures /users/{uid}, /userProgress/{uid}, and /leaderboards/{uid} exist
  /// once the user's email has been verified (matching `isVerifiedUser()` in firestore.rules).
  Future<void> completeVerifiedProfileIfNeeded(User user) async {
    if (!user.emailVerified) return;
    final userRef = _db.collection('users').doc(user.uid);
    final snap = await userRef.get();
    final nowIso = DateTime.now().toUtc().toIso8601String();

    if (!snap.exists) {
      final pending = await _readPendingProfile(user.uid);
      final rawName = (pending?['fullName'] ?? user.displayName ?? 'Aspirant')
          .toString()
          .trim();
      final fullName = rawName.isEmpty ? 'Aspirant' : rawName;
      final cleanUsername = (pending?['username'] ?? '').toString().trim();
      final lowerUsername = cleanUsername.toLowerCase();
      final prefLang =
          (pending?['preferredLanguage'] ?? 'en').toString().trim();
      final validLang =
          ['en', 'ml', 'manglish', 'hi', 'ta'].contains(prefLang)
              ? prefLang
              : 'en';

      final batch = _db.batch();
      batch.set(userRef, {
        'uid': user.uid,
        if (cleanUsername.isNotEmpty) 'username': cleanUsername,
        if (lowerUsername.isNotEmpty) 'usernameLower': lowerUsername,
        'displayName': fullName,
        'fullName': fullName,
        'email': (user.email ?? pending?['email'] ?? '').toString().toLowerCase(),
        'preferredLanguage': validLang,
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
          'statistics': {'attempted': 0, 'correct': 0},
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

      final progressRef = _db.collection('userProgress').doc(user.uid);
      batch.set(progressRef, {
        'uid': user.uid,
        'completedLessonIds': <String>[],
        'completedTopics': <String>[],
        'totalStudyMinutes': 0,
        'lastStudiedAt': nowIso,
        'difficultQuestionIds': <String>[],
        'revisionListIds': <String>[],
        'pyqAttempts': <String, dynamic>{},
      });

      final lbRef = _db.collection('leaderboards').doc(user.uid);
      batch.set(lbRef, {
        'uid': user.uid,
        'displayName': fullName,
        'xp': 0,
        'streak': 1,
        'level': 'Beginner',
        'accuracy': 0,
        'updatedAt': nowIso,
      });

      await batch.commit();
      await _clearPendingProfile(user.uid);
    } else {
      await userRef.set({
        'lastLogin': nowIso,
        'updatedAt': nowIso,
      }, SetOptions(merge: true));
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

    try {
      await user.reload();
    } catch (_) {}
    final freshUser = _auth.currentUser ?? user;

    if (!freshUser.emailVerified) {
      final pending = await _readPendingProfile(freshUser.uid);
      return AuthSessionState(
        user: freshUser,
        role: AppUserRole.student,
        isActive: true,
        username: (pending?['username'] ?? '').toString(),
        displayName:
            (pending?['fullName'] ?? freshUser.displayName ?? 'Aspirant')
                .toString(),
      );
    }

    try {
      await completeVerifiedProfileIfNeeded(freshUser);
    } catch (_) {}

    final isAdmin = await verifyServerAdminAccess();
    Map<String, dynamic> data = {};
    try {
      final userSnap = await _db.collection('users').doc(freshUser.uid).get();
      data = userSnap.data() ?? <String, dynamic>{};
    } catch (_) {}

    return AuthSessionState(
      user: freshUser,
      role: isAdmin ? AppUserRole.admin : AppUserRole.student,
      isActive: data['isActive'] != false,
      username: (data['username'] ?? '').toString(),
      displayName:
          (data['displayName'] ?? freshUser.displayName ?? 'Aspirant')
              .toString(),
    );
  }

  /// Registers a student account with unique username reservation and email verification.
  /// Defers writing /users/{uid} until emailVerified == true so Firestore `isVerifiedUser()`
  /// rules are cleanly respected without PERMISSION_DENIED.
  Future<UserCredential> registerStudent({
    required String username,
    required String fullName,
    required String email,
    required String password,
    String preferredLanguage = 'en',
  }) async {
    final cleanUsername = username.trim();
    final lowerUsername = cleanUsername.toLowerCase();
    final cleanFullName = fullName.trim();
    final cleanEmail = email.trim().toLowerCase();

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
      email: cleanEmail,
      password: password,
    );

    final user = cred.user!;
    await user.updateDisplayName(cleanFullName);

    final nowIso = DateTime.now().toUtc().toIso8601String();
    // Reserve unique username (/usernames only requires isSignedIn())
    await _db.collection('usernames').doc(lowerUsername).set({
      'uid': user.uid,
      'username': cleanUsername,
      'createdAt': nowIso,
    });

    await _savePendingProfile(
      uid: user.uid,
      username: cleanUsername,
      fullName: cleanFullName,
      email: cleanEmail,
      preferredLanguage: preferredLanguage,
    );

    await user.sendEmailVerification();
    return cred;
  }

  Future<void> resendVerificationEmail() async {
    final user = _auth.currentUser;
    if (user == null) {
      throw FirebaseAuthException(
        code: 'user-not-found',
        message: 'Please sign in first to resend verification.',
      );
    }
    await user.sendEmailVerification();
  }

  Future<bool> reloadAndCheckVerified() async {
    final user = _auth.currentUser;
    if (user == null) return false;
    await user.reload();
    final refreshed = _auth.currentUser;
    if (refreshed != null && refreshed.emailVerified) {
      await completeVerifiedProfileIfNeeded(refreshed);
      return true;
    }
    return false;
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

    if (cred.user != null && cred.user!.emailVerified) {
      await completeVerifiedProfileIfNeeded(cred.user!);
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
