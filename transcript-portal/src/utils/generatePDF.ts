import jsPDF from "jspdf";
import "jspdf-autotable";

export async function generatePDF(student: any, semesters: any[], reqId: number) {
  // Fetch logo and convert to base64 for embedding
  const logoData = await new Promise<string | null>((resolve) => {
    fetch('/AAMUSTED_nobg.png')
      .then(r => r.blob())
      .then(blob => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      })
      .catch(() => resolve(null)); // Fallback if logo fails
  });

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210, margin = 20;

  // Header Banner: WINE Color
  doc.setFillColor(114, 47, 55); 
  doc.rect(0, 0, W, 35, "F");
  
  if (logoData) {
    // Add Logo perfectly aligned left
    doc.addImage(logoData, "PNG", margin, 5, 25, 25);
  }

  // Header Texts
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("AAMUSTED", margin + 30, 16);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Official Academic Records Office", margin + 30, 24);
  doc.text("records@aamusted.edu.gh", margin + 30, 30);

  // Title: OFFICIAL TRANSCRIPT
  doc.setTextColor(114, 47, 55);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("OFFICIAL ACADEMIC RECORD", W / 2, 50, { align: "center" });
  
  doc.setLineWidth(0.5);
  doc.setDrawColor(184, 150, 46); // GOLD divider
  doc.line(margin, 54, W - margin, 54);

  // Student info Box
  doc.setFillColor(249, 246, 239);
  doc.rect(margin, 60, W - margin * 2, 35, "F");
  doc.setDrawColor(224, 208, 176);
  doc.rect(margin, 60, W - margin * 2, 35, "S");

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(50, 50, 50);
  
  doc.text("Student Name:", margin + 5, 68);
  doc.text("Index Number:", margin + 5, 78);
  doc.text("Enrollment Level:", margin + 5, 88);
  
  doc.text("Date Issued:", margin + 95, 68);
  doc.text("Cumulative GPA:", margin + 95, 78);
  doc.text("Request Ref:", margin + 95, 88);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(20, 20, 20);
  
  doc.text(student.name || "—", margin + 38, 68);
  doc.text(student.student_id || "—", margin + 38, 78);
  doc.text(student.year || "—", margin + 38, 88);
  
  doc.text(new Date().toLocaleDateString('en-GB'), margin + 128, 68);
  doc.text(String(student.gpa || "0.00"), margin + 128, 78);
  doc.text(reqId ? reqId.toString().padStart(8, '0') : "—", margin + 128, 88);

  let y = 105;

  // Semesters via autotable
  if (!semesters || semesters.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.text("No course records found for this student.", margin, y);
  } else {
    semesters.forEach((sem: any) => {
      // Semester Header
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(184, 150, 46); // GOLD
      doc.text(sem.name.toUpperCase(), margin, y);
      
      const courses = sem.courses || [];
      const tableBody = courses.map((c: any) => [
        c.code, 
        c.title, 
        c.credit.toString(), 
        c.grade
      ]);

      doc.autoTable({
        startY: y + 4,
        head: [['COURSE CODE', 'COURSE TITLE', 'CREDIT', 'GRADE']],
        body: tableBody,
        theme: 'striped',
        headStyles: { 
          fillColor: [114, 47, 55], // WINE
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9
        },
        styles: { 
          fontSize: 9, 
          cellPadding: 4,
          textColor: [40, 40, 40]
        },
        alternateRowStyles: {
          fillColor: [249, 246, 239]
        },
        margin: { left: margin, right: margin }
      });
      
      y = doc.lastAutoTable.finalY + 15;
    });
  }

  // Footer signature area
  if (y > 240) { doc.addPage(); y = 40; }
  
  doc.setLineWidth(0.5);
  doc.setDrawColor(220, 220, 220);
  doc.line(margin, y, W - margin, y);
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(50, 50, 50);
  doc.text("UNIVERSITY REGISTRAR", margin, y + 10);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(140, 140, 140);
  doc.text("This document is verified and officially exported from the USTED portal.", margin, y + 16);
  doc.text(`Verification ID: ${reqId || "N/A"} - ${new Date().toISOString()}`, margin, y + 21);

  doc.save(`Official_Transcript_${student.student_id}.pdf`);
}
