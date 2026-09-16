# CERVEL Design System and Application Shell

PR #78 turns the shared-experience contracts into a canonical visual and structural foundation for CERVEL clients.

## Brand

CERVEL uses the supplied circular CERVEL mark as the canonical brand source. The source reference is:

`https://i.postimg.cc/3JTRqdvz/Chat-GPT-Image-Aug-24-2026-04-48-31-PM.png`

Production clients MUST vendor an approved copy at `brand/cervel-mark.png`; they MUST NOT depend on the Postimg host at runtime. This keeps CERVEL usable offline and prevents a third-party image host from becoming part of the application trust or availability boundary.

The wordmark is `CERVEL`. The supporting descriptor is `Sovereign Knowledge`. The product thesis remains: Persistent Knowledge Infrastructure for humans, AI, and machines. Sovereign by design.

## Visual language

The shared design tokens define a system-first sans-serif typography stack with Inter as the preferred face when available, a 4px-derived spacing scale, restrained radii, semantic status states, and explicit light/dark palettes. Clients may translate these tokens into native platform primitives, but semantic names and hierarchy remain shared.

Theme selection supports light, dark and system preference. Theme is presentation state only; it MUST NOT alter knowledge, permissions, provenance, scope, authority or synchronization semantics.

## Canonical shell

The wide application shell has five structural regions: navigation/sidebar, top bar, workspace, Activity/Properties inspector, and status bar. Vault Explorer is a first-class shared product surface. Global search routes through the shared retrieval/search contract rather than a client-local search implementation.

The status bar communicates runtime truth such as Local Node health, Vault state, synchronization and privacy. A visual status MUST be derived from authoritative runtime state and MUST NOT imply health, encryption, synchronization, privacy or verification merely because a particular color or icon is rendered.

Activity and Properties share the inspector rail. Activity presents real product events; Properties presents metadata/provenance/authority/membership/permission information available to the current principal. Synthetic demo events and fixture metadata remain outside production clients.

## Responsive structure

At wide widths the sidebar and inspector can remain visible. Compact mode collapses navigation and moves the inspector to an overlay. Mobile mode uses a navigation drawer/adaptive bottom navigation and presents the inspector as a sheet. Responsive adaptation changes composition, not product ownership or knowledge semantics.

The browser extension remains a specialized capture/context surface and is not required to render the full workspace shell.

## Experience boundary

This rollout is deliberately a shared design/application-shell foundation. It does not migrate synthetic demo state into production, does not create a second knowledge model, and does not make the UI a source of truth. Desktop, Web and Mobile will consume the same semantic shell contracts through their appropriate runtime adapters in later convergence rollouts.
