const fs = require('fs');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } = require('docx');

// Resume Content
const content = {
    name: "SERGEY RYADOVOY",
    contact: "Cupertino, CA | ryadovoys@gmail.com | ryadovoy.com | linkedin.com/in/sergeyryadovoy",

    summary: "Design leader with 15 years of experience across branding, digital products, and AI. Currently VP of Experience Design at Digitas, leading AI product design for enterprise clients and internal AI platforms. I design conversational AI interfaces, build design systems, and prototype rapidly using classic design tools such as Figma and modern approaches such as coding with AI. Strong foundation in visual design, typography, and composition. I believe in keeping humans in the loop when designing AI experiences.",

    skills: [
        { category: "AI & Prototyping", items: "Conversational AI interfaces, AI-powered tools, Figma (advanced prototyping), AI coding for rapid iteration, ProtoPie, Principle" },
        { category: "Motion Design", items: "After Effects, Figma prototyping, Cavalry" },
        { category: "Platforms", items: "Web, mobile, desktop apps, cross-platform design" },
        { category: "Design Systems", items: "Figma components, tokens, variables, documentation, scalable systems" }
    ],

    experience: [
        {
            title: "Vice President of Experience Design",
            company: "Digitas",
            dates: "January 2025 - Present",
            description: "Leading a design team focused on AI interfaces and design systems for enterprise clients.",
            bullets: [
                "Designed conversational AI experiences for an internal agentic platform, including customizable chatbot interfaces that let users train bots with their own data",
                "Prototyped AI interactions using Figma and code for rapid iteration and team decision-making",
                "Created scalable design systems to improve team efficiency and brand consistency across touchpoints",
                "Prioritized human-in-the-loop design patterns for responsible AI experiences",
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

// Style Settings: Helvetica Clean
const style = {
    font: "Helvetica",
    headingSize: 20 * 2, // 20pt (docx uses half-points)
    bodySize: 10 * 2,    // 10pt
    sectionSize: 10 * 2,  // 10pt (matching body as per preset)
    lineHeight: 1.45 * 240, // Twips (240 = 1 line) approx adjustment
    paragraphSpacing: 80, // Twips (~4px)
    sectionSpacing: 320,  // Twips (~16px)
    border: true
};

// Helper: Create Section Title
const createSectionTitle = (text) => {
    const paragraphOptions = {
        text: text.toUpperCase(),
        heading: HeadingLevel.HEADING_2,
        spacing: { before: style.sectionSpacing, after: 120 }, // 120 twips = 6pt
        border: style.border ? {
            bottom: { style: BorderStyle.SINGLE, size: 6, space: 4 }
        } : undefined
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
                    spacing: { line: 276 } // Approx 1.15 line height default, adjusted below
                }
            },
            heading2: {
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
                margin: {
                    top: 1008, // 0.7in
                    right: 1008,
                    bottom: 1008,
                    left: 1008
                }
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
                text: content.contact,
                alignment: AlignmentType.LEFT,
                spacing: { after: style.sectionSpacing }
            }),

            // SUMMARY
            createSectionTitle("Summary"),
            new Paragraph({
                text: content.summary,
                spacing: { after: style.paragraphSpacing }
            }),

            // SKILLS
            createSectionTitle("Skills"),
            ...content.skills.map(skill => new Paragraph({
                children: [
                    new TextRun({ text: skill.category + ": ", bold: true }),
                    new TextRun({ text: skill.items })
                ],
                spacing: { after: style.paragraphSpacing }
            })),

            // EXPERIENCE
            createSectionTitle("Experience"),
            ...content.experience.flatMap(job => [
                new Paragraph({
                    children: [
                        new TextRun({ text: job.title, bold: true, size: style.bodySize + 2 }), // Slightly larger title
                        new TextRun({ text: " | " + job.company }),
                        new TextRun({ text: "\t" + job.dates, italics: true })
                    ],
                    tabStops: [
                        { type: "right", position: 9800 } // Approx right align
                    ],
                    spacing: { before: 200, after: 60 }
                }),
                ...(job.description ? [new Paragraph({
                    text: job.description,
                    spacing: { after: 60 }
                })] : []),
                ...job.bullets.map(bullet => new Paragraph({
                    text: bullet,
                    bullet: { level: 0 },
                    spacing: { after: 40 }
                }))
            ]),

            // PROJECTS
            createSectionTitle("Projects & Outside Experience"),
            ...content.projects.map(project => new Paragraph({
                children: [
                    new TextRun({ text: project.name, bold: true }),
                    new TextRun({ text: " - " + project.description })
                ],
                spacing: { after: style.paragraphSpacing }
            })),

            // ACTIVITIES
            createSectionTitle("Activities & Leadership"),
            ...content.activities.map(activity => new Paragraph({
                children: [
                    new TextRun({ text: activity.title, bold: true }),
                    new TextRun({ text: " | " + activity.details })
                ],
                spacing: { after: style.paragraphSpacing }
            })),

            // EDUCATION
            createSectionTitle("Education"),
            new Paragraph({
                children: [
                    new TextRun({ text: content.education.degree, bold: true }),
                    new TextRun({ text: " | " + content.education.school }),
                    new TextRun({ text: "\t" + content.education.dates, italics: true })
                ],
                tabStops: [
                    { type: "right", position: 9800 }
                ]
            })
        ]
    }]
});

Packer.toBuffer(doc).then((buffer) => {
    fs.writeFileSync("ryadovoy-resume-clean.docx", buffer);
    console.log("Resume generated: ryadovoy-resume-clean.docx");
});
