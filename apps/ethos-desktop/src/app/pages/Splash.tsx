import React from "react";

export const Splash = () => {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0F172A",
        color: "#F8FAFC",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 12,
        fontFamily: "Inter, sans-serif",
      }}
    >
      <h1 style={{ margin: 0 }}>ETHOS</h1>
      <p style={{ margin: 0, color: "#94A3B8" }}>Carregando ambiente seguro...</p>
    </div>
  );
};
