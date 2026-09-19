import type { ReactNode } from "react";

export function PhoneShell({ children }: { children: ReactNode }) {
  return (
    <div className="studio">
      <div className="phone">
        <div className="phone-island" aria-hidden="true" />
        <div className="phone-screen">{children}</div>
        <div className="phone-home" aria-hidden="true" />
      </div>
    </div>
  );
}
