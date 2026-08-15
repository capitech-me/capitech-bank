import { getAccounts, getCards } from "@/lib/data";
import { CardsManager } from "@/components/cards-manager";

export default async function CardsPage() {
  const [cards, accounts] = await Promise.all([getCards(), getAccounts()]);
  const defaultAccountId = accounts[0]?.id ?? "";

  return <CardsManager cards={cards} defaultAccountId={defaultAccountId} />;
}
