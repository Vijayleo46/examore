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
