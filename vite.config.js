import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/family-app/",   // GitHub Pages 저장소 이름에 맞게
});
