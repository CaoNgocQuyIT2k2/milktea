# Pixel art assets

Generated/edited with the built-in ImageGen tool using the user's reference and
the character, drink, topping and shop previews approved for integration in chat.
All runtime assets are stored here, rather than referenced from Codex storage.

- `tea-atlas.png`: four player poses and six drinks, 1536 × 1024, alpha background.
- `topping-atlas.png`: eight topping icons, 1536 × 1024, alpha background.
- `guest-atlas.png`: eight staff/customer sprites, 1536 × 1024, alpha background.
- `shop.png`: empty shop backdrop, 1536 × 1024.

Atlas rectangles live in `lib/tea-art.ts`. UI icons use clipped nested SVG
viewports to avoid exposing adjacent sprites. Canvas sprites use source rectangles
and disable image smoothing. Movement, idle breathing, footsteps, brewing steam,
cup carrying and topping drops are procedural animations built from these static
poses, not pre-rendered multi-frame animation sheets. Canvas animation respects
the system's reduced-motion preference, as do the CSS animations.

## Final edit prompts

### tea-atlas.png

Edit target: this exact sprite and drink sheet. Remove the entire cream background
and ground shadows to genuine alpha transparency, preserving every character and
drink pixel, exact original positions and original canvas dimensions 1536x1024.
No layout changes, no scaling, no additions. Four characters top row and six cups
bottom row stay unchanged. This will be used as a sprite atlas.

### topping-atlas.png

Edit target: this exact eight topping sheet. Remove cream background and ground
shadows to genuine alpha transparency. Preserve all eight topping bowls exactly,
same original positions, original canvas dimensions 1536x1024. No resizing, no
layout changes, no additions. Output a transparent game icon atlas.

### guest-atlas.png

Edit target: this exact eight character roster sheet. Remove the cream background
and ground shadows to genuine alpha transparency. Preserve all eight characters
exactly, same original positions, original canvas dimensions 1536x1024. No resizing,
no layout changes, no additions. Output a transparent game character sprite atlas.

### shop.png

Edit this exact milk tea shop environment for use as a game background. Remove
only all people and characters, including the purple-haired character in front of
the counter, seated customers and two baristas. Reconstruct the empty furniture,
floor and equipment naturally behind them. Preserve every other detail, the exact
camera angle, composition, canvas 1536x1024, counter, tables, booth seating, bicycle,
plants, pixel style and colors. No new people, no text, no additional objects.
