import AsyncStorage from '@react-native-async-storage/async-storage';

// Generic typed helpers

export async function getItem<T>(key: string): Promise<T | null> {
  const raw = await AsyncStorage.getItem(key);
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return raw as unknown as T;
  }
}

export async function setItem<T>(key: string, value: T): Promise<void> {
  const raw = typeof value === 'string' ? value : JSON.stringify(value);
  await AsyncStorage.setItem(key, raw);
}

export async function removeItem(key: string): Promise<void> {
  await AsyncStorage.removeItem(key);
}

export async function clearAll(): Promise<void> {
  await AsyncStorage.clear();
}

// Convenience: get multiple keys at once
export async function getMultiple<T extends Record<string, unknown>>(
  keys: string[]
): Promise<Partial<T>> {
  const pairs = await AsyncStorage.multiGet(keys);
  const result: Partial<T> = {};
  for (const [key, raw] of pairs) {
    if (raw !== null) {
      try {
        (result as Record<string, unknown>)[key] = JSON.parse(raw);
      } catch {
        (result as Record<string, unknown>)[key] = raw;
      }
    }
  }
  return result;
}
