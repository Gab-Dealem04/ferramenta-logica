import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'build' ? '/ferramenta-logica/' : '/',
  server: {
    host: true, // Expõe o servidor para a rede local (0.0.0.0)
    port: 5173, // Opcional: fixa a porta (padrão é 5173)
  },
}));  