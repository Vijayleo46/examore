import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Examora Ocean-Inspired Design System Color Tokens
class OceanColors {
  static const Color deepOcean = Color(0xFF062B3D);
  static const Color oceanNavy = Color(0xFF073B50);
  static const Color oceanBlue = Color(0xFF075985);
  static const Color turquoise = Color(0xFF20C7C9);
  static const Color aqua = Color(0xFF55D6D0);
  static const Color seaGlass = Color(0xFF8DE1D3);
  static const Color foamWhite = Color(0xFFF3FAFA);
  static const Color coralAccent = Color(0xFFFF8B78);

  // Neutral & accessible surface tokens
  static const Color pureWhite = Color(0xFFFFFFFF);
  static const Color textDark = Color(0xFF062B3D);
  static const Color textMuted = Color(0xFF47697A);
  static const Color darkSurface = Color(0xFF073B50);
  static const Color darkCanvas = Color(0xFF041F2D);
  static const Color borderLight = Color(0xFFC5ECE6);
  static const Color borderDark = Color(0xFF13506B);
  static const Color emerald = Color(0xFF10B981);
}

/// Compatibility aliases mapped onto the Ocean-Inspired Design System.
class ExamoraColors {
  static const Color navy = OceanColors.deepOcean;
  static const Color navyDark = OceanColors.darkCanvas;
  static const Color navySurface = OceanColors.oceanNavy;
  static const Color purple = OceanColors.oceanBlue;
  static const Color purpleLight = OceanColors.turquoise;
  static const Color turquoise = OceanColors.turquoise;
  static const Color aqua = OceanColors.aqua;
  static const Color seaGlass = OceanColors.seaGlass;
  static const Color coral = OceanColors.coralAccent;
  static const Color white = OceanColors.pureWhite;
  static const Color canvasLight = OceanColors.foamWhite;
  static const Color slateBorder = OceanColors.borderLight;
  static const Color textDark = OceanColors.textDark;
  static const Color textMuted = OceanColors.textMuted;
}

class ExamoraTheme {
  static ThemeData light() {
    final base = ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      scaffoldBackgroundColor: OceanColors.foamWhite,
      colorScheme: const ColorScheme.light(
        primary: OceanColors.oceanBlue,
        secondary: OceanColors.turquoise,
        tertiary: OceanColors.coralAccent,
        surface: OceanColors.pureWhite,
        error: OceanColors.coralAccent,
        onPrimary: OceanColors.pureWhite,
        onSecondary: OceanColors.deepOcean,
        onSurface: OceanColors.deepOcean,
      ),
    );
    return base.copyWith(
      textTheme: GoogleFonts.plusJakartaSansTextTheme(base.textTheme).apply(
        bodyColor: OceanColors.deepOcean,
        displayColor: OceanColors.deepOcean,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: OceanColors.foamWhite,
        foregroundColor: OceanColors.deepOcean,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
      ),
      cardTheme: CardThemeData(
        color: OceanColors.pureWhite,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(18),
          side: const BorderSide(color: OceanColors.borderLight),
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: OceanColors.oceanBlue,
          foregroundColor: OceanColors.pureWhite,
          minimumSize: const Size(48, 48),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: OceanColors.oceanBlue,
          minimumSize: const Size(48, 48),
          side: const BorderSide(color: OceanColors.seaGlass, width: 1.5),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: OceanColors.pureWhite,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: OceanColors.borderLight),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: OceanColors.borderLight),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: OceanColors.turquoise, width: 2),
        ),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: OceanColors.pureWhite,
        indicatorColor: OceanColors.turquoise.withValues(alpha: 0.2),
        labelTextStyle: WidgetStateProperty.resolveWith((states) {
          final selected = states.contains(WidgetState.selected);
          return TextStyle(
            fontSize: 12,
            fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
            color: selected ? OceanColors.deepOcean : OceanColors.textMuted,
          );
        }),
        iconTheme: WidgetStateProperty.resolveWith((states) {
          final selected = states.contains(WidgetState.selected);
          return IconThemeData(
            color: selected ? OceanColors.oceanBlue : OceanColors.textMuted,
          );
        }),
      ),
    );
  }

  static ThemeData dark() {
    final base = ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      scaffoldBackgroundColor: OceanColors.darkCanvas,
      colorScheme: const ColorScheme.dark(
        primary: OceanColors.turquoise,
        secondary: OceanColors.aqua,
        tertiary: OceanColors.coralAccent,
        surface: OceanColors.oceanNavy,
        error: OceanColors.coralAccent,
        onPrimary: OceanColors.deepOcean,
        onSecondary: OceanColors.deepOcean,
        onSurface: OceanColors.foamWhite,
      ),
    );
    return base.copyWith(
      textTheme: GoogleFonts.plusJakartaSansTextTheme(base.textTheme).apply(
        bodyColor: OceanColors.foamWhite,
        displayColor: OceanColors.foamWhite,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: OceanColors.deepOcean,
        foregroundColor: OceanColors.foamWhite,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
      ),
      cardTheme: CardThemeData(
        color: OceanColors.oceanNavy,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(18),
          side: const BorderSide(color: OceanColors.borderDark),
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: OceanColors.turquoise,
          foregroundColor: OceanColors.deepOcean,
          minimumSize: const Size(48, 48),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
        ),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: OceanColors.deepOcean,
        indicatorColor: OceanColors.turquoise.withValues(alpha: 0.25),
        labelTextStyle: WidgetStateProperty.resolveWith((states) {
          final selected = states.contains(WidgetState.selected);
          return TextStyle(
            fontSize: 12,
            fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
            color: selected ? OceanColors.aqua : OceanColors.seaGlass,
          );
        }),
      ),
    );
  }
}
