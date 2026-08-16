import { lazy, Suspense } from "react";
import { NavLink, Navigate, Route, Routes } from "react-router-dom";

const DrivePage = lazy(() =>
  import('./pages/DrivePage').then((module) => ({
    default: module.DrivePage
  }))
)

const ManipulatorPage = lazy(() => 
  import('./pages/ManipulatorPage').then((module) => ({
    default: module.ManipulatorPage
  }))
)

export default function App() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <NavLink to="/drive">Ridgeback / Franka</NavLink>
        <nav>
          <NavLink to="/drive">Mobile base</NavLink>
          <NavLink to="/manipulator">Manipulator</NavLink>
        </nav>
      </header>
      <main>
        <Suspense fallback={<div className="placeholder">Loading</div>}>
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