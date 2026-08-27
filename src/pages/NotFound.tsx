import { Compass } from "lucide-react"
import { Link } from "react-router-dom"

import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="grid min-h-[60vh] place-items-center text-center">
      <div>
        <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-accent">
          <Compass className="size-7 text-primary" />
        </div>
        <h1 className="mt-5 font-display text-2xl font-semibold">Página não encontrada</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          O endereço acessado não existe ou foi movido.
        </p>
        <Button asChild className="mt-6 rounded-full">
          <Link to="/">Ir para Minha Clínica</Link>
        </Button>
      </div>
    </div>
  )
}
