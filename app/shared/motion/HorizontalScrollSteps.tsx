import { ReactNode } from 'react';

type Step = { title: string; body: string; icon: ReactNode };

export function HorizontalScrollSteps({ steps }: { steps: Step[]; title: string; subtitle: string }) {
  return null;
}

export type ScrollStep = Step;
