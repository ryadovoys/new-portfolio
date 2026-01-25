# AI Agent Instruction: Job Application Tailoring

**Goal**: Analyze a specific job description and tailor Sergey Ryadovoy's Resume and Cover Letter to maximize the probability of interview/approval (Target: 95%+).

**Constraint**: Make **minimal** but **high-impact** edits. Do not rewrite the entire personality. Focus on keyword alignment, highlighting relevant case studies, and mirroring the company's language.

---

## 1. Inputs Required
Before starting, ensure you have:
1.  **Taget Vacancy**: The full text of the job description (Role, Responsibilities, Requirements).
2.  **Current Resume Source**: Content from `create-resume.js` (The source of truth).
3.  **Current Cover Letter Source**: Content from `create-cover-letter.js` (The template).
4.  **Full Experience Context**: Sergey's LinkedIn profile export or full master portfolio data (to pull relevant details that might be missing from the current resume version).

---

## 2. Analysis Step (Thinking Process)
Do not output this step, but perform it internally:
1.  **Extract Keywords**: Identify the top 5-10 hard skills, soft skills, and "cultural pillars" mentioned in the JD (e.g., "Agentic AI", "0-to-1", "Design Systems", "Mentorship").
2.  **Gap Analysis**: Compare the JD against the Current Resume.
    *   *Match*: What already aligns perfectly?
    *   *Missing*: What skills does Sergey possess (from Experience Context) that are NOT highlighted in the Current Resume but are critical for this role?
    *   *Mismatch*: Is the resume emphasizing something irrelevant (e.g., "Packaging Design" for an "AI Interface" role)?
3.  **Tone Match**: Analyze the specific voice of the company (Formal vs. Playful, Corporate vs. Startup).

---

## 3. Output Requirements

### A. Resume Updates (`create-resume.js`)
Provide specific code snippets to replace or specific instructions.
*   **Summary Section**: Rewrite the 3-4 line summary to directly address the JD's core problem.
    *   *Example*: If JD asks for "scaling AI tools", change "designing AI interfaces" to "scaling agentic AI platforms".
*   **Skills Section**: Reorder or add keywords. Ensure Exact Match keywords from JD are present.
*   **Experience Bullets**: Suggest 1-2 bullet point tweaks.
    *   *Action*: Rephrase existing bullets to use the *verbs* from the JD.
    *   *Add*: Swap a less relevant bullet for a highly relevant one from the "Experience Context".

### B. Cover Letter Updates (`create-cover-letter.js`)
Provide the new `body` array.
*   **Hook (Para 1)**: Rewrite the opening to connect Sergey's *current status* directly to the *company's mission*.
*   **Proof (Para 2 & 3)**: Select the 2 most relevant case studies.
    *   *Logic*: If the role is about "Internal Tools", emphasize the "Digitas Agentic Platform". If the role is about "Consumer Apps", emphasize "Journely" and "Visa".
    *   *Language*: Use the "Star" method (Situation, Task, Action, Result) briefly.
*   **Closing**: Reaffirm specific value add.

### C. Critical Questions & Roadmap (The "missing 5%")
If 95% confidence isn't met with current data, ask Sergey:
*   "The JD emphasizes [Specific Skill/Tool]. You haven't mentioned this explicitly. Do you have experience with it that we can add?"
*   "They value [Specific Culture Attribute, e.g., 'Radical Candor']. Can we add a specific example of this to the Cover Letter?"

---

## 4. Execution Format (Example Response)

**Status**: 🟢 High Match (Current) -> 🚀 Targeted Match (Proposed)

### 1. Resume Tweaks
In `create-resume.js`:
-   **Update Summary**: Change "...leading AI product design" to "...leading **0-to-1** AI product design strategies".
-   **Update Skills**: Move "Figma" to the end, move "Agentic Workflows" to the front.

### 2. Cover Letter Body
Replace the `body` array in `create-cover-letter.js` with:
```javascript
[
  "I'm applying because...",
  "At Digitas, I solved exactly [Problem from JD] by...",
  ...
]
```

### 3. Questions
- Do you have metrics on how much time the Agentic Platform saved the team? Adding a % number would boost the impact significantly.
