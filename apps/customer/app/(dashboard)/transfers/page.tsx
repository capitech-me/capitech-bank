import { getAccounts } from "@/lib/data";
import { TransferForm } from "@/components/transfer-form";

export default async function TransfersPage() {
  const accounts = await getAccounts();

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Transfers</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Internal transfers settle instantly. External payments are sandbox-simulated.
        </p>
      </div>
      <TransferForm accounts={accounts} />
    </div>
  );
}
