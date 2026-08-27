import { Routes, Route } from "react-router-dom";
import AreaEstudosPage from "./pages/AreaEstudosPage.jsx";
import TelaProvaPage from "./pages/TelaProvaPage.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<AreaEstudosPage />} />
      <Route path="/tela-prova" element={<TelaProvaPage />} />
    </Routes>
  );
}
