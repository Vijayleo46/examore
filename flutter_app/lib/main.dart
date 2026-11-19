import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'core/theme/app_theme.dart';
import 'core/widgets/ocean_components.dart';
import 'features/admin/admin_shell.dart';
import 'features/auth/auth_screen.dart';
import 'features/student/student_shell.dart';
import 'firebase_options.dart';
import 'services/auth_service.dart';
import 'services/firestore_service.dart';
import 'services/local_notification_service.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp(
    options: DefaultFirebaseOptions.currentPlatform,
  );
  await LocalNotificationService.instance.initialize();
  runApp(const ProviderScope(child: ExamoraApp()));
}

final authServiceProvider = Provider<AuthService>((ref) => AuthService());
final firestoreServiceProvider =
    Provider<FirestoreService>((ref) => FirestoreService());

final authSessionProvider = FutureProvider<AuthSessionState>((ref) async {
  return ref.watch(authServiceProvider).resolveCurrentSession();
});

class ExamoraApp extends ConsumerWidget {
  const ExamoraApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final sessionAsync = ref.watch(authSessionProvider);
    final authService = ref.read(authServiceProvider);
    final firestoreService = ref.read(firestoreServiceProvider);

    final router = GoRouter(
      routes: [
        GoRoute(
          path: '/',
          builder: (context, state) {
            return sessionAsync.when(
              loading: () => const OceanSplashScreen(),
              error: (_, __) => AuthScreen(
                authService: authService,
                onAuthenticated: () => ref.invalidate(authSessionProvider),
              ),
              data: (session) {
                if (session.user == null) {
                  return AuthScreen(
                    authService: authService,
                    onAuthenticated: () => ref.invalidate(authSessionProvider),
                  );
                }

                // Email verification gate (matches Firestore isVerifiedUser() rules)
                if (!session.user!.emailVerified) {
                  return _OceanEmailVerificationGate(
                    email: session.user!.email ?? '',
                    displayName: session.displayName,
                    authService: authService,
                    onVerified: () => ref.invalidate(authSessionProvider),
                    onSignedOut: () => ref.invalidate(authSessionProvider),
                  );
                }

                // Strict server-verified Admin separation
                if (session.isAdmin) {
                  return AdminShell(
                    session: session,
                    authService: authService,
                    firestoreService: firestoreService,
                    onSignedOut: () => ref.invalidate(authSessionProvider),
                  );
                }

                // Account deactivation guard
                if (!session.isActive) {
                  return Scaffold(
                    body: Container(
                      decoration: const BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                          colors: [
                            OceanColors.deepOcean,
                            OceanColors.oceanNavy,
                          ],
                        ),
                      ),
                      child: Center(
                        child: Padding(
                          padding: const EdgeInsets.all(24),
                          child: ConstrainedBox(
                            constraints: const BoxConstraints(maxWidth: 420),
                            child: OceanGlassCard(
                              padding: const EdgeInsets.all(28),
                              child: Column(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Container(
                                    width: 60,
                                    height: 60,
                                    decoration: BoxDecoration(
                                      color: OceanColors.coralAccent
                                          .withValues(alpha: 0.16),
                                      borderRadius: BorderRadius.circular(18),
                                    ),
                                    child: const Icon(
                                      Icons.lock_person_outlined,
                                      size: 32,
                                      color: OceanColors.coralAccent,
                                    ),
                                  ),
                                  const SizedBox(height: 16),
                                  const Text(
                                    'Account Paused',
                                    style: TextStyle(
                                      fontSize: 20,
                                      fontWeight: FontWeight.w800,
                                    ),
                                  ),
                                  const SizedBox(height: 8),
                                  const Text(
                                    'Your learning access has been paused by your academy administrator. Please reach out to support to reactivate your account.',
                                    textAlign: TextAlign.center,
                                    style: TextStyle(
                                      color: OceanColors.textMuted,
                                      height: 1.4,
                                    ),
                                  ),
                                  const SizedBox(height: 20),
                                  SizedBox(
                                    width: double.infinity,
                                    child: FilledButton.icon(
                                      onPressed: () async {
                                        await authService.signOut();
                                        ref.invalidate(authSessionProvider);
                                      },
                                      icon: const Icon(Icons.logout),
                                      label: const Text('Sign Out'),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                  );
                }

                return StudentShell(
                  session: session,
                  authService: authService,
                  firestoreService: firestoreService,
                  onSignedOut: () => ref.invalidate(authSessionProvider),
                );
              },
            );
          },
        ),
      ],
    );

    return MaterialApp.router(
      title: 'Examora — Learn Smart. Play Hard. Rank Higher.',
      debugShowCheckedModeBanner: false,
      theme: ExamoraTheme.light(),
      darkTheme: ExamoraTheme.dark(),
      routerConfig: router,
    );
  }
}

class _OceanEmailVerificationGate extends StatefulWidget {
  final String email;
  final String displayName;
  final AuthService authService;
  final VoidCallback onVerified;
  final VoidCallback onSignedOut;

  const _OceanEmailVerificationGate({
    required this.email,
    required this.displayName,
    required this.authService,
    required this.onVerified,
    required this.onSignedOut,
  });

  @override
  State<_OceanEmailVerificationGate> createState() =>
      _OceanEmailVerificationGateState();
}

class _OceanEmailVerificationGateState
    extends State<_OceanEmailVerificationGate> {
  bool _checking = false;
  bool _resending = false;
  String? _statusMsg;
  bool _isError = false;

  Future<void> _checkVerified() async {
    setState(() {
      _checking = true;
      _statusMsg = null;
    });
    try {
      final verified = await widget.authService.reloadAndCheckVerified();
      if (!mounted) return;
      if (verified) {
        widget.onVerified();
      } else {
        setState(() {
          _isError = true;
          _statusMsg =
              'Verification not confirmed yet. Please open the link sent to ${widget.email} (check Spam too), then tap again.';
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isError = true;
          _statusMsg = widget.authService.friendlyErrorMessage(e);
        });
      }
    } finally {
      if (mounted) setState(() => _checking = false);
    }
  }

  Future<void> _resend() async {
    setState(() {
      _resending = true;
      _statusMsg = null;
    });
    try {
      await widget.authService.resendVerificationEmail();
      if (mounted) {
        setState(() {
          _isError = false;
          _statusMsg =
              'Fresh verification link sent to ${widget.email}! Please check your inbox.';
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isError = true;
          _statusMsg = widget.authService.friendlyErrorMessage(e);
        });
      }
    } finally {
      if (mounted) setState(() => _resending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              OceanColors.deepOcean,
              OceanColors.oceanNavy,
              OceanColors.oceanBlue,
            ],
          ),
        ),
        child: Stack(
          children: [
            const Positioned.fill(
              child: CustomPaint(
                painter: OceanWavePainter(waveColor: OceanColors.aqua),
              ),
            ),
            SafeArea(
              child: Center(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(24),
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 440),
                    child: OceanGlassCard(
                      padding: const EdgeInsets.all(28),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Center(
                            child: Container(
                              width: 64,
                              height: 64,
                              decoration: BoxDecoration(
                                gradient: const LinearGradient(
                                  colors: [
                                    OceanColors.turquoise,
                                    OceanColors.aqua,
                                  ],
                                ),
                                borderRadius: BorderRadius.circular(20),
                              ),
                              child: const Icon(
                                Icons.mark_email_read_outlined,
                                color: OceanColors.deepOcean,
                                size: 32,
                              ),
                            ),
                          ),
                          const SizedBox(height: 18),
                          Text(
                            'Verify Your Email, ${widget.displayName}',
                            textAlign: TextAlign.center,
                            style: const TextStyle(
                              fontSize: 21,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                          const SizedBox(height: 10),
                          Text(
                            'We sent a verification link to ${widget.email}. Tap that link to activate your Examora SSC CGL cloud sync and progress.',
                            textAlign: TextAlign.center,
                            style: const TextStyle(
                              color: OceanColors.textMuted,
                              fontSize: 13.5,
                              height: 1.45,
                            ),
                          ),
                          if (_statusMsg != null) ...[
                            const SizedBox(height: 14),
                            Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: (_isError
                                        ? OceanColors.coralAccent
                                        : OceanColors.emerald)
                                    .withValues(alpha: 0.14),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Text(
                                _statusMsg!,
                                textAlign: TextAlign.center,
                                style: const TextStyle(
                                  fontSize: 12.5,
                                  fontWeight: FontWeight.w600,
                                  color: OceanColors.deepOcean,
                                ),
                              ),
                            ),
                          ],
                          const SizedBox(height: 20),
                          FilledButton.icon(
                            onPressed: _checking ? null : _checkVerified,
                            icon: _checking
                                ? const SizedBox(
                                    width: 18,
                                    height: 18,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                      color: Colors.white,
                                    ),
                                  )
                                : const Icon(Icons.verified_user_outlined),
                            label: Text(
                              _checking
                                  ? 'Checking Status...'
                                  : "I've Verified My Email",
                            ),
                          ),
                          const SizedBox(height: 10),
                          OutlinedButton.icon(
                            onPressed: _resending ? null : _resend,
                            icon: const Icon(Icons.send_outlined, size: 18),
                            label: Text(
                              _resending
                                  ? 'Sending Link...'
                                  : 'Resend Verification Email',
                            ),
                          ),
                          const SizedBox(height: 8),
                          TextButton.icon(
                            onPressed: () async {
                              await widget.authService.signOut();
                              widget.onSignedOut();
                            },
                            icon: const Icon(Icons.logout, size: 18),
                            label: const Text('Use Different Account / Sign Out'),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
