import { ShieldCheck, FileText, Cookie, Scale } from "lucide-react";
import { Badge } from "@capitech/ui";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

const SECTIONS = [
  {
    id: "privacy",
    icon: ShieldCheck,
    title: "Privacy Policy",
    updated: "Last updated: August 2026",
    body: [
      "Capitech Bank respects your privacy and is committed to protecting your personal information. This policy explains what we collect, why we collect it, and how we use and safeguard it.",
      "We collect information you provide directly — such as your name, email address, contact details, identification documents and payment information — as well as technical data like IP address, device information and usage patterns, in order to provide, secure and improve our services.",
      "We process personal data to verify your identity, comply with legal and regulatory obligations (including anti-money-laundering and know-your-customer requirements), process transactions, prevent fraud, and communicate with you about your account.",
      "We never sell your personal data. We share information only with service providers who help us operate the platform, with regulators and law enforcement where required by law, and with third parties you explicitly authorise.",
      "You have the right to access, correct, export and delete your personal data, and to withdraw consent where processing is based on consent. To exercise these rights, contact us at the support email listed on our website.",
      "We retain personal data only as long as necessary to fulfil the purposes described in this policy or as required by applicable law. We use encryption, access controls and monitoring to protect your information at rest and in transit.",
    ],
  },
  {
    id: "terms",
    icon: FileText,
    title: "Terms of Service",
    updated: "Last updated: August 2026",
    body: [
      "These Terms of Service govern your access to and use of the Capitech Bank platform. By creating an account or using our services, you agree to be bound by these terms.",
      "You must be at least 18 years old and provide accurate, complete and up-to-date information during onboarding. You are responsible for maintaining the confidentiality of your credentials and for all activity that occurs under your account.",
      "Capitech Bank is a software demonstration platform. All services, accounts, balances, cards and transactions are simulated in a sandbox environment and do not constitute real financial services, real money, or a licensed banking offer.",
      "You agree not to use the platform for any unlawful purpose, to attempt to gain unauthorised access, to interfere with the security or operation of the platform, or to submit false or misleading information.",
      "We may suspend or terminate access to the platform at any time, without notice, for conduct that violates these terms or applicable law, or that we reasonably believe poses a risk to the platform or other users.",
      "The platform is provided on an \"as is\" and \"as available\" basis. To the maximum extent permitted by law, we disclaim all warranties and shall not be liable for any indirect, incidental or consequential damages arising from your use of the platform.",
    ],
  },
  {
    id: "cookies",
    icon: Cookie,
    title: "Cookie Policy",
    updated: "Last updated: August 2026",
    body: [
      "This Cookie Policy explains how Capitech Bank uses cookies and similar tracking technologies when you visit our website or use our applications.",
      "Essential cookies are strictly necessary for the operation of the platform — for example, maintaining your authenticated session and remembering your preferences. These cannot be disabled.",
      "Functional and analytical cookies help us understand how the platform is used so we can improve performance and user experience. They do not identify you personally and are used only in aggregate form.",
      "We use authentication tokens stored as cookies to keep you signed in securely. These tokens are encrypted and scoped to the application domain, and are cleared when you sign out.",
      "You can control or delete cookies through your browser settings. Note that disabling essential cookies may prevent the platform from functioning correctly.",
    ],
  },
  {
    id: "regulatory",
    icon: Scale,
    title: "Regulatory",
    updated: "Last updated: August 2026",
    body: [
      "Capitech Bank models its platform on internationally recognised banking standards, including ISO 4217 (currencies), ISO 13616 / IBAN, ISO 20022 (payment messaging) and IFRS-aligned double-entry accounting.",
      "Our onboarding and monitoring workflows reflect standard KYC and AML practices: customer due diligence, identity verification, PEP screening and transaction monitoring are modelled throughout the platform.",
      "Security controls are designed around industry frameworks including PCI-DSS-style card tokenisation, PSD2-style strong customer authentication, and maker–checker approval workflows.",
      "Capitech Bank is a demonstration platform and is not a licensed bank, payment institution or e-money institution. No real financial services are offered and no real funds are held or moved.",
      "This platform does not provide legal, tax or investment advice. If you require regulated financial services, please consult a licensed financial institution in your jurisdiction.",
    ],
  },
];

export default function LegalPage() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden bg-navy-950">
          <div className="pointer-events-none absolute inset-0" aria-hidden="true">
            <div className="absolute -top-40 left-1/2 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-brand-600/20 blur-3xl" />
            <div className="absolute -bottom-32 -left-32 h-[400px] w-[400px] rounded-full bg-accent-500/10 blur-3xl" />
            <div
              className="absolute inset-0 opacity-[0.35]"
              style={{
                backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.06) 1px, transparent 0)",
                backgroundSize: "32px 32px",
              }}
            />
          </div>

          <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-20 text-center sm:px-6 lg:px-8 lg:pb-28 lg:pt-28">
            <Badge variant="neutral" className="mb-6 border-white/10 bg-white/10 text-navy-100">
              Legal
            </Badge>
            <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Legal &amp;{" "}
              <span className="bg-gradient-to-r from-brand-400 to-accent-400 bg-clip-text text-transparent">
                compliance
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-navy-300">
              Transparency built into everything we do. Review our privacy, terms,
              cookie and regulatory information below.
            </p>
          </div>
        </section>

        {/* Sections */}
        <div className="bg-background py-16 lg:py-20">
          <div className="mx-auto max-w-5xl space-y-8 px-4 sm:px-6 lg:px-8">
            {SECTIONS.map((section) => (
              <section
                key={section.id}
                id={section.id}
                className="scroll-mt-24 rounded-3xl border border-border bg-card p-8 shadow-sm sm:p-10"
              >
                <div className="flex items-start gap-4">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-brand-800 text-white">
                    <section.icon className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-2xl font-bold tracking-tight text-navy-950 sm:text-3xl">
                      {section.title}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">{section.updated}</p>
                  </div>
                </div>
                <div className="mt-6 space-y-4">
                  {section.body.map((paragraph, i) => (
                    <p
                      key={i}
                      className="text-sm leading-relaxed text-muted-foreground sm:text-base"
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
