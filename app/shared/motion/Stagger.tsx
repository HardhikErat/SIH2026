import { ReactNode } from 'react';

export function Stagger({ children }: { children: ReactNode; stagger?: number }) {
  return <>{children}</>;
}
