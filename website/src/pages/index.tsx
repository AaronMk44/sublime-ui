import React from 'react';
import Head from '@docusaurus/Head';
import useBaseUrl from '@docusaurus/useBaseUrl';

// Landing page — "Strata" brand design (folded-ribbon mark, amber/cream/ink,
// Sora · Manrope · IBM Plex Mono). Rendered standalone (its own nav + footer);
// the /docs/* pages use the Docusaurus chrome. Internal links are wired via the
// %DOCS% / %GH% placeholders below so the baseUrl is applied correctly.
const MARKUP = String.raw`
<div style="background:#E7E8EB; min-height:100vh;">
<div style="max-width:1180px; margin:0 auto; padding:0 28px;">

  <nav style="display:flex; align-items:center; justify-content:space-between; padding:22px 4px;">
    <a href="%DOCS%" style="display:flex; align-items:center; gap:13px;">
      <svg width="40" height="40" viewBox="0 0 100 100" style="display:block;">
        <rect x="2" y="2" width="96" height="96" rx="24" fill="#F4EBD8"/>
        <polyline points="67,24 33,40 67,60 33,76" fill="none" stroke="#E07A0B" stroke-width="16.5" stroke-linejoin="miter" stroke-miterlimit="3"/>
      </svg>
      <span style="font-family:'Sora'; font-size:21px; font-weight:800; letter-spacing:-0.03em;"><span style="color:#1E1B16;">Sublime</span> <span style="color:#E07A0B;">UI</span></span>
    </a>
    <div style="display:flex; align-items:center; gap:34px;">
      <div style="display:flex; align-items:center; gap:30px; font-family:'Manrope'; font-size:14.5px; font-weight:600; color:#5A5750;">
        <a href="%DOCS%">Docs</a>
        <a href="#framework">Framework</a>
        <a href="#navigation">Navigation</a>
        <a href="#desktop">Desktop</a>
      </div>
      <a href="%GH%" style="display:flex; align-items:center; gap:8px; font-family:'Manrope'; font-size:14.5px; font-weight:700; color:#1E1B16; background:#fff; border:1px solid #E2E0DA; padding:9px 16px; border-radius:11px; box-shadow:0 1px 2px rgba(20,28,48,0.05);">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="#1E1B16"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
        GitHub
      </a>
    </div>
  </nav>

  <section style="display:grid; grid-template-columns:1.05fr 0.95fr; gap:56px; align-items:center; padding:64px 4px 80px;">
    <div>
      <div style="display:inline-flex; align-items:center; gap:9px; font-family:'IBM Plex Mono'; font-size:12px; font-weight:500; letter-spacing:0.04em; color:#A0561A; background:#FBF4E6; border:1px solid #EBDCC0; padding:6px 13px; border-radius:999px; margin-bottom:26px;">
        <span style="width:6px; height:6px; border-radius:50%; background:#E07A0B; display:inline-block;"></span>
        TypeScript-only · v1.0
      </div>
      <h1 style="font-family:'Sora'; font-size:55px; font-weight:800; letter-spacing:-0.035em; line-height:1.02; color:#1E1B16; margin:0 0 22px;">Write your app once.<br>Ship it <span style="color:#E07A0B;">native</span> on mobile, web, and desktop.</h1>
      <p style="font-family:'Manrope'; font-size:18px; line-height:1.55; color:#5A5750; margin:0 0 34px; max-width:520px;">One TypeScript codebase. Real platform-native UI on every target — no lowest-common-denominator widgets, no runtime guesswork. Just your model, compiled everywhere.</p>
      <div style="display:flex; align-items:center; gap:14px;">
        <a href="%DOCS%" style="display:inline-flex; align-items:center; gap:9px; font-family:'Sora'; font-size:15.5px; font-weight:700; color:#FBF3E2; background:#E07A0B; padding:14px 26px; border-radius:13px; box-shadow:0 10px 24px -8px rgba(224,122,11,0.55);">
          Get started
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#FBF3E2" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8h10M9 4l4 4-4 4"/></svg>
        </a>
        <a href="%DOCS%" style="display:inline-flex; align-items:center; font-family:'Sora'; font-size:15.5px; font-weight:700; color:#1E1B16; background:#fff; border:1px solid #E2E0DA; padding:14px 24px; border-radius:13px; box-shadow:0 1px 2px rgba(20,28,48,0.05);">Read the docs</a>
      </div>
      <div style="display:flex; align-items:center; gap:24px; margin-top:34px; font-family:'Manrope'; font-size:13.5px; font-weight:600; color:#857F73;">
        <span style="display:flex; align-items:center; gap:7px;"><svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="#16A34A" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M13.5 4.5L6 12 2.5 8.5"/></svg> iOS · Android</span>
        <span style="display:flex; align-items:center; gap:7px;"><svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="#16A34A" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M13.5 4.5L6 12 2.5 8.5"/></svg> Web</span>
        <span style="display:flex; align-items:center; gap:7px;"><svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="#16A34A" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M13.5 4.5L6 12 2.5 8.5"/></svg> macOS · Windows · Linux</span>
      </div>
    </div>

    <div style="background:#15130F; border-radius:18px; box-shadow:0 1px 2px rgba(20,28,48,0.06), 0 30px 60px -30px rgba(20,28,48,0.45); overflow:hidden;">
      <div style="display:flex; align-items:center; gap:8px; padding:15px 18px; border-bottom:1px solid #2A261E;">
        <span style="width:11px; height:11px; border-radius:50%; background:#3A352B; display:inline-block;"></span>
        <span style="width:11px; height:11px; border-radius:50%; background:#3A352B; display:inline-block;"></span>
        <span style="width:11px; height:11px; border-radius:50%; background:#3A352B; display:inline-block;"></span>
        <span style="font-family:'IBM Plex Mono'; font-size:12px; color:#7C7568; margin-left:8px;">models/user.ts</span>
      </div>
      <pre style="margin:0; padding:24px 22px; font-family:'IBM Plex Mono'; font-size:13.5px; line-height:1.75; color:#D8D1C4; overflow-x:auto;"><span style="color:#C98A3C;">import</span> { Model } <span style="color:#C98A3C;">from</span> <span style="color:#8FB573;">'@sublime-ui/framework'</span>;

<span style="color:#C98A3C;">export class</span> <span style="color:#F2A33A;">User</span> <span style="color:#C98A3C;">extends</span> <span style="color:#F2A33A;">Model</span> {
  <span style="color:#C98A3C;">declare</span> id:   <span style="color:#7FA8D8;">number</span>;
  <span style="color:#C98A3C;">declare</span> name: <span style="color:#7FA8D8;">string</span>;
  <span style="color:#C98A3C;">declare</span> role: <span style="color:#8FB573;">'admin'</span> | <span style="color:#8FB573;">'member'</span>;
}

<span style="color:#6B6557;">// → typed store, native UI, and</span>
<span style="color:#6B6557;">// → API bridge generated at compile time</span>
<span style="color:#C98A3C;">const</span> users = <span style="color:#F2A33A;">User</span>.<span style="color:#7FA8D8;">all</span>();</pre>
    </div>
  </section>

  <section id="framework" style="padding:18px 4px 36px;">
    <div style="font-family:'IBM Plex Mono'; font-size:12px; font-weight:500; letter-spacing:0.14em; text-transform:uppercase; color:#A0561A; margin-bottom:14px;">Why Sublime UI</div>
    <h2 style="font-family:'Sora'; font-size:36px; font-weight:800; letter-spacing:-0.03em; color:#1E1B16; margin:0 0 40px; max-width:620px;">One model in. Native apps out — with the types intact.</h2>
    <div style="display:grid; grid-template-columns:repeat(4,1fr); gap:20px;">
      <div style="background:#fff; border-radius:18px; padding:28px 24px 30px; box-shadow:0 1px 2px rgba(20,28,48,0.04), 0 16px 40px -28px rgba(20,28,48,0.22); display:flex; flex-direction:column; gap:16px;">
        <div style="width:46px; height:46px; border-radius:13px; background:#FBF4E6; border:1px solid #EBDCC0; display:flex; align-items:center; justify-content:center;">
          <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="#C76A08" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>
        </div>
        <h3 style="font-family:'Sora'; font-size:18px; font-weight:700; letter-spacing:-0.02em; color:#1E1B16; margin:0;">One model, many platforms</h3>
        <p style="font-family:'Manrope'; font-size:14px; line-height:1.55; color:#6B675F; margin:0;">Define your data and logic once. Sublime UI projects it onto every platform you target — no per-platform rewrites.</p>
      </div>
      <div style="background:#fff; border-radius:18px; padding:28px 24px 30px; box-shadow:0 1px 2px rgba(20,28,48,0.04), 0 16px 40px -28px rgba(20,28,48,0.22); display:flex; flex-direction:column; gap:16px;">
        <div style="width:46px; height:46px; border-radius:13px; background:#FBF4E6; border:1px solid #EBDCC0; display:flex; align-items:center; justify-content:center;">
          <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="#C76A08" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M12 12l8-4.5M12 12v9M12 12L4 7.5"/></svg>
        </div>
        <h3 style="font-family:'Sora'; font-size:18px; font-weight:700; letter-spacing:-0.02em; color:#1E1B16; margin:0;">Platform-native UI</h3>
        <p style="font-family:'Manrope'; font-size:14px; line-height:1.55; color:#6B675F; margin:0;">Shared building blocks render as <strong style="color:#1E1B16;">real MUI</strong> on web and <strong style="color:#1E1B16;">Paper</strong> on mobile — actual native components, not a webview.</p>
      </div>
      <div style="background:#fff; border-radius:18px; padding:28px 24px 30px; box-shadow:0 1px 2px rgba(20,28,48,0.04), 0 16px 40px -28px rgba(20,28,48,0.22); display:flex; flex-direction:column; gap:16px;">
        <div style="width:46px; height:46px; border-radius:13px; background:#FBF4E6; border:1px solid #EBDCC0; display:flex; align-items:center; justify-content:center;">
          <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="#C76A08" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h16M4 12h16M4 18h10"/><circle cx="19" cy="18" r="2.4" fill="#C76A08" stroke="none"/></svg>
        </div>
        <h3 style="font-family:'Sora'; font-size:18px; font-weight:700; letter-spacing:-0.02em; color:#1E1B16; margin:0;">Compile-time, not runtime</h3>
        <p style="font-family:'Manrope'; font-size:14px; line-height:1.55; color:#6B675F; margin:0;">Navigation and the native bridge are <strong style="color:#1E1B16;">generated</strong> with full types. Errors surface in your editor, not in production.</p>
      </div>
      <div style="background:#fff; border-radius:18px; padding:28px 24px 30px; box-shadow:0 1px 2px rgba(20,28,48,0.04), 0 16px 40px -28px rgba(20,28,48,0.22); display:flex; flex-direction:column; gap:16px;">
        <div style="width:46px; height:46px; border-radius:13px; background:#FBF4E6; border:1px solid #EBDCC0; display:flex; align-items:center; justify-content:center;">
          <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="#C76A08" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M5 7l3 3-3 3M11 16h6"/><rect x="2.5" y="3.5" width="19" height="17" rx="2.5"/></svg>
        </div>
        <h3 style="font-family:'Sora'; font-size:18px; font-weight:700; letter-spacing:-0.02em; color:#1E1B16; margin:0;">A CLI that scaffolds it all</h3>
        <p style="font-family:'Manrope'; font-size:14px; line-height:1.55; color:#6B675F; margin:0;">One command sets up the workspace, platforms, and tooling. Add a model, get screens and routes wired in automatically.</p>
      </div>
    </div>
  </section>

  <section id="navigation" style="padding:56px 4px;">
    <div style="background:#fff; border-radius:24px; box-shadow:0 1px 2px rgba(20,28,48,0.04), 0 24px 60px -34px rgba(20,28,48,0.28); display:grid; grid-template-columns:0.92fr 1.08fr; gap:48px; align-items:center; padding:52px 52px; overflow:hidden;">
      <div>
        <div style="font-family:'IBM Plex Mono'; font-size:12px; font-weight:500; letter-spacing:0.14em; text-transform:uppercase; color:#A0561A; margin-bottom:14px;">Storybook navigation</div>
        <h2 style="font-family:'Sora'; font-size:32px; font-weight:800; letter-spacing:-0.03em; color:#1E1B16; margin:0 0 18px;">Describe your screens. Get native routing for free.</h2>
        <p style="font-family:'Manrope'; font-size:16px; line-height:1.6; color:#5A5750; margin:0 0 22px;">Declare a <strong style="color:#1E1B16;">book</strong> of pages once and pick a format. Sublime UI compiles it to <strong style="color:#1E1B16;">React Navigation</strong> on mobile and <strong style="color:#1E1B16;">react-router</strong> on web — fully typed links, params, and deep links included.</p>
        <div style="display:flex; flex-direction:column; gap:13px;">
          <div style="display:flex; align-items:center; gap:11px; font-family:'Manrope'; font-size:14.5px; font-weight:600; color:#3A372F;"><svg width="17" height="17" viewBox="0 0 16 16" fill="none" stroke="#E07A0B" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M13.5 4.5L6 12 2.5 8.5"/></svg> Typed routes — no string-keyed mistakes</div>
          <div style="display:flex; align-items:center; gap:11px; font-family:'Manrope'; font-size:14.5px; font-weight:600; color:#3A372F;"><svg width="17" height="17" viewBox="0 0 16 16" fill="none" stroke="#E07A0B" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M13.5 4.5L6 12 2.5 8.5"/></svg> Swap layout formats without touching pages</div>
          <div style="display:flex; align-items:center; gap:11px; font-family:'Manrope'; font-size:14.5px; font-weight:600; color:#3A372F;"><svg width="17" height="17" viewBox="0 0 16 16" fill="none" stroke="#E07A0B" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M13.5 4.5L6 12 2.5 8.5"/></svg> Deep links generated per platform</div>
        </div>
      </div>
      <div style="background:#15130F; border-radius:16px; box-shadow:0 24px 50px -28px rgba(20,28,48,0.5); overflow:hidden;">
        <div style="display:flex; align-items:center; gap:8px; padding:14px 18px; border-bottom:1px solid #2A261E;">
          <span style="width:10px; height:10px; border-radius:50%; background:#3A352B;"></span>
          <span style="width:10px; height:10px; border-radius:50%; background:#3A352B;"></span>
          <span style="width:10px; height:10px; border-radius:50%; background:#3A352B;"></span>
          <span style="font-family:'IBM Plex Mono'; font-size:11.5px; color:#7C7568; margin-left:8px;">navigation/app.book.ts</span>
        </div>
        <pre style="margin:0; padding:22px; font-family:'IBM Plex Mono'; font-size:13px; line-height:1.7; color:#D8D1C4; overflow-x:auto;"><span style="color:#C98A3C;">export default</span> <span style="color:#7FA8D8;">book</span>({
  format: <span style="color:#8FB573;">'bottomNav'</span>,
  pages: {
    home:    <span style="color:#7FA8D8;">screen</span>(HomePage),
    search:  <span style="color:#7FA8D8;">screen</span>(SearchPage),
    profile: <span style="color:#7FA8D8;">screen</span>(ProfilePage),
  },
});

<span style="color:#6B6557;">// mobile → React Navigation</span>
<span style="color:#6B6557;">// web    → react-router</span></pre>
      </div>
    </div>
  </section>

  <section id="desktop" style="margin:20px -28px 0; padding:0;">
    <div style="background:radial-gradient(120% 120% at 80% 0%, #232019 0%, #15130F 60%); padding:84px 56px;">
      <div style="max-width:1124px; margin:0 auto; display:grid; grid-template-columns:1fr 1fr; gap:56px; align-items:center;">
        <div>
          <div style="font-family:'IBM Plex Mono'; font-size:12px; font-weight:500; letter-spacing:0.14em; text-transform:uppercase; color:#C98A3C; margin-bottom:16px;">Native bridge</div>
          <h2 style="font-family:'Sora'; font-size:34px; font-weight:800; letter-spacing:-0.03em; color:#F7F3EA; margin:0 0 20px;">Reach the OS through one secure channel.</h2>
          <p style="font-family:'Manrope'; font-size:16.5px; line-height:1.6; color:#B5AE9F; margin:0 0 28px; max-width:480px;">Call into Node and native OS capabilities — printers, filesystem, hardware — with a single typed hook. Every call crosses one audited, permission-scoped bridge. No ad-hoc native modules, no leaky globals.</p>
          <div style="display:flex; gap:14px; flex-wrap:wrap;">
            <span style="font-family:'IBM Plex Mono'; font-size:12.5px; color:#E8C896; background:rgba(242,163,58,0.1); border:1px solid rgba(242,163,58,0.25); padding:7px 14px; border-radius:9px;">printer</span>
            <span style="font-family:'IBM Plex Mono'; font-size:12.5px; color:#E8C896; background:rgba(242,163,58,0.1); border:1px solid rgba(242,163,58,0.25); padding:7px 14px; border-radius:9px;">filesystem</span>
            <span style="font-family:'IBM Plex Mono'; font-size:12.5px; color:#E8C896; background:rgba(242,163,58,0.1); border:1px solid rgba(242,163,58,0.25); padding:7px 14px; border-radius:9px;">camera</span>
            <span style="font-family:'IBM Plex Mono'; font-size:12.5px; color:#E8C896; background:rgba(242,163,58,0.1); border:1px solid rgba(242,163,58,0.25); padding:7px 14px; border-radius:9px;">notifications</span>
          </div>
        </div>
        <div style="background:#0D0B08; border:1px solid #2A261E; border-radius:16px; box-shadow:0 30px 60px -30px rgba(0,0,0,0.7); overflow:hidden;">
          <div style="display:flex; align-items:center; gap:8px; padding:14px 18px; border-bottom:1px solid #2A261E;">
            <svg width="15" height="15" viewBox="0 0 100 100"><rect x="6" y="6" width="88" height="88" rx="22" fill="#E07A0B"/><polyline points="67,24 33,40 67,60 33,76" fill="none" stroke="#FBF3E2" stroke-width="16.5" stroke-linejoin="miter" stroke-miterlimit="3"/></svg>
            <span style="font-family:'IBM Plex Mono'; font-size:11.5px; color:#7C7568; margin-left:4px;">receipts/print.ts</span>
          </div>
          <pre style="margin:0; padding:24px 22px; font-family:'IBM Plex Mono'; font-size:13.5px; line-height:1.75; color:#D8D1C4; overflow-x:auto;"><span style="color:#C98A3C;">const</span> printer = <span style="color:#7FA8D8;">useNative</span>(<span style="color:#8FB573;">'printer'</span>);

<span style="color:#C98A3C;">await</span> printer.<span style="color:#7FA8D8;">print</span>({
  template: <span style="color:#8FB573;">'receipt'</span>,
  order,
});
<span style="color:#6B6557;">// typed end-to-end, OS-side</span>
<span style="color:#6B6557;">// runs over the secure bridge</span></pre>
        </div>
      </div>
    </div>
  </section>

  <section style="padding:72px 4px 40px;">
    <div style="font-family:'IBM Plex Mono'; font-size:12px; font-weight:500; letter-spacing:0.14em; text-transform:uppercase; color:#A0561A; margin-bottom:14px;">The packages</div>
    <h2 style="font-family:'Sora'; font-size:32px; font-weight:800; letter-spacing:-0.03em; color:#1E1B16; margin:0 0 36px; max-width:580px;">Five focused packages. One coherent system.</h2>
    <div style="display:flex; flex-direction:column; gap:0; background:#fff; border-radius:20px; box-shadow:0 1px 2px rgba(20,28,48,0.04), 0 18px 48px -30px rgba(20,28,48,0.24); overflow:hidden;">
      <div style="display:grid; grid-template-columns:auto 1fr; gap:22px; align-items:center; padding:22px 28px; border-bottom:1px solid #F0EEE9;">
        <code style="font-family:'IBM Plex Mono'; font-size:14px; font-weight:600; color:#C76A08; background:#FBF4E6; padding:8px 14px; border-radius:10px; white-space:nowrap;">@sublime-ui/framework</code>
        <span style="font-family:'Manrope'; font-size:15px; color:#5A5750;">Models, state, and the compile-time core that ties every platform together.</span>
      </div>
      <div style="display:grid; grid-template-columns:auto 1fr; gap:22px; align-items:center; padding:22px 28px; border-bottom:1px solid #F0EEE9;">
        <code style="font-family:'IBM Plex Mono'; font-size:14px; font-weight:600; color:#C76A08; background:#FBF4E6; padding:8px 14px; border-radius:10px; white-space:nowrap;">@sublime-ui/library</code>
        <span style="font-family:'Manrope'; font-size:15px; color:#5A5750;">Shared logic, hooks, and utilities — the platform-agnostic standard library.</span>
      </div>
      <div style="display:grid; grid-template-columns:auto 1fr; gap:22px; align-items:center; padding:22px 28px; border-bottom:1px solid #F0EEE9;">
        <code style="font-family:'IBM Plex Mono'; font-size:14px; font-weight:600; color:#C76A08; background:#FBF4E6; padding:8px 14px; border-radius:10px; white-space:nowrap;">@sublime-ui/ui</code>
        <span style="font-family:'Manrope'; font-size:15px; color:#5A5750;">Building blocks that render to real MUI on web and Paper on mobile.</span>
      </div>
      <div style="display:grid; grid-template-columns:auto 1fr; gap:22px; align-items:center; padding:22px 28px; border-bottom:1px solid #F0EEE9;">
        <code style="font-family:'IBM Plex Mono'; font-size:14px; font-weight:600; color:#C76A08; background:#FBF4E6; padding:8px 14px; border-radius:10px; white-space:nowrap;">@sublime-ui/desktop</code>
        <span style="font-family:'Manrope'; font-size:15px; color:#5A5750;">Native desktop shells for macOS, Windows, and Linux with the same codebase.</span>
      </div>
      <div style="display:grid; grid-template-columns:auto 1fr; gap:22px; align-items:center; padding:22px 28px;">
        <code style="font-family:'IBM Plex Mono'; font-size:14px; font-weight:600; color:#C76A08; background:#FBF4E6; padding:8px 14px; border-radius:10px; white-space:nowrap;">@sublime-ui/devkit</code>
        <span style="font-family:'Manrope'; font-size:15px; color:#5A5750;">The CLI, codegen, and dev server that scaffold and build the whole workspace.</span>
      </div>
    </div>
  </section>

  <section style="padding:48px 4px 72px;">
    <div style="background:radial-gradient(120% 140% at 50% 0%, #FBF4E6 0%, #F4EBD8 100%); border:1px solid #EBDCC0; border-radius:24px; padding:64px 48px; text-align:center;">
      <svg width="56" height="56" viewBox="0 0 100 100" style="display:block; margin:0 auto 24px; filter:drop-shadow(0 10px 20px rgba(120,80,20,0.18));">
        <rect x="2" y="2" width="96" height="96" rx="24" fill="#fff"/>
        <polyline points="67,24 33,40 67,60 33,76" fill="none" stroke="#E07A0B" stroke-width="16.5" stroke-linejoin="miter" stroke-miterlimit="3"/>
      </svg>
      <h2 style="font-family:'Sora'; font-size:38px; font-weight:800; letter-spacing:-0.03em; color:#1E1B16; margin:0 0 12px;">Build once · ship everywhere.</h2>
      <p style="font-family:'Manrope'; font-size:17px; line-height:1.55; color:#6B5E45; margin:0 auto 34px; max-width:480px;">Spin up a fully-wired cross-platform workspace in one command.</p>
      <div style="display:inline-flex; align-items:center; gap:16px; background:#15130F; border-radius:13px; padding:16px 20px; box-shadow:0 16px 36px -16px rgba(20,28,48,0.4);">
        <span style="font-family:'IBM Plex Mono'; font-size:15px; color:#D8D1C4;"><span style="color:#C98A3C;">$</span> npm create sublime-ui@latest</span>
      </div>
    </div>
  </section>

  <footer style="padding:48px 4px 64px; border-top:1px solid #D9DADE;">
    <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:40px; flex-wrap:wrap;">
      <div style="max-width:280px;">
        <a href="%DOCS%" style="display:flex; align-items:center; gap:11px; margin-bottom:14px;">
          <svg width="34" height="34" viewBox="0 0 100 100" style="display:block;">
            <rect x="2" y="2" width="96" height="96" rx="24" fill="#F4EBD8"/>
            <polyline points="67,24 33,40 67,60 33,76" fill="none" stroke="#E07A0B" stroke-width="16.5" stroke-linejoin="miter" stroke-miterlimit="3"/>
          </svg>
          <span style="font-family:'Sora'; font-size:18px; font-weight:800; letter-spacing:-0.03em;"><span style="color:#1E1B16;">Sublime</span> <span style="color:#E07A0B;">UI</span></span>
        </a>
        <p style="font-family:'IBM Plex Mono'; font-size:12.5px; color:#857F73; margin:0;">build once · ship everywhere</p>
      </div>
      <div style="display:flex; gap:64px; flex-wrap:wrap;">
        <div style="display:flex; flex-direction:column; gap:11px;">
          <div style="font-family:'Sora'; font-size:13px; font-weight:700; color:#1E1B16; margin-bottom:3px;">Product</div>
          <a href="%DOCS%framework/overview" style="font-family:'Manrope'; font-size:14px; color:#6B675F;">Framework</a>
          <a href="%DOCS%navigation/storybook" style="font-family:'Manrope'; font-size:14px; color:#6B675F;">Navigation</a>
          <a href="%DOCS%desktop/overview" style="font-family:'Manrope'; font-size:14px; color:#6B675F;">Desktop</a>
        </div>
        <div style="display:flex; flex-direction:column; gap:11px;">
          <div style="font-family:'Sora'; font-size:13px; font-weight:700; color:#1E1B16; margin-bottom:3px;">Resources</div>
          <a href="%DOCS%" style="font-family:'Manrope'; font-size:14px; color:#6B675F;">Docs</a>
          <a href="%DOCS%devkit/overview" style="font-family:'Manrope'; font-size:14px; color:#6B675F;">CLI reference</a>
        </div>
        <div style="display:flex; flex-direction:column; gap:11px;">
          <div style="font-family:'Sora'; font-size:13px; font-weight:700; color:#1E1B16; margin-bottom:3px;">Community</div>
          <a href="%GH%" style="font-family:'Manrope'; font-size:14px; color:#6B675F;">GitHub</a>
        </div>
      </div>
    </div>
    <div style="margin-top:40px; font-family:'Manrope'; font-size:13px; color:#A99F8C;">© 2026 Sublime UI · MIT licensed · A TypeScript framework for native cross-platform apps.</div>
  </footer>

</div>
</div>
`;

export default function Home(): React.ReactElement {
  const docs = useBaseUrl('/docs/');
  const html = MARKUP.split('%DOCS%')
    .join(docs)
    .split('%GH%')
    .join('https://github.com/AaronMk44/sublime-ui')
    // Generic fallbacks so the page never drops to serif if a webfont is slow/missing.
    .split("font-family:'Sora'")
    .join("font-family:'Sora', system-ui, sans-serif")
    .split("font-family:'Manrope'")
    .join("font-family:'Manrope', system-ui, sans-serif")
    .split("font-family:'IBM Plex Mono'")
    .join("font-family:'IBM Plex Mono', ui-monospace, monospace");
  return (
    <>
      <Head>
        <html lang="en" />
        <title>Sublime UI — build once · ship everywhere</title>
        <meta
          name="description"
          content="Write your app once in TypeScript and ship it native on mobile, web, and desktop."
        />
        <style>{`
          html, body { margin: 0; padding: 0; }
          #__docusaurus { background: #E7E8EB; }
          .sublime-landing a { text-decoration: none; color: inherit; }
          .sublime-landing ::selection { background: #F2A33A; color: #1E1B16; }
        `}</style>
      </Head>
      <div className="sublime-landing" dangerouslySetInnerHTML={{ __html: html }} />
    </>
  );
}
