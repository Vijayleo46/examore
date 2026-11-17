import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'core/theme/app_theme.dart';
import 'features/admin/admin_shell.dart';
import 'features/auth/auth_screen.dart';
import 'features/student/student_shell.dart';
import 'firebase_options.dart';
import 'services/auth_service.dart';
import 'services/firestore_service.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp(
    options: DefaultFirebaseOptions.currentPlatform,
  );
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
              loading: () => const Scaffold(
                backgroundColor: ExamoraColors.navy,
                body: Center(
                  child: CircularProgressIndicator(color: Colors.white),
                ),
              ),
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
                    body: Center(
                      child: Padding(
                        padding: const EdgeInsets.all(24),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.block, size: 48, color: Colors.red),
                            const SizedBox(height: 12),
                            const Text(
                              'Account Deactivated',
                              style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                            const SizedBox(height: 8),
                            const Text(
                              'Contact your academy administrator to restore access.',
                              textAlign: TextAlign.center,
                            ),
                            const SizedBox(height: 16),
                            FilledButton(
                              onPressed: () async {
                                await authService.signOut();
                                ref.invalidate(authSessionProvider);
                              },
                              child: const Text('Sign Out'),
                            ),
                          ],
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
      title: 'Examora — SSC CGL AI Academy',
      debugShowCheckedModeBanner: false,
      theme: ExamoraTheme.light(),
      darkTheme: ExamoraTheme.dark(),
      routerConfig: router,
    );
  }
}
