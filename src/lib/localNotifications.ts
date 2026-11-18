import {
  LocalReminderNotification,
  NotificationPreferences,
} from '../types/examverse';

export interface OceanReminderBuildInput {
  displayName: string;
  username?: string;
  studiedMinutes: number;
  goalMinutes: number;
  streak: number;
  forceKind?: LocalReminderNotification['kind'];
}

export function getGoalPercent(studiedMinutes: number, goalMinutes: number): number {
  const safeGoal = Math.max(1, goalMinutes);
  return Math.min(100, Math.round((Math.max(0, studiedMinutes) / safeGoal) * 100));
}

export function formatTime12h(hhmm: string): string {
  const [hRaw, mRaw] = (hhmm || '19:00').split(':');
  const h = Number(hRaw);
  const m = Number(mRaw);
  if (Number.isNaN(h) || Number.isNaN(m)) return '7:00 PM';
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

export function buildOceanStudyReminder(
  input: OceanReminderBuildInput
): LocalReminderNotification {
  const safeGoal = Math.max(15, Math.round(input.goalMinutes || 60));
  const studied = Math.max(0, Math.round(input.studiedMinutes || 0));
  const remaining = Math.max(0, safeGoal - studied);
  const pct = getGoalPercent(studied, safeGoal);
  const who = input.username?.trim()
    ? `@${input.username.trim()}`
    : (input.displayName || 'Scholar').split(' ')[0];

  const kind: LocalReminderNotification['kind'] =
    input.forceKind ??
    (pct >= 100
      ? 'goal-complete'
      : pct >= 50
      ? 'goal-halfway'
      : studied === 0
      ? 'goal-kickoff'
      : 'goal-streak');

  if (kind === 'goal-complete') {
    return {
      id: `rem-${Date.now()}`,
      kind,
      title: 'Daily Tide Complete — Shore Reached!',
      body: `Calm focus pays off, ${who}. You completed all ${safeGoal} min of Today’s Study Goal (${input.streak}d streak alive).`,
      ctaLabel: 'View Progress',
      ctaTab: 'analytics',
      createdAt: new Date().toISOString(),
      read: false,
      goalPct: 100,
    };
  }

  if (kind === 'goal-halfway') {
    return {
      id: `rem-${Date.now()}`,
      kind,
      title: `Halfway Across the Reef · ${remaining} min left`,
      body: `Smooth sailing, ${who}! Just ${remaining} more minutes finishes your ${safeGoal} min goal and keeps your ${input.streak}-day tide flowing.`,
      ctaLabel: 'Continue Learning',
      ctaTab: 'learn',
      createdAt: new Date().toISOString(),
      read: false,
      goalPct: pct,
    };
  }

  if (kind === 'goal-streak') {
    return {
      id: `rem-${Date.now()}`,
      kind,
      title: `Keep Your Lighthouse Lit · ${studied}/${safeGoal} min`,
      body: `${remaining} min left to reach Today’s Study Goal. Catch a calm 10-minute practice wave to guard your ${input.streak}-day streak.`,
      ctaLabel: 'Quick Practice',
      ctaTab: 'practice',
      createdAt: new Date().toISOString(),
      read: false,
      goalPct: pct,
    };
  }

  if (kind === 'mock-alert') {
    return {
      id: `rem-${Date.now()}`,
      kind,
      title: 'New Horizon: Calm Mock Simulation Ready',
      body: `Your SSC CGL practice waters are clear, ${who}. Test your pace with a short timed mock and review every solution calmly.`,
      ctaLabel: 'Open Mock Tests',
      ctaTab: 'learn',
      createdAt: new Date().toISOString(),
      read: false,
      goalPct: pct,
    };
  }

  return {
    id: `rem-${Date.now()}`,
    kind: 'goal-kickoff',
    title: 'Calm Waters Await Your First Wave',
    body: `Set sail on Today’s ${safeGoal} min Study Goal, ${who} — even 15 calm minutes builds steady exam confidence.`,
    ctaLabel: 'Start Today’s Wave',
    ctaTab: 'learn',
    createdAt: new Date().toISOString(),
    read: false,
    goalPct: pct,
  };
}

export type BrowserPermissionState = 'granted' | 'denied' | 'default' | 'unsupported';

export function getBrowserNotificationPermission(): BrowserPermissionState {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

export async function requestBrowserNotificationPermission(): Promise<BrowserPermissionState> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  try {
    const result = await Notification.requestPermission();
    return result;
  } catch {
    return getBrowserNotificationPermission();
  }
}

export function triggerBrowserLocalNotification(
  reminder: LocalReminderNotification,
  prefs: NotificationPreferences
): boolean {
  if (!prefs.browserPushEnabled) return false;
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (Notification.permission !== 'granted') return false;

  try {
    const notif = new Notification(`Examora · ${reminder.title}`, {
      body: reminder.body,
      tag: `examora-${reminder.kind}-${new Date().toISOString().slice(0, 10)}`,
    });
    notif.onclick = () => {
      window.focus();
      notif.close();
    };
    return true;
  } catch {
    return false;
  }
}

export function shouldFireDailyScheduledReminder(
  now: Date,
  prefs: NotificationPreferences,
  lastReminderDate: string | null,
  studiedMinutes: number,
  goalMinutes: number
): boolean {
  if (!prefs.dailyReminder) return false;
  const todayIso = now.toISOString().slice(0, 10);
  if (lastReminderDate === todayIso) return false;
  if (studiedMinutes >= goalMinutes) return false;

  const [targetHourStr, targetMinStr] = (prefs.reminderTime || '19:00').split(':');
  const targetHour = Number(targetHourStr);
  const targetMin = Number(targetMinStr);
  if (Number.isNaN(targetHour) || Number.isNaN(targetMin)) return false;

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const targetMinutes = targetHour * 60 + targetMin;
  return nowMinutes >= targetMinutes;
}
