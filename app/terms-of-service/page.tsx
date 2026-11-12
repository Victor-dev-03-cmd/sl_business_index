import type { Metadata } from "next";
import Link from "next/link";
import { Mail, MapPin, Scale, ShieldAlert } from "lucide-react";
import LegalPageShell, { LegalSection, legalBody, legalList, legalStrong, type LegalSectionRef } from "@/app/components/LegalPageShell";

export const metadata: Metadata = {
  title: "Terms of Service | SLBI 2.0 | SL Business Index",
  description: "Read SL Business Index terms covering accounts, verified listings, ownership, acceptable use, QR codes, billing, liability and the phased SLBI 2.0 Growth OS vision.",
  alternates: { canonical: "https://www.slbusinessindex.com/terms-of-service" },
  openGraph: {
    title: "Terms of Service | SL Business Index",
    description: "The ground rules for using the SL Business Index directory and business-owner workspace.",
    url: "https://www.slbusinessindex.com/terms-of-service",
    type: "website",
  },
};

const sections: LegalSectionRef[] = [
  {id:"acceptance",label:"Acceptance of terms"},
  {id:"accounts",label:"Accounts & registration"},
  {id:"listings",label:"Business listings & content"},
  {id:"qr",label:"QR code usage"},
  {id:"intellectual-property",label:"Intellectual property"},
  {id:"liability",label:"Liability & availability"},
  {id:"prohibited",label:"Prohibited activities"},
  {id:"law",label:"Governing law"},
  {id:"changes",label:"Changes to the terms"},
  {id:"contact",label:"Contact information"},
];

export default function TermsOfServicePage() {
  return (
    <LegalPageShell kind="terms" eyebrow="Platform agreements"
      title="Terms of Service."
      summary="Clear rules make better connections possible. Read about your responsibilities, business listings, ownership, platform conduct and what SL Business Index can—and cannot—promise."
      effectiveDate="March 25, 2026" sections={sections}>
      <div className="rounded-[14px] border border-[#dbe8da] bg-[#f3f8f0] p-5 sm:p-6">
        <p className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[.16em] text-[#3b7e59]"><Scale size={17}/> A clear foundation for growth</p>
        <p className={"mt-3 " + legalBody}>Welcome to SL Business Index. By accessing or using our website and services, you agree to these Terms of Service. <strong className={legalStrong}>SLBI 2.0</strong> marks the next chapter of our business platform; its Growth &amp; Security OS roadmap includes features being developed in phases. A roadmap does not mean all proposed tools are available or covered by a paid plan today.</p>
      </div>

      <LegalSection id="acceptance" number={1} heading="Acceptance of terms">
        <p className={legalBody}>By using SL Business Index, you confirm that you are at least <strong className={legalStrong}>18 years old</strong> and legally capable of entering into binding contracts. If you do not agree to these terms, you should not use our services.</p>
      </LegalSection>

      <LegalSection id="accounts" number={2} heading="User accounts & registration">
        <ul className={legalList}>
          <li>To list a business, you must register an account and keep login credentials confidential.</li>
          <li>You must provide accurate, current and complete information when registering or updating a business.</li>
          <li>We may suspend or terminate accounts that contain false information or violate applicable platform policies.</li>
        </ul>
        <p className={legalBody}>Access to owner tools and permissions depends on your account, business ownership, applicable verification checks and any plan-specific entitlements.</p>
      </LegalSection>

      <LegalSection id="listings" number={3} heading="Business listings & content">
        <ul className={legalList}>
          <li><strong className={legalStrong}>Responsibility:</strong> Business owners are responsible for the accuracy and legality of the descriptions, images, prices, locations and contact information they provide.</li>
          <li><strong className={legalStrong}>Legal rights:</strong> You must have authorization to represent your business and the right to use any trade names, logos, images or other material uploaded.</li>
          <li><strong className={legalStrong}>Prohibited content:</strong> Illegal services, adult content and content that breaches Sri Lankan law or applicable platform rules are not allowed.</li>
          <li><strong className={legalStrong}>Moderation:</strong> SL Business Index may remove or edit inappropriate, inaccurate or non-compliant listings as permitted by law and our policies.</li>
        </ul>
        <p className={legalBody}>Public business reviews, news, posters and other owner-provided content remain the publisher's responsibility. Verification or appearance on SLBI is not an independent guarantee of every claim made by a business.</p>
      </LegalSection>

      <LegalSection id="qr" number={4} heading="QR code system usage">
        <p className={legalBody}>SLBI-generated QR codes are intended to open relevant business profiles and related platform content. Tampering, unauthorized reverse engineering, impersonation or fraudulent use of these codes is prohibited.</p>
      </LegalSection>

      <LegalSection id="intellectual-property" number={5} heading="Intellectual property">
        <p className={legalBody}>The SL Business Index brand, design, logo and platform software are our intellectual property, subject to any third-party rights and licenses. By submitting business information or media, you grant SLBI a non-exclusive license to display and promote that material as needed to operate the directory and applicable business services.</p>
        <p className={legalBody}>You remain responsible for ensuring that your submitted content does not infringe the rights of others. Our future AI-assisted features are intended to include owner review and approval controls; their specific terms may be presented separately when released.</p>
      </LegalSection>

      <LegalSection id="liability" number={6} heading="Limitation of liability & availability">
        <ul className={legalList}>
          <li>SL Business Index provides a business directory and connected owner tools. We do not guarantee the quality, safety, legality or performance of third-party businesses listed on the platform.</li>
          <li>We are not responsible for disputes, purchases, service arrangements or losses arising directly between visitors and listed businesses, subject to applicable law.</li>
          <li>We cannot guarantee 100% uninterrupted site availability due to maintenance, technical faults or circumstances outside our control.</li>
          <li>Listing visibility, search rankings, enquiries, sales, SEO indexing and commercial results are <strong className={legalStrong}>not guaranteed</strong>. A recorded call-button click or profile view is not a completed transaction.</li>
        </ul>
        <p className={legalBody}>SLBI 2.0 GrowthOS features may be released incrementally. Where subscriptions, credits, AI tools or third-party integrations are offered, their current availability, fees and limits should be confirmed at the time of use. Future roadmap descriptions are not purchases or entitlements.</p>
      </LegalSection>

      <LegalSection id="prohibited" number={7} heading="Prohibited activities">
        <p className={legalBody}>Users must not:</p>
        <ul className={legalList}>
          <li>Use unauthorized bots, scraping or automated extraction that breaches SLBI terms or applicable laws.</li>
          <li>Publish spam, fraudulent content, malicious software, repetitive abuse or harmful links.</li>
          <li>Harass, impersonate or deceive visitors, business owners or the SLBI team.</li>
          <li>Attempt unauthorized access to other accounts, private business records, infrastructure or security features.</li>
        </ul>
      </LegalSection>

      <LegalSection id="law" number={8} heading="Governing law">
        <p className={legalBody}>These terms are governed by and construed in accordance with the laws of the <strong className={legalStrong}>Democratic Socialist Republic of Sri Lanka</strong>. Disputes are subject to the jurisdiction of the courts in Sri Lanka, as applicable under law.</p>
      </LegalSection>

      <LegalSection id="changes" number={9} heading="Changes to these terms">
        <p className={legalBody}>We may amend these terms over time. Significant updates may be communicated by email, on the website or by other appropriate notice. Continued use after amended terms take effect may constitute acceptance as permitted by applicable law.</p>
        <p className={legalBody}>This page's presentation has been refreshed for <strong className={legalStrong}>SLBI 2.0</strong>. The terms' previously published effective date is March 25, 2026. New paid, AI, security or marketing services may require additional service-specific information and notices when introduced.</p>
      </LegalSection>

      <LegalSection id="contact" number={10} heading="Contact information">
        <p className={legalBody}>If you have questions about these terms, contact the SLBI support team in Sri Lanka:</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <a className="flex min-w-0 items-start gap-3 rounded-[13px] border border-[#e1eae0] bg-[#f9fbf7] p-4 text-[12px] font-semibold text-[#326445] hover:bg-[#f0f7ef]" href="mailto:slbusinessindex@gmail.com"><Mail size={18} className="shrink-0"/> <span className="break-all">slbusinessindex@gmail.com</span></a>
          <Link className="flex min-w-0 items-start gap-3 rounded-[13px] border border-[#e1eae0] bg-[#f9fbf7] p-4 text-[12px] font-semibold text-[#326445] hover:bg-[#f0f7ef]" href="/contact"><MapPin size={18} className="shrink-0"/> Contact Us · Sri Lanka</Link>
        </div>
        <p className="flex items-start gap-2 text-[11px] leading-[1.85] text-[#829385]"><ShieldAlert size={15} className="mt-0.5 shrink-0"/> SLBI does not act as a bank, utility provider or government agency. Public-service numbers on our Contact page are independent references.</p>
      </LegalSection>
    </LegalPageShell>
  );
}
