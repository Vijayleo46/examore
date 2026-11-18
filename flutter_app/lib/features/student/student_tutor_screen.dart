import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/ocean_components.dart';
import '../../services/firestore_service.dart';
import 'student_i18n.dart';

class _TutorMessage {
  final bool isUser;
  final String text;
  final bool isError;

  const _TutorMessage({
    required this.isUser,
    required this.text,
    this.isError = false,
  });
}

class StudentTutorScreen extends StatefulWidget {
  final FirestoreService firestoreService;
  final String initialLanguage;
  final String? initialPrompt;
  final String? contextTopic;
  final VoidCallback onGoHome;

  const StudentTutorScreen({
    super.key,
    required this.firestoreService,
    required this.initialLanguage,
    required this.onGoHome,
    this.initialPrompt,
    this.contextTopic,
  });

  @override
  State<StudentTutorScreen> createState() => _StudentTutorScreenState();
}

class _StudentTutorScreenState extends State<StudentTutorScreen> {
  final _inputCtrl = TextEditingController();
  final _scrollCtrl = ScrollController();
  late String _language;
  bool _sending = false;
  String? _lastFailedPrompt;

  final List<_TutorMessage> _messages = [
    const _TutorMessage(
      isUser: false,
      text:
          'Hello! I am your Examora AI Study Mentor. Ask any Quantitative Aptitude, Reasoning, English, or General Awareness question in simple words—I will explain it step by step.',
    ),
  ];

  static const _starterPrompts = [
    'Explain Profit & Loss discount shortcut with 1 example',
    'How to solve Syllogism questions quickly without mistakes?',
    'Give me 5 important Constitutional Amendments for SSC CGL',
    'Difference between Simple and Compound Interest for 2 years',
  ];

  @override
  void initState() {
    super.initState();
    _language = widget.initialLanguage;
    if (widget.initialPrompt != null && widget.initialPrompt!.trim().isNotEmpty) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _sendMessage(widget.initialPrompt!);
      });
    }
  }

  @override
  void dispose() {
    _inputCtrl.dispose();
    _scrollCtrl.dispose();
    super.dispose();
  }

  Future<void> _sendMessage(String text) async {
    final clean = text.trim();
    if (clean.isEmpty || _sending) return;

    setState(() {
      _messages.add(_TutorMessage(isUser: true, text: clean));
      _sending = true;
      _lastFailedPrompt = null;
      _inputCtrl.clear();
    });
    _scrollToBottom();

    try {
      final reply = await widget.firestoreService.askAiTutor(
        message: clean,
        language: _language,
        contextTopic: widget.contextTopic,
      );
      if (mounted) {
        setState(() {
          _messages.add(_TutorMessage(isUser: false, text: reply));
          _sending = false;
        });
        _scrollToBottom();
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _lastFailedPrompt = clean;
          _messages.add(
            const _TutorMessage(
              isUser: false,
              text: 'Unable to reach the study mentor right now. Please tap Retry.',
              isError: true,
            ),
          );
          _sending = false;
        });
        _scrollToBottom();
      }
    }
  }

  void _scrollToBottom() {
    Future.delayed(const Duration(milliseconds: 100), () {
      if (_scrollCtrl.hasClients) {
        _scrollCtrl.animateTo(
          _scrollCtrl.position.maxScrollExtent,
          duration: const Duration(milliseconds: 240),
          curve: Curves.easeOut,
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'Examora AI Mentor',
          style: TextStyle(fontWeight: FontWeight.w800),
        ),
        actions: [
          DropdownButtonHideUnderline(
            child: DropdownButton<String>(
              value: _language,
              items: const [
                DropdownMenuItem(value: 'en', child: Text('English')),
                DropdownMenuItem(value: 'ml', child: Text('Malayalam')),
                DropdownMenuItem(value: 'hi', child: Text('Hindi')),
                DropdownMenuItem(value: 'ta', child: Text('Tamil')),
              ],
              onChanged: (val) {
                if (val != null) setState(() => _language = val);
              },
            ),
          ),
          const SizedBox(width: 12),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
            child: OceanBackHomeBar(
              title: 'Language: ${StudentStrings.languageLabel(_language)}',
              onBack: () => Navigator.of(context).pop(),
              onHome: () {
                Navigator.of(context).pop();
                widget.onGoHome();
              },
            ),
          ),
          SizedBox(
            height: 44,
            child: ListView.separated(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              scrollDirection: Axis.horizontal,
              itemBuilder: (_, idx) => ActionChip(
                backgroundColor: OceanColors.turquoise.withValues(alpha: 0.14),
                side: const BorderSide(color: OceanColors.seaGlass),
                label: Text(
                  _starterPrompts[idx],
                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                ),
                onPressed: () => _sendMessage(_starterPrompts[idx]),
              ),
              separatorBuilder: (_, __) => const SizedBox(width: 8),
              itemCount: _starterPrompts.length,
            ),
          ),
          const SizedBox(height: 8),
          Expanded(
            child: ListView.builder(
              controller: _scrollCtrl,
              padding: const EdgeInsets.all(16),
              itemCount: _messages.length + (_sending ? 1 : 0),
              itemBuilder: (_, idx) {
                if (idx >= _messages.length) {
                  return const Align(
                    alignment: Alignment.centerLeft,
                    child: Padding(
                      padding: EdgeInsets.symmetric(vertical: 8),
                      child: OceanGlassCard(
                        padding: EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            SizedBox(
                              width: 14,
                              height: 14,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: OceanColors.turquoise,
                              ),
                            ),
                            SizedBox(width: 10),
                            Text('Preparing simple explanation...'),
                          ],
                        ),
                      ),
                    ),
                  );
                }

                final m = _messages[idx];
                return Align(
                  alignment:
                      m.isUser ? Alignment.centerRight : Alignment.centerLeft,
                  child: Container(
                    constraints: const BoxConstraints(maxWidth: 340),
                    margin: const EdgeInsets.only(bottom: 10),
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: m.isUser
                          ? OceanColors.oceanBlue
                          : (m.isError
                              ? OceanColors.coralAccent.withValues(alpha: 0.15)
                              : OceanColors.pureWhite),
                      borderRadius: BorderRadius.circular(16),
                      border: m.isUser
                          ? null
                          : Border.all(
                              color: m.isError
                                  ? OceanColors.coralAccent
                                  : OceanColors.borderLight,
                            ),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          m.text,
                          style: TextStyle(
                            color: m.isUser
                                ? OceanColors.pureWhite
                                : OceanColors.deepOcean,
                            fontSize: 13.5,
                            height: 1.45,
                          ),
                        ),
                        if (m.isError && _lastFailedPrompt != null) ...[
                          const SizedBox(height: 8),
                          OutlinedButton.icon(
                            onPressed: () => _sendMessage(_lastFailedPrompt!),
                            icon: const Icon(Icons.refresh, size: 16),
                            label: const Text('Retry'),
                          ),
                        ],
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
          SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _inputCtrl,
                      minLines: 1,
                      maxLines: 3,
                      textInputAction: TextInputAction.send,
                      onSubmitted: _sendMessage,
                      decoration: const InputDecoration(
                        hintText: 'Ask any SSC CGL doubt...',
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  FilledButton(
                    onPressed: _sending ? null : () => _sendMessage(_inputCtrl.text),
                    style: FilledButton.styleFrom(
                      minimumSize: const Size(52, 52),
                      padding: EdgeInsets.zero,
                    ),
                    child: const Icon(Icons.send_rounded),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
