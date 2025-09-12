import path from "path";
import { defineConfig } from 'vite';

// https://vitejs.dev/config
export default defineConfig(async () => {
  const [{ default: react }, { default: tailwindcss }] = await Promise.all([
    import("@vitejs/plugin-react"),
    import("@tailwindcss/vite")
  ]);

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
