# Resume & Cover Letter Toolkit

A system for generating perfectly matching Resume and Cover Letter documents for Sergey Ryadovoy. Designed for automation and iterative AI tailoring.

## 📂 Structure

```
resume-toolkit/
├── scripts/
│   ├── build-resume.js       # Generates Resume (ryadovoy-resume-perfect.docx)
│   └── build-cover-letter.js # Generates Cover Letter with timestamp
├── output/                   # All generated DOCX files appear here
└── instructions/
    └── AI_AGENT_PROMPT.md    # Instruction for AI agents to tailor content
```

## 🚀 How to Use

### 1. Generating Documents
Run these commands from the project root:

**To generate the Resume:**
```bash
node resume-toolkit/scripts/build-resume.js
```

**To generate a Cover Letter:**
```bash
node resume-toolkit/scripts/build-cover-letter.js
```
*Files will be saved in `resume-toolkit/output/`*

### 2. Tailoring for a Vacancy (AI Workflow)
To customize your documents for a specific job:

1.  Open the instruction file: `resume-toolkit/instructions/AI_AGENT_PROMPT.md`
2.  Copy its content.
3.  Paste it into a chat with an AI Agent (ChatGPT, Claude, Gemini).
4.  Paste the **Job Description**.
5.  Ask the AI to provide the code updates.
6.  Paste the provided code snippets into `build-resume.js` or `build-cover-letter.js`.
7.  Run the generation scripts again.

## 🎨 Style Notes
-   **Font**: Arial
-   **Sizes**: 12pt Body, 11pt Contact, 14pt Headers, 20pt Name.
-   **Margins**: 0.625" Top, 0.75" Sides/Bottom.
-   **Separators**: Gray (`#B7B7B7`) pipe with double spaces.

*Controlled by `style` constants in the scripts.*
