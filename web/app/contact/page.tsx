// app/contact/page.tsx
//
// CONTACT_EMAIL below is a placeholder — swap it for a real, monitored
// inbox before launch. It's referenced here and in privacy/page.tsx.
import { Mail } from 'lucide-react';

export const metadata = {
  title: 'Contact — Bike PartPicker',
  description: 'Get in touch with the Bike PartPicker team.',
};

const CONTACT_EMAIL = 'hello@bikepartpicker.co.uk';

export default function ContactPage() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <h1 className="font-display text-3xl font-bold text-ink mb-4">Contact</h1>
      <p className="text-ink-muted leading-relaxed mb-8">
        Spotted a wrong spec, a broken link, or have a question about a build? We'd rather hear
        about it than have you find out the hard way mid-order.
      </p>

      <div className="rounded-2xl bg-white border border-black/5 shadow-card p-6 md:p-8">
        <div className="flex items-center gap-3.5 mb-1">
          <div className="w-10 h-10 rounded-xl bg-chassis-soft text-chassis flex items-center justify-center shrink-0">
            <Mail size={18} />
          </div>
          <div>
            <div className="text-xs text-ink-muted uppercase tracking-wide font-semibold">Email</div>
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-ink font-medium hover:text-chassis transition-colors">
              {CONTACT_EMAIL}
            </a>
          </div>
        </div>
        <p className="text-sm text-ink-muted leading-relaxed mt-5 pt-5 border-t border-black/5">
          This includes data requests — to see, correct, or delete the personal data associated
          with your account, email us at the address above and we'll handle it directly. See our{' '}
          <a href="/privacy" className="text-chassis hover:underline">Privacy Policy</a> for details.
        </p>
      </div>
    </div>
  );
}
