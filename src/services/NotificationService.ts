/**
 * NotificationService — session-running + scheduled notifications
 *
 * Session notification: shows when focus session starts, cancelled on end.
 * Scheduled notifications (pet hungry, daily reminder, streak): Session 18.
 */
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

let activeNotificationId: string | null = null;

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
): Promise<void> {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return;

  await cancelSessionNotification();

  activeNotificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: `${petName} is waiting... 🐣`,
      body: `Session ends at ${formatEndTime(durationSeconds)} — stay focused!`,
      sticky: true,
      autoDismiss: false,
      data: { type: 'session_running' },
    },
    trigger: null,
  });
}

export async function cancelSessionNotification(): Promise<void> {
  if (activeNotificationId === null) return;
  await Notifications.dismissNotificationAsync(activeNotificationId);
  activeNotificationId = null;
}
