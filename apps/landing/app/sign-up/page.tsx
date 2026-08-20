"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Building2, CheckCircle2, Info, Mail, User } from "lucide-react";
import { Alert, AlertDescription, AlertTitle, Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, Logo, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@capitech/ui";
import { getSupabaseBrowserClient } from "@/lib/auth";
import { COUNTRIES } from "@capitech/lib";
import { cn } from "@capitech/ui";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isAdult(dateStr: string) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const monthDiff = now.getMonth() - d.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < d.getDate())) age--;
  return age >= 18;
}

function countryName(code: string) {
  return COUNTRIES.find((c) => c.alpha2 === code)?.name ?? code;
}

type FieldErrors = Partial<
  Record<
    | "email"
    | "password"
    | "terms"
    | "firstName"
    | "lastName"
    | "dob"
    | "nationality"
    | "residence"
    | "address"
    | "city"
    | "legalName"
    | "regNumber"
    | "incorpCountry"
    | "regAddress",
    string
  >
>;

function StepIndicator({ step }: { step: number }) {
  const labels = ["Account", "Identity", "Review"];
  return (
    <div className="mb-6">
      <p className="mb-3 text-xs font-medium text-navy-400">
        Step {step + 1} of {labels.length} · {labels.join(" → ")}
      </p>
      <div className="flex items-center gap-2">
        {labels.map((label, i) => (
          <div key={label} className="flex flex-1 items-center gap-2">
            <div
              className={cn(
                "flex size-6 items-center justify-center rounded-full text-xs font-semibold",
                i < step
                  ? "bg-emerald-500/15 text-emerald-400"
                  : i === step
                    ? "bg-brand-600 text-white"
                    : "border border-white/10 bg-white/5 text-navy-400"
              )}
            >
              {i < step ? <CheckCircle2 className="size-3.5" /> : i + 1}
            </div>
            <span className={cn("text-xs", i === step ? "font-medium text-navy-100" : "text-navy-500")}>
              {label}
            </span>
            {i < labels.length - 1 && <div className="mx-1 h-px flex-1 bg-white/10" />}
          </div>
        ))}
      </div>
    </div>
  );
}

function SignUpForm() {
  const searchParams = useSearchParams();
  const initialType = searchParams.get("type") === "corporate" ? "corporate" : "retail";

  const [accountType, setAccountType] = useState<"retail" | "corporate">(initialType);
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);

  // KYC (personal)
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dob, setDob] = useState("");
  const [nationality, setNationality] = useState("");
  const [residence, setResidence] = useState("");
  const [country, setCountry] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [occupation, setOccupation] = useState("");
  const [sourceOfFunds, setSourceOfFunds] = useState("");
  const [isPep, setIsPep] = useState(false);

  // KYB (business)
  const [legalName, setLegalName] = useState("");
  const [regNumber, setRegNumber] = useState("");
  const [incorpCountry, setIncorpCountry] = useState("");
  const [entityType, setEntityType] = useState("");
  const [industry, setIndustry] = useState("");
  const [regAddress, setRegAddress] = useState("");

  const [errors, setErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const supabaseConfigured = !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  function validateAccount(): boolean {
    const next: FieldErrors = {};
    if (!EMAIL_REGEX.test(email)) next.email = "Enter a valid email address.";
    if (password.length < 8 || !/(?=.*[A-Za-z])(?=.*\d)/.test(password))
      next.password = "Use at least 8 characters with letters and numbers.";
    if (!acceptTerms) next.terms = "Please accept the Terms of Service and Privacy Policy to continue.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function validatePersonal(): boolean {
    const next: FieldErrors = {};
    if (!firstName.trim()) next.firstName = "Legal first name is required.";
    if (!lastName.trim()) next.lastName = "Legal last name is required.";
    if (!dob) next.dob = "Date of birth is required.";
    else if (!isAdult(dob)) next.dob = "You must be at least 18 years old.";
    if (!nationality) next.nationality = "Select your nationality.";
    if (!residence) next.residence = "Select your country of residence.";
    if (!address.trim()) next.address = "Residential address is required.";
    if (!city.trim()) next.city = "City is required.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function validateBusiness(): boolean {
    const next: FieldErrors = {};
    if (!legalName.trim()) next.legalName = "Legal company name is required.";
    if (!regNumber.trim()) next.regNumber = "Registration number is required.";
    if (!incorpCountry) next.incorpCountry = "Select your country of incorporation.";
    if (!regAddress.trim()) next.regAddress = "Registered address is required.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleContinue() {
    setErrors({});
    if (step === 0) {
      if (validateAccount()) setStep(1);
    } else if (step === 1) {
      const valid = accountType === "retail" ? validatePersonal() : validateBusiness();
      if (valid) setStep(2);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = getSupabaseBrowserClient();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${siteUrl}/auth/callback?next=/app/onboarding`,
        data: {
          first_name: firstName,
          last_name: lastName,
          account_type: accountType,
          country,
          // KYC
          date_of_birth: dob,
          nationality,
          country_of_residence: residence,
          address_line1: address,
          city,
          occupation: occupation || null,
          source_of_funds: sourceOfFunds || null,
          is_pep: isPep,
          // KYB
          company_legal_name: legalName,
          registration_number: regNumber,
          country_of_incorporation: incorpCountry,
          entity_type: entityType || null,
          industry: industry || null,
          registered_address: regAddress,
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }
    setDone(true);
  }

  const reviewRows = [
    { label: "Account type", value: accountType === "retail" ? "Personal" : "Business" },
    { label: "Email", value: email },
    ...(accountType === "retail"
      ? [
          { label: "Legal name", value: `${firstName} ${lastName}`.trim() },
          { label: "Date of birth", value: dob },
          { label: "Nationality", value: countryName(nationality) },
          { label: "Country of residence", value: countryName(residence) },
          { label: "Address", value: `${address}${city ? `, ${city}` : ""}` },
          ...(occupation ? [{ label: "Occupation", value: occupation }] : []),
          ...(sourceOfFunds ? [{ label: "Source of funds", value: sourceOfFunds }] : []),
          { label: "PEP declaration", value: isPep ? "Yes" : "No" },
        ]
      : [
          { label: "Legal company name", value: legalName },
          { label: "Registration number", value: regNumber },
          { label: "Country of incorporation", value: countryName(incorpCountry) },
          ...(entityType ? [{ label: "Entity type", value: entityType }] : []),
          ...(industry ? [{ label: "Industry", value: industry }] : []),
          { label: "Registered address", value: regAddress },
        ]),
  ];

  if (done) {
    return (
      <Card className="border-white/10 bg-navy-900/80 shadow-2xl backdrop-blur">
        <CardContent className="pt-8 text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
            <CheckCircle2 className="size-7" />
          </div>
          <h2 className="mt-5 text-2xl font-bold text-white">Check your inbox</h2>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-navy-300">
            We sent a confirmation link to <span className="font-medium text-white">{email}</span>.
            Click it to activate your account and complete onboarding.
          </p>
          <Button asChild variant="outline" className="mt-7 border-white/15 bg-transparent text-white hover:bg-white/5">
            <Link href="/sign-in">Back to sign in</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-white/10 bg-navy-900/80 shadow-2xl backdrop-blur">
      <CardHeader>
        <CardTitle className="text-2xl text-white">Open your account</CardTitle>
        <CardDescription className="text-navy-300">
          Takes about 2 minutes. Free forever on the standard plan.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!supabaseConfigured && (
          <Alert variant="warning" className="mb-4">
            <AlertTitle>Supabase not configured</AlertTitle>
            <AlertDescription>
              Add your <code className="font-mono">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
              <code className="font-mono">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to{" "}
              <code className="font-mono">apps/landing/.env.local</code> to enable sign-up.
            </AlertDescription>
          </Alert>
        )}

        <StepIndicator step={step} />

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Step 1 — Account */}
          {step === 0 && (
            <div className="space-y-5">
              {/* Account type selector */}
              <div className="grid grid-cols-2 gap-3">
                {(["retail", "corporate"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setAccountType(type)}
                    className={cn(
                      "flex flex-col items-center gap-2 rounded-xl border px-4 py-4 text-sm font-medium transition-colors",
                      accountType === type
                        ? "border-brand-400 bg-brand-600/20 text-white"
                        : "border-white/10 bg-white/5 text-navy-300 hover:border-white/20"
                    )}
                  >
                    {type === "retail" ? <User className="size-5" /> : <Building2 className="size-5" />}
                    {type === "retail" ? "Personal" : "Business"}
                  </button>
                ))}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-navy-100">Email</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-navy-400" />
                  <Input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="border-white/10 bg-white/5 pl-9 text-white placeholder:text-navy-500"
                  />
                </div>
                {errors.email && <p className="text-xs text-red-400">{errors.email}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-navy-100">Password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="border-white/10 bg-white/5 text-white placeholder:text-navy-500"
                />
                <p className="text-xs text-navy-400">Use 8+ characters with letters and numbers.</p>
                {errors.password && <p className="text-xs text-red-400">{errors.password}</p>}
              </div>

              <div className="space-y-2">
                <label className="flex items-start gap-3 text-sm text-navy-300">
                  <input
                    type="checkbox"
                    checked={acceptTerms}
                    onChange={(e) => setAcceptTerms(e.target.checked)}
                    className="mt-0.5 size-4 rounded border-white/20 bg-white/5 accent-brand-500"
                  />
                  <span>
                    I agree to the{" "}
                    <Link href="#" className="text-brand-300 hover:underline">Terms of Service</Link> and{" "}
                    <Link href="#" className="text-brand-300 hover:underline">Privacy Policy</Link>, and consent
                    to identity verification for KYC purposes.
                  </span>
                </label>
                {errors.terms && <p className="text-xs text-red-400">{errors.terms}</p>}
              </div>

              <Button type="button" size="lg" onClick={handleContinue} className="w-full bg-brand-600 text-white shadow-sm hover:bg-brand-500">
                Continue <ArrowRight className="size-4" />
              </Button>
            </div>
          )}

          {/* Step 2a — Identity details (KYC, personal) */}
          {step === 1 && accountType === "retail" && (
            <div className="space-y-5">
              <div>
                <h3 className="text-lg font-semibold text-white">Identity details</h3>
                <p className="mt-1 text-sm text-navy-300">Use your legal name exactly as shown on your ID.</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="legalFirstName" className="text-navy-100">Legal first name</Label>
                  <Input
                    id="legalFirstName"
                    required
                    autoComplete="given-name"
                    placeholder="Jane"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="border-white/10 bg-white/5 text-white placeholder:text-navy-500"
                  />
                  {errors.firstName && <p className="text-xs text-red-400">{errors.firstName}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="legalLastName" className="text-navy-100">Legal last name</Label>
                  <Input
                    id="legalLastName"
                    required
                    autoComplete="family-name"
                    placeholder="Doe"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="border-white/10 bg-white/5 text-white placeholder:text-navy-500"
                  />
                  {errors.lastName && <p className="text-xs text-red-400">{errors.lastName}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dob" className="text-navy-100">Date of birth</Label>
                <Input
                  id="dob"
                  type="date"
                  required
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="border-white/10 bg-white/5 text-white"
                />
                {errors.dob ? (
                  <p className="text-xs text-red-400">{errors.dob}</p>
                ) : dob && !isAdult(dob) ? (
                  <p className="text-xs text-red-400">You must be at least 18 years old.</p>
                ) : null}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-navy-100">Nationality</Label>
                  <Select value={nationality} onValueChange={setNationality}>
                    <SelectTrigger className="w-full border-white/10 bg-white/5 text-white">
                      <SelectValue placeholder="Select nationality" />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {COUNTRIES.map((c) => (
                        <SelectItem key={c.alpha2} value={c.alpha2}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.nationality && <p className="text-xs text-red-400">{errors.nationality}</p>}
                </div>
                <div className="space-y-2">
                  <Label className="text-navy-100">Country of residence</Label>
                  <Select value={residence} onValueChange={(v) => { setResidence(v); setCountry(v); }}>
                    <SelectTrigger className="w-full border-white/10 bg-white/5 text-white">
                      <SelectValue placeholder="Select your country" />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {COUNTRIES.map((c) => (
                        <SelectItem key={c.alpha2} value={c.alpha2}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.residence && <p className="text-xs text-red-400">{errors.residence}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address" className="text-navy-100">Residential address</Label>
                <Input
                  id="address"
                  required
                  autoComplete="street-address"
                  placeholder="Street, building, apartment"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="border-white/10 bg-white/5 text-white placeholder:text-navy-500"
                />
                {errors.address && <p className="text-xs text-red-400">{errors.address}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="city" className="text-navy-100">City</Label>
                <Input
                  id="city"
                  required
                  autoComplete="address-level2"
                  placeholder="London"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="border-white/10 bg-white/5 text-white placeholder:text-navy-500"
                />
                {errors.city && <p className="text-xs text-red-400">{errors.city}</p>}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="occupation" className="text-navy-100">Occupation <span className="text-navy-400">(optional)</span></Label>
                  <Input
                    id="occupation"
                    placeholder="Software Engineer"
                    value={occupation}
                    onChange={(e) => setOccupation(e.target.value)}
                    className="border-white/10 bg-white/5 text-white placeholder:text-navy-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sourceOfFunds" className="text-navy-100">Source of funds <span className="text-navy-400">(optional)</span></Label>
                  <Input
                    id="sourceOfFunds"
                    placeholder="e.g. Salary, business income"
                    value={sourceOfFunds}
                    onChange={(e) => setSourceOfFunds(e.target.value)}
                    className="border-white/10 bg-white/5 text-white placeholder:text-navy-500"
                  />
                </div>
              </div>

              <label className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-navy-100">
                <input
                  type="checkbox"
                  checked={isPep}
                  onChange={(e) => setIsPep(e.target.checked)}
                  className="mt-0.5 size-4 rounded border-white/20 bg-white/5 accent-brand-500"
                />
                I am (or have been) a Politically Exposed Person, or hold a senior public function.
              </label>

              <Alert variant="info" className="border-sky-400/30 bg-sky-500/10 text-sky-200">
                <Info className="size-4" />
                <AlertDescription className="text-sky-200/80">
                  We verify your identity with Didit (KYC) — you&apos;ll complete a secure ID + selfie check after sign-up.
                  Your data is processed by our verification partner.
                </AlertDescription>
              </Alert>

              <div className="flex justify-between">
                <Button type="button" variant="ghost" onClick={() => { setErrors({}); setStep(0); }} className="text-navy-300 hover:bg-white/5 hover:text-white">
                  <ArrowLeft className="size-4" /> Back
                </Button>
                <Button type="button" onClick={handleContinue} className="bg-brand-600 text-white shadow-sm hover:bg-brand-500">
                  Continue <ArrowRight className="size-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 2b — Company details (KYB, business) */}
          {step === 1 && accountType === "corporate" && (
            <div className="space-y-5">
              <div>
                <h3 className="text-lg font-semibold text-white">Company details</h3>
                <p className="mt-1 text-sm text-navy-300">Registered company information for your business account.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="legalName" className="text-navy-100">Legal company name</Label>
                <Input
                  id="legalName"
                  required
                  placeholder="Acme Ltd"
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  className="border-white/10 bg-white/5 text-white placeholder:text-navy-500"
                />
                {errors.legalName && <p className="text-xs text-red-400">{errors.legalName}</p>}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="regNumber" className="text-navy-100">Registration number</Label>
                  <Input
                    id="regNumber"
                    required
                    placeholder="e.g. 12345678"
                    value={regNumber}
                    onChange={(e) => setRegNumber(e.target.value)}
                    className="border-white/10 bg-white/5 text-white placeholder:text-navy-500"
                  />
                  {errors.regNumber && <p className="text-xs text-red-400">{errors.regNumber}</p>}
                </div>
                <div className="space-y-2">
                  <Label className="text-navy-100">Country of incorporation</Label>
                  <Select value={incorpCountry} onValueChange={setIncorpCountry}>
                    <SelectTrigger className="w-full border-white/10 bg-white/5 text-white">
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {COUNTRIES.map((c) => (
                        <SelectItem key={c.alpha2} value={c.alpha2}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.incorpCountry && <p className="text-xs text-red-400">{errors.incorpCountry}</p>}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="entityType" className="text-navy-100">Entity type <span className="text-navy-400">(optional)</span></Label>
                  <Input
                    id="entityType"
                    placeholder="e.g. LLC, PLC"
                    value={entityType}
                    onChange={(e) => setEntityType(e.target.value)}
                    className="border-white/10 bg-white/5 text-white placeholder:text-navy-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="industry" className="text-navy-100">Industry <span className="text-navy-400">(optional)</span></Label>
                  <Input
                    id="industry"
                    placeholder="e.g. Technology"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="border-white/10 bg-white/5 text-white placeholder:text-navy-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="regAddress" className="text-navy-100">Registered address</Label>
                <Input
                  id="regAddress"
                  required
                  placeholder="Street, city, postcode"
                  value={regAddress}
                  onChange={(e) => setRegAddress(e.target.value)}
                  className="border-white/10 bg-white/5 text-white placeholder:text-navy-500"
                />
                {errors.regAddress && <p className="text-xs text-red-400">{errors.regAddress}</p>}
              </div>

              <Alert variant="info" className="border-sky-400/30 bg-sky-500/10 text-sky-200">
                <Info className="size-4" />
                <AlertDescription className="text-sky-200/80">
                  We verify your company with Didit (KYB) — registry check, AML screening and key-people
                  verification. Authorised signatory verification happens after sign-up.
                </AlertDescription>
              </Alert>

              <div className="flex justify-between">
                <Button type="button" variant="ghost" onClick={() => { setErrors({}); setStep(0); }} className="text-navy-300 hover:bg-white/5 hover:text-white">
                  <ArrowLeft className="size-4" /> Back
                </Button>
                <Button type="button" onClick={handleContinue} className="bg-brand-600 text-white shadow-sm hover:bg-brand-500">
                  Continue <ArrowRight className="size-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3 — Review */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-lg font-semibold text-white">Review & create</h3>
                <p className="mt-1 text-sm text-navy-300">Please confirm everything is correct before creating your account.</p>
              </div>

              <div className="grid gap-x-6 gap-y-3 rounded-xl border border-white/10 bg-white/5 p-4 sm:grid-cols-2">
                {reviewRows.map((row) => (
                  <div key={row.label} className="space-y-0.5">
                    <Label className="text-xs text-navy-400">{row.label}</Label>
                    <p className="text-sm text-navy-100">{row.value}</p>
                  </div>
                ))}
              </div>

              <Alert variant="info" className="border-sky-400/30 bg-sky-500/10 text-sky-200">
                <Info className="size-4" />
                <AlertDescription className="text-sky-200/80">
                  By submitting you confirm the information is accurate and consent to identity verification
                  in line with our KYC and AML obligations.
                </AlertDescription>
              </Alert>

              {error && (
                <Alert variant="destructive" className="border-red-400/30 bg-red-500/10 text-red-200">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex justify-between">
                <Button type="button" variant="ghost" onClick={() => { setErrors({}); setStep(1); }} className="text-navy-300 hover:bg-white/5 hover:text-white">
                  <ArrowLeft className="size-4" /> Back
                </Button>
                <Button type="submit" size="lg" className="bg-brand-600 text-white shadow-sm hover:bg-brand-500" disabled={loading || !supabaseConfigured}>
                  {loading ? "Creating account…" : "Create account"}
                  {!loading && <ArrowRight className="size-4" />}
                </Button>
              </div>
            </div>
          )}
        </form>

        <p className="mt-6 text-center text-sm text-navy-400">
          Already have an account?{" "}
          <Link href="/sign-in" className="font-medium text-brand-300 hover:text-brand-200">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen flex-col bg-navy-950">
      <div className="flex items-center justify-between px-6 py-5">
        <Link href="/" aria-label="Back to home">
          <Logo dark />
        </Link>
        <Badge variant="neutral" className="hidden border-white/10 bg-white/5 text-navy-300 sm:inline-flex">
          KYC-compliant onboarding
        </Badge>
      </div>

      <div className="flex flex-1 items-start justify-center px-4 pb-16 pt-4 sm:items-center sm:pt-0">
        <div className="w-full max-w-md">
          <Suspense>
            <SignUpForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
