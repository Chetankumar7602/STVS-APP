import { sendMail } from '@/lib/email';
import { getSiteSettingValue } from '@/lib/siteSettings.server';

const DEFAULT_SUPPORT_EMAIL = 'subudendrateerthavidyasamste@gmail.com';

function formatDate(value) {
  return new Date(value).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

function escapePdfText(value = '') {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/\r/g, '')
    .replace(/\n/g, ' ');
}

function splitText(value, maxLength = 78) {
  const words = String(value || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxLength) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  if (current) lines.push(current);
  return lines.length ? lines : [''];
}

function buildTextBlock({ x, y, font = 'F1', size = 11, color = [0.06, 0.09, 0.16], lines = [], leading = 16 }) {
  if (!lines.length) {
    return '';
  }

  const [r, g, b] = color;

  return [
    'BT',
    `/${font} ${size} Tf`,
    `${r} ${g} ${b} rg`,
    `1 0 0 1 ${x} ${y} Tm`,
    `${leading} TL`,
    lines.map((line) => `(${escapePdfText(line)}) Tj T*`).join('\n'),
    'ET',
  ].join('\n');
}

function buildTextStream(lines) {
  const drawOps = [
    '0.96 0.97 0.99 rg',
    '0 0 595 842 re',
    'f',
    '0.08 0.28 0.53 rg',
    '0 724 595 118 re',
    'f',
    '0.90 0.95 1.00 rg',
    '44 642 507 70 re',
    'f',
    '0.95 0.98 1.00 rg',
    '44 460 507 156 re',
    'f',
    '0.96 0.98 0.96 rg',
    '44 322 507 112 re',
    'f',
    '0.99 0.96 0.92 rg',
    '44 168 507 126 re',
    'f',
  ];

  const textOps = [
    buildTextBlock({
      x: 44,
      y: 798,
      font: 'F2',
      size: 24,
      color: [1, 1, 1],
      lines: ['STVS Trust Donation Receipt'],
      leading: 24,
    }),
    buildTextBlock({
      x: 44,
      y: 772,
      size: 11,
      color: [0.88, 0.94, 1],
      lines: ['Subudhendra Teertha Vidya Samaste (R)', 'Hosaritti, Haveri'],
      leading: 15,
    }),
    buildTextBlock({
      x: 44,
      y: 690,
      font: 'F2',
      size: 12,
      color: [0.06, 0.16, 0.34],
      lines: ['Receipt Reference'],
      leading: 14,
    }),
    buildTextBlock({
      x: 44,
      y: 668,
      size: 11,
      color: [0.15, 0.21, 0.30],
      lines: [lines.receiptNo, lines.date, lines.paymentId, lines.orderId],
      leading: 16,
    }),
    buildTextBlock({
      x: 44,
      y: 594,
      font: 'F2',
      size: 13,
      color: [0.06, 0.16, 0.34],
      lines: ['Donor Details'],
      leading: 14,
    }),
    buildTextBlock({
      x: 44,
      y: 570,
      size: 11,
      color: [0.12, 0.17, 0.26],
      lines: [lines.name, lines.email, lines.phone],
      leading: 16,
    }),
    buildTextBlock({
      x: 44,
      y: 412,
      font: 'F2',
      size: 13,
      color: [0.17, 0.31, 0.14],
      lines: ['Contribution Summary'],
      leading: 14,
    }),
    buildTextBlock({
      x: 44,
      y: 386,
      font: 'F2',
      size: 16,
      color: [0.13, 0.34, 0.20],
      lines: [lines.amount],
      leading: 18,
    }),
    buildTextBlock({
      x: 44,
      y: 360,
      size: 11,
      color: [0.14, 0.24, 0.16],
      lines: [lines.status],
      leading: 16,
    }),
    buildTextBlock({
      x: 44,
      y: 272,
      font: 'F2',
      size: 13,
      color: [0.47, 0.23, 0.04],
      lines: ['With Appreciation'],
      leading: 14,
    }),
    buildTextBlock({
      x: 44,
      y: 246,
      size: 11,
      color: [0.28, 0.19, 0.10],
      lines: [...lines.message, '', ...lines.note, '', ...lines.footer],
      leading: 15,
    }),
  ];

  return [...drawOps, ...textOps.filter(Boolean)].join('\n');
}

function buildPdfBuffer(textStream) {
  const objects = [];

  const addObject = (value) => {
    objects.push(value);
    return objects.length;
  };

  const fontId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const boldFontId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
  const contentId = addObject(`<< /Length ${Buffer.byteLength(textStream, 'utf8')} >>\nstream\n${textStream}\nendstream`);
  const pageId = addObject(`<< /Type /Page /Parent 5 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontId} 0 R /F2 ${boldFontId} 0 R >> >> /Contents ${contentId} 0 R >>`);
  const pagesId = addObject(`<< /Type /Pages /Kids [${pageId} 0 R] /Count 1 >>`);
  const catalogId = addObject(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);

  let pdf = '%PDF-1.4\n';
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i <= objects.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, 'utf8');
}

export function buildDonationReceiptPdf(donation, options = {}) {
  const supportEmail = String(options.supportEmail || DEFAULT_SUPPORT_EMAIL).trim();
  const receiptNumber = `STVS-${String(donation._id).slice(-6).toUpperCase()}`;
  const isManualQr = donation.paymentMethod === 'upi_qr';
  const isWrongAmount = donation.manualReviewStatus === 'wrong_amount';
  const receiptAmount = isManualQr && donation.confirmedAmount ? donation.confirmedAmount : donation.amount;
  const paymentStatusLabel = isManualQr
    ? donation.manualReviewStatus === 'wrong_amount'
      ? 'Manual QR Review: Wrong amount selected'
      : donation.manualReviewStatus === 'successful'
        ? 'Manual QR Review: Successful'
        : donation.manualReviewStatus === 'unsuccessful'
          ? 'Manual QR Review: Unsuccessful'
          : 'Manual QR Review: Pending'
    : `Payment Status: ${donation.status || 'successful'}`;
  const donorMessage = donation.message
    ? `Donor message: ${donation.message}`
    : 'Your support helps us continue our charitable, educational, and community welfare initiatives.';
  const textLines = {
    receiptNo: `Receipt No: ${receiptNumber}`,
    date: `Date: ${formatDate(donation.createdAt || Date.now())}`,
    paymentId: `Payment ID: ${donation.razorpayPaymentId || 'N/A'}`,
    orderId: `Order ID: ${donation.razorpayOrderId || 'N/A'}`,
    name: `Name: ${donation.name || 'N/A'}`,
    email: `Email: ${donation.email || 'N/A'}`,
    phone: `Phone: ${donation.phone || 'N/A'}`,
    amount: `Amount Sent: ${formatCurrency(receiptAmount)}`,
    status: paymentStatusLabel,
    message: splitText(donorMessage, 74),
    note: splitText(
      isWrongAmount
        ? `The donor selected ${formatCurrency(donation.amount)} on the website, while the actual amount received and verified was ${formatCurrency(receiptAmount)}. This receipt reflects the verified amount and review status for the manual UPI QR payment.`
        : 'Thank you for standing with STVS Trust. Every contribution strengthens our efforts to support education, learning materials, student care, and meaningful community outreach.',
      74
    ),
    footer: splitText(
      `This is a system-generated acknowledgement for your records. For assistance, please contact ${supportEmail}`,
      74
    ),
  };

  return buildPdfBuffer(buildTextStream(textLines));
}

export async function buildDonationReceiptEmail(donation) {
  const supportEmail = await getSiteSettingValue('contact_email', DEFAULT_SUPPORT_EMAIL);
  const pdfBuffer = buildDonationReceiptPdf(donation, { supportEmail });
  const receiptNumber = `STVS-${String(donation._id).slice(-6).toUpperCase()}`;
  const isManualQr = donation.paymentMethod === 'upi_qr';
  const isWrongAmount = donation.manualReviewStatus === 'wrong_amount';
  const receiptAmount = isManualQr && donation.confirmedAmount ? donation.confirmedAmount : donation.amount;
  const reviewStatus = isManualQr
    ? donation.manualReviewStatus === 'wrong_amount'
      ? 'Wrong amount selected'
      : donation.manualReviewStatus === 'successful'
        ? 'Successful'
        : donation.manualReviewStatus === 'unsuccessful'
          ? 'Unsuccessful'
          : 'Pending'
    : donation.status || 'successful';
  const extraRows = isWrongAmount
    ? `
            <tr><td style="padding:10px;border:1px solid #e2e8f0;"><strong>Selected Amount</strong></td><td style="padding:10px;border:1px solid #e2e8f0;">${formatCurrency(donation.amount)}</td></tr>
            <tr><td style="padding:10px;border:1px solid #e2e8f0;"><strong>Verified Amount Received</strong></td><td style="padding:10px;border:1px solid #e2e8f0;">${formatCurrency(receiptAmount)}</td></tr>
    `
    : '';

  return {
    subject: `STVS Donation Receipt - ${receiptNumber}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;padding:24px;background:#f8fafc;color:#0f172a;">
        <div style="background:linear-gradient(135deg,#0f4c81,#1d6fa5);padding:24px;border-radius:18px 18px 0 0;color:#ffffff;">
          <h2 style="margin:0 0 8px;font-size:28px;">Thank you for supporting STVS Trust</h2>
          <p style="margin:0;color:#dbeafe;">Your contribution has been acknowledged successfully.</p>
        </div>
        <div style="background:#ffffff;padding:24px;border:1px solid #dbe4f0;border-top:none;border-radius:0 0 18px 18px;">
          <p>Dear ${donation.name || 'Donor'},</p>
          <p>We sincerely appreciate the amount you sent to support the trust. Your generosity helps us continue educational and community-focused initiatives with greater reach and consistency.</p>
          <p>Your PDF receipt is attached for your records.</p>
          <table style="width:100%;border-collapse:collapse;margin:18px 0;background:#ffffff;">
            <tr><td style="padding:10px;border:1px solid #e2e8f0;"><strong>Receipt No</strong></td><td style="padding:10px;border:1px solid #e2e8f0;">${receiptNumber}</td></tr>
            <tr><td style="padding:10px;border:1px solid #e2e8f0;"><strong>Amount Sent</strong></td><td style="padding:10px;border:1px solid #e2e8f0;">${formatCurrency(receiptAmount)}</td></tr>
            <tr><td style="padding:10px;border:1px solid #e2e8f0;"><strong>Status</strong></td><td style="padding:10px;border:1px solid #e2e8f0;">${reviewStatus}</td></tr>
            ${extraRows}
            <tr><td style="padding:10px;border:1px solid #e2e8f0;"><strong>Payment ID</strong></td><td style="padding:10px;border:1px solid #e2e8f0;">${donation.razorpayPaymentId || 'N/A'}</td></tr>
            <tr><td style="padding:10px;border:1px solid #e2e8f0;"><strong>Date</strong></td><td style="padding:10px;border:1px solid #e2e8f0;">${formatDate(donation.createdAt || Date.now())}</td></tr>
          </table>
          <p>Thank you for placing your trust in our work.</p>
          <p style="margin-top:24px;">Regards,<br />STVS Trust</p>
        </div>
      </div>
    `,
    attachments: [
      {
        filename: `${receiptNumber}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      },
    ],
  };
}

export async function sendDonationReceiptEmail(donation) {
  if (!donation.email) {
    throw new Error('Donor email is missing.');
  }

  const mail = await buildDonationReceiptEmail(donation);
  return sendMail({
    from: `"STVS Trust" <${process.env.GMAIL_USER || 'no-reply@stvs.local'}>`,
    to: donation.email,
    ...mail,
  });
}
