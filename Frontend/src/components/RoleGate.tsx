import { ReactNode } from "react";
import { useAuth, UserRole } from "@/contexts/AuthContext";

interface RoleGateProps {
  children: ReactNode;
  allowed: UserRole[];
  fallback?: ReactNode;
}

const RoleGate = ({ children, allowed, fallback = null }: RoleGateProps) => {
  const { hasRole } = useAuth();

  if (!hasRole(...allowed)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

export default RoleGate;
