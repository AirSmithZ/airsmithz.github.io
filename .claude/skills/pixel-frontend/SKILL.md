---
name: pixel-frontend
description: Create pixel-art style frontend interfaces and web UIs. Use this skill when the user asks for pixel style, pixel art UI, retro game aesthetic, 8-bit/16-bit look, chunky pixel design, or when building interfaces that should look like classic video games, game menus, or pixel-perfect retro web apps. Triggers on mentions of "像素风", "pixel art", "retro game UI", "8-bit", "16-bit", "NES/SNES style", "game-like interface", or similar.
license: Complete terms in LICENSE.txt
---

This skill guides creation of frontend interfaces in a **pixel-art / retro game aesthetic**. Output production-grade HTML/CSS/JS or React/Vue code that authentically embodies the look and feel of classic video game UIs.

The user provides requirements for a component, page, or application. Apply pixel-art design principles throughout.

## Design Thinking

Before coding, commit to a coherent pixel-era direction:

- **Era**: 8-bit (NES, Game Boy), 16-bit (SNE​S, Mega Drive), or modern pixel-art hybrid?
- **Tone**: Cute, dark, arcade, RPG menu, roguelike terminal, vaporwave pixel?
- **Constraints**: Technical requirements, accessibility (ensure sufficient contrast, readable pixel fonts at appropriate sizes).
- **Differentiation**: What makes this memorable — a unique color palette, animated pixel borders, CRT scanlines, a specific game homage?

**CRITICAL**: Pixel style is not "low effort" — it requires precision. Every choice must reinforce the aesthetic: limited palettes, grid alignment, chunky shapes.

## Pixel-Frontend Aesthetics Guidelines

### Typography

- **Pixel fonts only**: Use bitmap/pixel fonts. Examples: Press Start 2P, Silkscreen, VT323, Pixelify Sans, Monogram, Creepster (for horror), or similar. Load via Google Fonts or local @font-face.
- **Sizing**: Font sizes in multiples of 8 (8, 16, 24, 32). Use `image-rendering` and crisp scaling where needed.
- **Pairing**: One pixel display font for headings, one for body. Avoid mixing pixel fonts with smooth vector fonts unless intentionally hybrid.

### Color

- **Limited palette**: 4–16 colors per design. Reference classic palettes (Game Boy 4-shade, NES, SNE​S) or create a coherent retro palette.
- **Use CSS variables** for all colors so the palette is easy to tweak.
- **Avoid** gradients unless simulating dithering or a very specific retro effect (e.g., sunset, scanlines). Prefer solid fills and pixel-perfect patterns.

### Layout & Spacing

- **Grid alignment**: All dimensions (width, height, padding, margin) in multiples of 4 or 8 (e.g., 8px, 16px, 24px, 32px).
- **Chunky borders**: 2px–4px solid borders. Consider double borders or "inset" shadows for that game-menu feel.
- **Composition**: Think game screens: title screens, menus, HUDs, dialog boxes. Use frames, panels, and clear hierarchical boxes.

### Visual Details

- **Borders & frames**: Thick outlines, inset/outset borders, pixel-perfect corner treatments.
- **Backgrounds**: Solid colors, subtle grid patterns, or tiled pixel textures. Optional: CRT scanlines, slight vignette (CSS overlay).
- **Icons & graphics**: Prefer pixel-style SVGs, CSS-built shapes (rect, pseudo-elements), or small pixel-art assets. Avoid smooth vector icons unless stylized.
- **Shadows**: Use `box-shadow` with 0 blur and integer offsets for a blocky shadow (e.g., `box-shadow: 4px 4px 0 #333`).

### Motion & Interactivity

- **Animations**: Short, snappy. Use `steps()` or `step-end` for frame-by-frame feel. Avoid smooth easing unless intentional.
- **Hover/active**: Instant color flip, 1–2px offset (pressed-button effect), or brief scale.
- **Micro-interactions**: Blinking cursors, pixel "bounce", menu selection highlight with chunky underline or border.

## Technical Implementation

- **image-rendering**: Use `pixelated` or `crisp-edges` for scaled images/canvas to avoid blur.
- **Font smoothing**: Consider `font-smooth: never` or `-webkit-font-smoothing: none` to preserve pixel sharpness (test readability).
- **Responsiveness**: Scale by integer factors (2x, 3x) when possible. Use `transform: scale()` with `transform-origin` for crisp upscaling.
- **Accessibility**: Ensure color contrast (WCAG AA). Pixel fonts can be hard to read at small sizes — provide adequate font-size or offer a "readable mode" if needed.

## What to Avoid

- Anti-aliased vector fonts (Inter, Roboto, Arial) unless explicitly hybrid.
- Smooth gradients and glassmorphism unless reinterpreting them in a pixel way.
- Overly complex layouts that break the grid.
- Soft shadows and blur effects that contradict the crisp pixel aesthetic.

## Example Palette (Game Boy style)

```css
:root {
  --pixel-bg: #0f380f;
  --pixel-dark: #306230;
  --pixel-mid: #8bac0f;
  --pixel-light: #9bbc0f;
  --pixel-accent: #0f380f;
  --pixel-text: #9bbc0f;
  --pixel-border: #306230;
}
```

## Example Palette (NES-inspired)

```css
:root {
  --pixel-bg: #212121;
  --pixel-dark: #4a4a4a;
  --pixel-mid: #8b7355;
  --pixel-light: #c4a574;
  --pixel-accent: #d63c3c;
  --pixel-text: #f4f4f4;
  --pixel-border: #5c5c5c;
}
```

Implement working code that is production-ready, visually cohesive, and unmistakably pixel-art in spirit. Match the level of detail to the scope: a simple landing page needs a clear palette and typography; a full game-style dashboard needs frames, animated elements, and richer interaction.
