import 'dart:async';
import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/ocean_components.dart';
import '../../services/auth_service.dart';

class AuthScreen extends StatefulWidget {
  final AuthService authService;
  final VoidCallback onAuthenticated;

  const AuthScreen({
    super.key,
    required this.authService,
    required this.onAuthenticated,
  });

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

enum _AuthMode { login, register, reset }

class _AuthScreenState extends State<AuthScreen> {
  bool _showOnboarding = true;
  int _onboardingPage = 0;
  final _pageCtrl = PageController();

  _AuthMode _mode = _AuthMode.login;
  final _formKey = GlobalKey<FormState>();

  final _usernameCtrl = TextEditingController();
  final _fullNameCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _identifierCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();

  bool _loading = false;
  bool _obscurePassword = true;
  bool? _usernameAvailable;
  bool _checkingUsername = false;
  Timer? _debounce;
  String? _errorMsg;
  String? _successMsg;

  static const _slides = [
    (
      title: 'Learn Simply, Step by Step',
      subtitle:
          'Master Quantitative Aptitude, Reasoning, English, and General Awareness with clear durations and resume-anytime video lessons.',
      icon: Icons.play_lesson_outlined,
    ),
    (
      title: 'Practice Without Stress',
      subtitle:
          'Solve 11 years of SSC CGL PYQs (2016–2026) and timed mock tests one question at a time with instant explanations.',
      icon: Icons.quiz_outlined,
    ),
    (
      title: 'Ask Examora AI Anytime',
      subtitle:
          'Get beginner-friendly step-by-step help in English, Malayalam, Hindi, or Tamil whenever you get stuck.',
      icon: Icons.auto_awesome_outlined,
    ),
  ];

  @override
  void dispose() {
    _debounce?.cancel();
    _pageCtrl.dispose();
    _usernameCtrl.dispose();
    _fullNameCtrl.dispose();
    _emailCtrl.dispose();
    _identifierCtrl.dispose();
    _passwordCtrl.dispose();
    super.dispose();
  }

  void _onUsernameChanged(String value) {
    _debounce?.cancel();
    final trimmed = value.trim();
    if (trimmed.isEmpty || !widget.authService.isValidUsernameFormat(trimmed)) {
      setState(() {
        _usernameAvailable = null;
        _checkingUsername = false;
      });
      return;
    }

    setState(() => _checkingUsername = true);
    _debounce = Timer(const Duration(milliseconds: 350), () async {
      final ok = await widget.authService.checkUsernameAvailable(trimmed);
      if (mounted) {
        setState(() {
          _usernameAvailable = ok;
          _checkingUsername = false;
        });
      }
    });
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _loading = true;
      _errorMsg = null;
      _successMsg = null;
    });

    try {
      if (_mode == _AuthMode.login) {
        await widget.authService.signInWithUsernameOrEmail(
          identifier: _identifierCtrl.text,
          password: _passwordCtrl.text,
        );
        widget.onAuthenticated();
      } else if (_mode == _AuthMode.register) {
        if (_usernameAvailable == false) {
          throw Exception('That username is already taken. Please try another.');
        }
        await widget.authService.registerStudent(
          username: _usernameCtrl.text,
          fullName: _fullNameCtrl.text,
          email: _emailCtrl.text,
          password: _passwordCtrl.text,
        );
        widget.onAuthenticated();
      } else {
        await widget.authService.sendPasswordReset(_identifierCtrl.text);
        setState(() {
          _successMsg =
              'Password reset link sent! Please check your inbox and follow the steps.';
        });
      }
    } catch (e) {
      setState(() {
        _errorMsg = e.toString().replaceFirst('Exception: ', '');
      });
    } finally {
      if (mounted) setState(() => _loading = false);
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
                  padding: const EdgeInsets.all(20),
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 460),
                    child: _showOnboarding
                        ? _buildOnboardingCard()
                        : _buildAuthCard(),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildOnboardingCard() {
    return OceanGlassCard(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [OceanColors.turquoise, OceanColors.aqua],
                  ),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: const Icon(Icons.waves_rounded, color: OceanColors.deepOcean),
              ),
              const SizedBox(width: 12),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Examora',
                      style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
                    ),
                    Text(
                      'Learn Smart. Play Hard. Rank Higher.',
                      style: TextStyle(fontSize: 12, color: OceanColors.textMuted),
                    ),
                  ],
                ),
              ),
              TextButton(
                onPressed: () => setState(() => _showOnboarding = false),
                child: const Text('Skip'),
              ),
            ],
          ),
          const SizedBox(height: 20),
          SizedBox(
            height: 230,
            child: PageView.builder(
              controller: _pageCtrl,
              itemCount: _slides.length,
              onPageChanged: (i) => setState(() => _onboardingPage = i),
              itemBuilder: (_, idx) {
                final slide = _slides[idx];
                return OceanWaveHeaderCard(
                  padding: const EdgeInsets.all(22),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        width: 48,
                        height: 48,
                        decoration: BoxDecoration(
                          color: OceanColors.turquoise.withValues(alpha: 0.2),
                          borderRadius: BorderRadius.circular(14),
                        ),
                        child: Icon(slide.icon, color: OceanColors.aqua, size: 26),
                      ),
                      const SizedBox(height: 16),
                      Text(
                        slide.title,
                        style: const TextStyle(
                          color: OceanColors.foamWhite,
                          fontSize: 19,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        slide.subtitle,
                        style: const TextStyle(
                          color: OceanColors.seaGlass,
                          fontSize: 13,
                          height: 1.4,
                        ),
                      ),
                    ],
                  ),
                );
              },
            ),
          ),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(_slides.length, (i) {
              final active = i == _onboardingPage;
              return AnimatedContainer(
                duration: const Duration(milliseconds: 220),
                margin: const EdgeInsets.symmetric(horizontal: 4),
                width: active ? 24 : 8,
                height: 8,
                decoration: BoxDecoration(
                  color: active ? OceanColors.turquoise : OceanColors.borderLight,
                  borderRadius: BorderRadius.circular(99),
                ),
              );
            }),
          ),
          const SizedBox(height: 20),
          Row(
            children: [
              if (_onboardingPage > 0)
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => _pageCtrl.previousPage(
                      duration: const Duration(milliseconds: 250),
                      curve: Curves.easeOut,
                    ),
                    child: const Text('Previous'),
                  ),
                ),
              if (_onboardingPage > 0) const SizedBox(width: 10),
              Expanded(
                flex: 2,
                child: FilledButton(
                  onPressed: () {
                    if (_onboardingPage < _slides.length - 1) {
                      _pageCtrl.nextPage(
                        duration: const Duration(milliseconds: 250),
                        curve: Curves.easeOut,
                      );
                    } else {
                      setState(() => _showOnboarding = false);
                    }
                  },
                  child: Text(
                    _onboardingPage < _slides.length - 1
                        ? 'Next'
                        : 'Start Learning',
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildAuthCard() {
    return OceanGlassCard(
      padding: const EdgeInsets.all(26),
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Container(
                  width: 46,
                  height: 46,
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [OceanColors.oceanBlue, OceanColors.turquoise],
                    ),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: const Icon(Icons.waves_rounded, color: Colors.white),
                ),
                const SizedBox(width: 12),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Examora',
                        style: TextStyle(fontSize: 21, fontWeight: FontWeight.w800),
                      ),
                      Text(
                        'Learn Smart. Play Hard. Rank Higher.',
                        style: TextStyle(fontSize: 12, color: OceanColors.textMuted),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  onPressed: () => setState(() => _showOnboarding = true),
                  tooltip: 'How Examora Works',
                  icon: const Icon(Icons.help_outline, color: OceanColors.oceanBlue),
                ),
              ],
            ),
            const SizedBox(height: 22),
            SegmentedButton<_AuthMode>(
              segments: const [
                ButtonSegment(value: _AuthMode.login, label: Text('Sign In')),
                ButtonSegment(value: _AuthMode.register, label: Text('Register')),
                ButtonSegment(value: _AuthMode.reset, label: Text('Reset')),
              ],
              selected: {_mode},
              onSelectionChanged: (sel) {
                setState(() {
                  _mode = sel.first;
                  _errorMsg = null;
                  _successMsg = null;
                });
              },
            ),
            const SizedBox(height: 18),
            if (_mode == _AuthMode.register) ...[
              TextFormField(
                controller: _usernameCtrl,
                onChanged: _onUsernameChanged,
                decoration: InputDecoration(
                  labelText: 'Choose a Username',
                  helperText: 'Example: arjun_ssc (3–32 characters)',
                  prefixIcon: const Icon(Icons.alternate_email),
                  suffixIcon: _checkingUsername
                      ? const Padding(
                          padding: EdgeInsets.all(12),
                          child: SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          ),
                        )
                      : _usernameAvailable == true
                          ? const Icon(Icons.check_circle, color: OceanColors.emerald)
                          : _usernameAvailable == false
                              ? const Icon(Icons.cancel, color: OceanColors.coralAccent)
                              : null,
                ),
                validator: (v) {
                  if (v == null || !widget.authService.isValidUsernameFormat(v)) {
                    return 'Use 3–32 letters, numbers, _ or -';
                  }
                  if (_usernameAvailable == false) {
                    return 'This username is already taken';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 14),
              TextFormField(
                controller: _fullNameCtrl,
                decoration: const InputDecoration(
                  labelText: 'Full Name',
                  prefixIcon: Icon(Icons.person_outline),
                ),
                validator: (v) =>
                    (v == null || v.trim().isEmpty) ? 'Please enter your full name' : null,
              ),
              const SizedBox(height: 14),
              TextFormField(
                controller: _emailCtrl,
                keyboardType: TextInputType.emailAddress,
                decoration: const InputDecoration(
                  labelText: 'Email Address',
                  prefixIcon: Icon(Icons.mail_outline),
                ),
                validator: (v) =>
                    (v == null || !v.contains('@')) ? 'Please enter a valid email' : null,
              ),
            ] else ...[
              TextFormField(
                controller: _identifierCtrl,
                decoration: const InputDecoration(
                  labelText: 'Username or Email',
                  prefixIcon: Icon(Icons.person_outline),
                ),
                validator: (v) => (v == null || v.trim().isEmpty)
                    ? 'Enter your username or email'
                    : null,
              ),
            ],
            if (_mode != _AuthMode.reset) ...[
              const SizedBox(height: 14),
              TextFormField(
                controller: _passwordCtrl,
                obscureText: _obscurePassword,
                decoration: InputDecoration(
                  labelText: 'Password',
                  prefixIcon: const Icon(Icons.lock_outline),
                  suffixIcon: IconButton(
                    onPressed: () =>
                        setState(() => _obscurePassword = !_obscurePassword),
                    icon: Icon(
                      _obscurePassword
                          ? Icons.visibility_outlined
                          : Icons.visibility_off_outlined,
                    ),
                  ),
                ),
                validator: (v) => (v == null || v.length < 6)
                    ? 'Password must be at least 6 characters'
                    : null,
              ),
            ],
            if (_errorMsg != null) ...[
              const SizedBox(height: 14),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: OceanColors.coralAccent.withValues(alpha: 0.14),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: OceanColors.coralAccent.withValues(alpha: 0.4),
                  ),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.error_outline,
                        color: OceanColors.coralAccent, size: 18),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        _errorMsg!,
                        style: const TextStyle(
                          color: OceanColors.deepOcean,
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
            if (_successMsg != null) ...[
              const SizedBox(height: 14),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: OceanColors.emerald.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.check_circle_outline,
                        color: OceanColors.emerald, size: 18),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        _successMsg!,
                        style: const TextStyle(
                          color: OceanColors.deepOcean,
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
            const SizedBox(height: 20),
            FilledButton(
              onPressed: _loading ? null : _submit,
              child: _loading
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : Text(
                      _mode == _AuthMode.login
                          ? 'Sign In to Examora'
                          : _mode == _AuthMode.register
                              ? 'Create Student Account'
                              : 'Send Reset Link',
                    ),
            ),
          ],
        ),
      ),
    );
  }
}
