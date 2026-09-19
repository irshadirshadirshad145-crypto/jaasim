import jsPDF from 'jspdf';
import { EditableHandoverData } from '../types';

export function exportHandoverToPdf(data: EditableHandoverData): void {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;
    const contentWidth = pageWidth - margin * 2;
    let y = margin;

    const checkPageBreak = (neededHeight: number) => {
      if (y + neededHeight > pageHeight - 14) {
        doc.addPage();
        y = margin;
      }
    };

    // Header Background Accent Bar
    doc.setFillColor(30, 41, 59); // Slate 800
    doc.rect(margin, y, contentWidth, 18, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('SHIFT HANDOVER NOTE', margin + 6, y + 8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Operations Handover Report • Grounded Activity Synthesis', margin + 6, y + 14);

    doc.setTextColor(203, 213, 225);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth - margin - 6, y + 11, {
      align: 'right',
    });

    y += 24;

    // Shift Metadata Box
    checkPageBreak(32);
    doc.setFillColor(248, 250, 252); // Slate 50
    doc.setDrawColor(226, 232, 240); // Slate 200
    doc.rect(margin, y, contentWidth, 26, 'FD');

    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);

    // Left Column
    doc.setFont('helvetica', 'bold');
    doc.text('Employee Name:', margin + 4, y + 7);
    doc.setFont('helvetica', 'normal');
    doc.text(data.employeeName || 'Unassigned', margin + 36, y + 7);

    doc.setFont('helvetica', 'bold');
    doc.text('Shift Date:', margin + 4, y + 14);
    doc.setFont('helvetica', 'normal');
    doc.text(data.shiftDate || 'N/A', margin + 36, y + 14);

    doc.setFont('helvetica', 'bold');
    doc.text('Employee Role:', margin + 4, y + 21);
    doc.setFont('helvetica', 'normal');
    doc.text(data.employeeRole || 'Operations Lead', margin + 36, y + 21);

    // Right Column
    doc.setFont('helvetica', 'bold');
    doc.text('Shift Start:', margin + 100, y + 7);
    doc.setFont('helvetica', 'normal');
    doc.text(data.shiftStart || 'N/A', margin + 124, y + 7);

    doc.setFont('helvetica', 'bold');
    doc.text('Shift End:', margin + 100, y + 14);
    doc.setFont('helvetica', 'normal');
    doc.text(data.shiftEnd || 'N/A', margin + 124, y + 14);

    y += 32;

    // SUMMARY SECTION
    checkPageBreak(25);
    doc.setFillColor(238, 242, 255); // Indigo 50
    doc.setDrawColor(199, 210, 254); // Indigo 200
    doc.rect(margin, y, contentWidth, 8, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(49, 46, 129); // Indigo 900
    doc.text('SUMMARY', margin + 4, y + 5.5);

    y += 12;

    // Automatic Counts
    if (data.autoCountSummary) {
      checkPageBreak(10);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);
      doc.text(`Metrics: ${data.autoCountSummary}`, margin, y);
      y += 6;
    }

    // Executive text
    checkPageBreak(15);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    const summaryLines = doc.splitTextToSize(data.summary || 'Normal steady-state monitoring maintained.', contentWidth);
    doc.text(summaryLines, margin, y);
    y += summaryLines.length * 4.5 + 8;

    // Render 4 Sections
    const renderPdfSection = (
      title: string,
      items: EditableHandoverData['sections']['COMPLETED'],
      headerRgb: [number, number, number],
      badgeLabel: string
    ) => {
      checkPageBreak(20);

      // Section Header Banner
      doc.setFillColor(headerRgb[0], headerRgb[1], headerRgb[2]);
      doc.rect(margin, y, contentWidth, 7, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(255, 255, 255);
      doc.text(title, margin + 4, y + 5);

      doc.setFontSize(7.5);
      doc.text(`${items.length} ${badgeLabel}`, pageWidth - margin - 4, y + 5, { align: 'right' });

      y += 10;

      if (!items || items.length === 0) {
        checkPageBreak(10);
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8.5);
        doc.setTextColor(148, 163, 184); // Slate 400
        doc.text('Nothing to report.', margin + 4, y);
        y += 8;
        return;
      }

      items.forEach((item, idx) => {
        // Estimate height for item
        const summaryTextLines = doc.splitTextToSize(`Summary: ${item.summary}`, contentWidth - 8);
        const notesLines = item.notes ? doc.splitTextToSize(`Note: ${item.notes}`, contentWidth - 8) : [];
        const itemBoxHeight = 10 + summaryTextLines.length * 4 + (notesLines.length > 0 ? notesLines.length * 4 + 2 : 0);

        checkPageBreak(itemBoxHeight + 4);

        // Light row card background
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.rect(margin, y, contentWidth, itemBoxHeight, 'FD');

        // First row: Source tag, ID, Timestamp, Status + Carried Forward badge
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);

        if (item.isCarriedForward) {
          doc.setTextColor(180, 83, 9); // Amber 700 for carried forward
          const carriedTag = ` [CARRIED FORWARD FROM PREV SHIFT]`;
          const metaLine = `${idx + 1}. [${item.source.toUpperCase()}] ${item.recordId}${carriedTag}  |  Time: ${item.timestamp}  |  Status: ${item.status || 'N/A'}`;
          doc.text(metaLine, margin + 3, y + 5);
        } else {
          doc.setTextColor(30, 41, 59);
          const metaLine = `${idx + 1}. [${item.source.toUpperCase()}] ${item.recordId}  |  Time: ${item.timestamp}  |  Status: ${item.status || 'N/A'}`;
          doc.text(metaLine, margin + 3, y + 5);
        }

        // Summary row
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(51, 65, 85);
        doc.text(summaryTextLines, margin + 3, y + 9.5);

        // Optional Notes
        if (notesLines.length > 0) {
          const notesY = y + 9.5 + summaryTextLines.length * 4;
          doc.setFont('helvetica', 'italic');
          doc.setTextColor(180, 83, 9); // Amber 700
          doc.text(notesLines, margin + 3, notesY);
        }

        y += itemBoxHeight + 3;
      });

      y += 4;
    };

    // SECTION 1: ✅ COMPLETED WORK
    renderPdfSection('SECTION 1: COMPLETED WORK', data.sections.COMPLETED, [16, 185, 129], 'Completed');

    // SECTION 2: 🔄 PENDING / IN-PROGRESS WORK
    renderPdfSection('SECTION 2: PENDING / IN-PROGRESS WORK', data.sections.IN_PROGRESS, [99, 102, 241], 'In-Progress');

    // SECTION 3: 🚨 PROBLEMS / BLOCKERS
    renderPdfSection('SECTION 3: PROBLEMS / BLOCKERS', data.sections.BLOCKERS, [239, 68, 68], 'Blockers');

    // SECTION 4: 👀 WATCH-LIST FOR NEXT SHIFT
    renderPdfSection('SECTION 4: WATCH-LIST FOR NEXT SHIFT', data.sections.WATCH_LIST, [245, 158, 11], 'Watch-List');

    // Page Numbering on all pages
    const totalPages = doc.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Shift Handover Note • Page ${p} of ${totalPages}`,
        pageWidth / 2,
        pageHeight - 6,
        { align: 'center' }
      );
    }

    const fileName = `Shift_Handover_Note_${(data.employeeName || 'Staff')
      .replace(/\s+/g, '_')}_${data.shiftDate || 'Report'}.pdf`;

    doc.save(fileName);
  } catch (err: unknown) {
    console.error('Failed to generate PDF:', err);
    throw new Error(err instanceof Error ? err.message : 'Unknown PDF generation error');
  }
}
