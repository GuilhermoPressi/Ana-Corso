import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter, HashRouter } from "react-router-dom"

import App from "@/App"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/ui/sonner"
import "./index.css"

/** O build de demonstração roda em host estático, onde só o hash sobrevive a um refresh. */
const Router = import.meta.env.VITE_ROUTER === "hash" ? HashRouter : BrowserRouter

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Router>
      <TooltipProvider delayDuration={200}>
        <App />
        <Toaster position="top-right" richColors />
      </TooltipProvider>
    </Router>
  </StrictMode>,
)
