import { motion, useScroll, useTransform } from 'motion/react';
import { useRef } from 'react';
import { colors, fonts, radius, space, shadow } from '../theme';
import { ScrollReveal } from './ScrollReveal';

export type ScrollStep = { title: string; body: string; icon: string };

type Props = {
  title: string;
  subtitle: string;
  steps: ScrollStep[];
};

export function HorizontalScrollSteps({ title, subtitle, steps }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });
  const x = useTransform(scrollYProgress, [0, 1], ['2%', `-${(steps.length - 1) * 72}%`]);

  return (
    <section style={{ margin: '0 0 32px' }}>
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 24px 40px' }}>
        <ScrollReveal>
          <p style={eyebrow}>{subtitle}</p>
          <h2 style={heading}>{title}</h2>
        </ScrollReveal>
      </div>

      <div ref={containerRef} style={{ height: `${steps.length * 55}vh`, position: 'relative' }}>
        <div
          style={{
            position: 'sticky',
            top: 0,
            height: '100vh',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            background: `linear-gradient(180deg, ${colors.sky50} 0%, ${colors.white} 100%)`,
          }}
        >
          <motion.div
            style={{
              x,
              display: 'flex',
              gap: 28,
              padding: '0 max(24px, 5vw)',
              width: 'max-content',
            }}
          >
            {steps.map((step, index) => (
              <article key={step.title} style={stepCard}>
                <div style={stepIcon}>{step.icon}</div>
                <span style={stepNum}>Step {index + 1}</span>
                <h3 style={stepTitle}>{step.title}</h3>
                <p style={stepBody}>{step.body}</p>
              </article>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

const eyebrow: React.CSSProperties = {
  fontFamily: fonts.uiSemiBold,
  fontSize: 12,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: colors.teal500,
  margin: '0 0 8px',
};

const heading: React.CSSProperties = {
  fontFamily: fonts.uiSemiBold,
  fontSize: 36,
  lineHeight: 1.15,
  color: colors.ink,
  margin: 0,
  letterSpacing: '-0.02em',
};

const stepCard: React.CSSProperties = {
  flexShrink: 0,
  width: 'min(420px, 78vw)',
  background: colors.white,
  borderRadius: radius.xl,
  padding: '36px 32px',
  border: `1px solid ${colors.line}`,
  boxShadow: '0 12px 40px rgba(6,32,53,0.08)',
};

const stepIcon: React.CSSProperties = {
  width: 56,
  height: 56,
  borderRadius: radius.lg,
  background: colors.tealSoft,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 28,
  marginBottom: 20,
};

const stepNum: React.CSSProperties = {
  fontFamily: fonts.data,
  fontSize: 13,
  color: colors.gold500,
  fontWeight: 600,
};

const stepTitle: React.CSSProperties = {
  fontFamily: fonts.uiSemiBold,
  fontSize: 24,
  color: colors.ink,
  margin: '8px 0 12px',
};

const stepBody: React.CSSProperties = {
  fontFamily: fonts.ui,
  fontSize: 16,
  lineHeight: 1.65,
  color: colors.inkMuted,
  margin: 0,
};
