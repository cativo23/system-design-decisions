# Systems Field Guide

A static web guide to industry software and system architecture. It's written in English and built from "decision cards".

## Read first
- `docs/DESIGN.md`: the approved design, decisions and stack
- `docs/PHASES.md`: roadmap, phase status, and the spec-kit prompts for each phase
- `docs/TOPICS.md`: the master list of cards and their status
- `docs/mockups/saga-card.html`: the approved visual reference ("Linear × terminal", green accent `#4ade80`)

## Working agreement
- **Spec-Driven Development with spec-kit, always.** Each phase is one feature, run as `/speckit-specify` (what and why, no tech) → `/speckit-clarify` → (`/speckit-checklist`) → `/speckit-plan` (tech goes here) → `/speckit-tasks` → `/speckit-analyze` → `/speckit-implement` → `/speckit-converge`, repeated until Converged. Review each artifact before moving on, and don't skip steps.
- **Follow official guides** to install and configure every technology (Astro, `astro add`, Pagefind, spec-kit). Don't use third-party templates.
- **TDD** for all logic.
- **Self-host on polaris2** (Docker + Traefik). No paid or managed services.
- **No backend in v1.** Keep the sync-ready rules in DESIGN §6.1.
- **Content (cards)** is produced with a multi-agent Workflow, launched only when Carlos asks.
- **At the end of every session:** update the status in `docs/PHASES.md` and `docs/TOPICS.md`, then give Carlos the ready-to-paste prompt for the next session.
