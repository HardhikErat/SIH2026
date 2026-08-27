import { router } from 'expo-router';
import { motion } from 'motion/react';
import {
  BrandMark,
  IconBolt,
  IconCheck,
  IconCheckSimple,
  IconClipboard,
  IconDoctor,
  IconGlobe,
  IconHospital,
  IconLock,
  IconMic,
  IconShield,
  IconSpeak,
} from '../components/icons';
import { colors, fonts, radius } from '../theme';
import { HorizontalScrollSteps } from '../motion/HorizontalScrollSteps';
import { ParallaxHero } from '../motion/ParallaxHero';
import { ScrollProgressBar } from '../motion/ScrollProgressBar';
import { ScrollReveal } from '../motion/ScrollReveal';
import { RobotEyes } from '../components/RobotEyes';

const STEPS = [
  {
    icon: <IconGlobe size={28} color={colors.teal700} />,
    title: 'Choose your language',
    body: 'Pick from 22+ scheduled languages. Speak naturally — we transcribe and structure your symptoms.',
  },
  {
    icon: <IconMic size={28} color={colors.teal700} />,
    title: 'Voice or text intake',
    body: 'Tap Speak and describe your problem. The assistant asks follow-up questions until the picture is clear.',
  },
  {
    icon: <IconCheck size={28} color={colors.teal700} />,
    title: 'Confirm your summary',
    body: 'Review what we understood. Edit anything before it goes to the doctor — nothing is final without you.',
  },
  {
    icon: <IconDoctor size={28} color={colors.teal700} />,
    title: 'Doctor verifies',
    body: 'A clinician reviews, corrects, and signs off. Only verified information enters your consultation.',
  },
];

const FEATURES = [
  {
    icon: <IconShield size={28} color={colors.teal700} />,
    title: 'Clinician in the loop',
    body: 'Every AI suggestion stays pending until a doctor verifies. No auto-diagnosis, no silent errors.',
  },
  {
    icon: <IconSpeak size={28} color={colors.teal700} />,
    title: 'Multilingual by design',
    body: 'Built for rural camps and urban OPDs — Hindi, Tamil, Telugu, Bengali, and 18 more languages.',
  },
  {
    icon: <IconBolt size={28} color={colors.teal700} />,
    title: 'Under 5 minutes',
    body: 'Structured intake in the time it takes to fill a paper form — without the handwriting puzzle.',
  },
  {
    icon: <IconClipboard size={28} color={colors.teal700} />,
    title: 'Queue-ready summaries',
    body: 'Doctors see chief complaint, duration, meds, and allergies — formatted and flagged for urgency.',
  },
];

const TRUST_ITEMS = [
  { icon: <IconHospital size={18} color={colors.inkMuted} />, label: 'Trusted camp workflow' },
  { icon: <IconLock size={18} color={colors.inkMuted} />, label: 'Data stays with your doctor' },
  { icon: <IconCheckSimple size={18} color={colors.inkMuted} />, label: 'AI never auto-diagnoses' },
  { icon: <IconGlobe size={18} color={colors.inkMuted} />, label: '22 scheduled languages' },
];

const PORTALS = [
  {
    role: 'Patient',
    title: 'Start your intake',
    body: 'Tell us your problem by voice or text. A doctor will review before your consultation.',
    cta: 'Begin intake',
    href: '/start',
    accent: colors.teal500,
  },
  {
    role: 'Doctor',
    title: 'Review the queue',
    body: 'See who is waiting, edit AI summaries, and Verify & Save before consultation.',
    cta: 'Doctor login',
    href: '/(doctor)/login',
    accent: colors.navy700,
  },
];

export default function LandingScreen() {
  return (
    <div style={{ background: colors.white, minHeight: '100vh' }}>
      <style>{`
        .landing-hero-inner {
          display: grid !important;
          grid-template-columns: minmax(0, 1.12fr) minmax(0, 0.88fr) !important;
          align-items: center;
          gap: clamp(12px, 3vw, 40px);
        }
        .landing-hero-robot {
          width: min(100%, 46vw, calc(68vh * 0.9)) !important;
          max-width: 520px !important;
          justify-self: end !important;
          order: 0 !important;
        }
        .landing-hero-title {
          font-size: clamp(1.65rem, 3.4vw, 3.6rem) !important;
        }
        .landing-nav-links { display: none; }
        @media (min-width: 960px) {
          .landing-nav-links { display: flex; }
        }
      `}</style>
      <ScrollProgressBar />
      <SiteNav />

      <ParallaxHero style={{ minHeight: '100vh' }}>
        <div style={heroShell}>
        <div className="landing-hero-inner" style={heroInner}>
          <div style={heroCopy}>
          <ScrollReveal delay={0.05}>
            <div style={heroBadge}>
              <span style={heroBadgeDot} />
              NABH-aligned workflow · Camp intake live
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.12}>
            <h1 className="landing-hero-title" style={heroTitle}>
              Care begins before you see the doctor
            </h1>
          </ScrollReveal>

          <ScrollReveal delay={0.2}>
            <p style={heroSubtitle}>
              Hospital-grade pre-consultation for outreach camps and OPD queues. Voice-first, multilingual,
              and always verified by a clinician before your visit.
            </p>
          </ScrollReveal>

          <ScrollReveal delay={0.28}>
            <div style={heroCtas}>
              <motion.button
                type="button"
                style={ctaPrimary}
                whileHover={{ y: -2, boxShadow: '0 12px 32px rgba(6,32,53,0.25)' }}
                whileTap={{ scale: 0.98 }}
                onClick={() => router.push('/start')}
              >
                Start patient intake
              </motion.button>
              <motion.button
                type="button"
                style={ctaSecondary}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => router.push('/(doctor)/login')}
              >
                Doctor portal
              </motion.button>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.36}>
            <div style={heroStats}>
              {[
                ['22+', 'Languages supported'],
                ['< 5 min', 'Average intake time'],
                ['100%', 'Doctor verified'],
                ['24/7', 'Camp-ready PWA'],
              ].map(([value, label]) => (
                <div key={label} style={heroStat}>
                  <div style={heroStatValue}>{value}</div>
                  <div style={heroStatLabel}>{label}</div>
                </div>
              ))}
            </div>
          </ScrollReveal>
          </div>
          <div className="landing-hero-robot" style={heroRobot}>
            <RobotEyes idPrefix="landing" style={{ maxWidth: '100%' }} />
          </div>
        </div>
        <div style={heroTrust}>
          {[
            { icon: <IconCheckSimple size={16} color={colors.navy800} />, label: 'Trusted camp workflow' },
            { icon: <IconLock size={16} color={colors.navy800} />, label: 'Data stays with your doctor' },
            { icon: <IconCheckSimple size={16} color={colors.navy800} />, label: 'AI never auto-diagnoses' },
          ].map((item) => (
            <span key={item.label} style={heroTrustItem}>
              <span style={trustIcon}>{item.icon}</span>
              {item.label}
            </span>
          ))}
        </div>
        </div>
      </ParallaxHero>

      <section style={trustBand}>
        <div style={trustInner}>
          {TRUST_ITEMS.map((item) => (
            <span key={item.label} style={trustItem}>
              <span style={trustIcon}>{item.icon}</span>
              {item.label}
            </span>
          ))}
        </div>
      </section>

      <section id="features" style={section}>
        <div style={sectionInner}>
          <ScrollReveal>
            <p style={eyebrow}>Why camps choose us</p>
            <h2 style={sectionTitle}>Built like a hospital system, sized for the field</h2>
            <p style={sectionSubtitle}>
              Inspired by enterprise healthcare portals — calm, trustworthy, and fast. No clutter, no guesswork.
            </p>
          </ScrollReveal>

          <div style={featureGrid}>
            {FEATURES.map((f, i) => (
              <ScrollReveal key={f.title} delay={i * 0.08}>
                <article style={featureCard}>
                  <div style={featureIcon}>{f.icon}</div>
                  <h3 style={featureTitle}>{f.title}</h3>
                  <p style={featureBody}>{f.body}</p>
                </article>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <div id="how">
        <HorizontalScrollSteps
        title="How it works"
        subtitle="Your journey"
        steps={STEPS}
        />
      </div>

      <section id="portals" style={{ ...section, background: colors.navy900 }}>
        <div style={sectionInner}>
          <ScrollReveal>
            <p style={{ ...eyebrow, color: colors.gold400 }}>Choose your portal</p>
            <h2 style={{ ...sectionTitle, color: colors.white }}>One platform, two roles</h2>
          </ScrollReveal>

          <div style={portalGrid}>
            {PORTALS.map((p, i) => (
              <ScrollReveal key={p.role} delay={i * 0.1}>
                <motion.article
                  style={portalCard}
                  whileHover={{ y: -6, boxShadow: '0 20px 48px rgba(0,0,0,0.25)' }}
                  transition={{ duration: 0.25 }}
                >
                  <div style={{ ...portalAccent, background: p.accent }} />
                  <span style={portalRole}>{p.role}</span>
                  <h3 style={portalTitle}>{p.title}</h3>
                  <p style={portalBody}>{p.body}</p>
                  <motion.button
                    type="button"
                    style={portalCta}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => router.push(p.href as '/start')}
                  >
                    {p.cta} →
                  </motion.button>
                </motion.article>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <section style={ctaSection}>
        <ScrollReveal>
          <h2 style={ctaTitle}>Ready to streamline your camp intake?</h2>
          <p style={ctaSubtitle}>Start a patient session in under a minute — no app install required.</p>
          <motion.button
            type="button"
            style={{ ...ctaPrimary, margin: '0 auto' }}
            whileHover={{ y: -2, boxShadow: '0 12px 32px rgba(6,32,53,0.25)' }}
            whileTap={{ scale: 0.98 }}
            onClick={() => router.push('/start')}
          >
            Start patient intake
          </motion.button>
        </ScrollReveal>
      </section>

      <footer style={footer}>
        <div style={footerInner}>
          <div>
            <div style={footerBrandRow}>
              <BrandMark size={40} />
              <div style={footerLogo}>Aira</div>
            </div>
            <p style={footerTag}>Pre-consultation · Multilingual · Doctor-verified</p>
          </div>
          <p style={footerCopy}>© 2026 · Your data is shared only with your care team</p>
        </div>
      </footer>
    </div>
  );
}

function SiteNav() {
  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      style={nav}
    >
      <div style={navInner}>
        <div style={navBrand}>
          <BrandMark size={42} />
          <span style={navName}>Aira</span>
        </div>
        <nav className="landing-nav-links" style={navLinks}>
          <a href="#features" style={navLink}>Features</a>
          <a href="#how" style={navLink}>How it works</a>
          <a href="#portals" style={navLink}>Portals</a>
        </nav>
      </div>
    </motion.header>
  );
}

/* ── Styles ── */
const heroShell: React.CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
};

const heroInner: React.CSSProperties = {
  maxWidth: 1180,
  margin: '0 auto',
  padding: '108px 28px 20px',
  width: '100%',
  flex: 1,
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1.12fr) minmax(0, 0.88fr)',
  gap: 24,
  alignItems: 'center',
  boxSizing: 'border-box',
};

const heroCopy: React.CSSProperties = {
  minWidth: 0,
};

const heroRobot: React.CSSProperties = {
  width: '100%',
  maxWidth: 520,
  justifySelf: 'end',
  alignSelf: 'center',
};

const heroTrust: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  justifyContent: 'space-around',
  alignItems: 'center',
  gap: '10px 28px',
  marginTop: 8,
  padding: '14px 32px',
  background: 'rgba(255,255,255,0.94)',
};

const heroTrustItem: React.CSSProperties = {
  fontFamily: fonts.ui,
  fontSize: 13,
  color: colors.navy800,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
};

const heroBadge: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '8px 16px',
  borderRadius: 999,
  background: 'rgba(255,255,255,0.12)',
  border: '1px solid rgba(255,255,255,0.2)',
  color: 'rgba(255,255,255,0.9)',
  fontFamily: fonts.uiSemiBold,
  fontSize: 13,
  marginBottom: 28,
  backdropFilter: 'blur(8px)',
};

const heroBadgeDot: React.CSSProperties = {
  width: 8,
  height: 8,
  borderRadius: '50%',
  background: colors.teal400,
  boxShadow: `0 0 8px ${colors.teal400}`,
};

const heroTitle: React.CSSProperties = {
  fontFamily: fonts.uiSemiBold,
  fontSize: 'clamp(1.65rem, 3.4vw, 3.6rem)',
  lineHeight: 1.08,
  color: colors.white,
  margin: '0 0 20px',
  letterSpacing: '-0.03em',
  maxWidth: 640,
};

const heroTitleAccent: React.CSSProperties = {
  background: `linear-gradient(90deg, ${colors.gold400}, ${colors.teal400})`,
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
};

const heroSubtitle: React.CSSProperties = {
  fontFamily: fonts.ui,
  fontSize: 'clamp(0.92rem, 1.6vw, 1.15rem)',
  lineHeight: 1.65,
  color: 'rgba(255,255,255,0.82)',
  maxWidth: 540,
  margin: '0 0 28px',
};

const heroCtas: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 16,
  marginBottom: 56,
};

const ctaPrimary: React.CSSProperties = {
  fontFamily: fonts.uiSemiBold,
  fontSize: 16,
  padding: '16px 32px',
  borderRadius: radius.lg,
  border: 'none',
  cursor: 'pointer',
  color: colors.white,
  background: colors.statusOk,
  boxShadow: '0 8px 24px rgba(45,122,79,0.35)',
};

const ctaSecondary: React.CSSProperties = {
  fontFamily: fonts.uiSemiBold,
  fontSize: 16,
  padding: '16px 32px',
  borderRadius: radius.lg,
  border: '1px solid rgba(255,255,255,0.35)',
  cursor: 'pointer',
  color: colors.white,
  background: 'rgba(255,255,255,0.08)',
  backdropFilter: 'blur(8px)',
};

const heroStats: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 16,
  maxWidth: 420,
  paddingTop: 28,
  borderTop: '1px solid rgba(255,255,255,0.18)',
};

const heroStat: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4 };
const heroStatValue: React.CSSProperties = {
  fontFamily: fonts.dataSemiBold,
  fontSize: 28,
  color: colors.white,
  fontWeight: 600,
};
const heroStatLabel: React.CSSProperties = {
  fontFamily: fonts.ui,
  fontSize: 13,
  color: 'rgba(255,255,255,0.65)',
};

const trustBand: React.CSSProperties = {
  background: colors.white,
  borderBottom: `1px solid ${colors.line}`,
  padding: '20px 24px',
};

const trustInner: React.CSSProperties = {
  maxWidth: 1120,
  margin: '0 auto',
  display: 'flex',
  flexWrap: 'wrap',
  justifyContent: 'center',
  gap: '12px 32px',
};

const trustItem: React.CSSProperties = {
  fontFamily: fonts.uiSemiBold,
  fontSize: 14,
  color: colors.inkMuted,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
};

const trustIcon: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
};

const section: React.CSSProperties = { padding: '96px 24px' };
const sectionInner: React.CSSProperties = { maxWidth: 1120, margin: '0 auto' };

const eyebrow: React.CSSProperties = {
  fontFamily: fonts.uiSemiBold,
  fontSize: 12,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: colors.teal500,
  margin: '0 0 12px',
};

const sectionTitle: React.CSSProperties = {
  fontFamily: fonts.uiSemiBold,
  fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
  lineHeight: 1.15,
  color: colors.ink,
  margin: '0 0 16px',
  letterSpacing: '-0.02em',
};

const sectionSubtitle: React.CSSProperties = {
  fontFamily: fonts.ui,
  fontSize: 18,
  lineHeight: 1.65,
  color: colors.inkMuted,
  maxWidth: 560,
  margin: '0 0 48px',
};

const featureGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))',
  gap: 24,
  maxWidth: 960,
  margin: '0 auto',
};

const featureCard: React.CSSProperties = {
  background: colors.white,
  borderRadius: radius.xl,
  padding: '32px 28px',
  border: `1px solid ${colors.line}`,
  boxShadow: '0 4px 20px rgba(6,32,53,0.05)',
  height: '100%',
};

const featureIcon: React.CSSProperties = {
  marginBottom: 20,
  width: 56,
  height: 56,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: colors.tealSoft,
  borderRadius: radius.lg,
};

const featureTitle: React.CSSProperties = {
  fontFamily: fonts.uiSemiBold,
  fontSize: 20,
  color: colors.ink,
  margin: '0 0 10px',
};

const featureBody: React.CSSProperties = {
  fontFamily: fonts.ui,
  fontSize: 15,
  lineHeight: 1.65,
  color: colors.inkMuted,
  margin: 0,
};

const portalGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
  gap: 24,
  marginTop: 48,
};

const portalCard: React.CSSProperties = {
  position: 'relative',
  background: 'rgba(255,255,255,0.06)',
  borderRadius: radius.xl,
  padding: '36px 28px',
  border: '1px solid rgba(255,255,255,0.12)',
  overflow: 'hidden',
};

const portalAccent: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  height: 4,
};

const portalRole: React.CSSProperties = {
  fontFamily: fonts.uiSemiBold,
  fontSize: 12,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: colors.gold400,
};

const portalTitle: React.CSSProperties = {
  fontFamily: fonts.uiSemiBold,
  fontSize: 22,
  color: colors.white,
  margin: '12px 0 10px',
};

const portalBody: React.CSSProperties = {
  fontFamily: fonts.ui,
  fontSize: 15,
  lineHeight: 1.65,
  color: 'rgba(255,255,255,0.7)',
  margin: '0 0 24px',
};

const portalCta: React.CSSProperties = {
  fontFamily: fonts.uiSemiBold,
  fontSize: 15,
  padding: '12px 20px',
  borderRadius: radius.card,
  border: 'none',
  cursor: 'pointer',
  color: colors.navy900,
  background: colors.white,
};

const ctaSection: React.CSSProperties = {
  padding: '96px 24px',
  textAlign: 'center',
  background: `linear-gradient(180deg, ${colors.sky50} 0%, ${colors.white} 100%)`,
};

const ctaTitle: React.CSSProperties = {
  fontFamily: fonts.uiSemiBold,
  fontSize: 'clamp(1.5rem, 3vw, 2.25rem)',
  color: colors.ink,
  margin: '0 0 12px',
};

const ctaSubtitle: React.CSSProperties = {
  fontFamily: fonts.ui,
  fontSize: 17,
  color: colors.inkMuted,
  margin: '0 0 32px',
};

const nav: React.CSSProperties = {
  position: 'fixed',
  top: 16,
  left: 0,
  right: 0,
  zIndex: 1000,
  display: 'flex',
  justifyContent: 'center',
  padding: '0 24px',
};

const navInner: React.CSSProperties = {
  margin: '0 auto',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 28,
  padding: '8px 20px',
  borderRadius: 999,
  background: colors.white,
  boxShadow: '0 8px 28px rgba(6,32,53,0.16)',
  pointerEvents: 'auto',
};

const navBrand: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 12 };
const navName: React.CSSProperties = {
  fontFamily: fonts.uiSemiBold,
  fontSize: 18,
  color: colors.ink,
};
const navLinks: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 24 };
const navLink: React.CSSProperties = {
  fontFamily: fonts.ui,
  fontSize: 14,
  color: colors.inkMuted,
  textDecoration: 'none',
};
const navCta: React.CSSProperties = {
  fontFamily: fonts.uiSemiBold,
  fontSize: 14,
  padding: '10px 18px',
  borderRadius: radius.card,
  border: 'none',
  cursor: 'pointer',
  color: colors.white,
  background: colors.navy800,
};

const footer: React.CSSProperties = {
  background: colors.navy900,
  padding: '48px 24px',
};
const footerInner: React.CSSProperties = {
  maxWidth: 1120,
  margin: '0 auto',
  display: 'flex',
  flexWrap: 'wrap',
  justifyContent: 'space-between',
  alignItems: 'flex-end',
  gap: 24,
};
const footerLogo: React.CSSProperties = {
  fontFamily: fonts.uiSemiBold,
  fontSize: 18,
  color: colors.white,
  marginBottom: 0,
};
const footerBrandRow: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  marginBottom: 6,
};
const footerTag: React.CSSProperties = {
  fontFamily: fonts.ui,
  fontSize: 14,
  color: 'rgba(255,255,255,0.55)',
  margin: 0,
};
const footerCopy: React.CSSProperties = {
  fontFamily: fonts.ui,
  fontSize: 13,
  color: 'rgba(255,255,255,0.4)',
  margin: 0,
};
