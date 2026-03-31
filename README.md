# Neon Reflex

A polished reaction timer game built with **HTML**, **CSS**, **vanilla JavaScript**, and **Three.js**.

Neon Reflex measures how quickly a user responds to a visual cue, then wraps that simple interaction in a sleek, high-contrast interface with subtle 3D motion, playful performance messages, session stats, and accessible controls.

This project was designed to feel like a premium frontend portfolio piece, not just a basic browser game.

---

## Preview

Test your reflexes by starting a round, waiting through a randomized delay, and reacting the instant the interface switches into its active state.

The experience includes:

- precise reaction timing with `performance.now()`
- randomized wait states
- false start detection
- fun reaction-level messages
- session best and average scores
- recent attempt history
- keyboard, mouse, and touch support
- reduced motion support
- Three.js visuals that enhance the mood without distracting from the core interaction

---

## Features

### Core gameplay
- Start a reaction test
- Wait through a randomized delay
- React to the visual cue as quickly as possible
- See your result in milliseconds
- Retry instantly

### State handling
- Idle
- Waiting
- Ready
- Result
- Too early / false start

### User feedback
- Funny performance tiers like **Poor**, **Fair**, **Good**, **Great**, and **Excellent**
- Dynamic microcopy based on reaction speed
- Best score, average score, and attempt count
- Recent run history stored locally

### Accessibility and UX
- Supports mouse, touch, **Space**, and **Enter**
- Clear focus states
- Non-color cue for the active reaction state
- Reduced motion support with `prefers-reduced-motion`
- Responsive layout for desktop and mobile

### Visual design
- Dark neon interface
- Clean, centered layout
- Subtle geometric Three.js scene with motion and lighting shifts
- Designed for both usability and strong portfolio screenshots

---

## Tech Stack

- **HTML5**
- **CSS3**
- **Vanilla JavaScript**
- **Three.js**

No frameworks. No build step. No unnecessary abstraction.

---

## Project Structure

```bash
neon-reflex/
├── index.html
├── style.css
└── script.js
```

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/your-username/neon-reflex.git
cd neon-reflex
```

### 2. Run locally

Because the project uses a JavaScript module import for Three.js, it works best with a local server.

#### Option 1. VS Code Live Server
Open the project folder in Visual Studio Code and run it with the **Live Server** extension.

#### Option 2. Python server
If you have Python installed:

```bash
python -m http.server 8000
```

Then open:

```bash
http://localhost:8000
```

---

## How It Works

1. The user starts a test.
2. The app enters a waiting state with a randomized delay.
3. A visual cue appears.
4. The user reacts by clicking, tapping, or pressing a key.
5. The app records the reaction time using `performance.now()`.
6. The result is displayed in milliseconds, along with a fun performance message.
7. Scores are saved in `localStorage` for the current browser session history.

---

## Why I Built It

This project was created as a portfolio piece to demonstrate:

- product thinking
- interaction design
- precise frontend behavior
- clean state management
- thoughtful accessibility
- visual polish with restrained Three.js usage

The goal was to take a very small idea and execute it with care, clarity, and taste.

---

## Highlights

- **Precise timing logic** using `performance.now()`
- **Stable interaction handling** with `pointerup` to avoid touch and click double-firing
- **Delta-based animation updates** for smoother rendering
- **Local persistence** with `localStorage`
- **State-driven UI** with clear feedback for every phase of the experience

---

## Accessibility Notes

This project includes several accessibility-minded decisions:

- keyboard support with **Space** and **Enter**
- visible focus styles
- semantic HTML structure
- non-color cues for active states
- reduced motion handling for users who prefer less animation

Accessibility was treated as part of the product, not an afterthought.

---

## Future Improvements

A few possible next steps:

- difficulty modes or multi-round challenges
- shareable score card
- richer analytics and trend charts
- optional sound design improvements
- accessibility settings panel
- contained Three.js scene variation for even more stable rendering across browsers

