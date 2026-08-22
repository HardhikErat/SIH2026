import { ScrollViewStyleReset } from 'expo-router/html';
import type { ReactNode } from 'react';

export default function Root({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <meta name="theme-color" content="#FBF9F6" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;600&family=Inter:wght@400;600&display=swap"
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
html, body, #root {
  height: 100%;
  background: #FBF9F6;
}
body {
  margin: 0;
  font-family: Inter, system-ui, -apple-system, sans-serif;
  color: #1E2422;
  -webkit-font-smoothing: antialiased;
}
* {
  box-sizing: border-box;
}
a {
  color: inherit;
  text-decoration: none;
}
input, textarea, button {
  font: inherit;
}
input:focus-visible, textarea:focus-visible, button:focus-visible {
  outline: 2px solid #1F6E5C;
  outline-offset: 2px;
}
`;
