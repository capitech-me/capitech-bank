import { FileDown, FileText, Wallet } from "lucide-react";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@capitech/ui";
import { formatMoney, maskIban } from "@capitech/lib";
import { getAccounts } from "@/lib/data";

export default async function StatementsPage() {
  const accounts = await getAccounts();

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Statements</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Download your account statements as PDF or CSV — perfect for records, accounting and tax.
        </p>
      </div>

      {accounts.length === 0 ? (
        <Card>
          <CardContent className="py-14 text-center">
            <FileText className="mx-auto size-10 text-muted-foreground" />
            <h3 className="mt-4 font-semibold text-white">No accounts yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">Open an account to generate statements.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {accounts.map((account) => (
            <Card key={account.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Wallet className="size-4 text-brand-400" />
                  {account.nickname ?? account.productName}
                </CardTitle>
                <CardDescription>
                  {account.productName} · {account.currency} · {maskIban(account.iban)}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Current balance</span>
                  <span className="text-lg font-bold text-navy-100">
                    {formatMoney(account.availableBalance, account.currency)}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Button asChild variant="outline">
                    <a href={`/app/api/statements/${account.id}?format=pdf`}>
                      <FileDown className="size-4" /> PDF
                    </a>
                  </Button>
                  <Button asChild variant="outline">
                    <a href={`/app/api/statements/${account.id}?format=csv`}>
                      <FileText className="size-4" /> CSV
                    </a>
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Last 30 days by default · <Badge variant="info" className="align-middle">Sandbox data</Badge>
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
