import { Document, Packer, Paragraph, TextRun, ImageRun, HeadingLevel, AlignmentType, Header, Footer, PageNumber } from "docx";
import { saveAs } from "file-saver";

// Helper for APA margins (1 inch = 1440 twips)
const ConvertInchesToTwip = (inches) => Math.round(inches * 1440);

export const generateDocx = async (reportTitle, sections) => {
    const children = [];

    // --- APA Title Page Elements ---

    // Title
    children.push(
        new Paragraph({
            text: reportTitle,
            heading: HeadingLevel.TITLE,
            spacing: { after: 240 },
        })
    );

    // Metadata
    children.push(
        new Paragraph({
            text: `Fecha: ${new Date().toLocaleDateString()}`,
            alignment: AlignmentType.CENTER,
            spacing: { after: 480 },
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
                pageBreakBefore: true, // Start each project on a new page (optional, but good for separation)
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
            // Task Title (Level 2 Heading)
            children.push(
                new Paragraph({
                    text: task.descripcion,
                    heading: HeadingLevel.HEADING_2,
                })
            );

            // Status & Date
            const statusText = task.completada ? "COMPLETADA" : "PENDIENTE";
            const dateText = task.fecha_objetivo ? ` | Fecha Objetivo: ${new Date(task.fecha_objetivo).toLocaleDateString()}` : "";

            children.push(
                new Paragraph({
                    children: [
                        new TextRun({
                            text: "Estado: ",
                            bold: true,
                        }),
                        new TextRun({
                            text: `${statusText}${dateText}`,
                            italics: true,
                        }),
                    ],
                    indent: { firstLine: 0 },
                    spacing: { after: 240 },
                })
            );

            // Report Content
            if (task.report_content) {
                children.push(
                    new Paragraph({
                        text: "Observaciones",
                        heading: HeadingLevel.HEADING_3,
                    })
                );
                children.push(
                    new Paragraph({
                        text: task.report_content,
                        alignment: AlignmentType.LEFT,
                    })
                );
            }

            // Evidence Images
            if (task.evidence && task.evidence.length > 0) {
                children.push(
                    new Paragraph({
                        text: "Evidencia Fotográfica",
                        heading: HeadingLevel.HEADING_3,
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

                        const MAX_WIDTH = 500;
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
                                        type: "png", // docx usually detects type from signature, but explicit fallback helps
                                    }),
                                ],
                                alignment: AlignmentType.CENTER,
                                indent: { firstLine: 0 },
                                spacing: { after: 240 },
                            })
                        );
                    } catch (error) {
                        console.error("Error loading image for docx:", error);
                        children.push(
                            new Paragraph({
                                text: `[Error al cargar imagen: ${ev.file_path}]`,
                                color: "FF0000",
                            })
                        );
                    }
                }
            }
        }
    }

    // Styles Definition
    const doc = new Document({
        styles: {
            default: {
                heading1: { // Project Title
                    run: {
                        font: "Arial",
                        size: 28,
                        bold: true,
                        color: "2E75B5", // Blue for project titles
                    },
                    paragraph: {
                        alignment: AlignmentType.LEFT,
                        spacing: { line: 360, before: 240, after: 120 },
                    },
                },
                heading2: { // Task Title
                    run: {
                        font: "Arial",
                        size: 24,
                        bold: true,
                        color: "000000",
                    },
                    paragraph: {
                        alignment: AlignmentType.LEFT,
                        spacing: { line: 360, before: 240, after: 120 },
                    },
                },
                heading3: { // Subtitles (Observations, Evidence)
                    run: {
                        font: "Arial",
                        size: 22,
                        bold: true,
                        italics: true,
                        color: "444444",
                    },
                    paragraph: {
                        alignment: AlignmentType.LEFT,
                        spacing: { line: 240, before: 120, after: 120 },
                    },
                },
                title: { // Main Title
                    run: {
                        font: "Arial",
                        size: 32, // 16pt
                        bold: true,
                        color: "000000",
                    },
                    paragraph: {
                        alignment: AlignmentType.CENTER,
                        spacing: { line: 480, before: 0, after: 240 },
                    },
                },
                document: { // Body Text
                    run: {
                        font: "Arial",
                        size: 22,
                        color: "000000",
                    },
                    paragraph: {
                        alignment: AlignmentType.LEFT,
                        indent: { firstLine: 0 },
                        spacing: { line: 360, after: 120 },
                    },
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
