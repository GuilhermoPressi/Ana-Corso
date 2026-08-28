import { lazy, Suspense } from "react"
import { Route, Routes } from "react-router-dom"

import { AdminProtectedRoute } from "@/components/auth/AdminProtectedRoute"
import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { Skeleton } from "@/components/ui/skeleton"

// Autenticação & Admin
const Login = lazy(() => import("@/pages/Login"))
const Cadastro = lazy(() => import("@/pages/Cadastro"))
const AdminLogin = lazy(() => import("@/pages/AdminLogin"))
const AdminDashboard = lazy(() => import("@/pages/AdminDashboard"))
const AdminUsers = lazy(() => import("@/pages/AdminUsers"))
const AdminUserDetail = lazy(() => import("@/pages/AdminUserDetail"))
const AdminClinics = lazy(() => import("@/pages/AdminClinics"))

// Páginas da Aplicação
const Dashboard = lazy(() => import("@/pages/Dashboard"))
const Pacientes = lazy(() => import("@/pages/Pacientes"))
const PacienteDetalhe = lazy(() => import("@/pages/PacienteDetalhe"))
const PlanejamentoFacial = lazy(() => import("@/pages/PlanejamentoFacial"))
const Academia = lazy(() => import("@/pages/Academia"))
const Agenda = lazy(() => import("@/pages/Agenda"))
const AntesDepois = lazy(() => import("@/pages/AntesDepois"))
const Calculadoras = lazy(() => import("@/pages/Calculadoras"))
const Configuracoes = lazy(() => import("@/pages/Configuracoes"))
const ConsultaRapida = lazy(() => import("@/pages/ConsultaRapida"))
const Crm = lazy(() => import("@/pages/Crm"))
const Documentos = lazy(() => import("@/pages/Documentos"))
const Estoque = lazy(() => import("@/pages/Estoque"))
const Financeiro = lazy(() => import("@/pages/Financeiro"))
const IaEspecialista = lazy(() => import("@/pages/IaEspecialista"))
const Intercorrencias = lazy(() => import("@/pages/Intercorrencias"))
const MapaProcedimento = lazy(() => import("@/pages/MapaProcedimento"))
const Marketing = lazy(() => import("@/pages/Marketing"))
const NotFound = lazy(() => import("@/pages/NotFound"))
const PlanoPaciente = lazy(() => import("@/pages/PlanoPaciente"))
const PosProcedimento = lazy(() => import("@/pages/PosProcedimento"))
const Precificacao = lazy(() => import("@/pages/Precificacao"))
const Protocolos = lazy(() => import("@/pages/Protocolos"))
const Recuperador = lazy(() => import("@/pages/Recuperador"))

function PageFallback() {
  return (
    <div className="mx-auto max-w-[1400px] p-6">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="mt-3 h-4 w-80" />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
      <Skeleton className="mt-5 h-72" />
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      {/* Rotas Públicas */}
      <Route
        path="/login"
        element={
          <Suspense fallback={<PageFallback />}>
            <Login />
          </Suspense>
        }
      />
      <Route
        path="/cadastro"
        element={
          <Suspense fallback={<PageFallback />}>
            <Cadastro />
          </Suspense>
        }
      />
      <Route
        path="/admin/login"
        element={
          <Suspense fallback={<PageFallback />}>
            <AdminLogin />
          </Suspense>
        }
      />

      {/* Rotas de Administrador Protegidas */}
      <Route element={<AdminProtectedRoute />}>
        <Route
          element={
            <Suspense fallback={<PageFallback />}>
              <DashboardLayout />
            </Suspense>
          }
        >
          <Route
            path="admin"
            element={
              <Suspense fallback={<PageFallback />}>
                <AdminDashboard />
              </Suspense>
            }
          />
          <Route
            path="admin/users"
            element={
              <Suspense fallback={<PageFallback />}>
                <AdminUsers />
              </Suspense>
            }
          />
          <Route
            path="admin/users/:id"
            element={
              <Suspense fallback={<PageFallback />}>
                <AdminUserDetail />
              </Suspense>
            }
          />
          <Route
            path="admin/clinics"
            element={
              <Suspense fallback={<PageFallback />}>
                <AdminClinics />
              </Suspense>
            }
          />
        </Route>
      </Route>

      {/* Rotas da Aplicação Protegidas por Autenticação */}
      <Route element={<ProtectedRoute />}>
        <Route
          element={
            <Suspense fallback={<PageFallback />}>
              <DashboardLayout />
            </Suspense>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="pacientes" element={<Pacientes />} />
          <Route path="pacientes/:patientId" element={<PacienteDetalhe />} />
          <Route path="planejamento-facial" element={<PlanejamentoFacial />} />
          <Route path="mapa-do-procedimento" element={<MapaProcedimento />} />
          <Route path="calculadoras" element={<Calculadoras />} />
          <Route path="precificacao" element={<Precificacao />} />
          <Route path="protocolos" element={<Protocolos />} />
          <Route path="plano-da-paciente" element={<PlanoPaciente />} />
          <Route path="crm" element={<Crm />} />
          <Route path="recuperador" element={<Recuperador />} />
          <Route path="agenda" element={<Agenda />} />
          <Route path="pos-procedimento" element={<PosProcedimento />} />
          <Route path="intercorrencias" element={<Intercorrencias />} />
          <Route path="antes-e-depois" element={<AntesDepois />} />
          <Route path="marketing" element={<Marketing />} />
          <Route path="financeiro" element={<Financeiro />} />
          <Route path="estoque" element={<Estoque />} />
          <Route path="academia" element={<Academia />} />
          <Route path="consulta-rapida" element={<ConsultaRapida />} />
          <Route path="ia-da-especialista" element={<IaEspecialista />} />
          <Route path="documentos" element={<Documentos />} />
          <Route path="configuracoes" element={<Configuracoes />} />

          <Route path="*" element={<NotFound />} />
        </Route>
      </Route>
    </Routes>
  )
}
