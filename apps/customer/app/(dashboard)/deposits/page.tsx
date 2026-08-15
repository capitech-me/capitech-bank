import { getAccounts, getDeposits } from "@/lib/data";
import { DepositsManager } from "@/components/deposits-manager";

export default async function DepositsPage() {
  const [deposits, accounts] = await Promise.all([getDeposits(), getAccounts()]);
  return <DepositsManager deposits={deposits} accountId={accounts[0]?.id ?? ""} />;
}
