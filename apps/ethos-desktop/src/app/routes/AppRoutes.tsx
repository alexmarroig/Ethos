import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { PatientAuthProvider, usePatientAuth } from "../auth/PatientAuthContext";
import { AppLayout } from "../layout/AppLayout";
import { Agenda } from "../pages/Agenda";
import { Forms } from "../pages/Forms";
import { Home } from "../pages/Home";
import { Login } from "../pages/Login";
import { Pacientes } from "../pages/Pacientes";
import { Sessao } from "../pages/Sessao";
import { Splash } from "../pages/Splash";
import { PatientLogin } from "../pages/patient/PatientLogin";
import { PatientPortal } from "../pages/patient/PatientPortal";

const PatientPortalRoutes = () => {
  const { status } = usePatientAuth();

  if (status === "loading") {
    return <Splash />;
  }

  return (
    <Routes>
      {status === "authenticated" ? (
        <Route path="*" element={<PatientPortal />} />
      ) : (
        <Route path="*" element={<PatientLogin />} />
      )}
    </Routes>
  );
};

export const AppRoutes = () => {
  const { status } = useAuth();

  if (status === "loading") {
    return <Splash />;
  }

  return (
    <Routes>
      <Route
        path="/portal/*"
        element={
          <PatientAuthProvider>
            <PatientPortalRoutes />
          </PatientAuthProvider>
        }
      />
      <Route path="/login" element={<Login />} />
      {status === "authenticated" ? (
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<Home />} />
          <Route path="/agenda" element={<Agenda />} />
          <Route path="/sessao" element={<Sessao />} />
          <Route path="/pacientes" element={<Pacientes />} />
          <Route path="/formularios" element={<Forms />} />
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Route>
      ) : (
        <Route path="*" element={<Navigate to="/login" replace />} />
      )}
    </Routes>
  );
};
