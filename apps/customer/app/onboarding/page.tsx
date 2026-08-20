"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  FileUp,
  User,
} from "lucide-react";
import { Alert, AlertDescription, Button, Card, CardContent, CardDescription, CardTitle, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@capitech/ui";
import { toast } from "@capitech/ui";
import { cn } from "@capitech/ui";
import { COUNTRIES } from "@capitech/lib";
import { getBrowserClient, isSupabaseConfigured } from "@/lib/supabase-browser";
import { VerifyButton } from "@/components/didit-verify-button";
import { sendClientEmail } from "@/lib/email-client";

type OnboardingType = "retail" | "corporate";

const DOC_TYPES = ["Passport", "National ID", "Driver's Licence", "Proof of Address"];

function StepIndicator({ step, steps }: { step: number; steps: string[] }) {
  return (
    <div className="flex items-center gap-2">
      {steps.map((label, i) => (
        <div key={label} className="flex items-center gap-2">
          <div
            className={cn(
              "flex size-7 items-center justify-center rounded-full text-xs font-semibold",
              i < step ? "bg-emerald-500/15 text-emerald-300" : i === step ? "bg-brand-600 text-white" : "bg-muted text-muted-foreground"
            )}
          >
            {i < step ? <CheckCircle2 className="size-4" /> : i + 1}
          </div>
          <span className={cn("hidden text-xs sm:block", i === step ? "font-medium text-navy-100" : "text-muted-foreground")}>
            {label}
          </span>
          {i < steps.length - 1 && <div className="h-px w-6 bg-border sm:w-10" />}
        </div>
      ))}
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const [type, setType] = useState<OnboardingType>("retail");
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  // Retail fields
  const [legalFirst, setLegalFirst] = useState("");
  const [legalLast, setLegalLast] = useState("");
  const [dob, setDob] = useState("");
  const [nationality, setNationality] = useState("");
  const [residence, setResidence] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [occupation, setOccupation] = useState("");
  const [sourceOfFunds, setSourceOfFunds] = useState("");
  const [isPep, setIsPep] = useState(false);

  // Corporate fields
  const [legalName, setLegalName] = useState("");
  const [regNumber, setRegNumber] = useState("");
  const [incorpCountry, setIncorpCountry] = useState("");
  const [entityType, setEntityType] = useState("");
  const [industry, setIndustry] = useState("");

  // Docs
  const [docType, setDocType] = useState(DOC_TYPES[0]);
  const [docFile, setDocFile] = useState<File | null>(null);

  const steps = ["Type", "Details", "Documents", "Review"];
  const stepsCorporate = ["Type", "Company", "Documents", "Review"];

  const retailValid =
    legalFirst && legalLast && dob && nationality && residence && address && city;

  // Prefill from sign-up user_metadata (collected by the landing 3-step wizard).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!isSupabaseConfigured()) return;
      const supabase = getBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled || !user) return;
      const m = user.user_metadata ?? {};
      if (m.account_type === "corporate") setType("corporate");
      // Shared / retail (KYC)
      if (typeof m.first_name === "string") setLegalFirst(m.first_name);
      if (typeof m.last_name === "string") setLegalLast(m.last_name);
      if (typeof m.date_of_birth === "string") setDob(m.date_of_birth);
      if (typeof m.nationality === "string") setNationality(m.nationality);
      if (typeof m.country_of_residence === "string") setResidence(m.country_of_residence);
      if (typeof m.address_line1 === "string") setAddress(m.address_line1);
      if (typeof m.city === "string") setCity(m.city);
      if (typeof m.occupation === "string") setOccupation(m.occupation);
      if (typeof m.source_of_funds === "string") setSourceOfFunds(m.source_of_funds);
      if (typeof m.is_pep === "boolean") setIsPep(m.is_pep);
      // Corporate (KYB)
      if (typeof m.company_legal_name === "string") setLegalName(m.company_legal_name);
      if (typeof m.registration_number === "string") setRegNumber(m.registration_number);
      if (typeof m.country_of_incorporation === "string") setIncorpCountry(m.country_of_incorporation);
      if (typeof m.entity_type === "string") setEntityType(m.entity_type);
      if (typeof m.industry === "string") setIndustry(m.industry);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submitOnboarding() {
    setSubmitting(true);
    if (isSupabaseConfigured()) {
      const supabase = getBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in first");
        router.push("/sign-in");
        return;
      }
      try {
        if (type === "retail") {
          const { data: customer, error } = await supabase.from("customers").insert({
            profile_id: user.id,
            customer_type: "retail",
            legal_first_name: legalFirst,
            legal_last_name: legalLast,
            date_of_birth: dob,
            nationality,
            country_of_residence: residence,
            address_line1: address,
            city,
            occupation: occupation || null,
            source_of_funds: sourceOfFunds || null,
            is_pep: isPep,
            kyc_status: "pending",
          }).select().single();
          if (error) throw error;
          if (docFile) {
            const path = `kyc/${user.id}/${customer.id}-${docType.replace(/\s/g, "-").toLowerCase()}`;
            await supabase.storage.from("kyc-documents").upload(path, docFile);
            await supabase.from("kyc_documents").insert({
              customer_id: customer.id,
              document_type: docType.toLowerCase().replace(/[^a-z]/g, "_"),
              file_path: path,
              status: "pending",
            });
          }
        } else {
          const { data: org, error } = await supabase.from("organizations").insert({
            legal_name: legalName,
            registration_number: regNumber,
            country_of_incorporation: incorpCountry,
            entity_type: entityType || null,
            industry: industry || null,
            kyc_status: "pending",
          }).select().single();
          if (error) throw error;
          if (docFile) {
            const path = `kyc/${user.id}/${org.id}-${docType.replace(/\s/g, "-").toLowerCase()}`;
            await supabase.storage.from("kyc-documents").upload(path, docFile);
            await supabase.from("kyc_documents").insert({
              organization_id: org.id,
              document_type: docType.toLowerCase().replace(/[^a-z]/g, "_"),
              file_path: path,
              status: "pending",
            });
          }
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Submission failed");
        setSubmitting(false);
        return;
      }
      toast.success("Application submitted for review");
    } else {
      await new Promise((r) => setTimeout(r, 900));
      toast.success("Application submitted (demo mode)");
    }
    sendClientEmail("welcome", { firstName: legalFirst || legalName });
    setDone(true);
    setSubmitting(false);
  }

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300">
              <CheckCircle2 className="size-7" />
            </div>
            <h1 className="mt-5 text-2xl font-bold text-white">Application received</h1>
            <p className="mx-auto mt-3 max-w-sm text-sm text-muted-foreground">
              Our compliance team is reviewing your details. You will receive an email as soon
              as your account is approved — usually within one business day.
            </p>
            <Button className="mt-7" onClick={() => router.push("/")}>
              Back to dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-10">
      <div className="mx-auto max-w-2xl space-y-8 px-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Complete your onboarding</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            We are required to verify your identity (KYC) before activating your account.
          </p>
        </div>

        <StepIndicator step={step} steps={type === "retail" ? steps : stepsCorporate} />

        <Card>
          <CardContent className="pt-6">
            {/* Step 0 — type */}
            {step === 0 && (
              <div className="space-y-5">
                <div>
                  <CardTitle>How will you use Capitech?</CardTitle>
                  <CardDescription className="mt-1">Choose the account type that fits you best.</CardDescription>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {([
                    { key: "retail", icon: User, title: "Personal", desc: "Everyday banking, cards, savings" },
                    { key: "corporate", icon: Building2, title: "Business / Corporate", desc: "Company accounts, team cards, API" },
                  ] as const).map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setType(opt.key)}
                      className={cn(
                        "rounded-xl border p-5 text-left transition-colors",
                        type === opt.key ? "border-brand-400 bg-brand-600/20" : "border-border hover:border-brand-400/50"
                      )}
                    >
                      <opt.icon className={cn("size-6", type === opt.key ? "text-brand-400" : "text-muted-foreground")} />
                      <p className="mt-3 font-semibold text-white">{opt.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{opt.desc}</p>
                    </button>
                  ))}
                </div>
                <div className="flex justify-end">
                  <Button onClick={() => setStep(1)}>
                    Continue <ArrowRight className="size-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 1 — details */}
            {step === 1 && type === "retail" && (
              <div className="space-y-4">
                <div>
                  <CardTitle>Personal details</CardTitle>
                  <CardDescription className="mt-1">Use your legal name exactly as shown on your ID.</CardDescription>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Legal first name</Label>
                    <Input value={legalFirst} onChange={(e) => setLegalFirst(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Legal last name</Label>
                    <Input value={legalLast} onChange={(e) => setLegalLast(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Date of birth</Label>
                  <Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Nationality</Label>
                    <Select value={nationality} onValueChange={setNationality}>
                      <SelectTrigger className="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent className="max-h-72">
                        {COUNTRIES.map((c) => <SelectItem key={c.alpha2} value={c.alpha2}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Country of residence</Label>
                    <Select value={residence} onValueChange={setResidence}>
                      <SelectTrigger className="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent className="max-h-72">
                        {COUNTRIES.map((c) => <SelectItem key={c.alpha2} value={c.alpha2}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Residential address</Label>
                  <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street, building, apartment" />
                </div>
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input value={city} onChange={(e) => setCity(e.target.value)} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Occupation (optional)</Label>
                    <Input value={occupation} onChange={(e) => setOccupation(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Source of funds (optional)</Label>
                    <Input value={sourceOfFunds} onChange={(e) => setSourceOfFunds(e.target.value)} placeholder="e.g. Salary, business income" />
                  </div>
                </div>
                <label className="flex items-start gap-3 rounded-lg bg-muted p-4 text-sm text-navy-100">
                  <input type="checkbox" checked={isPep} onChange={(e) => setIsPep(e.target.checked)} className="mt-0.5 size-4 accent-brand-600" />
                  I am (or have been) a Politically Exposed Person, or hold a senior public function.
                </label>
                <div className="flex justify-between">
                  <Button variant="ghost" onClick={() => setStep(0)}><ArrowLeft className="size-4" /> Back</Button>
                  <Button onClick={() => setStep(2)} disabled={!retailValid}>
                    Continue <ArrowRight className="size-4" />
                  </Button>
                </div>
              </div>
            )}

            {step === 1 && type === "corporate" && (
              <div className="space-y-4">
                <div>
                  <CardTitle>Company details</CardTitle>
                  <CardDescription className="mt-1">Registered company information for your business account.</CardDescription>
                </div>
                <div className="space-y-2">
                  <Label>Legal company name</Label>
                  <Input value={legalName} onChange={(e) => setLegalName(e.target.value)} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Registration number</Label>
                    <Input value={regNumber} onChange={(e) => setRegNumber(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Country of incorporation</Label>
                    <Select value={incorpCountry} onValueChange={setIncorpCountry}>
                      <SelectTrigger className="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent className="max-h-72">
                        {COUNTRIES.map((c) => <SelectItem key={c.alpha2} value={c.alpha2}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Entity type (optional)</Label>
                    <Input value={entityType} onChange={(e) => setEntityType(e.target.value)} placeholder="e.g. LLC, PLC" />
                  </div>
                  <div className="space-y-2">
                    <Label>Industry (optional)</Label>
                    <Input value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="e.g. Technology" />
                  </div>
                </div>
                <div className="flex justify-between">
                  <Button variant="ghost" onClick={() => setStep(0)}><ArrowLeft className="size-4" /> Back</Button>
                  <Button onClick={() => setStep(2)} disabled={!legalName || !regNumber || !incorpCountry}>
                    Continue <ArrowRight className="size-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2 — documents */}
            {step === 2 && (
              <div className="space-y-5">
                <div>
                  <CardTitle>Identity verification</CardTitle>
                  <CardDescription className="mt-1">
                    Verify your identity with Didit — scan your ID, take a selfie and confirm your
                    details in the secure flow. Optional: upload supporting documents below.
                  </CardDescription>
                </div>

                <div className="rounded-xl border border-brand-500/30 bg-brand-600/10 p-4">
                  <p className="text-sm font-medium text-white">Secure identity check</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    Powered by Didit. Your documents, biometrics and device information are
                    processed by our verification partner in line with our Privacy Policy. The
                    result is applied automatically — no manual review required.
                  </p>
                  <div className="mt-3">
                    <VerifyButton label="Verify my identity with Didit" />
                  </div>
                </div>

                <div>
                  <CardTitle className="text-base">Supporting documents (optional)</CardTitle>
                  <CardDescription className="mt-1">Upload a clear photo or scan of your document. We never share your data.</CardDescription>
                </div>
                <div className="space-y-2">
                  <Label>Document type</Label>
                  <Select value={docType} onValueChange={setDocType}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DOC_TYPES.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/40 px-6 py-8 text-center transition-colors hover:border-brand-400/60">
                  <FileUp className="size-7 text-muted-foreground" />
                  <p className="mt-3 text-sm font-medium text-navy-100">
                    {docFile ? docFile.name : "Click to upload your document"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">PDF, JPG or PNG — max 10 MB</p>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={(e) => setDocFile(e.target.files?.[0] ?? null)}
                  />
                </label>
                <div className="flex justify-between">
                  <Button variant="ghost" onClick={() => setStep(1)}><ArrowLeft className="size-4" /> Back</Button>
                  <Button onClick={() => setStep(3)}>
                    Continue <ArrowRight className="size-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3 — review */}
            {step === 3 && (
              <div className="space-y-5">
                <div>
                  <CardTitle>Review & submit</CardTitle>
                  <CardDescription className="mt-1">Please confirm everything is correct before submitting.</CardDescription>
                </div>
                <div className="space-y-3 rounded-xl bg-white/5 p-4 text-sm">
                  {type === "retail" ? (
                    <>
                      <Row label="Name" value={`${legalFirst} ${legalLast}`} />
                      <Row label="Date of birth" value={dob} />
                      <Row label="Nationality" value={COUNTRIES.find((c) => c.alpha2 === nationality)?.name ?? nationality} />
                      <Row label="Residence" value={COUNTRIES.find((c) => c.alpha2 === residence)?.name ?? residence} />
                      <Row label="Address" value={`${address}, ${city}`} />
                      <Row label="Document" value={`${docType} — ${docFile?.name}`} />
                    </>
                  ) : (
                    <>
                      <Row label="Company" value={legalName} />
                      <Row label="Registration no." value={regNumber} />
                      <Row label="Incorporated in" value={COUNTRIES.find((c) => c.alpha2 === incorpCountry)?.name ?? incorpCountry} />
                      <Row label="Document" value={`${docType} — ${docFile?.name}`} />
                    </>
                  )}
                </div>
                <Alert variant="info">
                  <AlertDescription>
                    By submitting you confirm the information is accurate and consent to identity verification in
                    line with our KYC and AML obligations.
                  </AlertDescription>
                </Alert>
                <div className="flex justify-between">
                  <Button variant="ghost" onClick={() => setStep(2)}><ArrowLeft className="size-4" /> Back</Button>
                  <Button onClick={submitOnboarding} disabled={submitting}>
                    {submitting ? "Submitting…" : "Submit application"}
                    {!submitting && <ArrowRight className="size-4" />}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-navy-100">{value}</span>
    </div>
  );
}
