import type { ReactNode } from "react";

interface AuthLayoutProps {
  children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="auth">
      <main className="auth__body">
        <div className="auth__container">{children}</div>
      </main>
    </div>
  );
}
