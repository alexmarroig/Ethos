import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { AppLayout } from "../layout/AppLayout";
import { Agenda } from "../pages/Agenda";
import { Contratos } from "../pages/Contratos";
import { Home } from "../pages/Home";
import { Login } from "../pages/Login";
import { Pacientes } from "../pages/Pacientes";
import { PortalContrato } from "../pages/PortalContrato";
import { Sessao } from "../pages/Sessao";
import { Splash } from "../pages/Splash";

export const AppRoutes = () => {
  const { status } = useAuth();

  if (status === "loading") {
    return <Splash />;
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/portal/contrato/:token" element={<PortalContrato />} />
      {status === "authenticated" ? (
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<Home />} />
          <Route path="/agenda" element={<Agenda />} />
          <Route path="/sessao" element={<Sessao />} />
          <Route path="/contratos" element={<Contratos />} />
          <Route path="/pacientes" element={<Pacientes />} />
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Route>
      ) : (
        <Route path="*" element={<Navigate to="/login" replace />} />
      )}
    </Routes>
  );
};
