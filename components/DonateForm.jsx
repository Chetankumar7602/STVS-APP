"use client";

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { siteData } from '@/lib/data';
import { Heart, Loader2, CheckCircle2 } from 'lucide-react';
import Script from 'next/script';
import { readJsonResponse } from '@/lib/response';
import Image from 'next/image';
import { useLanguage } from '@/lib/useLanguage';

export default function DonateForm() {
  const { donate } = siteData;
  const { tr } = useLanguage();
  const sectionRef = useRef(null);
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', amount: '1000', customAmount: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('idle'); // 'idle' | 'processing' | 'cancelled' | 'failed'
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

  const getMissingUpiFields = () => {
    const missing = [];
    const amountValue = formData.amount === 'custom'
      ? parsedCustomAmount
      : (parsedCustomAmount >= 100 ? parsedCustomAmount : finalAmount);

    if (!formData.name.trim()) missing.push('name');
    if (!formData.email.trim()) missing.push('email');
    if (!upiReference.trim()) missing.push('UPI reference');
    if (!amountValue || Number.isNaN(amountValue) || amountValue < 100) missing.push('valid amount');
    return missing;
  };

  useEffect(() => {
    if (!success || !sectionRef.current) {
      return;
    }

    requestAnimationFrame(() => {
      sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [success]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);
    setSuccessMessage('');
    setPaymentStatus('processing');

    if (!finalAmount || finalAmount < 100) {
      setError(tr('donate.errors.invalidAmount', 'Please enter a valid amount (minimum ₹100)'));
      setLoading(false);
      setPaymentStatus('idle');
      return;
    }

    try {
      // 1. Create order
      const orderRes = await fetch('/api/donations/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone,
          email: formData.email,
          amount: finalAmount,
          message: formData.message,
        }),
      });

      const orderData = await readJsonResponse(orderRes);
      if (!orderData.success) {
        setError(orderData.message || 'Failed to initialize payment');
        setLoading(false);
        setPaymentStatus('idle');
        return;
      }

      // 2. Launch Razorpay Checkout
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderData.order.amount,
        currency: orderData.order.currency,
        name: "STVS Charity Trust",
        description: "Donation via Web Portal",
        image: typeof window !== 'undefined' ? `${window.location.origin}/assets/Logo.jpg` : "",
        order_id: orderData.order.id,
        handler: async function (response) {
          // 3. Verify payment signature
          setLoading(true);
          try {
            const verifyRes = await fetch('/api/donations', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });
            const verifyData = await readJsonResponse(verifyRes);
            if (verifyData.success) {
              setPaymentStatus('idle');
              setSuccessMessage('Your generous donation has been recorded. We will contact you shortly with the receipt and further details.');
              setSuccess(true);
              resetDonationForm();
            } else {
              setError(verifyData.message || 'Payment verification failed.');
              setPaymentStatus('idle');
            }
          } catch (err) {
            setError('Verification network error.');
            setPaymentStatus('idle');
          } finally {
            setLoading(false);
          }
        },
        modal: {
          ondismiss: function () {
            setLoading(false);
            setPaymentStatus('cancelled');
            // Revert back to idle after 3 seconds
            setTimeout(() => setPaymentStatus('idle'), 3000);
          }
        },
        prefill: {
          name: formData.name,
          contact: formData.phone
        },
        theme: {
          color: "#0f4c81"
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response) {
        setError('Payment Failed: ' + response.error.description);
        setLoading(false);
        setPaymentStatus('failed');
        // Revert back to idle after 3 seconds
        setTimeout(() => setPaymentStatus('idle'), 3000);
      });
      rzp.open();

    } catch (err) {
      setError('Network error. Please try again later.');
      setLoading(false);
      setPaymentStatus('idle');
    }
  };

  const handleUpiSubmit = async () => {
    setError('');
    setSuccess(false);
    setSuccessMessage('');

    const missingFields = getMissingUpiFields();
    const amountForUpi = formData.amount === 'custom'
      ? parsedCustomAmount
      : (parsedCustomAmount >= 100 ? parsedCustomAmount : finalAmount);

    if (missingFields.length > 0) {
      setError(`Please provide: ${missingFields.join(', ')}.`);
      return;
    }

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
      setSuccessMessage('Thank you for your payment. Your details have been recorded and are now pending manual verification. Once the payment is reviewed, we will send your receipt to the email address you provided.');
      setSuccess(true);
      resetDonationForm();
      setPaymentStatus('idle');

      const res = await fetch('/api/donations/upi-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await readJsonResponse(res);
      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || 'Failed to submit UPI payment for verification.');
      }
    } catch (err) {
      setSuccess(false);
      setSuccessMessage('');
      setError(err.message || 'Unable to submit UPI payment details right now.');
    } finally {
      setQrSubmitting(false);
    }
  };

  return (
    <section ref={sectionRef} id="donate" className="py-24 bg-white relative overflow-x-clip">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <div className="absolute top-0 right-0 w-1/3 h-full bg-slate-50 rounded-l-[100px] -z-10 hidden lg:block"></div>

      <div className="container mx-auto px-4 md:px-6 overflow-x-clip">
        <div className="flex flex-col lg:flex-row gap-16 items-center">

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
                  show: {
                    opacity: 1,
                    transition: {
                      staggerChildren: 0.1,
                      delayChildren: 0.3
                    }
                  }
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
                    variants={{
                      hidden: { opacity: 0, x: -20 },
                      show: { opacity: 1, x: 0, transition: { duration: 0.5, ease: "easeOut" } }
                    }}
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
                    onClick={() => {
                      setSuccess(false);
                      setSuccessMessage('');
                      setPaymentStatus('idle');
                    }}
                    className="px-8 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-full font-medium transition-colors"
                  >
                    {tr('donate.makeAnother', 'Make another donation')}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <h3 className="text-2xl font-bold text-slate-800 mb-6">{tr('donate.donationDetails', 'Donation Details')}</h3>

                  {error && (
                    <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium border border-red-100">
                      {error}
                    </div>
                  )}

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
                            : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                            }`}
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
                            required
                            className="w-full pl-8 pr-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary transition-all"
                            value={formData.customAmount}
                            onChange={(e) => setFormData({ ...formData, amount: 'custom', customAmount: e.target.value })}
                          />
                        </motion.div>
                      )}
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">{tr('donate.fullNameLabel', 'Full Name *')}</label>
                      <input
                        type="text"
                        required
                        className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all bg-slate-50 focus:bg-white"
                        placeholder={tr('donate.fullNamePlaceholder', 'John Doe')}
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
                        placeholder={tr('donate.emailPlaceholder', 'john@example.com')}
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">{tr('donate.messageOptional', 'Message (Optional)')}</label>
                    <textarea
                      rows="3"
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all bg-slate-50 focus:bg-white resize-none"
                      placeholder={tr('donate.messagePlaceholder', 'Your message of support...')}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    ></textarea>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className={`w-full py-4 rounded-xl text-white font-bold text-lg shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed transform hover:-translate-y-1 active:translate-y-0 ${paymentStatus === 'cancelled' ? 'bg-amber-500 hover:bg-amber-600' :
                        paymentStatus === 'failed' ? 'bg-red-500 hover:bg-red-600' :
                          'bg-primary hover:bg-primary/90'
                      }`}
                  >
                    {loading ? <Loader2 className="animate-spin" /> : <Heart className="fill-current" size={20} />}
                    {
                      paymentStatus === 'processing' ? tr('donate.processing', 'Processing...') :
                        paymentStatus === 'cancelled' ? tr('donate.cancelled', 'Payment Cancelled') :
                          paymentStatus === 'failed' ? tr('donate.unsuccessful', 'Unsuccessful') :
                            `${tr('donate.donatePrefix', 'Donate')} ₹${formData.amount === 'custom' ? (formData.customAmount || '0') : formData.amount}`
                    }
                  </button>
                  <p className="text-xs text-center text-slate-500 flex items-center justify-center gap-1 mt-4">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                    {tr('donate.securePayment', 'Secure payment powered by Razorpay. Your information is safe.')}
                  </p>

                  <div className="rounded-2xl border border-primary/15 bg-primary/[0.03] p-5">
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                      <div className="relative mx-auto h-32 w-32 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm sm:mx-0">
                        <Image
                          src="/assets/ScannerQR.jpeg"
                          alt="UPI QR code for direct donation"
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary/70">{tr('donate.alternativePayment', 'Alternative Payment')}</p>
                        <h4 className="mt-2 text-lg font-bold text-slate-800">{tr('donate.payViaUpi', 'Pay via UPI QR')}</h4>
                        <p className="mt-2 text-sm leading-relaxed text-slate-600">
                          {tr('donate.upiHelp1', 'If UPI is not showing inside Razorpay checkout, donors can scan this QR code using any UPI app and pay directly to the trust account.')}
                        </p>
                        <p className="mt-3 text-xs leading-relaxed text-slate-500">
                          {tr('donate.upiHelp2', 'After payment, enter the UPI transaction reference below. The donation will be stored in the backend as pending verification, and the admin can verify it before the receipt is emailed.')}
                        </p>
                        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
                          <p className="text-xs font-bold uppercase tracking-wide text-amber-700">
                            {tr('donate.scannerFormNoticeTitle', 'Important for QR Payments')}
                          </p>
                          <p className="mt-1 text-xs leading-relaxed text-amber-800">
                            {tr('donate.scannerFormNoticeText', 'If you paid through the scanner, filling this form is compulsory to inform the trust owner about your donation and to receive your receipt.')}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="mt-5 grid gap-4 border-t border-primary/10 pt-5">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">{tr('donate.upiReference', 'UPI Transaction Reference / UTR *')}</label>
                        <input
                          type="text"
                          value={upiReference}
                          onChange={(e) => setUpiReference(e.target.value)}
                          placeholder={tr('donate.upiReferencePlaceholder', 'Enter UPI reference after payment')}
                          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleUpiSubmit}
                        disabled={qrSubmitting}
                        className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {qrSubmitting ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                        {tr('donate.submitUpi', 'Submit UPI Payment For Verification')}
                      </button>
                    </div>
                  </div>

                  {/* Tax & Legal Notice */}
                  <div className="mt-5 p-4 rounded-xl bg-green-50 border border-green-100 flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0 mt-0.5">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                    </div>
                    <p className="text-xs text-green-800 leading-relaxed">
                      {tr('donate.taxNotice', 'All donations are tax-deductible under Section 80G of the Income Tax Act. The institution is also registered under Section 12A and is eligible for CSR contributions.')}
                    </p>
                  </div>
                </form>
              )}
            </motion.div>
          </div>

        </div>
      </div>
    </section>
  );
}
