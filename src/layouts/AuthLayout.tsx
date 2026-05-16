import type { ReactNode } from "react";

interface AuthLayoutProps {
  children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="auth">
      <div className="auth__box">
        <span className="auth__brand">Trama</span>
        {children}
      </div>
    </div>
  );
}