import { Document, Packer, Paragraph, TextRun, ImageRun, HeadingLevel, AlignmentType, Header, Footer, PageNumber } from "docx";
import { saveAs } from "file-saver";

// APA: 1 inch = 1440 twips. APA line spacing 2.0 = 480 twips
const ConvertInchesToTwip = (inches) => Math.round(inches * 1440);
const APA_DOUBLE_SPACE = 480; // double-spaced
const APA_BODY_SIZE = 24;     // 12pt
const APA_FIRST_LINE_INDENT = 720; // 0.5 inch first-line indent

// Helper: splits a line into TextRun[] honoring **bold** markers
const lineToTextRuns = (text) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    const runs = [];
    parts.forEach((part) => {
        if (part === '') return;
        if (part.startsWith('**') && part.endsWith('**')) {
            runs.push(new TextRun({ text: part.slice(2, -2), bold: true, font: 'Times New Roman', size: APA_BODY_SIZE }));
        } else {
            runs.push(new TextRun({ text: part, font: 'Times New Roman', size: APA_BODY_SIZE }));
        }
    });
    return runs;
};

// Main markdown parser: returns an array of Paragraph objects
// Handles: **bold**, * bullet / - bullet, blank-line paragraph separation
const parseMarkdownToParagraphs = (text) => {
    if (!text) return [];
    const paragraphs = [];
    const lines = text.split('\n');
    let pendingBodyLines = [];

    const flushBody = () => {
        if (pendingBodyLines.length === 0) return;
        // Join into one paragraph with line breaks
        const runs = [];
        pendingBodyLines.forEach((line, i) => {
            runs.push(...lineToTextRuns(line));
            if (i < pendingBodyLines.length - 1) runs.push(new TextRun({ text: '', break: 1 }));
        });
        paragraphs.push(new Paragraph({
            children: runs,
            alignment: AlignmentType.JUSTIFIED,
            indent: { firstLine: APA_FIRST_LINE_INDENT },
            spacing: { before: 0, after: 0, line: APA_DOUBLE_SPACE },
        }));
        pendingBodyLines = [];
    };

    lines.forEach((rawLine) => {
        const line = rawLine.trim();

        // Bullet list items: lines starting with * or -
        if (/^[\*\-]\s+/.test(line)) {
            flushBody();
            const content = line.replace(/^[\*\-]\s+/, '');
            paragraphs.push(new Paragraph({
                children: lineToTextRuns(content),
                bullet: { level: 0 },
                spacing: { before: 0, after: 0, line: APA_DOUBLE_SPACE },
            }));
        }
        // Empty line = paragraph break
        else if (line === '') {
            flushBody();
        }
        // Normal text line (accumulate)
        else {
            pendingBodyLines.push(line);
        }
    });

    flushBody();
    return paragraphs;
};

export const generateDocx = async (reportTitle, sections) => {
    const children = [];

    // --- APA Title Page ---
    // Blank line spacer from top
    children.push(new Paragraph({ text: '', spacing: { before: 1440, after: 0 } }));

    // Centered Bold Title (APA)
    children.push(
        new Paragraph({
            children: [new TextRun({
                text: reportTitle,
                bold: true,
                font: "Times New Roman",
                size: 28, // 14pt for title
            })],
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 240, line: APA_DOUBLE_SPACE },
        })
    );

    // Fecha centered
    children.push(
        new Paragraph({
            children: [new TextRun({
                text: new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' }),
                font: "Times New Roman",
                size: APA_BODY_SIZE,
            })],
            alignment: AlignmentType.CENTER,
            spacing: { after: APA_DOUBLE_SPACE, line: APA_DOUBLE_SPACE },
        })
    );

    // --- Content ---

    for (const section of sections) {
        // Project Title (Level 1 Heading)
        children.push(
            new Paragraph({
                text: `Proyecto: ${section.projectTitle}`,
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 480, after: 240 },
                border: {
                    bottom: {
                        color: "auto",
                        space: 1,
                        value: "single",
                        size: 6,
                    },
                },
                pageBreakBefore: true, // Start each project on a new page
            })
        );

        if (section.tasks.length === 0) {
            children.push(
                new Paragraph({
                    text: 'No hay tareas seleccionadas para este proyecto.',
                    italics: true
                })
            );
            continue;
        }

        for (const task of section.tasks) {
            // Task Title - APA Level 2 (Left-aligned, Bold)
            children.push(
                new Paragraph({
                    text: task.descripcion,
                    heading: HeadingLevel.HEADING_2,
                    spacing: { before: APA_DOUBLE_SPACE, after: 0, line: APA_DOUBLE_SPACE },
                })
            );

            // Status & Date
            const statusText = task.completada ? "COMPLETADA" : "PENDIENTE";
            const dateText = task.fecha_objetivo ? ` | Fecha Objetivo: ${new Date(task.fecha_objetivo).toLocaleDateString()}` : "";

            children.push(
                new Paragraph({
                    children: [
                        new TextRun({ text: "Estado: ", bold: true, font: "Times New Roman", size: APA_BODY_SIZE }),
                        new TextRun({ text: `${statusText}${dateText}`, italics: true, font: "Times New Roman", size: APA_BODY_SIZE }),
                    ],
                    indent: { firstLine: APA_FIRST_LINE_INDENT },
                    spacing: { after: 0, line: APA_DOUBLE_SPACE },
                })
            );

            // Report Content - APA Level 3 heading + body text
            if (task.report_content) {
                children.push(
                    new Paragraph({
                        text: "Observaciones",
                        heading: HeadingLevel.HEADING_3,
                        spacing: { before: APA_DOUBLE_SPACE, after: 0, line: APA_DOUBLE_SPACE },
                    })
                );
                // Parse full markdown into proper paragraphs (handles bullets, bold, blank lines)
                const contentParagraphs = parseMarkdownToParagraphs(task.report_content);
                contentParagraphs.forEach(p => children.push(p));
            }

            // Evidence Images
            if (task.evidence && task.evidence.length > 0) {
                children.push(
                    new Paragraph({
                        text: "Evidencia Fotográfica",
                        heading: HeadingLevel.HEADING_3,
                        spacing: { before: APA_DOUBLE_SPACE, after: 0, line: APA_DOUBLE_SPACE },
                    })
                );

                for (const ev of task.evidence) {
                    try {
                        // Normalize path to use forward slashes and ensure no double slashes
                        const normalizedPath = ev.file_path.replace(/\\/g, '/');
                        const imageUrl = `http://localhost:3000/${normalizedPath}`;

                        const response = await fetch(imageUrl);
                        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

                        const blob = await response.blob();
                        const arrayBuffer = await blob.arrayBuffer();

                        // Robust way to get image dimensions
                        const getImageDimensions = (blob) => {
                            return new Promise((resolve, reject) => {
                                const img = new Image();
                                const url = URL.createObjectURL(blob);
                                img.onload = () => {
                                    resolve({ width: img.naturalWidth, height: img.naturalHeight });
                                    URL.revokeObjectURL(url);
                                };
                                img.onerror = (err) => {
                                    URL.revokeObjectURL(url);
                                    reject(err);
                                };
                                img.src = url;
                            });
                        };

                        const dimensions = await getImageDimensions(blob);
                        const originalWidth = dimensions.width;
                        const originalHeight = dimensions.height;

                        const MAX_WIDTH = 450; // Slightly smaller to fit with indentation
                        let targetWidth = originalWidth;
                        let targetHeight = originalHeight;

                        // Scale down if too big
                        if (originalWidth > MAX_WIDTH) {
                            const ratio = MAX_WIDTH / originalWidth;
                            targetWidth = MAX_WIDTH;
                            targetHeight = Math.round(originalHeight * ratio);
                        }

                        children.push(
                            new Paragraph({
                                children: [
                                    new ImageRun({
                                        data: arrayBuffer,
                                        transformation: {
                                            width: targetWidth,
                                            height: targetHeight,
                                        },
                                        type: "png",
                                    }),
                                ],
                                alignment: AlignmentType.CENTER,
                                indent: { left: 720 },
                                spacing: { after: 240 },
                            })
                        );
                    } catch (error) {
                        console.error("Error loading image for docx:", error);
                        children.push(
                            new Paragraph({
                                text: `[Error al cargar imagen: ${ev.file_path}]`,
                                color: "FF0000",
                                indent: { left: 720 },
                            })
                        );
                    }
                }
            }
        }
    }

    // APA Styles Definition
    const doc = new Document({
        styles: {
            default: {
                // APA Level 1 heading: Centered, Bold
                heading1: {
                    run: { font: "Times New Roman", size: 28, bold: true, color: "000000" },
                    paragraph: { alignment: AlignmentType.CENTER, spacing: { line: APA_DOUBLE_SPACE, before: APA_DOUBLE_SPACE, after: 0 } },
                },
                // APA Level 2 heading: Left-aligned, Bold
                heading2: {
                    run: { font: "Times New Roman", size: APA_BODY_SIZE, bold: true, color: "000000" },
                    paragraph: { alignment: AlignmentType.LEFT, spacing: { line: APA_DOUBLE_SPACE, before: APA_DOUBLE_SPACE, after: 0 } },
                },
                // APA Level 3 heading: Left-aligned, Bold Italic
                heading3: {
                    run: { font: "Times New Roman", size: APA_BODY_SIZE, bold: true, italics: true, color: "000000" },
                    paragraph: { alignment: AlignmentType.LEFT, spacing: { line: APA_DOUBLE_SPACE, before: APA_DOUBLE_SPACE, after: 0 } },
                },
                // APA title styling (used for main report title)
                title: {
                    run: { font: "Times New Roman", size: 28, bold: true, color: "000000" },
                    paragraph: { alignment: AlignmentType.CENTER, spacing: { line: APA_DOUBLE_SPACE, before: 0, after: APA_DOUBLE_SPACE } },
                },
                // APA body text: 12pt Times New Roman, double-spaced
                document: {
                    run: { font: "Times New Roman", size: APA_BODY_SIZE, color: "000000" },
                    paragraph: { alignment: AlignmentType.JUSTIFIED, indent: { firstLine: APA_FIRST_LINE_INDENT }, spacing: { line: APA_DOUBLE_SPACE, after: 0 } },
                },
            },
        },
        sections: [
            {
                properties: {
                    page: {
                        margin: {
                            top: ConvertInchesToTwip(1),
                            right: ConvertInchesToTwip(1),
                            bottom: ConvertInchesToTwip(1),
                            left: ConvertInchesToTwip(1),
                        },
                    },
                },
                headers: {
                    default: new Header({
                        children: [
                            new Paragraph({
                                children: [
                                    new TextRun({
                                        children: [PageNumber.CURRENT],
                                        font: "Arial",
                                    }),
                                ],
                                alignment: AlignmentType.RIGHT,
                                indent: { firstLine: 0 },
                            }),
                        ],
                    }),
                },
                footers: {
                    default: new Footer({
                        children: [
                            new Paragraph({
                                children: [
                                    new TextRun({
                                        text: "Informe Generado automáticamente",
                                        font: "Arial",
                                        size: 16,
                                        color: "888888",
                                    }),
                                ],
                                alignment: AlignmentType.CENTER,
                                indent: { firstLine: 0 },
                            }),
                        ],
                    }),
                },
                children: children,
            },
        ],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `Informe_Global_${new Date().toISOString().split('T')[0]}.docx`);
};
