import { defineConfig } from "vite";

export default defineConfig(({ mode }) => ({
  base: mode === "production" ? "/retro-shooter-3d/" : "/",
}));
