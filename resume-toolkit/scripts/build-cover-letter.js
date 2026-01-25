const fs = require('fs');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = require('docx');

// Cover Letter Content
const content = {
    name: "SERGEY RYADOVOY",
    contact: "Mountain View, CA | ryadovoys@gmail.com | ryadovoy.com | linkedin.com/in/sergeyryadovoy",

    // Recipient removed per user request


    body: [
        "I'm a design leader with 15 years of experience, currently VP of Experience Design at Digitas, where I lead AI product design. I'm applying for the Senior AI Product Designer role on the Gemini team because I want to design AI experiences at the scale and quality that Google operates at.",

        "At Digitas, I lead a team focused on AI interfaces and design systems. One of our main projects is an internal agentic platform with conversational AI experiences, including chatbot interfaces that let users train bots with their own data. I prototype rapidly using Figma and code, which helps teams make decisions faster. Before that, I led Visa's digital presence for three years, building their design system and exploring AI experiments.",

        "I also build my own AI products. Mindcomplete is a Figma plugin that uses Gemini to complete your writing in real time. Journely is an iOS app I created for iPad, a conversational UI that uses handwriting instead of typed text for journaling and therapy. Both are available to download.",

        "What makes me different is my combination of skills. Strong visual foundation from years of branding and typography. Systems thinking from building design systems at scale. And hands-on AI experience, not just exploring, but shipping real products. I also believe in keeping humans in the loop when designing AI, which was a priority in our Digitas platform.",

        "I'd love to bring this experience to the Gemini team."
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
