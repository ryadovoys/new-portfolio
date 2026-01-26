const fs = require('fs');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } = require('docx');

// Resume Content
const content = {
    name: "SERGEY RYADOVOY",
    contact: "Mountain View, CA | ryadovoys@gmail.com | ryadovoy.com | linkedin.com/in/sergeyryadovoy",

    summary: "Design leader with 15 years of experience. Currently VP at Digitas, architecting agentic AI platforms and generative media workflows. My approach is defined by a simple rule: don't just imagine features; prototype them with real models. I use the Gemini API to connect real models and Figma to create pixel-perfect user flows. This minimizes the gap between the prototype and the real product, allowing us to validate probabilistic interactions and make smarter product decisions early in the process.",

    skills: [
        { category: "Product Design", items: "User-Centered Design, End-to-End Product Design, User Research, Systems Thinking, Design Strategy" },
        { category: "AI & Generative Media", items: "Gemini API, Natural Language Processing (NLP), Machine Learning, Visual Electric, Sora, Runway, Kling" },
        { category: "Prototyping & Code", items: "Figma, Adobe Creative Suite, HTML, JavaScript, Front-end, ProtoPie, Principle, Origami Studio" },
        { category: "Design Systems", items: "Figma Variables, Token Architecture, Scalable Systems, Cross-Functional Collaboration" }
    ],

    experience: [
        {
            title: "Vice President of Experience Design",
            company: "Digitas",
            dates: "January 2025 - Present",
            description: "Leading a design team focused on AI interfaces and design systems for enterprise clients.",
            bullets: [
                "Architected intuitive AI experiences for an internal agentic platform, designing end-to-end user flows that allow non-technical users to build and train their own agents",
                "Simulated model responses using code, Figma, and Gemini API to validate probabilistic interactions before engineering handoff",
                "Created scalable design systems to improve team efficiency and brand consistency across touchpoints",
                "Championed design innovation by prioritizing human-in-the-loop patterns for responsible AI experiences",
                "Led creative workshops to enhance cross-functional team collaboration"
            ]
        },
        {
            title: "Lead Experience Designer",
            company: "Digitas",
            dates: "March 2020 - December 2024",
            description: "Led design initiatives for major global brands, focusing on design systems and digital transformation.",
            bullets: [
                "Led Visa's creative initiatives for 3 years, shaping their digital presence and Figma design system as one of their main US creative partners",
                "Designed conversational AI experiments for Visa and L'Oreal",
                "Built scalable design systems for Visa and RaceTrac that significantly reduced production time",
                "Led research and website redesign for Amway and Nutrilite digital products",
                "Created pitches and prototypes that won partnerships with GoodEggs, FIS, and Snowflake",
                "Designed cross-platform experiences for web, mobile, and apps"
            ]
        },
        {
            title: "Senior Graphic Designer / Art Director",
            company: "Funky Agency",
            dates: "September 2016 - August 2019",
            description: "",
            bullets: [
                "Led packaging, branding, and communication design projects from research and strategy through final execution",
                "Work earned 4 industry awards and features in The Dieline, Packaging of the World, and Behance Gallery",
                "Built foundation in typography, composition, and visual craft that shapes digital product design approach"
            ]
        },
        {
            title: "Graphic Designer",
            company: "Z&G Branding",
            dates: "March 2012 - September 2016",
            description: "",
            bullets: [
                "Worked with 50+ brands including major federal companies on brand identity and packaging",
                "Grew from junior to senior designer, gaining experience across diverse design disciplines",
                "2 projects published internationally, 2 Logolounge awards, 1 Behance feature"
            ]
        }
    ],

    projects: [
        { name: "Mindcomplete", description: "AI-powered Figma plugin that uses Gemini to complete your writing in real-time. Available on Figma Community." },
        { name: "Journely", description: "iOS app for iPad with conversational UI that uses handwriting instead of typed text for AI-powered journaling. Available on App Store." },
        { name: "Peace Sans", description: "Free display font with 500K+ downloads, one of the most popular free fonts on Behance." }
    ],

    activities: [
        { title: "Figma Config Leadership Attendee", details: "2024, 2025" },
        { title: "Public Speaker", details: "Gave talks about AI and design, sharing experiments and practical ways designers can use AI" },
        { title: "Design Mentorship", details: "Mentoring middle designers through monthly conversations to support their career growth" }
    ],

    education: {
        degree: "Master of Computer Science",
        school: "Ural State University",
        dates: "2005 - 2010"
    }
};

// Style Settings: Matches ryadovoy-resume-2026.docx (Extracted)
const style = {
    font: "Arial",
    headingSize: 40,   // 20pt (sz=40)
    bodySize: 24,      // 12pt (sz=24)
    contactSize: 22,   // 11pt (sz=22)
    sectionSize: 28,   // 14pt (sz=28) - "Heading 1" in DOCX is 14pt
    jobTitleSize: 24,  // 12pt (sz=24)

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
    paragraphSpacing: 200, // 200 twips (10pt) - Used in contact spacing
    sectionSpacingBefore: 480, // 24pt
    sectionSpacingAfter: 240,  // 12pt

    border: false // No borders in reference file styles
};

// Helper: Create Section Title
const createSectionTitle = (text) => {
    const paragraphOptions = {
        text: text.toUpperCase(),
        heading: HeadingLevel.HEADING_1, // Using Heading 1 as per reference
        spacing: { before: style.sectionSpacingBefore, after: style.sectionSpacingAfter },
        border: undefined // Explicitly no border
    };

    return new Paragraph(paragraphOptions);
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
                },
                paragraph: {
                    spacing: { before: style.sectionSpacingBefore, after: style.sectionSpacingAfter }
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
                    new TextRun({ text: item, size: style.contactSize }), // 11pt
                    ...(index < array.length - 1 ? [new TextRun({ text: "  |  ", color: style.separatorColor, size: style.contactSize })] : [])
                ]),
                alignment: AlignmentType.LEFT,
                spacing: { after: 200 } // Matches extracted "200"
            }),

            // SUMMARY
            createSectionTitle("Summary"),
            new Paragraph({
                text: content.summary,
                spacing: { after: 60 } // Matches extracted "60"
            }),

            // SKILLS
            createSectionTitle("Skills"),
            ...content.skills.map(skill => new Paragraph({
                children: [
                    new TextRun({ text: skill.category + ": ", bold: true }),
                    new TextRun({ text: skill.items })
                ],
                spacing: { after: 60 } // Matches extracted "60"
            })),

            // EXPERIENCE
            createSectionTitle("Experience"),
            ...content.experience.flatMap(job => [
                new Paragraph({
                    children: [
                        new TextRun({ text: job.title, bold: true }), // size inherited (24/12pt)
                        new TextRun({ text: "  |  ", color: style.separatorColor }),
                        new TextRun({ text: job.company }),
                        new TextRun({ text: "  |  ", color: style.separatorColor }), // Added second separator per reference text
                        new TextRun({ text: job.dates }) // Removed italics, matched reference
                    ],
                    spacing: { after: 40 } // Matches extracted "40"
                }),
                ...(job.description ? [new Paragraph({
                    text: job.description,
                    spacing: { after: 40 }
                })] : []),
                ...job.bullets.map((bullet, index, array) => new Paragraph({
                    text: "• " + bullet,
                    spacing: { after: index === array.length - 1 ? 240 : 40 } // Last bullet has 12pt (240 twips) spacing
                }))
            ]),

            // PROJECTS
            createSectionTitle("Projects & Outside Experience"),
            ...content.projects.map(project => new Paragraph({
                children: [
                    new TextRun({ text: project.name + ":", bold: true }), // Colon added
                    new TextRun({ text: " " + project.description })
                ],
                spacing: { after: 40 }
            })),

            // ACTIVITIES
            createSectionTitle("Activities & Leadership"),
            ...content.activities.map(activity => {
                const separator = activity.title.includes("Figma") ? " " : ": ";
                const details = activity.title.includes("Figma") ? "2024 – 2025" : activity.details;

                return new Paragraph({
                    children: [
                        new TextRun({ text: activity.title, bold: true }),
                        new TextRun({ text: separator + details })
                    ],
                    spacing: { after: 40 }
                });
            }),

            // EDUCATION
            createSectionTitle("Education"),
            new Paragraph({
                children: [
                    new TextRun({ text: content.education.degree, bold: true }),
                    new TextRun({ text: "  |  ", color: style.separatorColor }),
                    new TextRun({ text: content.education.school }),
                    new TextRun({ text: "  |  ", color: style.separatorColor }), // Added pipe
                    new TextRun({ text: content.education.schoolLocation || "Russia" }), // Hardcoded in XML "Russia", adding fallback
                    new TextRun({ text: "  |  ", color: style.separatorColor }),
                    new TextRun({ text: content.education.dates })
                ],
                // No tab stops in reference for Education
            })
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
    const filename = `ryadovoy-resume-google-${getTimestamp()}.docx`;
    const outputPath = path.join(__dirname, '../output', filename);
    fs.writeFileSync(outputPath, buffer);
    console.log(`Resume generated: ${outputPath}`);
});

