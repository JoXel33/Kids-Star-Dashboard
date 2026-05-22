# DESIGN_SPEC.md — Princess Ocean Dashboard

> Auto-generated from `princess_ocean_dashboard.html`  
> Last updated: 2026-05-23  
> Theme: Whimsical underwater princess dashboard for children

---

## 1. Design Identity

| Attribute     | Value                                                                 |
|---------------|-----------------------------------------------------------------------|
| Theme         | Princess × Ocean — soft, playful, magical                            |
| Audience      | Young children (primary user) + parent/guardian (setup)              |
| Tone          | Joyful, encouraging, sparkly — emoji-heavy, never clinical            |
| Layout type   | Fixed-width centered dashboard, not a full responsive web app        |

---

## 2. Typography

| Role              | Font             | Weight | Size   | Notes                              |
|-------------------|------------------|--------|--------|------------------------------------|
| Display / Titles  | `Fredoka One`    | 400    | 28px   | Header greeting                    |
| Display / Clock   | `Fredoka One`    | 400    | 52px   | Clock time display                 |
| Display / Day     | `Fredoka One`    | 400    | 20px   | Day of week label                  |
| Card Titles       | `Fredoka One`    | 400    | 17px   | Section headers inside cards       |
| Modal Titles      | `Fredoka One`    | 400    | 20px   | Modal `h3`                         |
| Modal Buttons     | `Fredoka One`    | 400    | 15px   | CTA and cancel buttons             |
| Inline Buttons    | `Fredoka One`    | 400    | 13–14px| Add goal, add movie, next fact     |
| Body / Labels     | `Nunito`         | 700    | 14px   | Chore labels, goal names           |
| Body / Small      | `Nunito`         | 600    | 12–13px| Video names, movie genres, inputs  |
| Stat Counts       | `Fredoka One`    | 400    | 22px   | Stars earned, chores done          |
| Subtitles         | `Nunito`         | 600    | 13px   | Header subtitle, fun fact label    |

**Font loading:** Google Fonts CDN — `Fredoka One` + `Nunito:wght@400;600;700;800`

---

## 3. Colour Palette

### Background
```
Page gradient: linear-gradient(180deg, #b8e8ff 0%, #d4f0fa 30%, #e8f8ff 60%, #f0e8ff 100%)
Wave overlay:  linear-gradient(180deg, transparent, rgba(100,180,255,0.25))
```

### Brand / Accent Colours (Named)

| Name              | Value     | Usage                                     |
|-------------------|-----------|-------------------------------------------|
| Pink Primary      | `#ff9dc6` | Header gradient start, chore check done   |
| Lavender Accent   | `#c8a8ff` | Header gradient end, goal bar, add button |
| Sky Blue          | `#a8d8ff` | Clock card gradient start                 |
| Ocean Blue        | `#2060a0` | Clock time, fun fact text, video names    |
| Mid Blue          | `#4080c0` | Clock date text                           |
| Light Blue        | `#5090d0` | Clock day text                            |
| Deep Purple-Pink  | `#604080` | Chore label text                          |
| Muted Purple      | `#b090c0` | Done/strikethrough chore label            |
| Pink Border       | `#e090c0` | Chore check border                        |
| Warm Purple       | `#804060` | Goal name text                            |
| Plum              | `#8040c0` | Modal title text                          |
| Green Accent      | `#30a060` | Chores done stat count                    |
| Warm Orange       | `#d06020` | Movies section title                      |
| Amber             | `#ffcc88` | Movie add button gradient start           |
| Coral             | `#ffaa66` | Movie add button gradient end             |
| Star Yellow       | `#fff9a0` | Sparkle decoration                        |

### Gradients (Reusable)

| Name                 | CSS                                                         |
|----------------------|-------------------------------------------------------------|
| `gradient-header`    | `linear-gradient(135deg, #ff9dc6 0%, #ffc2dc 40%, #c8a8ff 100%)` |
| `gradient-cta`       | `linear-gradient(135deg, #ff9dc6, #c8a8ff)`                |
| `gradient-clock`     | `linear-gradient(135deg, #a8d8ff 0%, #c4e8ff 50%, #daf0ff 100%)` |
| `gradient-video`     | `linear-gradient(135deg, #c8e8ff, #e8f4ff)`                |
| `gradient-photo`     | `linear-gradient(135deg, #c8f0e0, #e0f8ec)`                |
| `gradient-movie`     | `linear-gradient(90deg, rgba(255,200,150,0.25), rgba(255,220,180,0.15))` |
| `gradient-goal-bar`  | `linear-gradient(90deg, #ffb3d4, #c8a8ff)`                 |
| `gradient-banner`    | `linear-gradient(135deg, #80d0ff 0%, #b0e8ff 40%, #d4b8ff 100%)` |
| `gradient-stars`     | `linear-gradient(135deg, rgba(255,200,230,0.7), rgba(220,180,255,0.7))` |
| `gradient-chores`    | `linear-gradient(135deg, rgba(180,240,200,0.7), rgba(160,230,255,0.7))` |
| `gradient-movie-btn` | `linear-gradient(135deg, #ffcc88, #ffaa66)`                |

---

## 4. Spacing & Layout

| Token              | Value    | Notes                              |
|--------------------|----------|------------------------------------|
| Base unit          | `8px`    | All spacing is multiples of 8      |
| Dashboard max-width| `1100px` | Centered, `margin: 0 auto`         |
| Dashboard padding  | `18px 20px 40px` |                           |
| Grid gap (main)    | `18px`   | Left/right column gap              |
| Grid gap (top row) | `16px`   | Clock + stat cards                 |
| Grid gap (inner)   | `8–10px` | Photo grid, video grid             |
| Card padding       | `18px 20px` | Standard card inner padding     |
| Header padding     | `18px 28px` |                                 |
| Modal padding      | `24px`   |                                 |
| Modal width        | `320px`  |                                 |

### Grid Structure

```
[ HEADER — full width ]

[ CLOCK ] [ STARS STAT ] [ CHORES STAT ]   ← 3-col equal grid

[ LEFT 260px          ] [ RIGHT 1fr                          ]
  Chores card              Videos card (full right width)
  Goals card               [ PHOTOS 1fr ] [ MOVIES 1fr ]

[ BOTTOM BANNER — full width ]
```

---

## 5. Border Radius

| Context          | Radius  |
|------------------|---------|
| Header, cards, banner, clock | `24px` |
| Header (larger feel) | `28px` |
| Chore check circle | `50%` |
| Video cards, photo slots | `14–16px` |
| Movie items      | `14px`  |
| Progress bar     | `20px`  |
| Modals           | `24px`  |
| Modal inputs     | `12px`  |
| Add button (small)| `12px` |
| Name input       | `16px`  |
| Goal/add buttons | `14px`  |

---

## 6. Shadow System

| Context         | Shadow                                        |
|-----------------|-----------------------------------------------|
| Header          | `0 8px 32px rgba(200,120,200,0.25)`           |
| Clock card      | `0 6px 24px rgba(100,160,220,0.2)`            |
| General card    | `0 4px 20px rgba(180,140,220,0.12)`           |
| Bottom banner   | `0 4px 20px rgba(100,160,220,0.2)`            |
| Modal           | `0 20px 60px rgba(180,120,220,0.3)`           |
| Video card hover| `0 8px 20px rgba(100,160,220,0.3)`            |

---

## 7. Borders

| Context         | Style                                         |
|-----------------|-----------------------------------------------|
| Header          | `3px solid rgba(255,255,255,0.7)`             |
| Cards           | `3px solid rgba(255,255,255,0.9)`             |
| Clock card      | `3px solid rgba(255,255,255,0.8)`             |
| Photo slots     | `3px solid rgba(255,255,255,0.8)`             |
| Bottom banner   | `3px solid rgba(255,255,255,0.8)`             |
| Modal           | `3px solid #e8b8ff`                           |
| Modal inputs    | `2px solid #d0a0e0`                           |
| Chore check     | `3px solid #e090c0`                           |
| Add input       | `2px solid #e090c0`                           |
| Video add (dashed) | `2px dashed rgba(100,160,220,0.4)`         |
| Video card      | `2px solid rgba(100,160,220,0.3)`             |
| Movie item      | `2px solid rgba(220,160,100,0.3)`             |
| Progress ring   | `2px solid rgba(220,180,255,0.5)`             |
| Modal cancel btn| `2px solid #d0b0e8`                           |

---

## 8. Backdrop / Glass Effect

Cards use `backdrop-filter: blur(8px)` with `background: rgba(255,255,255,0.75)`.  
Modal overlay uses `backdrop-filter: blur(4px)` with `background: rgba(100,80,150,0.4)`.

---

## 9. Components

### Header
- Full-width, `gradient-header` background
- Left: bouncing emoji (52px) + `Fredoka One` title + `Nunito` subtitle
- Right: frosted glass name input (`Fredoka One`, centered, 180px wide)
- Decorative circle pseudo-element top-right (`rgba(255,255,255,0.2)`, 120px)
- `overflow: hidden` to clip decoration

### Stat Cards (Stars / Chores Done)
- Centred content: large emoji (42px) + count (`Fredoka One` 22px) + label (`Nunito` 700 12px)
- Uses `gradient-stars` or `gradient-chores` as background

### Clock Card
- Centred, `gradient-clock` background
- Time: `Fredoka One` 52px, `#2060a0`
- Date: `Nunito` 700 14px, `#4080c0`
- Day/greeting: `Fredoka One` 20px, `#5090d0`

### Chore Item
- Row: circle checkbox (28px, animated fill on done) + emoji (18px) + label
- Hover: `translateX(4px)`
- Done state: checkbox fills with `gradient-cta`; label gets strikethrough + muted color
- Add row: flex input + `+` button (gradient, 32px square)

### Goal Item
- Goal name + star count in a row
- Progress bar: 12px high, `gradient-goal-bar`, animates width on change (`0.5s ease`)
- Controls: emoji star buttons (`⭐ +1` / `➖`) that scale on hover

### Video Card
- Grid, auto-fill, min 130px columns
- Each card: `gradient-video`, emoji icon (32px), name below
- Hover: `translateY(-4px)` + shadow lift
- Add card: dashed border variant

### Photo Slot
- 4-column grid, `aspect-ratio: 1`
- `gradient-photo` background when empty; emoji placeholder (24px)
- `scale(1.05)` on hover
- Hidden `<input type="file">` overlay for upload

### Movie Item
- Horizontal row: emoji poster (26px) + info (name + genre) + heart toggle
- `gradient-movie` row background
- Hover: `translateX(4px)`
- Heart toggles between `🤍` and `❤️`

### Bottom Banner
- Full-width, `gradient-banner`
- Left: wobble-animated `🐚` emoji
- Centre: fun fact label + text
- Right: "Next Fact" button + `🐠` bounce animation

### Modal
- Overlay: full-screen fixed, blurred backdrop
- White modal box, `border-radius: 24px`, `border: 3px solid #e8b8ff`
- Title: `Fredoka One` 20px, `#8040c0`
- Inputs: full width, lavender border, `Nunito`
- Buttons: gradient OK + muted cancel, flex row

---

## 10. Animations

| Name        | Behaviour                                           | Duration   | Target             |
|-------------|-----------------------------------------------------|------------|--------------------|
| `bounce`    | `translateY(0 → -6px → 0)`                         | 2s ∞       | Header emoji, `🐠` |
| `wobble`    | `rotate(-5deg → 5deg → -5deg)`                     | 3s ∞       | `🐚` ocean deco    |
| `twinkle`   | opacity + scale + rotation pulse                    | 2s ∞       | Sparkle stars      |
| `floatUp`   | `translateY(110vh → -10vh)` with opacity fade       | 7–13s ∞    | Bubbles            |
| Hover lift  | `translateY(-4px)` + shadow                         | 0.2s ease  | Video cards        |
| Hover slide | `translateX(4px)`                                   | 0.15s ease | Chore items, movies|
| Hover scale | `scale(1.05)` or `scale(1.12)` or `scale(1.3)`     | 0.15s ease | Photo slots, btns  |
| Goal bar    | `width` transition                                  | 0.5s ease  | Goal progress bar  |
| Chore check | background + border fill                            | 0.2s ease  | Checkbox circle    |

---

## 11. Ambient Decorations

These are fixed-position, `pointer-events: none`, `z-index: 0` — always behind content.

- **Bubbles** (8 total): white semi-transparent circles, varying sizes 8–30px, staggered `floatUp` animation
- **Sparkles** (4 total): star clip-path shapes, yellow (`#fff9a0`), twinkling
- **Wave overlay**: fixed bottom, 120px fade to `rgba(100,180,255,0.25)`

---

## 12. Interactive States

| Element          | Default             | Hover                    | Active / Done               |
|------------------|---------------------|--------------------------|-----------------------------|
| Chore checkbox   | White, pink border  | —                        | Gradient fill, no border    |
| Chore label      | `#604080`           | —                        | Strikethrough, `#b090c0`    |
| Video card       | Flat                | Lift + shadow            | —                           |
| Photo slot       | Emoji placeholder   | `scale(1.05)`            | Shows uploaded image        |
| Movie heart      | `🤍`                | `scale(1.3)`             | `❤️`                        |
| Add chore btn    | Gradient            | `scale(1.12)`            | —                           |
| Star buttons     | Normal              | `scale(1.3)`             | —                           |
| Modal OK btn     | `gradient-cta`      | —                        | —                           |
| Modal Cancel btn | `#f0e8f8`           | —                        | —                           |

---

## 13. Content Conventions

- Every section title includes a leading emoji followed by a child-friendly label (e.g. `👑 My Royal Chores`)
- Section title colours are distinct per section — see colour palette for per-section accent colours
- Button copy ends with emoji or sparkle character (e.g. `+ Add a Goal ✨`, `Next Fact ✨`)
- Empty/placeholder states use thematic emojis: `🌺 🐚 🐠 🧜‍♀️ 🌊 👑 ⭐ 🦀`
- All user-facing text is warm and second-person: "My Royal Chores", "Your magical ocean kingdom"

---

## 14. Accessibility Notes

- Colour contrast is designed for a child-friendly aesthetic — verify WCAG AA for interactive elements if extending
- All interactive elements have `cursor: pointer`
- Focus states should be added for keyboard navigation (not present in source — flag as gap)
- `aria-label` attributes should be added to icon-only buttons (add chore `+`, heart toggle)
- Inputs have `placeholder` text as the only label — add `aria-label` for screen reader support
