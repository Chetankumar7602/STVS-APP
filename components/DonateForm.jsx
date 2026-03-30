"use client";

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { siteData } from '@/lib/data';
import { Heart, Loader2, CheckCircle2 } from 'lucide-react';
import { readJsonResponse } from '@/lib/response';
import Image from 'next/image';
import { useLanguage } from '@/lib/useLanguage';

export default function DonateForm() {
  const { donate } = siteData;
  const { tr } = useLanguage();
  const sectionRef = useRef(null);
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', amount: '1000', customAmount: '', message: '' });
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');
  const [upiReference, setUpiReference] = useState('');
  const [qrSubmitting, setQrSubmitting] = useState(false);

  const amounts = [500, 1000, 2500, 5000];
  const parsedCustomAmount = Number(String(formData.customAmount || '').trim());
  const finalAmount = formData.amount === 'custom'
    ? parsedCustomAmount
    : Number(String(formData.amount || '').trim());

  const resetDonationForm = () => {
    setFormData({ name: '', phone: '', email: '', amount: '1000', customAmount: '', message: '' });
    setUpiReference('');
  };

  const getMissingFields = () => {
    const missing = [];
    const amountValue = formData.amount === 'custom' ? parsedCustomAmount : finalAmount;
    if (!formData.name.trim()) missing.push('name');
    if (!formData.email.trim()) missing.push('email');
    if (!upiReference.trim()) missing.push('UPI reference');
    if (!amountValue || Number.isNaN(amountValue) || amountValue < 100) missing.push('valid amount (min ₹100)');
    return missing;
  };

  useEffect(() => {
    if (!success || !sectionRef.current) return;
    requestAnimationFrame(() => {
      sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [success]);

  const handleUpiSubmit = async () => {
    setError('');
    setSuccess(false);
    setSuccessMessage('');

    const missingFields = getMissingFields();
    if (missingFields.length > 0) {
      setError(`Please provide: ${missingFields.join(', ')}.`);
      return;
    }

    const amountForUpi = formData.amount === 'custom' ? parsedCustomAmount : finalAmount;
    const payload = {
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      email: formData.email.trim(),
      amount: amountForUpi,
      message: formData.message.trim(),
      upiReference: upiReference.trim(),
    };

    try {
      setQrSubmitting(true);

      const res = await fetch('/api/donations/upi-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await readJsonResponse(res);
      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || 'Failed to submit payment for verification.');
      }

      setSuccessMessage('Thank you for your payment! Your details have been recorded and are pending verification. Once confirmed, we will send your receipt to the email you provided.');
      setSuccess(true);
      resetDonationForm();
    } catch (err) {
      setError(err.message || 'Unable to submit payment details right now. Please try again.');
    } finally {
      setQrSubmitting(false);
    }
  };

  return (
    <section ref={sectionRef} id="donate" className="py-24 bg-white relative overflow-x-clip">
      <div className="absolute top-0 right-0 w-1/3 h-full bg-slate-50 rounded-l-[100px] -z-10 hidden lg:block"></div>

      <div className="container mx-auto px-4 md:px-6 overflow-x-clip">
        <div className="flex flex-col lg:flex-row gap-16 items-center">

          {/* Left — info panel */}
          <div className="lg:w-1/2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{}}
              className="max-w-xl"
            >
              <div className="inline-flex items-center gap-2 mb-4 px-4 py-2 bg-rose-50 text-rose-600 font-semibold rounded-full text-sm">
                <Heart size={16} className="fill-current" />
                {tr('donate.makeDifference', 'Make a Difference')}
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-slate-800 mb-6 leading-tight">
                {tr('donate.title', donate.sectionTitle)}
              </h2>
              <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                {tr('donate.subtitle', 'Your generosity directly funds the education, books, uniforms, and meals of underprivileged children. Even a small contribution helps break the cycle of poverty and builds a brighter future.')}
              </p>

              <motion.ul
                initial="hidden"
                whileInView="show"
                viewport={{ once: false }}
                variants={{
                  hidden: { opacity: 0 },
                  show: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.3 } }
                }}
                className="space-y-4 mb-10"
              >
                {[
                  tr('donate.impactPoints.books', "₹1,000 sponsors a child's books & stationery for a term"),
                  tr('donate.impactPoints.uniforms', '₹2,500 covers uniforms and shoes for a year'),
                  tr('donate.impactPoints.sixMonths', '₹5,000 provides complete education for 6 months'),
                  tr('donate.impactPoints.directToChildren', '100% of your donation goes directly to the children')
                ].map((item, i) => (
                  <motion.li
                    key={i}
                    variants={{ hidden: { opacity: 0, x: -20 }, show: { opacity: 1, x: 0, transition: { duration: 0.5, ease: "easeOut" } } }}
                    className="flex items-center gap-3 text-slate-700 font-medium"
                  >
                    <div className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0 shadow-sm">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    </div>
                    {item}
                  </motion.li>
                ))}
              </motion.ul>
            </motion.div>
          </div>

          {/* Right — donate form */}
          <div className="lg:w-1/2 w-full">
            <motion.div
              initial={{ opacity: 0, x: 50, scale: 0.98 }}
              whileInView={{ opacity: 1, x: 0, scale: 1 }}
              viewport={{ once: false, amount: 0.1 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
              className="bg-white rounded-3xl shadow-2xl p-8 md:p-10 border border-slate-100 relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-secondary to-accent"></div>

              {success ? (
                <div className="text-center py-16">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-20 h-20 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6"
                  >
                    <CheckCircle2 size={40} />
                  </motion.div>
                  <h3 className="text-3xl font-bold text-slate-800 mb-4">Thank You!</h3>
                  <p className="text-slate-600 text-lg mb-8">
                    {successMessage || tr('donate.successDefault', 'Your generous donation has been recorded. We will contact you shortly with the receipt and further details.')}
                  </p>
                  <button
                    onClick={() => { setSuccess(false); setSuccessMessage(''); }}
                    className="px-8 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-full font-medium transition-colors"
                  >
                    {tr('donate.makeAnother', 'Make another donation')}
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  <h3 className="text-2xl font-bold text-slate-800 mb-2">{tr('donate.donationDetails', 'Donate via UPI / QR')}</h3>
                  <p className="text-sm text-slate-500 -mt-3">
                    {tr('donate.scanInstruction', 'Scan the QR below with any UPI app, then fill in your details and submit.')}
                  </p>

                  {error && (
                    <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium border border-red-100">
                      {error}
                    </div>
                  )}

                  {/* Amount selector */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-3">{tr('donate.selectAmount', 'Select Amount (₹)')}</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                      {amounts.map((amt) => (
                        <button
                          type="button"
                          key={amt}
                          onClick={() => setFormData({ ...formData, amount: amt.toString() })}
                          className={`py-3 rounded-xl border-2 font-bold transition-all ${formData.amount === amt.toString()
                            ? 'border-secondary bg-secondary/10 text-secondary'
                            : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'}`}
                        >
                          ₹{amt.toLocaleString('en-IN')}
                        </button>
                      ))}
                    </div>

                    <div className="relative">
                      <div className="flex items-center">
                        <input
                          type="radio"
                          id="custom"
                          name="amount"
                          checked={formData.amount === 'custom'}
                          onChange={() => setFormData({ ...formData, amount: 'custom' })}
                          className="mr-3 w-4 h-4 text-secondary focus:ring-secondary"
                        />
                        <label htmlFor="custom" className="text-slate-700 font-medium">{tr('donate.customAmount', 'Custom Amount')}</label>
                      </div>
                      {formData.amount === 'custom' && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-3 relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-500">₹</span>
                          <input
                            type="number"
                            min="100"
                            placeholder={tr('donate.enterAmount', 'Enter amount')}
                            className="w-full pl-8 pr-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary transition-all"
                            value={formData.customAmount}
                            onChange={(e) => setFormData({ ...formData, amount: 'custom', customAmount: e.target.value })}
                          />
                        </motion.div>
                      )}
                    </div>
                  </div>

                  {/* Donor details */}
                  <div className="grid md:grid-cols-2 gap-5 pt-4 border-t border-slate-100">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">{tr('donate.fullNameLabel', 'Full Name *')}</label>
                      <input
                        type="text"
                        required
                        className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all bg-slate-50 focus:bg-white"
                        placeholder={tr('donate.fullNamePlaceholder', 'Your full name')}
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">{tr('donate.phoneNumber', 'Phone Number')}</label>
                      <input
                        type="tel"
                        className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all bg-slate-50 focus:bg-white"
                        placeholder={tr('donate.phonePlaceholder', '+91 xxxxx xxxxx')}
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-2">{tr('donate.emailAddress', 'Email Address *')}</label>
                      <input
                        type="email"
                        required
                        className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all bg-slate-50 focus:bg-white"
                        placeholder={tr('donate.emailPlaceholder', 'you@example.com')}
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">{tr('donate.messageOptional', 'Message (Optional)')}</label>
                    <textarea
                      rows="2"
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all bg-slate-50 focus:bg-white resize-none"
                      placeholder={tr('donate.messagePlaceholder', 'Your message of support...')}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    />
                  </div>

                  {/* QR + UPI reference */}
                  <div className="rounded-2xl border border-primary/15 bg-primary/[0.03] p-5">
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                      <div className="relative mx-auto shrink-0 h-36 w-36 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm sm:mx-0">
                        <Image
                          src="/assets/ScannerQR.jpeg"
                          alt="UPI QR code for direct donation"
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-bold uppercase tracking-widest text-primary/60 mb-1">{tr('donate.qrStep1Label', 'Step 1')}</p>
                        <h4 className="text-base font-bold text-slate-800">{tr('donate.qrStep1Title', 'Scan & Pay via UPI')}</h4>
                        <p className="mt-1 text-sm leading-relaxed text-slate-600">
                          {tr('donate.qrStep1Text', 'Use GPay, PhonePe, Paytm, BHIM, or any UPI app to scan this QR and pay directly to the trust account.')}
                        </p>
                        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
                          <p className="text-xs font-bold uppercase tracking-wide text-amber-700">{tr('donate.qrStep2Label', 'Step 2 - Required')}</p>
                          <p className="mt-1 text-xs leading-relaxed text-amber-800">
                            {tr('donate.qrStep2Text', 'After paying, enter your UPI transaction reference / UTR number below and submit. This is mandatory to receive your receipt.')}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-4 border-t border-primary/10 pt-5">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">
                          {tr('donate.upiReference', 'UPI Transaction Reference / UTR *')}
                        </label>
                        <input
                          type="text"
                          value={upiReference}
                          onChange={(e) => setUpiReference(e.target.value)}
                          placeholder={tr('donate.upiReferencePlaceholder', 'e.g. 425123456789')}
                          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleUpiSubmit}
                        disabled={qrSubmitting}
                        className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3.5 font-semibold text-white transition-all hover:bg-emerald-700 hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-70 shadow-md"
                      >
                        {qrSubmitting ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                        {tr('donate.submitUpi', 'Submit Payment for Verification')}
                      </button>
                    </div>
                  </div>

                  {/* Tax notice */}
                  <div className="p-4 rounded-xl bg-green-50 border border-green-100 flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0 mt-0.5">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                    </div>
                    <p className="text-xs text-green-800 leading-relaxed">
                      {tr('donate.taxNotice', 'All donations are tax-deductible under Section 80G of the Income Tax Act. The institution is also registered under Section 12A and is eligible for CSR contributions.')}
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          </div>

        </div>
      </div>
    </section>
  );
}

