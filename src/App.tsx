import { lazy, Suspense } from 'react'
import { NavLink, Navigate, Route, Routes } from 'react-router-dom'

const DrivePage = lazy(() => import('./pages/DrivePage').then((module) => ({ default: module.DrivePage })))
const ManipulatorPage = lazy(() => import('./pages/ManipulatorPage').then((module) => ({ default: module.ManipulatorPage })))

export default function App() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <NavLink className="brand" to="/drive" aria-label="Ridgeback lab home">
          <span className="brand-mark">RF</span>
          <span><strong>Ridgeback / Franka</strong><small>Robotics simulation lab</small></span>
        </NavLink>
        <nav aria-label="Simulation pages">
          <NavLink to="/drive">01 · Mobile base</NavLink>
          <NavLink to="/manipulator">02 · Manipulator</NavLink>
        </nav>
        <span className="system-status"><i /> Simulation ready</span>
      </header>
      <main>
        <Suspense fallback={<div className="route-loader"><span>Loading simulation</span></div>}>
          <Routes>
            <Route path="/drive" element={<DrivePage />} />
            <Route path="/manipulator" element={<ManipulatorPage />} />
            <Route path="*" element={<Navigate to="/drive" replace />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  )
}
