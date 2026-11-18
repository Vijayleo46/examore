import 'dart:convert';
import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:lottie/lottie.dart';
import '../../core/theme/app_theme.dart';
import 'ocean_quest_data.dart';

/// Lightweight haptics & system sound manager respecting student mute toggle.
class OceanSoundHaptic {
  static void tap(bool muted) {
    if (muted) return;
    HapticFeedback.selectionClick();
    SystemSound.play(SystemSoundType.click);
  }

  static void correct(bool muted) {
    if (muted) return;
    HapticFeedback.lightImpact();
    SystemSound.play(SystemSoundType.click);
  }

  static void wrong(bool muted) {
    if (muted) return;
    HapticFeedback.mediumImpact();
  }

  static void victory(bool muted) {
    if (muted) return;
    HapticFeedback.heavyImpact();
    SystemSound.play(SystemSoundType.click);
  }
}

/// Valid minimal inline Lottie v5 JSON payload (pulsing turquoise pearl ring)
/// with graceful fallback so missing asset bundles can never occur.
const String _kPearlPulseLottieJson = '''
{
  "v": "5.7.4",
  "fr": 30,
  "ip": 0,
  "op": 60,
  "w": 120,
  "h": 120,
  "nm": "ocean_pearl_pulse",
  "ddd": 0,
  "assets": [],
  "layers": [
    {
      "ddd": 0,
      "ind": 1,
      "ty": 4,
      "nm": "ring",
      "sr": 1,
      "ks": {
        "o": {
          "a": 1,
          "k": [
            {"t": 0, "s": [95], "e": [25]},
            {"t": 30, "s": [25], "e": [95]},
            {"t": 60, "s": [95]}
          ]
        },
        "r": {"a": 0, "k": 0},
        "p": {"a": 0, "k": [60, 60, 0]},
        "a": {"a": 0, "k": [0, 0, 0]},
        "s": {
          "a": 1,
          "k": [
            {"t": 0, "s": [75, 75, 100], "e": [112, 112, 100]},
            {"t": 30, "s": [112, 112, 100], "e": [75, 75, 100]},
            {"t": 60, "s": [75, 75, 100]}
          ]
        }
      },
      "shapes": [
        {
          "ty": "el",
          "p": {"a": 0, "k": [0, 0]},
          "s": {"a": 0, "k": [78, 78]},
          "nm": "circle"
        },
        {
          "ty": "st",
          "c": {"a": 0, "k": [0.125, 0.78, 0.788, 1]},
          "o": {"a": 0, "k": 100},
          "w": {"a": 0, "k": 6},
          "lc": 2,
          "lj": 2,
          "nm": "stroke"
        }
      ],
      "ip": 0,
      "op": 60,
      "st": 0
    }
  ]
}
''';

class OceanQuestLottieBadge extends StatelessWidget {
  final IconData fallbackIcon;
  final Color color;
  final double size;

  const OceanQuestLottieBadge({
    super.key,
    required this.fallbackIcon,
    this.color = OceanColors.turquoise,
    this.size = 76,
  });

  @override
  Widget build(BuildContext context) {
    final bytes = Uint8List.fromList(utf8.encode(_kPearlPulseLottieJson));
    return SizedBox(
      width: size,
      height: size,
      child: Stack(
        alignment: Alignment.center,
        children: [
          Lottie.memory(
            bytes,
            width: size,
            height: size,
            repeat: true,
            errorBuilder: (_, __, ___) => const SizedBox.shrink(),
          ),
          Container(
            width: size * 0.62,
            height: size * 0.62,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: color.withValues(alpha: 0.18),
              border: Border.all(color: color.withValues(alpha: 0.65), width: 1.5),
            ),
            child: Icon(fallbackIcon, color: color, size: size * 0.34),
          )
              .animate(onPlay: (c) => c.repeat(reverse: true))
              .scaleXY(begin: 0.96, end: 1.05, duration: 1400.ms),
        ],
      ),
    );
  }
}

class AnimatedSubmarineMarker extends StatelessWidget {
  final bool active;
  const AnimatedSubmarineMarker({super.key, this.active = true});

  @override
  Widget build(BuildContext context) {
    final badge = Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [OceanColors.turquoise, OceanColors.aqua],
        ),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: OceanColors.foamWhite, width: 1.5),
        boxShadow: [
          BoxShadow(
            color: OceanColors.turquoise.withValues(alpha: 0.45),
            blurRadius: 10,
          ),
        ],
      ),
      child: const Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            Icons.directions_boat_filled_rounded,
            color: OceanColors.deepOcean,
            size: 14,
          ),
          SizedBox(width: 4),
          Text(
            'SUB',
            style: TextStyle(
              color: OceanColors.deepOcean,
              fontSize: 10,
              fontWeight: FontWeight.w800,
              letterSpacing: 0.4,
            ),
          ),
        ],
      ),
    );

    if (!active) return badge;
    return badge
        .animate(onPlay: (c) => c.repeat(reverse: true))
        .moveY(begin: -3, end: 3, duration: 1600.ms, curve: Curves.easeInOut);
  }
}

/// Bathymetric contour & expedition route painter connecting the 9 underwater zones.
class OceanBathymetricMapPainter extends CustomPainter {
  final List<OceanLocationDef> locations;
  final Set<String> unlockedLocations;

  const OceanBathymetricMapPainter({
    required this.locations,
    required this.unlockedLocations,
  });

  @override
  void paint(Canvas canvas, Size size) {
    // Subtle depth contour bands
    final contourPaint = Paint()
      ..color = OceanColors.aqua.withValues(alpha: 0.12)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.2;

    for (int band = 1; band <= 4; band++) {
      final baseY = size.height * (band * 0.22);
      final path = Path()..moveTo(0, baseY);
      for (double x = 0; x <= size.width; x += 12) {
        final y = baseY + math.sin((x / size.width) * math.pi * 2 + band) * 8;
        path.lineTo(x, y);
      }
      canvas.drawPath(path, contourPaint);
    }

    // Expedition route lines between sequential zones
    for (int i = 0; i < locations.length - 1; i++) {
      final a = locations[i];
      final b = locations[i + 1];
      final p1 = Offset((a.mapX / 100.0) * size.width, (a.mapY / 100.0) * size.height);
      final p2 = Offset((b.mapX / 100.0) * size.width, (b.mapY / 100.0) * size.height);
      final isUnlockedEdge = unlockedLocations.contains(b.locationId);

      final linePaint = Paint()
        ..color = isUnlockedEdge
            ? OceanColors.turquoise.withValues(alpha: 0.78)
            : OceanColors.seaGlass.withValues(alpha: 0.26)
        ..strokeWidth = isUnlockedEdge ? 2.8 : 1.8
        ..style = PaintingStyle.stroke
        ..strokeCap = StrokeCap.round;

      if (isUnlockedEdge) {
        canvas.drawLine(p1, p2, linePaint);
      } else {
        // Dashed locked route segment
        const dashLen = 6.0;
        const gapLen = 5.0;
        final total = (p2 - p1).distance;
        final dir = (p2 - p1) / total;
        double dist = 0;
        while (dist < total) {
          final start = p1 + dir * dist;
          final end = p1 + dir * math.min(dist + dashLen, total);
          canvas.drawLine(start, end, linePaint);
          dist += dashLen + gapLen;
        }
      }
    }
  }

  @override
  bool shouldRepaint(covariant OceanBathymetricMapPainter oldDelegate) {
    return oldDelegate.unlockedLocations.length != unlockedLocations.length;
  }
}
