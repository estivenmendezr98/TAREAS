const { TextRun } = require("docx"); // Mock or simulate

// Mock TextRun for testing
class TextRunMock {
    constructor(opts) {
        this.text = opts.text;
        this.bold = opts.bold;
        this.break = opts.break;
    }
}

const parseMarkdownToTextRuns = (text) => {
    if (!text) return [];
    const runs = [];
    const lines = text.split('\n');

    lines.forEach((line, lineIndex) => {
        // Split by **bold** markers
        const parts = line.split(/(\*\*.*?\*\*)/g);

        parts.forEach((part) => {
            if (part === "") return;

            let isBold = false;
            let content = part;

            if (part.startsWith('**') && part.endsWith('**')) {
                isBold = true;
                content = part.slice(2, -2); // Remove **
            }

            runs.push({
                text: content,
                bold: isBold
            });
        });

        // Add line break
        if (lineIndex < lines.length - 1) {
            runs.push({ text: "", break: 1 });
        }
    });

    return runs;
};

// Test Case
const input = `**Descripción General:**
Se presentan dos imágenes digitales independientes...`;

console.log("Input:", JSON.stringify(input));
const output = parseMarkdownToTextRuns(input);
console.log("Output:", JSON.stringify(output, null, 2));

// Check if it produces what we expect
const expectedTitle = output.find(r => r.text === "Descripción General:");
if (expectedTitle && expectedTitle.bold) {
    console.log("SUCCESS: Found bold title.");
} else {
    console.log("FAILURE: Did not find bold title.");
}
