export const dynamic = 'force-dynamic';

import ForgotPasswordClient from './ForgotPasswordClient';

export default function AdminForgotPasswordPage({ searchParams }) {
  const token = String(searchParams?.token || '');
  const email = String(searchParams?.email || '');

  return <ForgotPasswordClient initialEmail={email} initialToken={token} />;
}
