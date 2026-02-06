import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { AppLayout } from "../layout/AppLayout";
import { Agenda } from "../pages/Agenda";
import { Home } from "../pages/Home";
import { Login } from "../pages/Login";
import { Pacientes } from "../pages/Pacientes";
import { Sessao } from "../pages/Sessao";
import { Splash } from "../pages/Splash";
import { Templates } from "../pages/Templates";

export const AppRoutes = () => {
  const { status } = useAuth();

  if (status === "loading") {
    return <Splash />;
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      {status === "authenticated" ? (
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<Home />} />
          <Route path="/agenda" element={<Agenda />} />
          <Route path="/sessao" element={<Sessao />} />
          <Route path="/pacientes" element={<Pacientes />} />
          <Route path="/templates" element={<Templates />} />
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Route>
      ) : (
        <Route path="*" element={<Navigate to="/login" replace />} />
      )}
    </Routes>
  );
};
