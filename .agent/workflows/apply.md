---
description: Analyzes role requirements and rebuilds resume and cover letter to match.
---

**Goal**: Analyze a specific job description and tailor Sergey Ryadovoy's Resume and Cover Letter to maximize the probability of interview/approval (Target: 95%+).

**Constraint**: Make **minimal** but **high-impact** edits. Do not rewrite the entire personality. Focus on keyword alignment, highlighting relevant case studies, and mirroring the company's language.

---

## 1. Inputs Required
Before starting, ensure you have:
1.  **Target Vacancy**: The full text of the job description.
2.  **Main Resume Reference**: `Context/02-RESUME-TEXT.docx` (Foundational source of truth).
3.  **Latest Generated Resumes**: `resume-toolkit/output/` (Check for latest formatting/structure).
4.  **Cards Data**: `data/cards.json` (Check for latest projects/metrics).
5.  **Current Cover Letter Source**: `resume-toolkit/scripts/build-cover-letter.js`.

---

## 2. Analysis Step (Thinking Process)
Do not output this step, but perform it internally:
1.  **Extract Keywords**: Identify the top 5-10 hard skills, soft skills, and "cultural pillars" mentioned in the JD.
2.  **Gap Analysis**: Compare the JD against the `02-RESUME-TEXT.docx`, `cards.json`, and latest outputs.
3.  **Tone Match**: Analyze the specific voice of the company.

---

## 3. Humanize Step (Mandatory)
Before generating the final proposed text, you MUST apply the principles from the **Humanize Workflow**.
Refer to `Context/HUMANIZE-SKILL.md` (or `../../.gemini/antigravity/global_workflows/humanize.md`).

**Key Humanization Rules:**
- Remove AI patterns ("delve", "testament", "tapestry").
- Remove negative parallelisms ("not just X, but Y").
- Ensure the tone differs from "Corporate AI".
- Inject *specific* personality (opinions, doubts, first-person perspective where appropriate).

---

## 4. Proposal & Confirmation (The "Stop" Step)
**CRITICAL**: You must NOT apply changes immediately. You must present the proposed changes first and wait for user confirmation.

**Output Format for Proposal:**

**Status**: 🟢 High Match (Current) -> 🚀 Targeted Match (Proposed)

### 1. Resume Tweaks (Proposed)
-   **Update Summary**: [Show the exact new summary text]
-   **Update Skills**: [Show the exact change]

### 2. Cover Letter Body (Proposed)
```javascript
[
  "I'm applying because...",
  "At Digitas, I solved exactly [Problem from JD] by...",
  ...
]
```

### 3. Questions
- Ask any clarifying questions here.

**[WAIT FOR USER CONFIRMATION BEFORE PROCEEDING]**

---

## 5. Execution (After Confirmation)
Only after the user says "Yes" or approves the plan:
1.  Apply the changes to `resume-toolkit/scripts/build-resume.js` and `resume-toolkit/scripts/build-cover-letter.js`.
2.  Run the generation scripts.