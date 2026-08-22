import { ScrollViewStyleReset } from 'expo-router/html';
import type { ReactNode } from 'react';

export default function Root({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <meta name="theme-color" content="#062035" />
        <meta name="description" content="Hospital-grade multilingual clinical intake for outreach camps and OPD queues." />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;600&family=Inter:wght@400;600;700&family=Noto+Sans:wght@400;600&display=swap"
          rel="stylesheet"
        />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: globalCss }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

const globalCss = `
html {
  scroll-behavior: smooth;
}
html, body, #root {
  min-height: 100%;
  background: #F7F9FC;
}
body {
  margin: 0;
  font-family: Inter, 'Noto Sans', system-ui, -apple-system, sans-serif;
  color: #0C1B2A;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
* { box-sizing: border-box; }
a { color: inherit; text-decoration: none; }
button { font: inherit; cursor: pointer; }
input, textarea { font: inherit; }
input:focus-visible, textarea:focus-visible, button:focus-visible {
  outline: 2px solid #1A9E8F;
  outline-offset: 2px;
}
::selection {
  background: rgba(26, 158, 143, 0.2);
  color: #062035;
}
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
`;
