import type { Config } from "@react-router/dev/config";
import { vercelPreset } from "@vercel/react-router/vite";

export default {
  // Rendu serveur : les pages s'affichent même si le JavaScript charge mal en 3G.
  ssr: true,
  // Sur Vercel seulement : adapte la sortie aux fonctions Vercel. En local, rien ne change.
  presets: process.env.VERCEL ? [vercelPreset()] : [],
} satisfies Config;
