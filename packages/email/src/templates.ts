/**
 * Capitech Bank — transactional email templates.
 * Each template returns a full HTML document via the shared layout.
 */

import { ctaButton, emailLayout, kvRow } from "./layout";

/* ------------------------------------------------ Auth / welcome */

export function welcomeEmail(opts: { firstName: string; lastName?: string }): string {
  return emailLayout({
    title: "Welcome to Capitech Bank",
    preheader: "Your digital bank account is on its way.",
    bodyHtml: `
      <h1 style="margin:0 0 12px 0;font-size:22px;letter-spacing:-0.02em;">Welcome to Capitech Bank 👋</h1>
      <p style="margin:0 0 16px 0;">Hi ${opts.firstName}, thanks for choosing Capitech Bank.</p>
      <p style="margin:0 0 16px 0;">Your account application has been received. Here is what happens next:</p>
      <ol style="margin:0 0 20px 0;padding-left:20px;">
        <li style="margin-bottom:8px;">Complete your identity verification (KYC) in the app.</li>
        <li style="margin-bottom:8px;">Open your first multi-currency account — it takes seconds.</li>
        <li style="margin-bottom:8px;">Create a virtual card and start spending online.</li>
      </ol>
      ${ctaButton("https://online.capitech.me/app/onboarding", "Continue onboarding")}
      <p style="margin:0;color:#64748b;font-size:13px;">Questions? Our support team is here 24/7 at <a href="mailto:support@capitech.me" style="color:#2557eb;">support@capitech.me</a>.</p>
    `,
  });
}

/* ------------------------------------------------ KYC lifecycle */

function kycBody(status: string, firstName: string, detail: string): string {
  const headline =
    status === "approved"
      ? "Your identity is verified ✅"
      : status === "declined"
        ? "Identity verification not successful"
        : status === "review"
          ? "Verification in review"
          : status === "resubmit"
            ? "Action needed — re-verify your identity"
            : "Re-verification required";
  const tone =
    status === "approved"
      ? "#065f46"
      : status === "declined"
        ? "#b91c1c"
        : "#1e40af";
  return `
    <h1 style="margin:0 0 12px 0;font-size:22px;color:${tone};letter-spacing:-0.02em;">${headline}</h1>
    <p style="margin:0 0 12px 0;">Hi ${firstName},</p>
    <p style="margin:0 0 16px 0;">${detail}</p>
  `;
}

export function kycEmail(opts: {
  status: "approved" | "declined" | "review" | "resubmit" | "expired";
  firstName: string;
}): string {
  const copy: Record<string, string> = {
    approved:
      "Great news — your identity verification was approved. All features are now unlocked: multi-currency accounts, virtual cards, term deposits and more.",
    declined:
      "Unfortunately we could not verify your identity with the information provided. Please start a new verification with clear, valid documents.",
    review:
      "Your identity verification has been submitted and is now being reviewed by our compliance team. We will notify you as soon as a decision is made.",
    resubmit:
      "Some of your verification documents need to be resubmitted. Please open the app and start a new verification session with the correct documents.",
    expired:
      "Your previous identity verification has expired in line with our security policy. Please re-verify your identity to keep your account fully active.",
  };
  return emailLayout({
    title: "Capitech Bank — identity verification update",
    preheader: "An update on your identity verification.",
    bodyHtml: `
      ${kycBody(opts.status, opts.firstName, copy[opts.status])}
      ${opts.status === "approved" ? "" : ctaButton("https://online.capitech.me/app/profile", "Go to verification")}
      <p style="margin:0;color:#64748b;font-size:13px;">If you have any questions, contact <a href="mailto:support@capitech.me" style="color:#2557eb;">support@capitech.me</a>.</p>
    `,
  });
}

/* ------------------------------------------------ Transfers */

export function transferEmail(opts: {
  direction: "sent" | "received";
  firstName: string;
  amount: string;
  currency: string;
  counterparty: string;
  reference: string;
  date: string;
}): string {
  const title =
    opts.direction === "sent" ? `You sent ${opts.amount} ${opts.currency}` : `You received ${opts.amount} ${opts.currency}`;
  return emailLayout({
    title,
    preheader: title,
    bodyHtml: `
      <h1 style="margin:0 0 12px 0;font-size:22px;letter-spacing:-0.02em;">${opts.direction === "sent" ? "Transfer sent" : "Transfer received"}</h1>
      <p style="margin:0 0 20px 0;">Hi ${opts.firstName}, here are the details of your ${opts.direction === "sent" ? "outgoing" : "incoming"} transfer:</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:8px;padding:16px 20px;margin-bottom:20px;">
        <tr>${kvRow("Amount", `${opts.amount} ${opts.currency}`)}</tr>
        <tr>${kvRow("Date", opts.date)}</tr>
        <tr>${kvRow("Counterparty", opts.counterparty)}</tr>
        <tr>${kvRow("Reference", opts.reference)}</tr>
      </table>
      ${ctaButton("https://online.capitech.me/app/accounts", "View your accounts")}
    `,
  });
}

/* ------------------------------------------------ Deposits */

export function depositEmail(opts: {
  firstName: string;
  principal: string;
  currency: string;
  rate: string;
  termDays: number;
  maturityDate: string;
}): string {
  return emailLayout({
    title: "Term deposit opened",
    preheader: "Your term deposit is earning interest.",
    bodyHtml: `
      <h1 style="margin:0 0 12px 0;font-size:22px;letter-spacing:-0.02em;">Term deposit opened 🎉</h1>
      <p style="margin:0 0 16px 0;">Hi ${opts.firstName}, your fixed-term deposit is now active:</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:8px;padding:16px 20px;margin-bottom:20px;">
        <tr>${kvRow("Principal", `${opts.principal} ${opts.currency}`)}</tr>
        <tr>${kvRow("Interest rate", `${opts.rate}% p.a.`)}</tr>
        <tr>${kvRow("Term", `${opts.termDays} days`)}</tr>
        <tr>${kvRow("Matures", opts.maturityDate)}</tr>
      </table>
      ${ctaButton("https://online.capitech.me/app/deposits", "Manage your deposits")}
    `,
  });
}

export function depositMaturedEmail(opts: {
  firstName: string;
  principal: string;
  currency: string;
  interest: string;
  total: string;
}): string {
  return emailLayout({
    title: "Your term deposit has matured",
    preheader: "Funds returned with interest.",
    bodyHtml: `
      <h1 style="margin:0 0 12px 0;font-size:22px;letter-spacing:-0.02em;">Deposit matured 💰</h1>
      <p style="margin:0 0 16px 0;">Hi ${opts.firstName}, your term deposit has matured. The funds have been returned to your account:</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:8px;padding:16px 20px;margin-bottom:20px;">
        <tr>${kvRow("Principal", `${opts.principal} ${opts.currency}`)}</tr>
        <tr>${kvRow("Interest earned", `${opts.interest} ${opts.currency}`)}</tr>
        <tr>${kvRow("Total returned", `${opts.total} ${opts.currency}`)}</tr>
      </table>
    `,
  });
}

/* ------------------------------------------------ Cards */

export function cardEmail(opts: { firstName: string; last4: string; brand: string }): string {
  return emailLayout({
    title: "Your new virtual card",
    preheader: "A virtual card was issued to your account.",
    bodyHtml: `
      <h1 style="margin:0 0 12px 0;font-size:22px;letter-spacing:-0.02em;">Virtual card issued 💳</h1>
      <p style="margin:0 0 16px 0;">Hi ${opts.firstName}, a new ${opts.brand} virtual card ending <strong>${opts.last4}</strong> was issued to your account. It is ready for online use.</p>
      <p style="margin:0 0 16px 0;color:#64748b;font-size:13px;">Tip: set a spending limit and freeze the card anytime from the Cards screen.</p>
      ${ctaButton("https://online.capitech.me/app/cards", "Manage your cards")}
    `,
  });
}

/* ------------------------------------------------ Security */

export function securityEmail(opts: { firstName: string; event: string; date: string }): string {
  return emailLayout({
    title: "Security alert — Capitech Bank",
    preheader: "Important update about your account security.",
    bodyHtml: `
      <h1 style="margin:0 0 12px 0;font-size:22px;color:#1e40af;letter-spacing:-0.02em;">Security alert 🔒</h1>
      <p style="margin:0 0 12px 0;">Hi ${opts.firstName},</p>
      <p style="margin:0 0 16px 0;">${opts.event} on ${opts.date}.</p>
      <p style="margin:0 0 16px 0;color:#64748b;font-size:13px;">If this was you, no action is needed. If you don't recognise this activity, contact us immediately at <a href="mailto:support@capitech.me" style="color:#2557eb;">support@capitech.me</a>.</p>
    `,
  });
}

/* ------------------------------------------------ Corporate team invite */

export function teamInviteEmail(opts: {
  firstName: string;
  orgName: string;
  roleTitle: string;
  inviterName?: string;
}): string {
  return emailLayout({
    title: `You've been added to ${opts.orgName}`,
    preheader: "Corporate banking team invitation.",
    bodyHtml: `
      <h1 style="margin:0 0 12px 0;font-size:22px;letter-spacing:-0.02em;">Welcome to the team 🏦</h1>
      <p style="margin:0 0 16px 0;">Hi ${opts.firstName},</p>
      <p style="margin:0 0 16px 0;">
        You have been added to <strong>${opts.orgName}</strong> as <strong>${opts.roleTitle}</strong>${opts.inviterName ? ` by ${opts.inviterName}` : ""}.
        Sign in to your Capitech Bank account to access your corporate banking dashboard.
      </p>
      ${ctaButton("https://online.capitech.me/app", "Open your dashboard")}
      <p style="margin:0;color:#64748b;font-size:13px;">If you don't recognise this invitation, contact <a href="mailto:support@capitech.me" style="color:#2557eb;">support@capitech.me</a>.</p>
    `,
  });
}

/* ------------------------------------------------ Statements */

export function statementReadyEmail(opts: {
  firstName: string;
  accountLabel: string;
  period: string;
  url: string;
}): string {
  return emailLayout({
    title: "Your statement is ready",
    preheader: "Download your latest account statement.",
    bodyHtml: `
      <h1 style="margin:0 0 12px 0;font-size:22px;letter-spacing:-0.02em;">Statement ready 📄</h1>
      <p style="margin:0 0 16px 0;">Hi ${opts.firstName}, your statement for <strong>${opts.accountLabel}</strong> (${opts.period}) is ready to download.</p>
      ${ctaButton(opts.url, "Download statement")}
    `,
  });
}
