/**
 * Subscribe to changes of one module setting, on every client.
 *
 * Foundry stores each world setting as a Setting *document*: the very first
 * write CREATES it (firing `createSetting`), every later write fires
 * `updateSetting`. Listening to `updateSetting` alone silently misses the
 * first change in a world's lifetime — e.g. the first graph refresh or the
 * GM's first "Hide from players".
 *
 * @param settingKey fully qualified key (`<module-id>.<setting>`).
 * @param onChange called after the new value is readable via `game.settings.get`.
 * @returns unsubscribe function.
 */
export function subscribeToSettingChanges(settingKey: string, onChange: () => void): () => void {
  const handler = (setting: unknown) => {
    const key = (setting as { key?: string } | null)?.key;
    if (key !== settingKey) return;
    onChange();
  };
  const createdId = Hooks.on('createSetting', handler);
  const updatedId = Hooks.on('updateSetting', handler);
  return () => {
    Hooks.off('createSetting', createdId);
    Hooks.off('updateSetting', updatedId);
  };
}
