import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const serverEnv = loadEnv(mode, process.cwd(), "");
  for (const key of ["STRIPE_SECRET_KEY", "APP_BASE_URL"]) {
    if (!process.env[key] && serverEnv[key]) {
      process.env[key] = serverEnv[key];
    }
  }

  return {
    plugins: [tailwindcss(), reactRouter()],
    resolve: {
      tsconfigPaths: true,
    },
  };
});
