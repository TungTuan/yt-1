import { NavLink, Route, Routes, Navigate } from 'react-router-dom';
import Calendar from './pages/Calendar';
import ReviewQueue from './pages/ReviewQueue';
import ExcelImport from './pages/ExcelImport';
import QualityReview from './pages/QualityReview';

export default function App() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>こもれび便り × 햇살 편지</h1>
        <nav>
          <NavLink to="/calendar" className={({ isActive }) => (isActive ? 'active' : '')}>
            Lịch nội dung
          </NavLink>
          <NavLink to="/review" className={({ isActive }) => (isActive ? 'active' : '')}>
            Kiểm duyệt
          </NavLink>
          <NavLink to="/import" className={({ isActive }) => (isActive ? 'active' : '')}>
            Import Excel
          </NavLink>
          <NavLink to="/quality" className={({ isActive }) => (isActive ? 'active' : '')}>
            QA nội dung
          </NavLink>
        </nav>
      </header>
      <main className="app-main">
        <Routes>
          <Route path="/" element={<Navigate to="/calendar" replace />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/review" element={<ReviewQueue />} />
          <Route path="/import" element={<ExcelImport />} />
          <Route path="/quality" element={<QualityReview />} />
        </Routes>
      </main>
    </div>
  );
}
