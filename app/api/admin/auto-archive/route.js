import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import nodemailer from 'nodemailer';
import connectDB from '@/lib/db';
import Donation from '@/models/Donation';
import Contact from '@/models/Contact';
import Volunteer from '@/models/Volunteer';

/**
 * GET /api/admin/auto-archive?secret=YOUR_CRON_SECRET
 *
 * This endpoint is designed to be called by a FREE external cron service
 * (e.g. cron-job.org) once per month.
 *
 * It will:
 *  1. Export all data to an Excel file
 *  2. Email it to ADMIN_EMAIL via Gmail
 *  3. Delete all records from the database (keeping it within free tier)
 *
 * Required env vars:
 *   CRON_SECRET       – a random secret string you pick, e.g. "MySuperSecret123"
 *   ADMIN_EMAIL       – the email to send the archive to
 *   GMAIL_USER        – your Gmail address used for sending
 *   GMAIL_APP_PASS    – Google App Password (not your normal Gmail password)
 */

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');

  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
  }

  try {
    await connectDB();

    const [donations, contacts, volunteers] = await Promise.all([
      Donation.find({ status: 'successful' }).sort({ createdAt: -1 }).lean(),
      Contact.find({}).sort({ createdAt: -1 }).lean(),
      Volunteer.find({}).sort({ createdAt: -1 }).lean(),
    ]);

    // ── Build Excel ───────────────────────────────────────────
    const wb = XLSX.utils.book_new();

    const donationRows = donations.map(d => ({
      'Date':              d.createdAt ? new Date(d.createdAt).toLocaleString('en-IN') : '',
      'Name':              d.name || '',
      'Phone':             d.phone || '',
      'Amount (₹)':        d.amount || 0,
      'Message':           d.message || '',
      'Status':            d.status || 'pending',
      'Razorpay Order ID': d.razorpayOrderId || '',
      'Razorpay Pay ID':   d.razorpayPaymentId || '',
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(donationRows.length ? donationRows : [{ Note: 'No data' }]), 'Donations');

    const contactRows = contacts.map(c => ({
      'Date':    c.createdAt ? new Date(c.createdAt).toLocaleString('en-IN') : '',
      'Name':    c.name || '',
      'Contact': c.contact || '',
      'Message': c.message || '',
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(contactRows.length ? contactRows : [{ Note: 'No data' }]), 'Contacts');

    const volunteerRows = volunteers.map(v => ({
      'Date':     v.createdAt ? new Date(v.createdAt).toLocaleString('en-IN') : '',
      'Name':     v.name || '',
      'Phone':    v.phone || '',
      'Interest': v.interest || '',
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(volunteerRows.length ? volunteerRows : [{ Note: 'No data' }]), 'Volunteers');

    const buf = Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
    const month = new Date().toLocaleString('en-IN', { month: 'long', year: 'numeric' });
    const fileName = `STVS_Archive_${new Date().toISOString().slice(0, 7)}.xlsx`;

    // ── Send Email via Gmail App Password ─────────────────────
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASS,
      },
    });

    await transporter.sendMail({
      from: `"STVS Auto Archive" <${process.env.GMAIL_USER}>`,
      to: process.env.ADMIN_EMAIL,
      subject: `📊 STVS Monthly Archive – ${month}`,
      html: `
        <div style="font-family:sans-serif;max-width:500px;margin:auto;padding:24px;background:#f8fafc;border-radius:12px;">
          <h2 style="color:#0f4c81;">Monthly Data Archive</h2>
          <p>Hello Admin,</p>
          <p>Please find attached the complete data export for <strong>${month}</strong> from the STVS website.</p>
          <ul>
            <li><strong>${donations.length}</strong> donation records</li>
            <li><strong>${contacts.length}</strong> contact/inquiry records</li>
            <li><strong>${volunteers.length}</strong> volunteer registrations</li>
          </ul>
          <p style="color:#ef4444;"><strong>⚠️ The database has been cleared after this export.</strong></p>
          <p style="font-size:12px;color:#94a3b8;">This is an automated message from STVS website system.</p>
        </div>
      `,
      attachments: [{ filename: fileName, content: buf }],
    });

    // ── Delete all records ────────────────────────────────────
    await Promise.all([
      Donation.deleteMany({}),
      Contact.deleteMany({}),
      Volunteer.deleteMany({}),
    ]);

    return NextResponse.json({
      success: true,
      message: `Archive emailed and DB cleared. ${donations.length} donations, ${contacts.length} contacts, ${volunteers.length} volunteers exported.`,
      month,
    });
  } catch (err) {
    console.error('Auto-archive error:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
