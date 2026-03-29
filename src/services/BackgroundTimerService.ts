import BackgroundService from 'react-native-background-actions';

export function formatTime(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

let isRunning = false;
// Stored at module level — cannot pass functions through the native bridge
let pendingCompletion: (() => void) | null = null;

// Must be a stable module-level reference, not a lambda created at runtime
const timerTask = async (taskData?: { durationSeconds: number; petName: string }) => {
  const { durationSeconds = 0, petName = 'Pochi' } = taskData ?? {};
  for (let remaining = durationSeconds; remaining >= 0; remaining--) {
    if (!isRunning) break;
    await BackgroundService.updateNotification({
      taskTitle: `${petName} is waiting... 🐣`,
      taskDesc: `${formatTime(remaining)} remaining`,
    });
    if (remaining > 0) await sleep(1000);
  }
  if (isRunning && pendingCompletion) {
    pendingCompletion();
  }
  isRunning = false;
};

export async function startBackgroundTimer(
  petName: string,
  durationSeconds: number,
  onComplete: () => void,
): Promise<void> {
  pendingCompletion = onComplete;
  isRunning = true;
  try {
    await BackgroundService.start(timerTask, {
      taskName: 'PetPalFocus',
      taskTitle: `${petName} is waiting... 🐣`,
      taskDesc: `${formatTime(durationSeconds)} remaining`,
      taskIcon: { name: 'ic_launcher', type: 'mipmap' },
      color: '#0a7ea4',
      linkingURI: 'petpal://',
      parameters: { durationSeconds, petName },
    });
  } catch (e) {
    console.error('[BackgroundTimer] start failed:', e);
    isRunning = false;
    pendingCompletion = null;
  }
}

export async function stopBackgroundTimer(): Promise<void> {
  if (!isRunning) return;
  isRunning = false;
  pendingCompletion = null;
  await BackgroundService.stop();
}
