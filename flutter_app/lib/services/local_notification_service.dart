import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:timezone/data/latest_all.dart' as tz_data;
import 'package:timezone/timezone.dart' as tz;

class LocalNotificationPrefs {
  final bool dailyReminder;
  final bool mockAlerts;
  final bool streakAlerts;
  final int reminderHour;
  final int reminderMinute;

  const LocalNotificationPrefs({
    this.dailyReminder = true,
    this.mockAlerts = true,
    this.streakAlerts = true,
    this.reminderHour = 19,
    this.reminderMinute = 0,
  });

  LocalNotificationPrefs copyWith({
    bool? dailyReminder,
    bool? mockAlerts,
    bool? streakAlerts,
    int? reminderHour,
    int? reminderMinute,
  }) {
    return LocalNotificationPrefs(
      dailyReminder: dailyReminder ?? this.dailyReminder,
      mockAlerts: mockAlerts ?? this.mockAlerts,
      streakAlerts: streakAlerts ?? this.streakAlerts,
      reminderHour: reminderHour ?? this.reminderHour,
      reminderMinute: reminderMinute ?? this.reminderMinute,
    );
  }
}

class OceanReminderCopy {
  final String title;
  final String body;
  final int goalPercent;

  const OceanReminderCopy({
    required this.title,
    required this.body,
    required this.goalPercent,
  });
}

class LocalNotificationService {
  LocalNotificationService._();
  static final LocalNotificationService instance = LocalNotificationService._();

  static const String _channelId = 'examora_ocean_study_tide';
  static const String _channelName = 'Examora Study Tide';
  static const String _channelDesc =
      'Gentle ocean-themed reminders anchored to Today’s Study Goal';

  static const int _dailyGoalNotificationId = 101;
  static const int _streakSaverNotificationId = 102;
  static const int _instantPreviewNotificationId = 103;

  static const String _kDailyKey = 'examora_notif_daily';
  static const String _kMockKey = 'examora_notif_mock';
  static const String _kStreakKey = 'examora_notif_streak';
  static const String _kHourKey = 'examora_notif_hour';
  static const String _kMinKey = 'examora_notif_min';

  final FlutterLocalNotificationsPlugin _plugin =
      FlutterLocalNotificationsPlugin();
  bool _initialized = false;

  Future<void> initialize() async {
    if (_initialized) return;
    try {
      tz_data.initializeTimeZones();
      const androidInit = AndroidInitializationSettings('@mipmap/ic_launcher');
      const darwinInit = DarwinInitializationSettings(
        requestAlertPermission: false,
        requestBadgePermission: false,
        requestSoundPermission: false,
      );
      const settings = InitializationSettings(
        android: androidInit,
        iOS: darwinInit,
        macOS: darwinInit,
      );
      await _plugin.initialize(settings);
      _initialized = true;
    } catch (e) {
      debugPrint('Local notification setup skipped: $e');
    }
  }

  Future<void> requestPermissions() async {
    if (!_initialized) await initialize();
    try {
      await _plugin
          .resolvePlatformSpecificImplementation<
              AndroidFlutterLocalNotificationsPlugin>()
          ?.requestNotificationsPermission();
      await _plugin
          .resolvePlatformSpecificImplementation<
              IOSFlutterLocalNotificationsPlugin>()
          ?.requestPermissions(alert: true, badge: true, sound: true);
    } catch (_) {
      // Safe fallback when platform permission handler isn't active
    }
  }

  Future<LocalNotificationPrefs> loadPrefs() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      return LocalNotificationPrefs(
        dailyReminder: prefs.getBool(_kDailyKey) ?? true,
        mockAlerts: prefs.getBool(_kMockKey) ?? true,
        streakAlerts: prefs.getBool(_kStreakKey) ?? true,
        reminderHour: (prefs.getInt(_kHourKey) ?? 19).clamp(0, 23),
        reminderMinute: (prefs.getInt(_kMinKey) ?? 0).clamp(0, 59),
      );
    } catch (_) {
      return const LocalNotificationPrefs();
    }
  }

  Future<void> savePrefs(LocalNotificationPrefs next) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setBool(_kDailyKey, next.dailyReminder);
      await prefs.setBool(_kMockKey, next.mockAlerts);
      await prefs.setBool(_kStreakKey, next.streakAlerts);
      await prefs.setInt(_kHourKey, next.reminderHour);
      await prefs.setInt(_kMinKey, next.reminderMinute);
    } catch (_) {
      // Ignore storage error in restricted environments
    }
  }

  static OceanReminderCopy buildGoalReminderCopy({
    required String displayName,
    required String username,
    required int studiedMinutes,
    required int goalMinutes,
    required int streak,
  }) {
    final safeGoal = goalMinutes < 15 ? 15 : goalMinutes;
    final studied = studiedMinutes < 0 ? 0 : studiedMinutes;
    final remaining = (safeGoal - studied).clamp(0, safeGoal);
    final pct = ((studied / safeGoal) * 100).round().clamp(0, 100);
    final who = username.trim().isNotEmpty
        ? '@${username.trim()}'
        : (displayName.trim().isNotEmpty
            ? displayName.trim().split(' ').first
            : 'Scholar');

    if (pct >= 100) {
      return OceanReminderCopy(
        title: 'Daily Tide Complete — Shore Reached!',
        body:
            'Calm focus pays off, $who. You completed all $safeGoal min of Today’s Study Goal (${streak}d streak alive).',
        goalPercent: 100,
      );
    }

    if (pct >= 50) {
      return OceanReminderCopy(
        title: 'Halfway Across the Reef · $remaining min left',
        body:
            'Smooth sailing, $who! Only $remaining more minutes finishes Today’s $safeGoal min Study Goal and keeps your $streak-day tide flowing.',
        goalPercent: pct,
      );
    }

    if (studied == 0) {
      return OceanReminderCopy(
        title: 'Calm Waters Await Your First Wave',
        body:
            'Set sail on Today’s $safeGoal min Study Goal, $who — even 15 calm minutes builds lasting exam confidence.',
        goalPercent: pct,
      );
    }

    return OceanReminderCopy(
      title: 'Keep Your Lighthouse Lit · $studied/$safeGoal min',
      body:
          '$remaining min left to reach Today’s Study Goal. Catch a calm 10-minute practice wave to guard your $streak-day streak.',
      goalPercent: pct,
    );
  }

  NotificationDetails _oceanNotificationDetails() {
    const androidDetails = AndroidNotificationDetails(
      _channelId,
      _channelName,
      channelDescription: _channelDesc,
      importance: Importance.defaultImportance,
      priority: Priority.defaultPriority,
    );
    const darwinDetails = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
    );
    return const NotificationDetails(
      android: androidDetails,
      iOS: darwinDetails,
      macOS: darwinDetails,
    );
  }

  tz.TZDateTime _nextInstanceOfTime(int hour, int minute) {
    final now = tz.TZDateTime.now(tz.local);
    var scheduled = tz.TZDateTime(
      tz.local,
      now.year,
      now.month,
      now.day,
      hour,
      minute,
    );
    if (scheduled.isBefore(now)) {
      scheduled = scheduled.add(const Duration(days: 1));
    }
    return scheduled;
  }

  Future<void> syncGoalReminders({
    required LocalNotificationPrefs prefs,
    required String displayName,
    required String username,
    required int studiedMinutes,
    required int goalMinutes,
    required int streak,
  }) async {
    if (!_initialized) await initialize();
    if (!_initialized) return;

    try {
      await _plugin.cancel(_dailyGoalNotificationId);
      await _plugin.cancel(_streakSaverNotificationId);

      final copy = buildGoalReminderCopy(
        displayName: displayName,
        username: username,
        studiedMinutes: studiedMinutes,
        goalMinutes: goalMinutes,
        streak: streak,
      );

      if (prefs.dailyReminder) {
        await _plugin.zonedSchedule(
          _dailyGoalNotificationId,
          'Examora · ${copy.title}',
          copy.body,
          _nextInstanceOfTime(prefs.reminderHour, prefs.reminderMinute),
          _oceanNotificationDetails(),
          androidScheduleMode: AndroidScheduleMode.inexactAllowWhileIdle,
          uiLocalNotificationDateInterpretation:
              UILocalNotificationDateInterpretation.absoluteTime,
          matchDateTimeComponents: DateTimeComponents.time,
        );
      }

      if (prefs.streakAlerts && studiedMinutes < goalMinutes) {
        final remaining = (goalMinutes - studiedMinutes).clamp(1, goalMinutes);
        await _plugin.zonedSchedule(
          _streakSaverNotificationId,
          'Examora · Keep Your Lighthouse Lit',
          'Only $remaining min left today to protect your $streak-day Examora study tide before midnight.',
          _nextInstanceOfTime(21, 0),
          _oceanNotificationDetails(),
          androidScheduleMode: AndroidScheduleMode.inexactAllowWhileIdle,
          uiLocalNotificationDateInterpretation:
              UILocalNotificationDateInterpretation.absoluteTime,
          matchDateTimeComponents: DateTimeComponents.time,
        );
      }
    } catch (e) {
      debugPrint('Could not schedule local reminder: $e');
    }
  }

  Future<OceanReminderCopy> sendGentleReminderNow({
    required String displayName,
    required String username,
    required int studiedMinutes,
    required int goalMinutes,
    required int streak,
  }) async {
    final copy = buildGoalReminderCopy(
      displayName: displayName,
      username: username,
      studiedMinutes: studiedMinutes,
      goalMinutes: goalMinutes,
      streak: streak,
    );
    if (!_initialized) await initialize();
    if (_initialized) {
      try {
        await requestPermissions();
        await _plugin.show(
          _instantPreviewNotificationId,
          'Examora · ${copy.title}',
          copy.body,
          _oceanNotificationDetails(),
        );
      } catch (e) {
        debugPrint('Local notification preview fallback: $e');
      }
    }
    return copy;
  }
}
