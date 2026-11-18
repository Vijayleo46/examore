import 'dart:math' as math;
import 'dart:ui' show FontFeature;
import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

/// Custom painter rendering subtle layered ocean waves along the bottom edge.
class OceanWavePainter extends CustomPainter {
  final Color waveColor;
  final double phaseOffset;

  const OceanWavePainter({
    this.waveColor = OceanColors.aqua,
    this.phaseOffset = 0,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final paint1 = Paint()
      ..color = waveColor.withValues(alpha: 0.16)
      ..style = PaintingStyle.fill;
    final paint2 = Paint()
      ..color = OceanColors.seaGlass.withValues(alpha: 0.12)
      ..style = PaintingStyle.fill;

    final path1 = Path()..moveTo(0, size.height);
    for (double x = 0; x <= size.width; x += 6) {
      final y = size.height * 0.72 +
          math.sin((x / size.width) * math.pi * 2.2 + phaseOffset) * 10;
      path1.lineTo(x, y);
    }
    path1.lineTo(size.width, size.height);
    path1.close();
    canvas.drawPath(path1, paint1);

    final path2 = Path()..moveTo(0, size.height);
    for (double x = 0; x <= size.width; x += 6) {
      final y = size.height * 0.80 +
          math.cos((x / size.width) * math.pi * 1.8 + phaseOffset + 1.1) * 8;
      path2.lineTo(x, y);
    }
    path2.lineTo(size.width, size.height);
    path2.close();
    canvas.drawPath(path2, paint2);
  }

  @override
  bool shouldRepaint(covariant OceanWavePainter oldDelegate) {
    return oldDelegate.waveColor != waveColor ||
        oldDelegate.phaseOffset != phaseOffset;
  }
}

/// Ocean gradient hero card with subtle underwater light glow and wave backdrop.
class OceanWaveHeaderCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry padding;
  final double borderRadius;

  const OceanWaveHeaderCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(20),
    this.borderRadius = 24,
  });

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(borderRadius),
      child: Container(
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              OceanColors.deepOcean,
              OceanColors.oceanNavy,
              OceanColors.oceanBlue,
            ],
          ),
          boxShadow: [
            BoxShadow(
              color: OceanColors.deepOcean.withValues(alpha: 0.18),
              blurRadius: 20,
              offset: const Offset(0, 10),
            ),
          ],
        ),
        child: Stack(
          children: [
            Positioned.fill(
              child: Opacity(
                opacity: 0.24,
                child: Image.asset(
                  'assets/images/ocean_sunrays.jpg',
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => const SizedBox.shrink(),
                ),
              ),
            ),
            Positioned.fill(
              child: Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      OceanColors.deepOcean.withValues(alpha: 0.35),
                      OceanColors.deepOcean.withValues(alpha: 0.72),
                    ],
                  ),
                ),
              ),
            ),
            Positioned(
              right: -32,
              top: -32,
              child: Container(
                width: 140,
                height: 140,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: RadialGradient(
                    colors: [
                      OceanColors.turquoise.withValues(alpha: 0.30),
                      OceanColors.turquoise.withValues(alpha: 0.0),
                    ],
                  ),
                ),
              ),
            ),
            Positioned.fill(
              child: CustomPaint(
                painter: const OceanWavePainter(waveColor: OceanColors.aqua),
              ),
            ),
            Padding(
              padding: padding,
              child: child,
            ),
          ],
        ),
      ),
    );
  }
}

/// Controlled sea-glass surface card with accessible border & optional tap target.
class OceanGlassCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry padding;
  final VoidCallback? onTap;
  final Color? borderColor;

  const OceanGlassCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(16),
    this.onTap,
    this.borderColor,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bg = isDark
        ? OceanColors.oceanNavy.withValues(alpha: 0.92)
        : OceanColors.pureWhite;
    final border = borderColor ??
        (isDark ? OceanColors.borderDark : OceanColors.seaGlass.withValues(alpha: 0.55));

    return Material(
      color: bg,
      borderRadius: BorderRadius.circular(18),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(18),
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: border),
            boxShadow: [
              BoxShadow(
                color: OceanColors.deepOcean.withValues(alpha: isDark ? 0.25 : 0.04),
                blurRadius: 12,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          padding: padding,
          child: child,
        ),
      ),
    );
  }
}

/// Animated circular progress ring with tabular numerals for goals & mastery.
class OceanProgressRing extends StatelessWidget {
  final double progress; // 0.0 - 1.0
  final double size;
  final double strokeWidth;
  final String centerLabel;
  final String? subtitle;
  final Color trackColor;
  final Color progressColor;
  final Color labelColor;

  const OceanProgressRing({
    super.key,
    required this.progress,
    required this.centerLabel,
    this.subtitle,
    this.size = 84,
    this.strokeWidth = 8,
    this.trackColor = const Color(0x338DE1D3),
    this.progressColor = OceanColors.turquoise,
    this.labelColor = OceanColors.pureWhite,
  });

  @override
  Widget build(BuildContext context) {
    final clamped = progress.clamp(0.0, 1.0);
    return TweenAnimationBuilder<double>(
      tween: Tween<double>(begin: 0, end: clamped),
      duration: const Duration(milliseconds: 650),
      curve: Curves.easeOutCubic,
      builder: (context, value, _) {
        return SizedBox(
          width: size,
          height: size,
          child: CustomPaint(
            painter: _ProgressRingPainter(
              progress: value,
              strokeWidth: strokeWidth,
              trackColor: trackColor,
              progressColor: progressColor,
            ),
            child: Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    centerLabel,
                    style: TextStyle(
                      color: labelColor,
                      fontWeight: FontWeight.w800,
                      fontSize: size * 0.21,
                      fontFeatures: const [FontFeature.tabularFigures()],
                    ),
                  ),
                  if (subtitle != null)
                    Text(
                      subtitle!,
                      style: TextStyle(
                        color: labelColor.withValues(alpha: 0.78),
                        fontSize: size * 0.12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}

class _ProgressRingPainter extends CustomPainter {
  final double progress;
  final double strokeWidth;
  final Color trackColor;
  final Color progressColor;

  const _ProgressRingPainter({
    required this.progress,
    required this.strokeWidth,
    required this.trackColor,
    required this.progressColor,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = (math.min(size.width, size.height) - strokeWidth) / 2;
    final rect = Rect.fromCircle(center: center, radius: radius);

    final trackPaint = Paint()
      ..color = trackColor
      ..strokeWidth = strokeWidth
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    final progressPaint = Paint()
      ..shader = SweepGradient(
        startAngle: -math.pi / 2,
        endAngle: 1.5 * math.pi,
        colors: [progressColor, OceanColors.aqua],
      ).createShader(rect)
      ..strokeWidth = strokeWidth
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    canvas.drawCircle(center, radius, trackPaint);
    if (progress > 0) {
      canvas.drawArc(
        rect,
        -math.pi / 2,
        2 * math.pi * progress,
        false,
        progressPaint,
      );
    }
  }

  @override
  bool shouldRepaint(covariant _ProgressRingPainter oldDelegate) {
    return oldDelegate.progress != progress ||
        oldDelegate.progressColor != progressColor;
  }
}

/// Dismissible beginner-friendly tip banner with clear icon and simple copy.
class OceanFirstTimeTip extends StatelessWidget {
  final String title;
  final String message;
  final VoidCallback onDismiss;

  const OceanFirstTimeTip({
    super.key,
    required this.title,
    required this.message,
    required this.onDismiss,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: OceanColors.turquoise.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: OceanColors.seaGlass),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: OceanColors.oceanBlue,
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Icon(
              Icons.lightbulb_outline,
              color: OceanColors.pureWhite,
              size: 20,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: 13,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  message,
                  style: const TextStyle(
                    fontSize: 12,
                    color: OceanColors.textMuted,
                    height: 1.35,
                  ),
                ),
              ],
            ),
          ),
          TextButton(
            onPressed: onDismiss,
            style: TextButton.styleFrom(
              minimumSize: const Size(48, 36),
              foregroundColor: OceanColors.oceanBlue,
            ),
            child: const Text('Got it'),
          ),
        ],
      ),
    );
  }
}

/// Clear Back & Home navigation bar so learners never feel stuck.
class OceanBackHomeBar extends StatelessWidget {
  final String title;
  final VoidCallback onBack;
  final VoidCallback onHome;
  final Widget? trailing;

  const OceanBackHomeBar({
    super.key,
    required this.title,
    required this.onBack,
    required this.onHome,
    this.trailing,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          OutlinedButton.icon(
            onPressed: onBack,
            style: OutlinedButton.styleFrom(
              minimumSize: const Size(48, 44),
              padding: const EdgeInsets.symmetric(horizontal: 12),
            ),
            icon: const Icon(Icons.arrow_back, size: 18),
            label: const Text('Back'),
          ),
          const SizedBox(width: 8),
          OutlinedButton.icon(
            onPressed: onHome,
            style: OutlinedButton.styleFrom(
              minimumSize: const Size(48, 44),
              padding: const EdgeInsets.symmetric(horizontal: 12),
            ),
            icon: const Icon(Icons.home_outlined, size: 18),
            label: const Text('Home'),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              title,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                fontWeight: FontWeight.w700,
                fontSize: 15,
              ),
            ),
          ),
          if (trailing != null) trailing!,
        ],
      ),
    );
  }
}

/// Accessible status label with icon + text (never relying on color alone).
class OceanStatusBadge extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;

  const OceanStatusBadge({
    super.key,
    required this.icon,
    required this.label,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.14),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: color.withValues(alpha: 0.35)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: color),
          const SizedBox(width: 5),
          Text(
            label,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w700,
              color: color,
            ),
          ),
        ],
      ),
    );
  }
}

/// Branded Ocean Splash Screen displayed during initial session restoration.
class OceanSplashScreen extends StatelessWidget {
  const OceanSplashScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              OceanColors.deepOcean,
              OceanColors.oceanNavy,
              OceanColors.oceanBlue,
            ],
          ),
        ),
        child: Stack(
          children: [
            Positioned.fill(
              child: Opacity(
                opacity: 0.34,
                child: Image.asset(
                  'assets/images/ocean_sunrays.jpg',
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => const SizedBox.shrink(),
                ),
              ),
            ),
            Positioned.fill(
              child: Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      OceanColors.deepOcean.withValues(alpha: 0.35),
                      OceanColors.deepOcean.withValues(alpha: 0.80),
                    ],
                  ),
                ),
              ),
            ),
            const Positioned.fill(
              child: CustomPaint(
                painter: OceanWavePainter(waveColor: OceanColors.aqua),
              ),
            ),
            Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 84,
                      height: 84,
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [OceanColors.turquoise, OceanColors.aqua],
                        ),
                        borderRadius: BorderRadius.circular(24),
                        boxShadow: [
                          BoxShadow(
                            color: OceanColors.turquoise.withValues(alpha: 0.35),
                            blurRadius: 24,
                          ),
                        ],
                      ),
                      child: const Icon(
                        Icons.waves_rounded,
                        color: OceanColors.deepOcean,
                        size: 46,
                      ),
                    ),
                    const SizedBox(height: 20),
                    const Text(
                      'Examora',
                      style: TextStyle(
                        color: OceanColors.foamWhite,
                        fontSize: 32,
                        fontWeight: FontWeight.w800,
                        letterSpacing: -0.5,
                      ),
                    ),
                    const SizedBox(height: 6),
                    const Text(
                      'Learn Smart. Play Hard. Rank Higher.',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: OceanColors.seaGlass,
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 28),
                    const SizedBox(
                      width: 28,
                      height: 28,
                      child: CircularProgressIndicator(
                        strokeWidth: 3,
                        color: OceanColors.aqua,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
