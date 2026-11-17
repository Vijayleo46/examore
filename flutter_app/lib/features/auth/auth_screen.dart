import 'dart:async';
import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';
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
  _AuthMode _mode = _AuthMode.login;
  final _formKey = GlobalKey<FormState>();

  final _usernameCtrl = TextEditingController();
  final _fullNameCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _identifierCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();

  bool _loading = false;
  bool? _usernameAvailable;
  bool _checkingUsername = false;
  Timer? _debounce;
  String? _errorMsg;
  String? _successMsg;

  @override
  void dispose() {
    _debounce?.cancel();
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
          throw Exception('Username is already taken.');
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
              'Password reset instructions were sent to your registered email.';
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
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 460),
            child: Card(
              child: Padding(
                padding: const EdgeInsets.all(28),
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Row(
                        children: [
                          Container(
                            width: 44,
                            height: 44,
                            decoration: BoxDecoration(
                              color: ExamoraColors.navy,
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: const Icon(Icons.school, color: Colors.white),
                          ),
                          const SizedBox(width: 12),
                          const Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Examora',
                                style: TextStyle(
                                  fontSize: 20,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                              Text(
                                'SSC CGL AI Academy',
                                style: TextStyle(
                                  fontSize: 12,
                                  color: ExamoraColors.textMuted,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                      const SizedBox(height: 24),
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
                      const SizedBox(height: 20),
                      if (_mode == _AuthMode.register) ...[
                        TextFormField(
                          controller: _usernameCtrl,
                          onChanged: _onUsernameChanged,
                          decoration: InputDecoration(
                            labelText: 'Unique Username',
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
                                    ? const Icon(Icons.check_circle, color: Colors.green)
                                    : _usernameAvailable == false
                                        ? const Icon(Icons.cancel, color: Colors.red)
                                        : null,
                            border: const OutlineInputBorder(),
                          ),
                          validator: (v) {
                            if (v == null || !widget.authService.isValidUsernameFormat(v)) {
                              return '3–32 chars: letters, numbers, _ or -';
                            }
                            if (_usernameAvailable == false) {
                              return 'Username already taken';
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
                            border: OutlineInputBorder(),
                          ),
                          validator: (v) =>
                              (v == null || v.trim().isEmpty) ? 'Enter your full name' : null,
                        ),
                        const SizedBox(height: 14),
                        TextFormField(
                          controller: _emailCtrl,
                          keyboardType: TextInputType.emailAddress,
                          decoration: const InputDecoration(
                            labelText: 'Email Address',
                            prefixIcon: Icon(Icons.mail_outline),
                            border: OutlineInputBorder(),
                          ),
                          validator: (v) =>
                              (v == null || !v.contains('@')) ? 'Enter a valid email' : null,
                        ),
                      ] else ...[
                        TextFormField(
                          controller: _identifierCtrl,
                          decoration: const InputDecoration(
                            labelText: 'Username or Email',
                            prefixIcon: Icon(Icons.person_outline),
                            border: OutlineInputBorder(),
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
                          obscureText: true,
                          decoration: const InputDecoration(
                            labelText: 'Password',
                            prefixIcon: Icon(Icons.lock_outline),
                            border: OutlineInputBorder(),
                          ),
                          validator: (v) => (v == null || v.length < 6)
                              ? 'Minimum 6 characters required'
                              : null,
                        ),
                      ],
                      if (_errorMsg != null) ...[
                        const SizedBox(height: 14),
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.red.withValues(alpha: 0.08),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Text(
                            _errorMsg!,
                            style: const TextStyle(color: Colors.red, fontSize: 12),
                          ),
                        ),
                      ],
                      if (_successMsg != null) ...[
                        const SizedBox(height: 14),
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.green.withValues(alpha: 0.08),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Text(
                            _successMsg!,
                            style: const TextStyle(color: Colors.green, fontSize: 12),
                          ),
                        ),
                      ],
                      const SizedBox(height: 20),
                      FilledButton(
                        onPressed: _loading ? null : _submit,
                        style: FilledButton.styleFrom(
                          backgroundColor: ExamoraColors.navy,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                        ),
                        child: _loading
                            ? const SizedBox(
                                width: 18,
                                height: 18,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: Colors.white,
                                ),
                              )
                            : Text(
                                _mode == _AuthMode.login
                                    ? 'Sign In'
                                    : _mode == _AuthMode.register
                                        ? 'Create Student Account'
                                        : 'Send Reset Link',
                              ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
