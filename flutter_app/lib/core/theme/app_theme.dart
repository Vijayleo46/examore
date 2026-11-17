import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class ExamoraColors {
  static const Color navy = Color(0xFF0A192F);
  static const Color navyDark = Color(0xFF081221);
  static const Color navySurface = Color(0xFF0F1E36);
  static const Color purple = Color(0xFF6D28D9);
  static const Color purpleLight = Color(0xFF7C3AED);
  static const Color white = Color(0xFFFFFFFF);
  static const Color canvasLight = Color(0xFFF8FAFC);
  static const Color slateBorder = Color(0xFFE2E8F0);
  static const Color textDark = Color(0xFF0F172A);
  static const Color textMuted = Color(0xFF64748B);
}

class ExamoraTheme {
  static ThemeData light() {
    final base = ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      scaffoldBackgroundColor: ExamoraColors.canvasLight,
      colorScheme: const ColorScheme.light(
        primary: ExamoraColors.navy,
        secondary: ExamoraColors.purple,
        surface: ExamoraColors.white,
        onPrimary: ExamoraColors.white,
        onSecondary: ExamoraColors.white,
        onSurface: ExamoraColors.textDark,
      ),
    );
    return base.copyWith(
      textTheme: GoogleFonts.plusJakartaSansTextTheme(base.textTheme),
      appBarTheme: const AppBarTheme(
        backgroundColor: ExamoraColors.white,
        foregroundColor: ExamoraColors.navy,
        elevation: 0,
      ),
      cardTheme: CardThemeData(
        color: ExamoraColors.white,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: ExamoraColors.slateBorder),
        ),
      ),
    );
  }

  static ThemeData dark() {
    final base = ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      scaffoldBackgroundColor: ExamoraColors.navyDark,
      colorScheme: const ColorScheme.dark(
        primary: ExamoraColors.purpleLight,
        secondary: ExamoraColors.purple,
        surface: ExamoraColors.navySurface,
        onPrimary: ExamoraColors.white,
        onSecondary: ExamoraColors.white,
        onSurface: Color(0xFFF1F5F9),
      ),
    );
    return base.copyWith(
      textTheme: GoogleFonts.plusJakartaSansTextTheme(base.textTheme),
      appBarTheme: const AppBarTheme(
        backgroundColor: ExamoraColors.navy,
        foregroundColor: ExamoraColors.white,
        elevation: 0,
      ),
      cardTheme: CardThemeData(
        color: ExamoraColors.navySurface,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: Color(0xFF1E293B)),
        ),
      ),
    );
  }
}
