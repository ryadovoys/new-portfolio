const fs = require('fs');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = require('docx');

// Cover Letter Content
const content = {
    name: "SERGEY RYADOVOY",
    contact: "Mountain View, CA | ryadovoys@gmail.com | ryadovoy.com | linkedin.com/in/sergeyryadovoy",

    // Recipient removed per user request


    body: [
        "I'm applying for the Senior AI Product Designer role because I'm already building with Gemini. As a designer who codes, I used the Gemini API to build 'Mindcomplete', a Figma plugin that brings generative writing directly into the design environment. I want to bring this hands-on technical understanding of your models to the Gemini App team.",

        "Experience wise, I currently lead AI product design at Digitas. My team builds agentic platforms where we don't just imagine AI features—we prototype them. I use ComfyUI and advanced generative workflows (from Midjourney to Kling and Sora) to simulate model responses and define design requirements before engineering starts. This matches your need for a designer who can 'bridge design and technology' and 'simulate model responses'.",

        "My background spans 15 years, including leading Visa's design system and building successful consumer iOS apps like Journely. I understand how to turn complex model capabilities into intuitive, human-centered features.",

        "I'm excited about the chance to help shape the future of Generative Media with DeepMind."
    ]
};

// Style Settings: Matches ryadovoy-resume-perfect.docx (Exact Copy)
const style = {
    font: "Arial",
    headingSize: 40,   // 20pt (sz=40)
    bodySize: 24,      // 12pt (sz=24)
    contactSize: 22,   // 11pt (sz=22)
    sectionSize: 28,   // 14pt (sz=28)
    lineHeight: 276,   // w:line="276"

    // Margins (Twips)
    margins: {
        top: 900,      // 0.625 in
        right: 1080,   // 0.75 in
        bottom: 1080,  // 0.75 in
        left: 1080     // 0.75 in
    },

    // Colors
    separatorColor: "B7B7B7",

    // Spacing
    paragraphSpacing: 240, // 12pt paragraph spacing for letter body
};

// Build Document
const doc = new Document({
    styles: {
        default: {
            document: {
                run: {
                    font: style.font,
                    size: style.bodySize,
                    color: "000000"
                },
                paragraph: {
                    spacing: { line: style.lineHeight }
                }
            },
            heading1: {
                run: {
                    font: style.font,
                    size: style.sectionSize,
                    bold: true,
                    color: "000000"
                }
            }
        }
    },
    sections: [{
        properties: {
            page: {
                margin: style.margins
            }
        },
        children: [
            // --- HEADER (Same as Resume) ---

            // Name
            new Paragraph({
                text: content.name,
                heading: HeadingLevel.HEADING_1,
                alignment: AlignmentType.LEFT,
                spacing: { after: 100 },
                run: {
                    font: style.font,
                    size: style.headingSize,
                    bold: true,
                    color: "000000"
                }
            }),

            // Contact
            new Paragraph({
                children: content.contact.split(" | ").flatMap((item, index, array) => [
                    new TextRun({ text: item, size: style.contactSize }),
                    ...(index < array.length - 1 ? [new TextRun({ text: "  |  ", color: style.separatorColor, size: style.contactSize })] : [])
                ]),
                alignment: AlignmentType.LEFT,
                spacing: { after: 200 } // Matches extracted "200"
            }),

            // --- COVER LETTER CONTENT ---

            // Body Paragraphs
            ...content.body.map((text, index) => new Paragraph({
                text: text,
                spacing: {
                    before: index === 0 ? 1440 : 0, // 1440 twips = 1 inch spacing before first paragraph
                    after: style.paragraphSpacing
                }
            }))
        ]
    }]
});

const path = require('path');

// Helper to get formatted timestamp MMDDYYHHMM
const getTimestamp = () => {
    const now = new Date();
    const pad = (n) => n.toString().padStart(2, '0');
    return `${pad(now.getMonth() + 1)}${pad(now.getDate())}${now.getFullYear().toString().slice(-2)}${pad(now.getHours())}${pad(now.getMinutes())}`;
};

Packer.toBuffer(doc).then((buffer) => {
    const filename = `ryadovoy-coverletter-${getTimestamp()}.docx`;
    const outputPath = path.join(__dirname, '../output', filename);
    fs.writeFileSync(outputPath, buffer);
    console.log(`Cover Letter generated: ${outputPath}`);
});
