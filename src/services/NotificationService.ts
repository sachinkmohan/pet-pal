/**
 * NotificationService — scheduled / triggered notifications (Session 18)
 *
 * Used for: pet hungry reminder, daily focus reminder, streak-at-risk alert.
 *
 * NOT used for the session-running notification — that is handled by
 * BackgroundTimerService via react-native-background-actions, which creates
 * its own persistent foreground-service notification automatically.
 * Using both would show a duplicate notification during a session.
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

export async function showSessionNotification(petName: string): Promise<void> {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return;

  await cancelSessionNotification();

  activeNotificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: `${petName} is waiting... 🐣`,
      body: 'Focus session in progress — stay off your phone!',
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
