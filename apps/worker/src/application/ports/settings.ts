/** Clés de woor.settings lues par le service de paiements. */
export type WorkerSettingKey = "payment_window_sec" | "cltv_delta_blocks";

/** Réglages modifiables sans redéploiement : toujours relus, jamais mis en cache. */
export interface SettingsReader {
  getInt(key: WorkerSettingKey): Promise<number>;
}
