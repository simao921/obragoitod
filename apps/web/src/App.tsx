import { useEffect } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { MaintenanceGate } from "@obragoito/ui";
import { SiteHeader } from "./components/SiteHeader";
import { SiteFooter } from "./components/SiteFooter";
import { CookieConsent } from "./components/CookieConsent";
import { Home } from "./pages/Home";
import { Servicos } from "./pages/Servicos";
import { Projetos } from "./pages/Projetos";
import { ProjetoDetalhe } from "./pages/ProjetoDetalhe";
import { Sobre } from "./pages/Sobre";
import { Contactos } from "./pages/Contactos";
import { Privacidade } from "./pages/Privacidade";
import { NaoEncontrado } from "./pages/NaoEncontrado";

function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      const target = document.getElementById(hash.slice(1));
      if (target) {
        target.scrollIntoView({ behavior: "auto", block: "start" });
        return;
      }
    }
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [pathname, hash]);
  return null;
}

export function App() {
  return (
    <MaintenanceGate portal="Obragoito">
      <a className="skip-link" href="#conteudo">
        Saltar para o conteúdo
      </a>
      <ScrollToTop />
      <SiteHeader />
      <main id="conteudo">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/home" element={<Home />} />
          <Route path="/servicos" element={<Servicos />} />
          <Route path="/projetos" element={<Projetos />} />
          <Route path="/projetos/:slug" element={<ProjetoDetalhe />} />
          <Route path="/sobre" element={<Sobre />} />
          <Route path="/contactos" element={<Contactos />} />
          <Route path="/privacidade" element={<Privacidade />} />
          <Route path="*" element={<NaoEncontrado />} />
        </Routes>
      </main>
      <SiteFooter />
      <CookieConsent />
    </MaintenanceGate>
  );
}
