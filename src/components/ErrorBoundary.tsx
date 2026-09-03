import React, { Component, type ErrorInfo, type ReactNode } from "react"
import { AlertTriangle, RotateCcw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error caught by ErrorBoundary:", error, errorInfo)
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null })
    window.location.reload()
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex min-h-[400px] w-full items-center justify-center p-6">
          <Card className="max-w-md border-border/80 shadow-lg">
            <CardHeader className="text-center">
              <div className="mx-auto mb-3 grid size-12 place-items-center rounded-2xl bg-destructive/10 text-destructive">
                <AlertTriangle className="size-6" />
              </div>
              <CardTitle className="font-display text-lg font-semibold">
                Não foi possível carregar esta página
              </CardTitle>
              <CardDescription className="text-xs">
                Ocorreu uma falha temporária durante a exibição dos dados. Tente recarregar a tela.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-3">
              <Button onClick={this.handleReset} className="w-full gap-2">
                <RotateCcw className="size-4" />
                Tentar novamente
              </Button>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}
