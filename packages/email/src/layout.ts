/**
 * Capitech Bank — branded email layout (inline styles, email-client safe).
 */

export interface EmailLayoutOptions {
  title: string;
  preheader?: string;
  bodyHtml: string;
}

const BRAND = {
  navy: "#0b1220",
  blue: "#2557eb",
  teal: "#14b8a6",
  muted: "#64748b",
  bg: "#f1f5f9",
  white: "#ffffff",
};

export function emailLayout({ title, preheader, bodyHtml }: EmailLayoutOptions): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:${BRAND.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${preheader}</div>` : ""}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BRAND.bg};padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:${BRAND.white};border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(11,18,32,0.08);">
          <!-- Header -->
          <tr>
            <td style="background-color:${BRAND.navy};padding:28px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="color:${BRAND.white};font-size:20px;font-weight:700;letter-spacing:-0.02em;">
                      Capitech<span style="color:#6096fa;"> Bank</span>
                    </span>
                  </td>
                  <td align="right">
                    <span style="color:#8797af;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;">Banking beyond borders</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:36px 32px;color:#0b1220;font-size:15px;line-height:1.6;">
              ${bodyHtml}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:${BRAND.bg};padding:20px 32px;">
              <p style="margin:0 0 8px 0;color:${BRAND.muted};font-size:12px;line-height:1.5;">
                This is a transactional message from Capitech Bank. Please do not reply to this email.
              </p>
              <p style="margin:0;color:${BRAND.muted};font-size:12px;">
                Need help? Contact <a href="mailto:support@capitech.me" style="color:${BRAND.blue};text-decoration:none;">support@capitech.me</a>
              </p>
              <p style="margin:12px 0 0 0;color:#94a3b8;font-size:11px;">
                © ${new Date().getFullYear()} Capitech Bank · capitech.me
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Inline helper for a CTA button block. */
export function ctaButton(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
    <tr>
      <td style="border-radius:8px;background-color:${BRAND.blue};">
        <a href="${href}" style="display:inline-block;padding:12px 28px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;">${label}</a>
      </td>
    </tr>
  </table>`;
}

/** Inline key/value row used in transaction summaries. */
export function kvRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:6px 0;color:${BRAND.muted};font-size:13px;width:45%;">${label}</td>
    <td style="padding:6px 0;color:#0b1220;font-size:13px;font-weight:600;text-align:right;">${value}</td>
  </tr>`;
}

export { BRAND };
