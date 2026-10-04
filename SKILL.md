---
name: agentpop-design
description: Use this skill to generate well-branded interfaces and assets for AgentPop, either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

Read the README.md file within this skill, and explore the other available files.

Quick orientation: AgentPop is a Firecracker sandbox + cloud-agent platform. Warm off-white canvas (#faf9f7), warm near-black text, one cobalt-indigo accent (#4f46e5), Inter + JetBrains Mono (mono ONLY for IDs/commands/URLs/logs), 8px spacing rhythm, 12–16px radii, five status tones that never communicate by color alone, lucide icons, no gradients/imagery/emoji, sentence case, terse we/you copy. Tokens live in `tokens/*.css` (import root `styles.css`); dark mode = `.dark` class. Reusable primitives (Button, Badge, StatusBadge, Input, Textarea, Card) are in `components/`; full-screen recreations in `ui_kits/dashboard/`. There is NO logo — render "AgentPop" in plain Inter 600 wherever a mark would go; never draw one.

If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and create static HTML files for the user to view. If working on production code, you can copy assets and read the rules here to become an expert in designing with this brand.
If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.
