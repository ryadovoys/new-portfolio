# Project Intelligence & Agent Instructions

## 1. Project Overview
**Project Name**: New Portfolio (Sergey Ryadovoy)
**Description**: A premium, "workspace-aware" personal portfolio and digital assistant for a Design Leader. It combines a high-aesthetic public portfolio with private productivity tools.

### Tech Stack
- **Frontend**: Vanilla HTML5, CSS3 (CSS Variables for Tokens), JavaScript (ES6+).
- **Styling**: `css/tokens.css` (Design System source of truth), `css/components/`.
- **Backend/Data**: Supabase (Context storage, Projects), Node.js (Local scripts).
- **Agent Integration**: `.agent/` directory for Skills and Workflows.

## 2. Living Product Requirements Document (PRD)

### Vision
To create a "magical" interface that not only showcases Sergey's work (Visa, Global Brands) but also acts as an extension of his mind ("The Brain"). The interface should feel alive, responsive, and premium.

### Core Pillars
1.  **Aesthetics First**: Vibrant colors, glassmorphism, smooth animations (GSAP), and "wow" moments. Never settle for basic or generic designs.
2.  **Context Awareness**: The system should understand the user's workspace, files, and intent.
3.  **Efficiency**: Reusable skills and automations to speed up workflows (e.g., asset generation).

### Key Features
-   **Bento Grid Layout**: A dynamic, responsive grid for showcasing work and tools.
-   **Mobile Inline Reels**: Project cards (folders) feature horizontal scrolling directly in the mobile feed.
-   **Immersive Project Expansion**: Full-height (window - 120px) card expansion on desktop with fluid FLIP animations.
-   **The Brain**: A central hub for context ingestion (URLs, PDFs, Images).
-   **Magic Assets**: Automatic generation of high-quality assets (GIFs from PDFs).

## 3. Sandboxes & Prototyping

### 🧪 UI Experiments (`experiment.html`)
The staging ground for high-fidelity UI interactions and physics-based animations.
*   **Files**: `experiment.html`, `css/experiment.css`, `js/experiment.js`.
*   **Active Prototypes**: 
    *   **Physics Scroll**: Desktop/Mobile unified gesture handling (Momentum, Tension).
    *   **Proportional Scaling**: Image-first scaling logic for project viewing.
    *   **Micro-interactions**: Hover-peek layers and animated close (X) button.

## 4. Skills Catalog
These are specialized capabilities available to the agent. Refer to the specific `SKILL.md` for detailed instructions.

### 🎥 PDF to GIF Converter
*   **Description**: Converts PDF documents into animated GIFs with customizable styling (dimensions, rounded corners, margins).
*   **Location**: `.agent/skills/pdf_to_gif/SKILL.md`
*   **Usage**: "Make a GIF from this PDF", "Convert `deck.pdf` to a small card GIF".
*   **Key Parameters**: Dimensions, Duration, Margins, Radius.

---

*Verified and Active as of Jan 2026. This document is the source of truth for agent behavior and project state. Update it after every major iteration.*
