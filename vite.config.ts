import path from "node:path"
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
    // @hello-pangea/dnd é pré-empacotado pelo Vite e acabava carregando uma
    // segunda cópia do React, o que derruba o DragDropContext com "Invalid hook call".
    dedupe: ["react", "react-dom", "react-reconciler", "scheduler", "three"],
  },
  optimizeDeps: {
    // Pré-empacotar tudo na mesma passada: o dnd importa "react-dom" e o app
    // importa "react-dom/client"; otimizados em passadas separadas, viram dois
    // renderers distintos e o DragDropContext quebra.
    include: [
      "react",
      "react-dom",
      "react-dom/client",
      "@hello-pangea/dnd",
      // O React Three Fiber renderiza por um reconciler próprio: se ele for
      // otimizado numa passada separada, carrega outra cópia do React e o
      // <Canvas> quebra com "Invalid hook call".
      "three",
      "@react-three/fiber",
      "@react-three/drei",
    ],
  },
  build:
    // O modo "demo" gera um bundle único, para ser inlinado em um HTML
    // self-contained (usado na demonstração publicada).
    mode === "demo"
      ? {
          outDir: "dist-demo",
          assetsInlineLimit: 100_000_000,
          cssCodeSplit: false,
          rolldownOptions: { output: { codeSplitting: false } },
        }
      : {},
}))
