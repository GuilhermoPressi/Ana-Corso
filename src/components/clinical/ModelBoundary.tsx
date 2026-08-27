import { Component, type ReactNode } from "react"

/**
 * O useGLTF suspende e depois lança quando o arquivo não existe. Sem uma
 * fronteira, isso derruba a árvore inteira — inclusive a página em volta do
 * Canvas. Aqui a falha vira um aviso e a cena cai no volume de reserva.
 */
export class ModelBoundary extends Component<
  { fallback: ReactNode; onError?: (error: Error) => void; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: Error) {
    this.props.onError?.(error)
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}
