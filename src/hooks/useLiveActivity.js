import { isNative } from '@/lib/capacitor';
import { registerPlugin } from '@capacitor/core';

const TimerLiveActivity = registerPlugin('TimerLiveActivity');

export async function startTimerLiveActivity(projectName, startTime) {
  if (!isNative()) return;
  try {
    const { available } = await TimerLiveActivity.isAvailable();
    if (!available) return;

    await TimerLiveActivity.start({
      projectName,
      startTime: new Date(startTime).getTime(),
    });
  } catch (err) {
    // Non-critical — app works without Live Activity
    console.warn('Live Activity start failed:', err);
  }
}

export async function stopTimerLiveActivity() {
  if (!isNative()) return;
  try {
    await TimerLiveActivity.stop();
  } catch (err) {
    console.warn('Live Activity stop failed:', err);
  }
}
