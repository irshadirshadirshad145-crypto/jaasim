import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  BorderStyle,
  WidthType,
  AlignmentType,
  ShadingType,
} from 'docx';
import { EditableHandoverData } from '../types';

export async function exportHandoverToDocx(data: EditableHandoverData): Promise<void> {
  try {
    const docChildren: (Paragraph | Table)[] = [];

    // Main Document Title
    docChildren.push(
      new Paragraph({
        text: 'SHIFT HANDOVER NOTE',
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { after: 200, before: 100 },
      })
    );

    // Metadata Table
    const metaTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 25, type: WidthType.PERCENTAGE },
              shading: { fill: 'F1F5F9', type: ShadingType.CLEAR },
              children: [new Paragraph({ children: [new TextRun({ text: 'Employee Name:', bold: true })] })],
            }),
            new TableCell({
              width: { size: 75, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ text: data.employeeName || 'Unassigned' })],
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({
              width: { size: 25, type: WidthType.PERCENTAGE },
              shading: { fill: 'F1F5F9', type: ShadingType.CLEAR },
              children: [new Paragraph({ children: [new TextRun({ text: 'Shift Date:', bold: true })] })],
            }),
            new TableCell({
              width: { size: 75, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ text: data.shiftDate || new Date().toISOString().split('T')[0] })],
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({
              width: { size: 25, type: WidthType.PERCENTAGE },
              shading: { fill: 'F1F5F9', type: ShadingType.CLEAR },
              children: [new Paragraph({ children: [new TextRun({ text: 'Shift Start:', bold: true })] })],
            }),
            new TableCell({
              width: { size: 75, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ text: data.shiftStart })],
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({
              width: { size: 25, type: WidthType.PERCENTAGE },
              shading: { fill: 'F1F5F9', type: ShadingType.CLEAR },
              children: [new Paragraph({ children: [new TextRun({ text: 'Shift End:', bold: true })] })],
            }),
            new TableCell({
              width: { size: 75, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ text: data.shiftEnd })],
            }),
          ],
        }),
      ],
    });

    docChildren.push(metaTable);

    // Spacing
    docChildren.push(new Paragraph({ spacing: { after: 200 } }));

    // SUMMARY
    docChildren.push(
      new Paragraph({
        text: 'SUMMARY',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
      })
    );

    if (data.autoCountSummary) {
      docChildren.push(
        new Paragraph({
          children: [
            new TextRun({ text: 'Status Metric: ', bold: true }),
            new TextRun({ text: data.autoCountSummary, italics: true }),
          ],
          spacing: { after: 100 },
        })
      );
    }

    docChildren.push(
      new Paragraph({
        text: data.summary || 'Normal steady-state operations. No extraordinary escalations.',
        spacing: { after: 300 },
      })
    );

    // Helper for adding section
    const addSection = (
      sectionTitle: string,
      items: EditableHandoverData['sections']['COMPLETED']
    ) => {
      docChildren.push(
        new Paragraph({
          text: sectionTitle,
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 120 },
        })
      );

      if (!items || items.length === 0) {
        docChildren.push(
          new Paragraph({
            children: [new TextRun({ text: 'Nothing to report.', italics: true })],
            spacing: { after: 200 },
          })
        );
        return;
      }

      items.forEach((item, idx) => {
        const itemHeaderRuns: TextRun[] = [
          new TextRun({ text: `${idx + 1}. [${item.source.toUpperCase()}] `, bold: true }),
          new TextRun({ text: `${item.recordId}  •  `, bold: true }),
        ];

        if (item.isCarriedForward) {
          itemHeaderRuns.push(
            new TextRun({
              text: '[CARRIED FORWARD FROM PREV SHIFT]  •  ',
              bold: true,
              color: 'B45309',
            })
          );
        }

        itemHeaderRuns.push(
          new TextRun({ text: `Timestamp: ${item.timestamp || 'N/A'}  •  ` }),
          new TextRun({ text: `Status: ${item.status || 'N/A'}`, italics: true })
        );

        docChildren.push(
          new Paragraph({
            children: itemHeaderRuns,
            spacing: { before: 80, after: 40 },
          })
        );

        docChildren.push(
          new Paragraph({
            children: [
              new TextRun({ text: '    Summary: ', bold: true }),
              new TextRun({ text: item.summary }),
            ],
            spacing: { after: item.notes ? 40 : 120 },
          })
        );

        if (item.notes) {
          docChildren.push(
            new Paragraph({
              children: [
                new TextRun({ text: '    Note: ', bold: true, italics: true }),
                new TextRun({ text: item.notes, italics: true }),
              ],
              spacing: { after: 120 },
            })
          );
        }
      });

      docChildren.push(new Paragraph({ spacing: { after: 100 } }));
    };

    // 4 SECTIONS IN EXACT REQUIRED ORDER
    addSection('SECTION 1: ✅ COMPLETED WORK', data.sections.COMPLETED);
    addSection('SECTION 2: 🔄 PENDING / IN-PROGRESS WORK', data.sections.IN_PROGRESS);
    addSection('SECTION 3: 🚨 PROBLEMS / BLOCKERS', data.sections.BLOCKERS);
    addSection('SECTION 4: 👀 WATCH-LIST FOR NEXT SHIFT', data.sections.WATCH_LIST);

    // Footer note
    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `Generated on ${new Date().toLocaleString()} • Shift Handover Note Generator`,
            italics: true,
            size: 18,
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { before: 300 },
      })
    );

    const doc = new Document({
      sections: [
        {
          properties: {},
          children: docChildren,
        },
      ],
    });

    const blob = await Packer.toBlob(doc);
    const fileName = `Shift_Handover_Note_${(data.employeeName || 'Staff')
      .replace(/\s+/g, '_')}_${data.shiftDate || 'Report'}.docx`;

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (err: unknown) {
    console.error('Failed to generate DOCX:', err);
    throw new Error(err instanceof Error ? err.message : 'Unknown DOCX generation error');
  }
}
