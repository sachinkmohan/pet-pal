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
