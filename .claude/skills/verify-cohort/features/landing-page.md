# Landing page

The landing page is Cohort's marketing site: a splash intro, hero CTA to install the Chrome extension, a nav bar to Home/Contact/About, and a footer linking to the legal pages. It calls no backend API — only the frontend dev server needs to be running.

## Sub-features

- `splash-to-hero` shows a brief splash screen, then reveals the hero content.
- `nav-links` route to Home, Contact, and About. These are plain `<a href>` tags, not React Router `Link`s, so each navigation is a full page reload, not a client-side SPA transition.
- `install-cta` (Hero's "Add to Chrome" button and the Navbar's "Install Extension" button) opens the Chrome Web Store listing in a new tab.
- `legal-links` (Footer) route to `/privacy` and `/terms`.

## How to get to it (user POV)

- Navigate to `http://localhost:5173/` directly.
- Click `Home`, `Contact`, or `About` in the top nav.
- Click `Privacy Policy` or `Terms of Service` in the footer.

## Driving it with claude-in-chrome

Preconditions:

- Frontend dev server is up (`curl -sf http://localhost:5173/`).

- **Open the page.** `mcp__claude-in-chrome__navigate({ tabId, url: "http://localhost:5173/" })`. Wait for the splash to clear: `mcp__claude-in-chrome__find({ tabId, role: "heading", name: /Sync.*Canvas.*Assignments/i })` should resolve — don't act on the page before it does.
- **Confirm the hero.** `mcp__claude-in-chrome__read_page({ tabId })` and confirm the tagline text `Canvas Integration Available` and a button named `Add to Chrome` are present.
- **Navigate via the nav bar.** `mcp__claude-in-chrome__find({ tabId, role: "link", name: "Contact" })`, click it (`mcp__claude-in-chrome__computer` click action on the found element, or `navigate` directly to `/contact` — either proves the route). This is a full page reload (plain `<a href>`, not a React Router `Link`), so wait for the new document to load before checking; confirm the URL is `/contact` and the page heading reads `Contact Us`.
- **Navigate via the footer.** From any landing route, find the `Privacy Policy` link and click it; this also triggers a full page reload. Confirm the URL becomes `/privacy` and a page heading renders once the new page loads.
- **Proof.** Screenshot the hero after splash clears, and screenshot the `/contact` page after the nav click, showing the URL bar (or report the tab's current URL from `tabs_context_mcp`) alongside each screenshot.

## Gotchas

- The nav bar has **no** Login or Signup link — Cohort's landing site doesn't link to auth. Reach `/login` and `/lookup` by direct `navigate`, not by clicking through the marketing site.
- Don't click "Add to Chrome" / "Install Extension" — both call `window.open` to the Chrome Web Store and leave a stray tab. If one opens by accident, close it immediately with `tabs_close_mcp`.
- The splash screen + scroll-triggered `IntersectionObserver` reveal animations mean an element can exist in the DOM before it's visually "revealed" — prefer `find` (which waits) over an instant `read_page` right after `navigate`.
