import type { Config } from "@react-router/dev/config";

export default {
  // Rendu serveur : les pages s'affichent même si le JavaScript charge mal en 3G.
  ssr: true,
} satisfies Config;
