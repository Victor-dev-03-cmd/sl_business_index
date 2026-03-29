import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact & Public Service Directory | SL Business Index',
  description: 'Get in touch with us or access our verified Public Service & Emergency Contact Directory for Sri Lanka, including Ambulance, Police, CEB, and Water Board contacts.',
  keywords: ['Sri Lanka Emergency Numbers', 'Public Service Directory Sri Lanka', 'Suwa Seriya Ambulance 1990', 'CEB Breakdown Hotline', 'National Hospital Contact', 'Sri Lanka Police 119'],
  openGraph: {
    title: 'Contact & Public Service Directory | SL Business Index',
    description: 'Verified emergency and utility contact directory for Sri Lanka. Quick access to essential services.',
    type: 'website',
  },
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
