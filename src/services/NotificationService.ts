/**
 * NotificationService — session notifications
 *
 * showSessionNotification: sticky "session running" notification shown during focus.
 * Scheduled notifications (pet hungry, daily reminder, streak): Session 18.
 */
import * as Notifications from 'expo-notifications';
import { formatDuration } from '@/src/utils/durationPicker';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

let activeNotificationId: string | null = null;
let activePrePhaseNotificationId: string | null = null;
let prePhaseToken = 0;

export function formatEndTime(durationSeconds: number, now = Date.now()): string {
  const end = new Date(now + durationSeconds * 1000);
  const h = end.getHours() % 12 || 12;
  const m = String(end.getMinutes()).padStart(2, '0');
  const ampm = end.getHours() >= 12 ? 'PM' : 'AM';
  return `${h}:${m} ${ampm}`;
}

export async function showSessionNotification(
  petName: string,
  durationSeconds: number,
  petEmoji: string,
  now = Date.now(),
): Promise<void> {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return;

  await cancelSessionNotification();

  const durationMins = Math.round(durationSeconds / 60);
  activeNotificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: `Don't leave ${petName} alone! ${petEmoji}`,
      body: `${durationMins} min · Come back at ${formatEndTime(durationSeconds, now)}`,
      sticky: true,
      autoDismiss: false,
      data: { type: 'session_running', endsAt: now + durationSeconds * 1000 },
    },
    trigger: null,
  });
}


export function formatCheckpointBody(durationSeconds: number | null): string {
  if (durationSeconds === null) return "You're in flow. Let's go.";
  const minutes = Math.round(durationSeconds / 60);
  return `Your ${formatDuration(minutes)} session begins now.`;
}

export async function showCheckpointNotification(durationSeconds: number | null): Promise<void> {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Two minutes done! 🎯',
      body: formatCheckpointBody(durationSeconds),
      autoDismiss: true,
      data: { type: 'checkpoint' },
    },
    trigger: null,
  });
}

export function formatPrePhaseBody(taskDurationSeconds: number | null, now: number): string {
  const taskBeginsAt = formatEndTime(120, now);
  if (taskDurationSeconds === null) return `Task begins at ${taskBeginsAt}`;
  return `Task begins at ${taskBeginsAt} · Ends at ${formatEndTime(taskDurationSeconds, now + 120_000)}`;
}

export async function showPrePhaseNotification(
  taskDurationSeconds: number | null,
  now = Date.now(),
): Promise<void> {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return;
  await cancelPrePhaseNotification();
  const token = ++prePhaseToken;
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: '2-min warm-up started ⏱️',
      body: formatPrePhaseBody(taskDurationSeconds, now),
      sticky: true,
      autoDismiss: false,
      data: { type: 'pre_phase' },
    },
    trigger: null,
  });
  if (prePhaseToken === token) {
    activePrePhaseNotificationId = id;
  } else {
    // A newer cancel/show ran while we were awaiting — dismiss this stale notification
    await Notifications.dismissNotificationAsync(id);
  }
}

export async function cancelPrePhaseNotification(): Promise<void> {
  prePhaseToken++;
  if (activePrePhaseNotificationId === null) return;
  await Notifications.dismissNotificationAsync(activePrePhaseNotificationId);
  activePrePhaseNotificationId = null;
}

export async function cancelSessionNotification(): Promise<void> {
  if (activeNotificationId === null) return;
  await Notifications.dismissNotificationAsync(activeNotificationId);
  activeNotificationId = null;
}
