import { jsPDF } from 'jspdf';

/**
 * Generate and download a PDF consent form for a signed asset acceptance.
 *
 * @param {object} acceptance - The acceptance record (signature_data, signer_name, signed_at, signer_ip, condition_at_checkout, etc.)
 * @param {object} asset - The asset record (name, serial_number, model, condition, asset_type)
 * @param {string} employeeName - Display name of the assigned employee
 */
export function generateConsentPDF(acceptance, asset, employeeName) {
  if (!acceptance || !asset) return;

  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const companyName = acceptance.company_name || 'Company';
  const formTitle = acceptance.form_title || 'Asset Acceptance Form';

  // -- Company name + date header --
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(companyName, margin, y);

  const signedDate = acceptance.signed_at
    ? new Date(acceptance.signed_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : '';
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  if (signedDate) {
    doc.text(signedDate, pageWidth - margin, y, { align: 'right' });
  }

  y += 10;

  // -- Form title --
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(formTitle, margin, y);
  y += 8;

  // -- Horizontal rule --
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // -- Asset details section --
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('ASSET DETAILS', margin, y);
  y += 7;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  const details = [
    ['Name', asset.name || ''],
    ['Type', asset.asset_type || ''],
    ['Serial Number', asset.serial_number || ''],
    ['Model', asset.model || ''],
    ['Condition at Checkout', acceptance.condition_at_checkout || asset.condition || ''],
    ['Assigned To', employeeName || ''],
  ];

  for (const [label, value] of details) {
    if (value) {
      doc.setFont('helvetica', 'bold');
      doc.text(`${label}: `, margin, y);
      const labelWidth = doc.getTextWidth(`${label}: `);
      doc.setFont('helvetica', 'normal');
      doc.text(value, margin + labelWidth, y);
      y += 6;
    }
  }

  y += 4;

  // -- Horizontal rule --
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // -- Terms text (if available) --
  if (acceptance.terms_text) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('TERMS OF ACCEPTANCE', margin, y);
    y += 7;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const wrappedTerms = doc.splitTextToSize(acceptance.terms_text, contentWidth);
    doc.text(wrappedTerms, margin, y);
    y += wrappedTerms.length * 4.5 + 4;

    doc.line(margin, y, pageWidth - margin, y);
    y += 8;
  }

  // -- Acknowledgment section --
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('ACKNOWLEDGMENT', margin, y);
  y += 8;

  // Signature image
  if (acceptance.signature_data) {
    try {
      const sigWidth = 60;
      const sigHeight = 25;
      doc.addImage(acceptance.signature_data, 'PNG', margin, y, sigWidth, sigHeight);
      y += sigHeight + 4;
    } catch (err) {
      // If the image fails to load, skip it
      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      doc.text('[Signature on file]', margin, y);
      y += 6;
    }
  }

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  if (acceptance.signer_name) {
    doc.text(`Signed by: ${acceptance.signer_name}`, margin, y);
    y += 6;
  }

  if (signedDate) {
    doc.text(`Date: ${signedDate}`, margin, y);
    y += 6;
  }

  if (acceptance.signer_ip) {
    doc.text(`IP Address: ${acceptance.signer_ip}`, margin, y);
  }

  // -- Save --
  const safeName = (asset.name || 'asset').replace(/[^a-zA-Z0-9-_ ]/g, '').replace(/\s+/g, '-');
  doc.save(`consent-form-${safeName}.pdf`);
}
