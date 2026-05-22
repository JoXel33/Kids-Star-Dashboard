# Theme & Layout Reference — Kids Star Dashboard

Styling tokens extracted from the user-provided `princess_ocean_dashboard.html` reference.
Use these to match the look and feel. The **section content** of that reference file
(chores, goals, videos, photos, movies) is NOT part of this feature — only its visual style is.

## Color Palette

- Page background: `linear-gradient(180deg, #b8e8ff 0%, #d4f0fa 30%, #e8f8ff 60%, #f0e8ff 100%)`
- Header / banner gradient: `linear-gradient(135deg, #ff9dc6 0%, #ffc2dc 40%, #c8a8ff 100%)`
- Blue feature-card gradient: `linear-gradient(135deg, #a8d8ff, #c4e8ff, #daf0ff)`
- Card surface: `rgba(255,255,255,0.75)` with `backdrop-filter: blur(8px)`
- Primary button gradient: `linear-gradient(135deg, #ff9dc6, #c8a8ff)`
- Accent text colors: deep blue `#2060a0`, purple `#8040c0`, pink `#c060a0`
- Stars: gold filled vs. pale outline

## Typography

- Display / headings: `Fredoka One` (rounded, playful)
- Body / UI text: `Nunito` (weights 400–800)

## Card / Panel Style

- `border-radius`: 24px panels, 28px header
- `border`: 3px solid `rgba(255,255,255,0.8–0.9)`
- `box-shadow`: soft, e.g. `0 4px 20px rgba(180,140,220,0.12)`
- `padding`: ~18–20px

## Inner Elements

- Inputs / sub-cards: `border-radius` 12–16px
- Buttons: rounded / pill gradient, white text, slight scale-up on hover

## Background Decorations (subtle, non-interactive)

- Rising bubbles: translucent white circles animating bottom → top
- Twinkling sparkles: small star shapes fading / scaling
- Bottom wave: soft translucent blue gradient strip along the page bottom
- Gentle bounce / wobble animation on decorative elements

## Layout

- Two columns: left ~65–70% (Agenda, then Your Rewards), right ~30–35%
  (Today's Star, Star Wallet, Calendar)
- Top band spans full width: Welcome greeting (left), Today's Date (right)
- Entire dashboard fits one standard screen; only the agenda hour-block list scrolls internally

## Mock Layout (ASCII)

```
+--------------------------------------------+----------------+
|  Welcome, <child name>                     |  Today's Date  |
+--------------------------------------------+----------------+
|  Agenda:                                   |  Today's Star  |
|  Time   | Activities          |  Edit      |   (big star)   |
|  10-11  | ...                 |  Edit      +----------------+
|  11-12  | ...                 |  Edit      | Stars  | Star  |
|  12-13  | ...                 |  Edit      | Coll.  | Bal.  |
+--------------------------------------------+----------------+
|  Your Rewards                              |   Calendar     |
|  Prize 3   * * * * *     [x]               |   (date        |
|  Prize 1   * * * * *     [x]               |    selector)   |
|  [+]                                       |                |
+--------------------------------------------+----------------+
```
