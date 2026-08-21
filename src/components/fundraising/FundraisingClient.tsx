"use client";

import { useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Send,
  Download,
  AlertTriangle,
  Utensils,
  Heart,
  Building2,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Scale,
} from "lucide-react";
import { EventFormModal, type EditableEvent } from "./EventFormModal";
import { DonorFormModal, type EditableDonor } from "./DonorFormModal";
import { LogDonationModal, type DonorOption, type EventOption } from "./LogDonationModal";
import { PurchaseFormModal, type CatalogItem, type EditablePurchase } from "./PurchaseFormModal";
import { BudgetCharts, type MonthlyPoint, type CategoryPoint, type EventNetPoint } from "./BudgetCharts";
import { deleteEvent } from "@/app/(app)/fundraising/event-actions";
import { deleteDonor } from "@/app/(app)/fundraising/donor-actions";
import { deletePurchase } from "@/app/(app)/fundraising/purchase-actions";
import { updateLowBalanceThreshold } from "@/app/(app)/fundraising/settings-actions";

type Tab = "overview" | "events" | "donors" | "purchases";

export type DonorRow = EditableDonor & { totalGiven: number };
export type PurchaseRow = {
  id: number;
  description: string;
  category: string;
  totalAmount: number;
  taxAmount: number;
  purchasedAt: string;
  lineItemSummary: string;
  receiptImage: string | null;
  lineItems: Array<{
    itemId: number | null;
    itemName: string;
    category: string;
    quantityPurchased: number;
    lineTotal: number | null;
  }>;
};
export type RestaurantPartnerRow = { name: string; totalRaised: number; nightCount: number };
export type CompanyItemDonationRow = {
  donorId: number;
  name: string;
  donorType: string;
  items: Array<{ itemName: string; totalQuantity: number }>;
};

export function FundraisingClient({
  events,
  donors,
  itemDonations,
  purchases,
  catalogItems,
  budget,
  monthly,
  categories,
  eventNet,
  restaurantPartners,
}: {
  events: EditableEvent[];
  donors: DonorRow[];
  itemDonations: CompanyItemDonationRow[];
  purchases: PurchaseRow[];
  catalogItems: CatalogItem[];
  budget: {
    totalRaised: number;
    totalSpent: number;
    netBalance: number;
    costPerKit: number | null;
    lowBalanceThreshold: number;
  };
  monthly: MonthlyPoint[];
  categories: CategoryPoint[];
  eventNet: EventNetPoint[];
  restaurantPartners: RestaurantPartnerRow[];
}) {
  const [tab, setTab] = useState<Tab>("overview");
  const [eventTarget, setEventTarget] = useState<EditableEvent | null | "new">(null);
  const [donorTarget, setDonorTarget] = useState<EditableDonor | null | "new">(null);
  const [donationModalOpen, setDonationModalOpen] = useState(false);
  const [purchaseTarget, setPurchaseTarget] = useState<EditablePurchase | null | "new">(null);
  const [deleteEventTarget, setDeleteEventTarget] = useState<EditableEvent | null>(null);
  const [deleteDonorTarget, setDeleteDonorTarget] = useState<DonorRow | null>(null);
  const [deletePurchaseTarget, setDeletePurchaseTarget] = useState<PurchaseRow | null>(null);
  const [thresholdInput, setThresholdInput] = useState(String(budget.lowBalanceThreshold));

  const donorOptions: DonorOption[] = donors.map((d) => ({
    id: d.id,
    name: d.name,
    isAnonymous: d.isAnonymous,
    donorType: d.donorType,
  }));
  const eventOptions: EventOption[] = events.map((e) => ({ id: e.id, name: e.name }));

  const isLow = budget.netBalance < budget.lowBalanceThreshold;

  return (
    <div>
      {/* Budget summary — always visible regardless of tab */}
      <div className="pop-card bg-paper-raised rounded-2xl grid grid-cols-2 lg:grid-cols-4 mb-6 divide-x-2 divide-ink [&>div:nth-child(n+3)]:border-t-2 [&>div:nth-child(n+3)]:border-ink lg:[&>div:nth-child(n+3)]:border-t-0">
        <div className="p-5">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-ink-soft mb-2">
            <TrendingUp className="w-3.5 h-3.5 text-sage-dark" />
            Raised
          </p>
          <p className="font-mono tabular text-2xl text-sage-dark">
            ${budget.totalRaised.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="p-5">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-ink-soft mb-2">
            <TrendingDown className="w-3.5 h-3.5 text-brick-dark" />
            Spent
          </p>
          <p className="font-mono tabular text-2xl text-brick-dark">
            ${budget.totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="p-5">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-ink-soft mb-2">
            <Scale className="w-3.5 h-3.5 text-ink" />
            Net balance
            {isLow && <AlertTriangle className="w-3.5 h-3.5 text-brick" />}
          </p>
          <p className={`font-mono tabular text-2xl ${isLow ? "text-brick" : "text-ink"}`}>
            ${budget.netBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="p-5">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-ink-soft mb-2">
            <Heart className="w-3.5 h-3.5 text-ochre-dark" />
            Cost per kit
          </p>
          <p className="font-mono tabular text-2xl text-ink">
            {budget.costPerKit !== null ? `$${budget.costPerKit.toFixed(2)}` : "—"}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 border-b-2 border-ink">
        {(["overview", "events", "donors", "purchases"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 -mb-px transition-colors ${
              tab === t
                ? "border-brick text-brick"
                : "border-transparent text-ink-soft hover:text-ink"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-ink-soft">
              Warn me when net balance drops below
            </p>
            <form
              className="flex items-center gap-2"
              onSubmit={async (e) => {
                e.preventDefault();
                await updateLowBalanceThreshold(Number(thresholdInput));
              }}
            >
              <span className="text-ink-soft">$</span>
              <input
                type="number"
                min={0}
                value={thresholdInput}
                onChange={(e) => setThresholdInput(e.target.value)}
                className="w-24 rounded-md border border-line bg-paper px-2 py-1 text-sm text-ink font-mono tabular"
              />
              <button
                type="submit"
                className="text-sm text-brick hover:text-brick-dark font-medium"
              >
                Save
              </button>
            </form>
          </div>

          <BudgetCharts monthly={monthly} categories={categories} eventNet={eventNet} />

          {restaurantPartners.length > 0 && (
            <div className="pop-card bg-paper-raised rounded-2xl p-5">
              <h3 className="font-display text-lg text-ink mb-4 flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-[10px] bg-brick-soft border-2 border-ink flex items-center justify-center shrink-0">
                  <Utensils className="w-4 h-4 text-brick-dark" />
                </span>
                Restaurant partners
              </h3>
              <ul className="space-y-2.5">
                {restaurantPartners.map((r) => (
                  <li
                    key={r.name}
                    className="flex items-center justify-between text-sm bg-paper border border-line rounded-xl px-3.5 py-3"
                  >
                    <div>
                      <p className="text-ink font-bold">{r.name}</p>
                      <p className="text-xs text-ink-soft">
                        {r.nightCount} night{r.nightCount === 1 ? "" : "s"} hosted
                      </p>
                    </div>
                    <span className="font-mono tabular text-sage-dark">
                      ${r.totalRaised.toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {tab === "events" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-ink-soft">
              {events.length} event{events.length === 1 ? "" : "s"}
            </p>
            <button
              onClick={() => setEventTarget("new")}
              className="flex items-center gap-2 bg-brick text-paper-raised border-2 border-ink rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wide hover:bg-brick-dark transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add event
            </button>
          </div>

          {events.length === 0 ? (
            <div className="hang-tag hang-tag--ochre p-6 bg-paper-raised text-center">
              <p className="text-ink-soft">No events yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {events.map((ev) => (
                <div
                  key={ev.id}
                  className="pop-card bg-paper-raised rounded-2xl p-5"
                >
                  <div className="flex items-start justify-between mb-1">
                    <div>
                      <h3 className="font-display text-lg text-ink">{ev.name}</h3>
                      <p className="text-xs text-ink-soft capitalize">
                        {ev.type.replace("_", " ")} · {ev.eventDate}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEventTarget(ev)}
                        aria-label={`Edit ${ev.name}`}
                        className="text-ink-soft hover:text-ink p-1.5 rounded hover:bg-paper"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteEventTarget(ev)}
                        aria-label={`Delete ${ev.name}`}
                        className="text-ink-soft hover:text-danger p-1.5 rounded hover:bg-paper"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 text-sm">
                    <p className="text-xs text-ink-soft">
                      {ev.type === "restaurant_night" ? "Amount given" : "Raised"}
                    </p>
                    <p className="font-mono tabular text-sage text-lg">
                      ${ev.amountRaised.toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "donors" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-ink-soft">
              {donors.length} donor{donors.length === 1 ? "" : "s"} · {itemDonations.length} with item
              donations
            </p>
            <div className="flex items-center gap-3">
              <a
                href="/api/export/donations"
                className="flex items-center gap-2 text-sm text-ink-soft hover:text-ink"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </a>
              <button
                onClick={() => setDonationModalOpen(true)}
                className="flex items-center gap-2 border-2 border-ink text-brick-dark bg-paper-raised rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wide hover:bg-brick hover:text-paper-raised transition-colors"
              >
                <Send className="w-4 h-4" />
                Log donation
              </button>
              <button
                onClick={() => setDonorTarget("new")}
                className="flex items-center gap-2 bg-brick text-paper-raised border-2 border-ink rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wide hover:bg-brick-dark transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add donor
              </button>
            </div>
          </div>

          <h3 className="font-display text-base text-ink mb-1 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-sage" />
            Monetary donations
          </h3>
          <p className="text-xs text-ink-soft mb-3">Every donor on file, and what they&apos;ve given in cash/check/online.</p>
          {donors.length === 0 ? (
            <div className="hang-tag hang-tag--ochre p-6 bg-paper-raised text-center mb-8">
              <p className="text-ink-soft">No donors yet.</p>
            </div>
          ) : (
            <div className="pop-card bg-paper-raised rounded-2xl overflow-hidden mb-8">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-paper border-b-2 border-ink text-left text-ink-soft">
                    <th className="px-4 py-2.5 font-bold text-xs uppercase tracking-wide">Donor</th>
                    <th className="px-4 py-2.5 font-bold text-xs uppercase tracking-wide">Type</th>
                    <th className="px-4 py-2.5 font-bold text-xs uppercase tracking-wide">Contact</th>
                    <th className="px-4 py-2.5 font-bold text-xs uppercase tracking-wide">Total given ($)</th>
                    <th className="px-4 py-2.5 font-bold text-xs uppercase tracking-wide text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {donors.map((d) => (
                    <tr key={d.id} className="border-b border-line last:border-0">
                      <td className="px-4 py-3 text-ink font-medium flex items-center gap-1.5">
                        {d.isAnonymous && <Heart className="w-3.5 h-3.5 text-brick" />}
                        {d.isAnonymous ? "Anonymous donor" : d.name}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-full border-[1.5px] ${
                            d.donorType === "company"
                              ? "bg-ochre-soft border-ochre-dark text-ochre-dark"
                              : "bg-sage-soft border-sage-dark text-sage-dark"
                          }`}
                        >
                          {d.donorType === "company" ? "Company" : "Individual"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-ink-soft">
                        {d.email || d.phone || "—"}
                      </td>
                      <td className="px-4 py-3 font-mono tabular text-ink">
                        {d.totalGiven > 0 ? `$${d.totalGiven.toFixed(2)}` : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setDonorTarget(d)}
                            aria-label={`Edit ${d.name ?? "donor"}`}
                            className="text-ink-soft hover:text-ink p-1.5 rounded hover:bg-paper"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteDonorTarget(d)}
                            aria-label={`Delete ${d.name ?? "donor"}`}
                            className="text-ink-soft hover:text-danger p-1.5 rounded hover:bg-paper"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <h3 className="font-display text-base text-ink mb-1 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-brick" />
            Item donations
          </h3>
          <p className="text-xs text-ink-soft mb-3">
            Anyone — individual or company — who has donated physical items, and exactly what they gave.
          </p>
          {itemDonations.length === 0 ? (
            <div className="hang-tag hang-tag--ochre p-6 bg-paper-raised text-center">
              <p className="text-ink-soft">
                No item donations logged yet. Log a donation with type
                &quot;Item donation&quot; to see it broken down here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {itemDonations.map((c) => (
                <div key={c.donorId} className="hang-tag hang-tag--sage p-4 bg-paper-raised">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-ink font-medium">{c.name}</p>
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-full border-[1.5px] ${
                        c.donorType === "company"
                          ? "bg-ochre-soft border-ochre-dark text-ochre-dark"
                          : "bg-sage-soft border-sage-dark text-sage-dark"
                      }`}
                    >
                      {c.donorType === "company" ? "Company" : "Individual"}
                    </span>
                  </div>
                  <ul className="text-sm text-ink-soft space-y-1">
                    {c.items.map((item) => (
                      <li key={item.itemName} className="flex justify-between">
                        <span>{item.itemName}</span>
                        <span className="font-mono tabular">x{item.totalQuantity}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "purchases" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-ink-soft">
              {purchases.length} purchase{purchases.length === 1 ? "" : "s"} logged
            </p>
            <div className="flex items-center gap-3">
              <a
                href="/api/export/purchases"
                className="flex items-center gap-2 text-sm text-ink-soft hover:text-ink"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </a>
              <button
                onClick={() => setPurchaseTarget("new")}
                className="flex items-center gap-2 bg-brick text-paper-raised border-2 border-ink rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wide hover:bg-brick-dark transition-colors"
              >
                <Plus className="w-4 h-4" />
                Log purchase
              </button>
            </div>
          </div>

          {purchases.length === 0 ? (
            <div className="hang-tag hang-tag--ochre p-6 bg-paper-raised text-center">
              <p className="text-ink-soft">No purchases logged yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {purchases.map((p) => (
                <div
                  key={p.id}
                  className="hang-tag hang-tag--ochre p-4 flex items-start gap-4"
                >
                  {p.receiptImage && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.receiptImage}
                      alt="Receipt"
                      className="w-14 h-14 object-cover rounded-md border border-line shrink-0"
                    />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-ink font-medium">{p.description}</p>
                      <p className="font-mono tabular text-ochre">
                        ${p.totalAmount.toFixed(2)}
                      </p>
                    </div>
                    <p className="text-xs text-ink-soft mt-0.5">
                      {p.category} · {p.purchasedAt}
                      {p.taxAmount > 0 && ` · $${p.taxAmount.toFixed(2)} tax`}
                    </p>
                    <p className="text-xs text-ink-soft mt-1">{p.lineItemSummary}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() =>
                        setPurchaseTarget({
                          id: p.id,
                          description: p.description,
                          category: p.category,
                          purchasedAt: p.purchasedAt,
                          notes: null,
                          receiptImage: p.receiptImage,
                          taxAmount: p.taxAmount,
                          lineItems: p.lineItems,
                        })
                      }
                      aria-label={`Edit purchase ${p.description}`}
                      className="text-ink-soft hover:text-ink p-1.5 rounded hover:bg-paper-raised"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeletePurchaseTarget(p)}
                      aria-label={`Delete purchase ${p.description}`}
                      className="text-ink-soft hover:text-danger p-1.5 rounded hover:bg-paper-raised"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {eventTarget !== null && (
        <EventFormModal
          event={eventTarget === "new" ? null : eventTarget}
          onClose={() => setEventTarget(null)}
        />
      )}

      {donorTarget !== null && (
        <DonorFormModal
          donor={donorTarget === "new" ? null : donorTarget}
          onClose={() => setDonorTarget(null)}
        />
      )}

      {donationModalOpen && (
        <LogDonationModal
          donorOptions={donorOptions}
          eventOptions={eventOptions}
          catalogItems={catalogItems}
          onClose={() => setDonationModalOpen(false)}
        />
      )}

      {purchaseTarget !== null && (
        <PurchaseFormModal
          purchase={purchaseTarget === "new" ? null : purchaseTarget}
          catalogItems={catalogItems}
          onClose={() => setPurchaseTarget(null)}
        />
      )}

      {deleteEventTarget && (
        <div
          className="fixed inset-0 bg-ink/30 flex items-center justify-center p-4 z-50"
          onClick={() => setDeleteEventTarget(null)}
        >
          <div
            className="bg-paper-raised rounded-2xl border-2 border-line w-full max-w-sm p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-display text-lg text-ink mb-2">
              Delete {deleteEventTarget.name}?
            </h2>
            <p className="text-sm text-ink-soft mb-5">This can&apos;t be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteEventTarget(null)}
                className="flex-1 rounded-md border border-line py-2 text-ink font-medium hover:bg-paper"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await deleteEvent(deleteEventTarget.id);
                  setDeleteEventTarget(null);
                }}
                className="flex-1 rounded-md bg-danger text-paper-raised py-2 font-medium hover:opacity-90"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteDonorTarget && (
        <div
          className="fixed inset-0 bg-ink/30 flex items-center justify-center p-4 z-50"
          onClick={() => setDeleteDonorTarget(null)}
        >
          <div
            className="bg-paper-raised rounded-2xl border-2 border-line w-full max-w-sm p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-display text-lg text-ink mb-2">
              Delete {deleteDonorTarget.isAnonymous ? "this donor" : deleteDonorTarget.name}?
            </h2>
            <p className="text-sm text-ink-soft mb-5">
              This removes the donor and their donation history. This can&apos;t be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteDonorTarget(null)}
                className="flex-1 rounded-md border border-line py-2 text-ink font-medium hover:bg-paper"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await deleteDonor(deleteDonorTarget.id);
                  setDeleteDonorTarget(null);
                }}
                className="flex-1 rounded-md bg-danger text-paper-raised py-2 font-medium hover:opacity-90"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {deletePurchaseTarget && (
        <div
          className="fixed inset-0 bg-ink/30 flex items-center justify-center p-4 z-50"
          onClick={() => setDeletePurchaseTarget(null)}
        >
          <div
            className="bg-paper-raised rounded-2xl border-2 border-line w-full max-w-sm p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-display text-lg text-ink mb-2">
              Delete this purchase?
            </h2>
            <p className="text-sm text-ink-soft mb-5">
              This reverses the inventory it added and removes it from your
              budget. This can&apos;t be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeletePurchaseTarget(null)}
                className="flex-1 rounded-md border border-line py-2 text-ink font-medium hover:bg-paper"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await deletePurchase(deletePurchaseTarget.id);
                  setDeletePurchaseTarget(null);
                }}
                className="flex-1 rounded-md bg-danger text-paper-raised py-2 font-medium hover:opacity-90"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
