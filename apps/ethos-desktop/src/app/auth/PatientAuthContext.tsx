import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type PatientAuthStatus = "loading" | "authenticated" | "unauthenticated";

export type PatientUser = {
  id: string;
  name: string;
  email: string;
};

type PatientAuthContextValue = {
  status: PatientAuthStatus;
  patient: PatientUser | null;
  login: (patient: PatientUser) => void;
  logout: () => void;
};

const PatientAuthContext = createContext<PatientAuthContextValue | undefined>(undefined);

const STORAGE_KEY = "ethos.patient.auth";

export const PatientAuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [status, setStatus] = useState<PatientAuthStatus>("loading");
  const [patient, setPatient] = useState<PatientUser | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as PatientUser;
        if (parsed?.id && parsed?.name && parsed?.email) {
          setPatient(parsed);
          setStatus("authenticated");
          return;
        }
      } catch {
        // ignore corrupted storage
      }
    }
    setStatus("unauthenticated");
  }, []);

  const login = (nextPatient: PatientUser) => {
    setPatient(nextPatient);
    setStatus("authenticated");
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextPatient));
  };

  const logout = () => {
    setPatient(null);
    setStatus("unauthenticated");
    localStorage.removeItem(STORAGE_KEY);
  };

  const value = useMemo(
    () => ({
      status,
      patient,
      login,
      logout,
    }),
    [status, patient]
  );

  return <PatientAuthContext.Provider value={value}>{children}</PatientAuthContext.Provider>;
};

export const usePatientAuth = () => {
  const context = useContext(PatientAuthContext);
  if (!context) {
    throw new Error("usePatientAuth must be used within PatientAuthProvider");
  }
  return context;
};
