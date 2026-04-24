import { ReactNode, useEffect } from "react";
import RoleGate from "@/components/RoleGate";
import { pageAccess, type Page, type PageRole } from "@/pages/pageRegistry";

type ProtectedPageProps = {
  page: Page;
  hasRole: (...roles: string[]) => boolean;
  onNavigate: (page: string) => void;
  children: ReactNode;
};

export function ProtectedPage({ page, hasRole, onNavigate, children }: ProtectedPageProps) {
  const allowed = pageAccess[page];
  if (!allowed) return <>{children}</>;

  return (
    <RoleGate allowed={allowed} fallback={<FallbackRedirect hasRole={hasRole} onNavigate={onNavigate} />}>
      {children}
    </RoleGate>
  );
}

function FallbackRedirect({
  hasRole,
  onNavigate,
}: {
  hasRole: (...roles: string[]) => boolean;
  onNavigate: (page: string) => void;
}) {
  const defaultPage = getDefaultPage(hasRole);

  useEffect(() => {
    onNavigate(defaultPage);
  }, [defaultPage, onNavigate]);

  return (
    <div className="content-container py-12 text-center">
      <p className="text-muted-foreground">Acesso não permitido.</p>
      <button onClick={() => onNavigate(defaultPage)} className="mt-4 text-sm text-primary hover:underline">
        Ir para página inicial
      </button>
    </div>
  );
}

function getDefaultPage(hasRole: (...roles: string[]) => boolean): Page {
  if (hasRole("patient" satisfies PageRole)) return "patient-home";
  if (hasRole("admin" satisfies PageRole)) return "admin-dashboard";
  return "home";
}
