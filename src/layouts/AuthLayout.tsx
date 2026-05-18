import type { ReactNode } from "react";

interface AuthLayoutProps {
  children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="auth">
      <header className="auth__header">
        <span className="auth__brand">
          Trama<span className="auth__brand-dot">.</span>
        </span>
      </header>
      <main className="auth__body">
        <div className="auth__container">{children}</div>
      </main>
    </div>
  );
}
