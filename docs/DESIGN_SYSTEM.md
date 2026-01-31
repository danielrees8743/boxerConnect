# BoxerConnect Design System

## Brand Identity

### Vision
BoxerConnect is the premier platform where boxing athletes find worthy opponents. Our design reflects the discipline, power, and respect inherent in the sport of boxing.

### Design Pillars

| Pillar | Meaning | Visual Expression |
|--------|---------|-------------------|
| **Power** | Strength, confidence, impact | Bold typography, strong contrast, decisive actions |
| **Precision** | Accuracy, skill, professionalism | Clean layouts, exact spacing, pixel-perfect alignment |
| **Respect** | Trust, reliability, sportsmanship | Consistent patterns, clear hierarchy, honest UI |
| **Championship** | Excellence, achievement, elite | Gold accents, premium feel, attention to detail |

---

## Color Palette

### Primary Colors

```
RING RED       #DC2626    - Primary actions, CTAs, energy
               HSL: 0 84% 50%

NAVY CORNER    #1E293B    - Backgrounds, authority, stability
               HSL: 217 33% 17%

CHAMPIONSHIP   #F59E0B    - Highlights, achievements, premium
GOLD           HSL: 38 92% 50%
```

### Secondary Colors

```
CANVAS WHITE   #F8FAFC    - Light backgrounds, breathing room
               HSL: 210 40% 98%

ROPE GRAY      #64748B    - Secondary text, borders, subtle elements
               HSL: 215 16% 47%

CORNER BLUE    #3B82F6    - Links, info states, secondary actions
               HSL: 217 91% 60%
```

### Semantic Colors

```
VICTORY GREEN  #22C55E    - Success, wins, positive actions
               HSL: 142 71% 45%

KNOCKOUT RED   #EF4444    - Errors, warnings, destructive actions
               HSL: 0 84% 60%

TRAINING AMBER #F59E0B    - Pending, in-progress, caution
               HSL: 38 92% 50%
```

### Color Usage Guidelines

| Use Case | Light Mode | Dark Mode |
|----------|------------|-----------|
| Background | Canvas White | Navy Corner |
| Text Primary | Navy Corner | Canvas White |
| Text Secondary | Rope Gray | Rope Gray (lighter) |
| Primary Action | Ring Red | Ring Red |
| Accent/Highlight | Championship Gold | Championship Gold |
| Success | Victory Green | Victory Green |
| Error | Knockout Red | Knockout Red |

---

## Typography

### Font Stack

```css
/* Primary - Headlines & UI */
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

/* Display - Hero text, stats */
font-family: 'Oswald', 'Impact', sans-serif;  /* Optional for punch */
```

### Type Scale

| Level | Size | Weight | Line Height | Use Case |
|-------|------|--------|-------------|----------|
| Display | 48px / 3rem | 800 | 1.1 | Hero headlines, fight announcements |
| H1 | 36px / 2.25rem | 700 | 1.2 | Page titles |
| H2 | 30px / 1.875rem | 700 | 1.25 | Section headers |
| H3 | 24px / 1.5rem | 600 | 1.3 | Card titles, subsections |
| H4 | 20px / 1.25rem | 600 | 1.4 | Small headers |
| Body Large | 18px / 1.125rem | 400 | 1.6 | Lead paragraphs |
| Body | 16px / 1rem | 400 | 1.6 | Default text |
| Small | 14px / 0.875rem | 400 | 1.5 | Captions, helper text |
| Tiny | 12px / 0.75rem | 500 | 1.4 | Labels, badges |

### Typography Principles

1. **Headlines Hit Hard**: Bold, uppercase for major announcements
2. **Body Stays Clean**: Regular weight, generous line height for readability
3. **Stats Stand Out**: Tabular numbers, monospace for fight records
4. **Labels Are Clear**: All caps for categories, medium weight

---

## Spacing System

### Base Unit: 4px

```
space-1:   4px   - Tight grouping (icon + label)
space-2:   8px   - Related elements
space-3:  12px   - Form field internal padding
space-4:  16px   - Default spacing, card padding
space-5:  20px   - Comfortable breathing room
space-6:  24px   - Section internal spacing
space-8:  32px   - Between sections
space-10: 40px   - Major section breaks
space-12: 48px   - Page section margins
space-16: 64px   - Hero spacing
```

### Layout Grid

```
Container: max-width 1280px, centered
Columns: 12-column grid
Gutter: 24px (desktop), 16px (mobile)
Margins: 24px (desktop), 16px (mobile)
```

---

## Component Patterns

### Buttons

```
PRIMARY (Ring Red)
- Background: #DC2626
- Text: White
- Hover: Darken 10%
- Active: Scale 0.98
- Shadow: 0 4px 14px rgba(220, 38, 38, 0.25)

SECONDARY (Outline)
- Border: 2px solid current color
- Background: Transparent
- Hover: Fill with 10% opacity

GHOST
- Background: Transparent
- Hover: Background 5% opacity

DESTRUCTIVE (Knockout Red)
- Use sparingly
- Confirm dangerous actions
```

### Cards

```
BOXER CARD
┌─────────────────────────────────┐
│  [Profile Photo]                │
│                                 │
│  Name                    W-L-D  │
│  Weight Class • Location        │
│                                 │
│  [Experience Badge]             │
│                                 │
│  ┌─────────┐ ┌─────────────┐   │
│  │ View    │ │ Challenge   │   │
│  └─────────┘ └─────────────┘   │
└─────────────────────────────────┘

- Subtle shadow for depth
- Rounded corners (8px)
- Hover: Lift effect (translate-y -2px, shadow increase)
```

### Fight Record Display

```
┌─────────────────────────────────┐
│        PROFESSIONAL RECORD       │
│                                 │
│    50      6       2            │
│   WINS   LOSSES  DRAWS          │
│   (44 KO)                       │
│                                 │
│    ████████████░░  89% Win Rate │
└─────────────────────────────────┘

- Large, bold numbers
- Color-coded: Green wins, Red losses, Gray draws
- Progress bar for win rate
```

### Match Request Card

```
┌─────────────────────────────────┐
│  ⏳ PENDING                     │
│                                 │
│  [Photo] Evander H. wants to    │
│          challenge you          │
│                                 │
│  📍 MGM Grand, Las Vegas        │
│  📅 March 15, 2026              │
│                                 │
│  "Ready for a rematch?"         │
│                                 │
│  ┌─────────┐ ┌─────────────┐   │
│  │ Decline │ │   Accept    │   │
│  └─────────┘ └─────────────┘   │
└─────────────────────────────────┘

Status badges:
- PENDING: Amber/Gold
- ACCEPTED: Victory Green
- DECLINED: Muted Gray
- EXPIRED: Faded
```

---

## Iconography

### Icon System: Lucide React

- **Size**: 20px default, 16px small, 24px large
- **Stroke**: 2px
- **Style**: Rounded caps, consistent weight

### Key Icons

| Concept | Icon | Usage |
|---------|------|-------|
| Weight | `Scale` | Weight class display |
| Location | `MapPin` | City/Country |
| Record | `Trophy` | Fight statistics |
| Match | `Swords` | Challenge/Fight |
| Calendar | `Calendar` | Date selection |
| User | `User` | Profile |
| Search | `Search` | Find boxers |
| Settings | `Settings` | Configuration |
| Check | `Check` | Success/Confirm |
| X | `X` | Close/Cancel |
| Alert | `AlertTriangle` | Warnings |

---

## Motion & Animation

### Principles

1. **Quick & Decisive**: Like a jab - fast, purposeful
2. **Smooth Power**: Easing that feels controlled
3. **Minimal Flash**: No unnecessary animation

### Timing

```css
--duration-fast: 150ms;     /* Micro-interactions */
--duration-normal: 200ms;   /* Standard transitions */
--duration-slow: 300ms;     /* Page transitions */

--ease-out: cubic-bezier(0.16, 1, 0.3, 1);  /* Decisive finish */
--ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);  /* Smooth power */
```

### Key Animations

```css
/* Button press - quick impact */
.btn:active {
  transform: scale(0.98);
  transition: transform 100ms ease-out;
}

/* Card hover - controlled lift */
.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.12);
  transition: all 200ms ease-out;
}

/* Page enter - confident slide */
.page-enter {
  animation: slideUp 300ms ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

---

## Responsive Breakpoints

```css
/* Mobile First */
sm:  640px   /* Large phones, small tablets */
md:  768px   /* Tablets */
lg:  1024px  /* Laptops */
xl:  1280px  /* Desktops */
2xl: 1536px  /* Large displays */
```

### Layout Adaptations

| Element | Mobile | Tablet | Desktop |
|---------|--------|--------|---------|
| Navigation | Bottom bar | Side drawer | Top bar |
| Boxer Grid | 1 column | 2 columns | 3-4 columns |
| Cards | Full width | Fixed width | Fixed width |
| Typography | -1 step | Base | Base |
| Spacing | Tighter | Standard | Generous |

---

## Accessibility

### Color Contrast

All text meets WCAG 2.1 AA standards:
- Normal text: 4.5:1 minimum
- Large text: 3:1 minimum
- UI components: 3:1 minimum

### Focus States

```css
/* Visible focus ring */
:focus-visible {
  outline: 2px solid hsl(var(--ring));
  outline-offset: 2px;
}

/* Skip to main content */
.skip-link:focus {
  position: fixed;
  top: 4px;
  left: 4px;
  z-index: 9999;
}
```

### Screen Reader Support

- All images have meaningful alt text
- Icons have aria-labels
- Form fields have associated labels
- Dynamic content uses aria-live regions

---

## Dark Mode

### Philosophy
Dark mode should feel like stepping into the gym at night - focused, intense, professional.

### Key Differences

| Element | Light Mode | Dark Mode |
|---------|------------|-----------|
| Background | #F8FAFC | #0F172A |
| Surface | #FFFFFF | #1E293B |
| Primary Text | #1E293B | #F1F5F9 |
| Borders | #E2E8F0 | #334155 |
| Ring Red | #DC2626 | #EF4444 (slightly brighter) |
| Gold | #F59E0B | #FBBF24 (slightly brighter) |

---

## Voice & Tone

### Language Style

- **Direct**: "Find your next opponent" not "Discover potential sparring opportunities"
- **Respectful**: "Challenge" not "Fight", professional terminology
- **Confident**: Active voice, strong verbs
- **Encouraging**: Celebrate achievements, acknowledge effort

### Microcopy Examples

| Context | Copy |
|---------|------|
| Empty state | "No matches yet. Time to step into the ring." |
| Success | "Challenge sent. Now we wait for their answer." |
| Error | "Something went wrong. Let's try that again." |
| Loading | "Finding your competition..." |
| CTA | "Find Your Match" / "Accept Challenge" / "Step Up" |

---

## Implementation Checklist

### Before Launch

- [ ] All colors meet contrast requirements
- [ ] Typography scale implemented
- [ ] Spacing system consistent
- [ ] All components have hover/focus/active states
- [ ] Dark mode fully tested
- [ ] Mobile responsive verified
- [ ] Animations respect `prefers-reduced-motion`
- [ ] Screen reader testing complete

---

*This design system is a living document. Update as the product evolves.*
