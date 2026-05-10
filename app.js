const { useEffect, useMemo, useRef, useState } = React;

const STORAGE_RECEIPTS = "billbuddy_receipts_v1";
const STORAGE_SPLITS = "billbuddy_splits_v1";
const STORAGE_FRIENDS = "threshold_friends_v1";
const STORAGE_PLANS = "threshold_plans_v1";
const STORAGE_LINKED_PLAN = "threshold_linked_plan_v1";
const STORAGE_DEMO_SKIPPED = "sync_demo_skipped_v1";
const STORAGE_DEMO_COMPLETED = "sync_demo_completed_v1";

const APP_NAME = "Sync";
const SPLIT_NAME = "Sync Split";
const defaultFriends = ["Weng Yee", "Weng Yan", "Ken Meng", "Cherrie"];
const categories = ["Food", "Groceries", "Transport", "Study", "Entertainment", "Other"];
const activityTags = ["Food", "Sports", "Study", "Movie", "Cafe", "Entertainment", "Trip", "Other"];
const planIdeas = [
  {
    title: "Cafe study reset",
    location: "BookXcess Cafe",
    activityTag: "Cafe",
    budget: 18,
    minimumPeople: 3,
    description: "Quick study session with drinks after class. Unlock only if enough people are in.",
  },
  {
    title: "KBBQ Friday",
    location: "Solaris Mont Kiara",
    activityTag: "Food",
    budget: 45,
    minimumPeople: 4,
    description: "End the week with KBBQ. The plan only confirms when enough friends commit.",
  },
  {
    title: "Badminton Night",
    location: "School Sports Hall",
    activityTag: "Sports",
    budget: 12,
    minimumPeople: 3,
    description: "Casual badminton session after school. No pressure unless the threshold is met.",
  },
  {
    title: "Movie Night",
    location: "Pavilion Bukit Jalil",
    activityTag: "Entertainment",
    budget: 35,
    minimumPeople: 3,
    description: "Chill movie plan that unlocks when enough people say yes.",
  },
  {
    title: "Supper Run",
    location: "SS15",
    activityTag: "Food",
    budget: 20,
    minimumPeople: 4,
    description: "Late-night food run with friends. Only happens if the group is actually in.",
  },
];

const uid = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const nextFridayDate = () => {
  const date = new Date();
  const daysUntilFriday = (5 - date.getDay() + 7) % 7;
  date.setDate(date.getDate() + daysUntilFriday);
  return date.toISOString().slice(0, 10);
};
const demoPlanDraft = () => ({
  title: "KBBQ Friday",
  location: "Solaris Mont Kiara",
  date: nextFridayDate(),
  time: "19:30",
  budget: 45,
  minimumPeople: 4,
  activityTag: "Food",
  invitedFriends: [...defaultFriends],
  description: "End the week with KBBQ. The plan only confirms when enough friends commit.",
});
const createDemoPlan = () => {
  const draft = demoPlanDraft();
  return {
    ...draft,
    id: `demo-${uid()}`,
    votes: Object.fromEntries(draft.invitedFriends.map((friend) => [friend, "pending"])),
    confirmedAttendees: [],
    unlocked: false,
    status: "planning",
    demoRun: true,
    createdAt: new Date().toISOString(),
  };
};
const demoReceiptDrafts = (planId) => [
  {
    merchant: "KBBQ Solaris",
    total: 178.4,
    paidBy: "Ken Meng",
    items: [
      ["KBBQ Set", 89.8],
      ["Kimchi Stew", 34.9],
      ["Drinks", 53.7],
    ],
  },
  {
    merchant: "Dessert Shop",
    total: 42,
    paidBy: "Cherrie",
    items: [
      ["Ice Cream", 22],
      ["Waffle", 20],
    ],
  },
  {
    merchant: "Parking",
    total: 8,
    paidBy: "Weng Yee",
    items: [["Parking Fee", 8]],
  },
].map((receipt) => ({
  ...receipt,
  id: `demo-receipt-${uid()}`,
  planId,
  date: new Date().toISOString().slice(0, 10),
  category: "Food",
  image: "",
  demoRun: true,
  items: receipt.items.map(([name, price]) => ({ id: uid(), name, price, assigned: "" })),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}));
const money = (value) =>
  `RM${Number(value || 0).toLocaleString("en-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

function readStorage(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value || (typeof fallback === "function" ? fallback() : fallback);
  } catch {
    return typeof fallback === "function" ? fallback() : fallback;
  }
}

function useLocalStorage(key, fallback) {
  const [value, setValue] = useState(() => readStorage(key, fallback));
  useEffect(() => localStorage.setItem(key, JSON.stringify(value)), [key, value]);
  return [value, setValue];
}

function yesCount(plan) {
  return Object.values(plan.votes || {}).filter((vote) => vote === "yes").length;
}

function planIsUnlocked(plan) {
  return yesCount(plan) >= Number(plan.minimumPeople || 1);
}

function planStatus(plan) {
  if (plan.status === "ended") return "ended";
  if (plan.status === "happening") return "happening";
  if (planIsUnlocked(plan)) return "unlocked";
  return "planning";
}

function yesVoters(plan) {
  return (plan?.invitedFriends || []).filter((friend) => plan.votes?.[friend] === "yes");
}

function confirmedAttendees(plan) {
  return plan?.confirmedAttendees?.length ? plan.confirmedAttendees : yesVoters(plan);
}

function demoPlans() {
  const now = new Date().toISOString();
  return [
    {
      id: uid(),
      ...planIdeas[0],
      date: new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10),
      time: "16:30",
      invitedFriends: [...defaultFriends],
      votes: { "Weng Yee": "yes", "Weng Yan": "pending", "Ken Meng": "yes", Cherrie: "pending" },
      unlocked: false,
      createdAt: now,
    },
    {
      id: uid(),
      ...planIdeas[1],
      date: new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10),
      time: "19:30",
      invitedFriends: [...defaultFriends],
      votes: { "Weng Yee": "yes", "Weng Yan": "yes", "Ken Meng": "yes", Cherrie: "pending" },
      unlocked: false,
      createdAt: now,
    },
    {
      id: uid(),
      ...planIdeas[2],
      date: new Date(Date.now() + 86400000 * 5).toISOString().slice(0, 10),
      time: "20:00",
      invitedFriends: [...defaultFriends],
      votes: { "Weng Yee": "yes", "Weng Yan": "pending", "Ken Meng": "no", Cherrie: "yes" },
      unlocked: false,
      createdAt: now,
    },
  ];
}

function budgetComfort(budget) {
  const value = Number(budget || 0);
  if (value <= 20) return { label: "Easy Join", tone: "green", copy: "Lower budgets usually unlock faster." };
  if (value <= 50) return { label: "Comfortable", tone: "blue", copy: "Comfortable for most student outings." };
  if (value <= 80) return { label: "Consider First", tone: "amber", copy: "This might reduce turnout." };
  return { label: "High Budget", tone: "red", copy: "This might reduce turnout." };
}

function unlockChance(plan) {
  if (!plan) return { score: 0, copy: "Create a plan to estimate momentum." };
  const minimum = Math.max(1, Number(plan.minimumPeople || 1));
  const base = (yesCount(plan) / minimum) * 78;
  const budgetBonus = Number(plan.budget || 0) <= 30 ? 12 : Number(plan.budget || 0) <= 50 ? 6 : 0;
  const tagBonus = ["Food", "Cafe", "Study", "Sports"].includes(plan.activityTag) ? 10 : 4;
  const score = Math.min(100, Math.round(base + budgetBonus + tagBonus));
  const remaining = Math.max(0, minimum - yesCount(plan));
  const copy = score >= 80
    ? `Strong momentum${remaining ? ` — only ${remaining} more yes needed.` : " — the plan is ready."}`
    : score >= 50
      ? "Good chance — keep the plan simple and easy to join."
      : "Low momentum — invite more friends or reduce budget.";
  return { score, copy };
}

function aiPlanSuggestion(plan) {
  if (!plan) return "Create a plan and Sync will estimate what helps it sync.";
  const yes = yesCount(plan);
  const remaining = Math.max(0, Number(plan.minimumPeople || 1) - yes);
  if (planIsUnlocked(plan)) return "Plan synced. Add receipts after the outing and use Sync Split to reduce money friction.";
  if (Number(plan.budget || 0) <= 20) return "This budget looks easy to join for a student group.";
  if (["Food", "Cafe"].includes(plan.activityTag) && Number(plan.budget || 0) <= 50) return "Food and cafe plans usually unlock faster when the budget stays under RM50.";
  if (remaining <= 1) return "Your plan needs 1 more yes. Try nudging the friend who is still pending.";
  return "Friday after class has a higher chance of unlocking. Keep the location familiar and the budget comfortable.";
}

function socialStats(plans, receipts, splits, friends) {
  const unlocked = plans.filter(planIsUnlocked).length;
  const totalSplit = splits.reduce((sum, split) => sum + Number(split.total || 0), 0);
  return {
    unlocked,
    outings: receipts.length,
    totalSplit,
    friends: friends.length,
  };
}

function receiptPayers(receipts = []) {
  return receipts.map((receipt) => ({
    payer: receipt.paidBy || defaultFriends[0],
    merchant: receipt.merchant,
    total: Number(receipt.total || 0),
  }));
}

function personReceiptShares(personName, split, receipts = []) {
  if (!split || !personName) return [];
  if (split.mode === "items") {
    return receipts
      .map((receipt) => {
        const total = (receipt.items || [])
          .filter((item) => item.assigned === personName)
          .reduce((sum, item) => sum + Number(item.price || 0), 0);
        return { merchant: receipt.merchant, amount: total, paidBy: receipt.paidBy };
      })
      .filter((row) => row.amount > 0);
  }
  const count = Math.max(1, split.people.length);
  return receipts.map((receipt) => ({
    merchant: receipt.merchant,
    amount: Number(receipt.total || 0) / count,
    paidBy: receipt.paidBy || defaultFriends[0],
  }));
}

function normalizeRoute(route) {
  if (!route || route === "home") return "home";
  if (route === "gallery") return "receipts";
  if (route === "dashboard") return "insights";
  return route;
}

function normalizeReceipt(receipt) {
  return {
    ...receipt,
    planId: receipt.planId || "",
    paidBy: receipt.paidBy || defaultFriends[0],
    items: (receipt.items || []).map((item) => ({
      id: item.id || uid(),
      name: item.name || "Item",
      price: Number(item.price || 0),
      assigned: item.assigned || "",
    })),
  };
}

function normalizePlan(plan) {
  const unlocked = planIsUnlocked(plan);
  const status = plan.status || (unlocked ? "unlocked" : "planning");
  return {
    ...plan,
    status,
    confirmedAttendees: plan.confirmedAttendees?.length ? plan.confirmedAttendees : yesVoters(plan),
    unlocked: plan.unlocked || unlocked,
  };
}

function combineReceipts(receipts, plan) {
  if (!receipts.length) return null;
  if (receipts.length === 1) return receipts[0];
  return {
    id: `plan-${plan?.id || "combined"}-all`,
    planId: plan?.id || "",
    merchant: plan?.title || "Hangout receipts",
    date: receipts[0]?.date || new Date().toISOString().slice(0, 10),
    category: "Hangout",
    paidBy: receipts[0]?.paidBy || defaultFriends[0],
    total: receipts.reduce((sum, receipt) => sum + Number(receipt.total || 0), 0),
    items: receipts.flatMap((receipt) =>
      (receipt.items || []).map((item) => ({
        ...item,
        id: `${receipt.id}-${item.id}`,
        merchant: receipt.merchant,
        paidBy: receipt.paidBy,
      })),
    ),
    receipts,
  };
}

function settlementTransfers(split, receipts = []) {
  if (!split?.people?.length || !receipts.length) return [];
  const people = split.people.map((person) => person.name);
  const byKey = new Map();
  const addTransfer = (from, to, amount, source) => {
    const value = Number(amount || 0);
    if (!from || !to || from === to || value <= 0) return;
    const key = `${from}->${to}`;
    const existing = byKey.get(key) || { from, to, amount: 0, sources: [] };
    existing.amount += value;
    existing.sources.push(source);
    byKey.set(key, existing);
  };

  if (split.mode === "equal") {
    receipts.forEach((receipt) => {
      const share = Number(receipt.total || 0) / Math.max(people.length, 1);
      people.forEach((name) => addTransfer(name, receipt.paidBy, share, receipt.merchant));
    });
  } else {
    receipts.forEach((receipt) => {
      (receipt.items || []).forEach((item) => addTransfer(item.assigned, receipt.paidBy, Number(item.price || 0), receipt.merchant));
    });
  }

  return Array.from(byKey.values()).map((transfer) => ({
    ...transfer,
    amount: Number(transfer.amount.toFixed(2)),
  })).filter((transfer) => transfer.amount > 0);
}

function transfersForPerson(transfers, name) {
  return transfers.filter((transfer) => transfer.from === name);
}

function buildSettlementContext({ route, plans, receipts, splits, friends }) {
  const parts = route.split("/");
  const kind = parts[1];
  const id = parts[2];
  const linkedPlan = kind === "plan" ? plans.find((plan) => plan.id === id) : null;
  const includedReceipts = linkedPlan
    ? receipts.filter((receipt) => receipt.planId === linkedPlan.id)
    : receipts.filter((receipt) => receipt.id === id);
  const fallbackReceipts = includedReceipts.length ? includedReceipts : receipts.slice(0, 1);
  const combinedReceipt = combineReceipts(fallbackReceipts, linkedPlan);
  if (!combinedReceipt) return null;
  const splitKey = linkedPlan ? `plan-${linkedPlan.id}-all` : combinedReceipt.id;
  const existing = splits.find((split) => split.receiptId === splitKey);
  const names = existing?.people?.length
    ? existing.people.map((person) => person.name)
    : linkedPlan
      ? confirmedAttendees(linkedPlan)
      : friends;
  const equalAmount = Number(combinedReceipt.total || 0) / Math.max(names.length, 1);
  const split = existing || {
    id: uid(),
    receiptId: splitKey,
    merchant: combinedReceipt.merchant,
    date: combinedReceipt.date,
    total: Number(combinedReceipt.total || 0),
    amountPerPerson: equalAmount,
    mode: "equal",
    receiptCount: fallbackReceipts.length,
    people: names.map((name) => ({ id: uid(), name, paid: false, amount: equalAmount })),
    updatedAt: new Date().toISOString(),
  };
  const transfers = settlementTransfers(split, fallbackReceipts);
  return { linkedPlan, receipts: fallbackReceipts, receipt: combinedReceipt, split, transfers };
}

function App() {
  const [receipts, setReceipts] = useLocalStorage(STORAGE_RECEIPTS, []);
  const [splits, setSplits] = useLocalStorage(STORAGE_SPLITS, []);
  const [friends, setFriends] = useLocalStorage(STORAGE_FRIENDS, defaultFriends);
  const [plans, setPlans] = useLocalStorage(STORAGE_PLANS, demoPlans);
  const [linkedPlanId, setLinkedPlanId] = useLocalStorage(STORAGE_LINKED_PLAN, "");
  const [demoSkipped, setDemoSkipped] = useLocalStorage(STORAGE_DEMO_SKIPPED, false);
  const [demoCompleted, setDemoCompleted] = useLocalStorage(STORAGE_DEMO_COMPLETED, false);
  const [demoStep, setDemoStep] = useState(0);
  const [personalBillFocus, setPersonalBillFocus] = useState(false);
  const [toast, setToast] = useState("");
  const [rawRoute, setRawRoute] = useState(location.hash.replace("#", "") || "home");
  const route = normalizeRoute(rawRoute);

  useEffect(() => {
    const onHash = () => setRawRoute(location.hash.replace("#", "") || "home");
    addEventListener("hashchange", onHash);
    return () => removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    const onSyncToast = (event) => flash(event.detail || "Copied");
    addEventListener("sync-toast", onSyncToast);
    return () => removeEventListener("sync-toast", onSyncToast);
  }, []);

  useEffect(() => {
    setPlans((current) =>
      mergeDemoPlans(current).map(normalizePlan),
    );
    setFriends((current) => {
      const legacyDemoNames = ["A" + "lya", "B" + "en", "Ch" + "loe", "Dan" + "iel"];
      const hasOldDemo = current.some((friend) => legacyDemoNames.includes(friend));
      const hasThresholdDefaults = defaultFriends.every((friend) => current.includes(friend));
      const onlyThresholdDefaults = hasThresholdDefaults && current.length === defaultFriends.length;
      return hasOldDemo || !current.length || onlyThresholdDefaults ? defaultFriends : current;
    });
  }, []);

  const safeReceipts = receipts.map(normalizeReceipt);
  const safePlans = plans.map(normalizePlan);

  const go = (next) => {
    location.hash = next;
    setRawRoute(next);
    scrollTo({ top: 0, behavior: "smooth" });
  };

  const flash = (message) => {
    setToast(message);
    setTimeout(() => setToast(""), 1800);
  };

  const startDemo = () => {
    setDemoSkipped(false);
    setDemoCompleted(false);
    setPersonalBillFocus(false);
    setDemoStep(1);
    setLinkedPlanId("");
    go("create");
  };

  const resetDemo = () => {
    setPlans((current) => current.filter((plan) => !plan.demoRun));
    setReceipts((current) => current.filter((receipt) => !receipt.demoRun));
    setSplits((current) => current.filter((split) => !split.demoRun));
    setLinkedPlanId("");
    setDemoStep(0);
    setDemoSkipped(false);
    setDemoCompleted(false);
    setPersonalBillFocus(false);
    flash("Demo reset");
    go("home");
  };

  const resetAndStartDemo = () => {
    setDemoSkipped(false);
    setDemoCompleted(false);
    setPersonalBillFocus(false);
    setPlans((current) => current.filter((plan) => !plan.demoRun));
    setReceipts((current) => current.filter((receipt) => !receipt.demoRun));
    setSplits((current) => current.filter((split) => !split.demoRun));
    setLinkedPlanId("");
    setDemoStep(1);
    flash("Clean demo ready");
    go("create");
  };

  const skipDemo = () => {
    setDemoSkipped(true);
    setDemoCompleted(false);
    setDemoStep(0);
  };

  const setDemoStepSafe = (next) => {
    if (!demoSkipped && !demoCompleted) setDemoStep(next);
  };

  const finishDemo = () => {
    setDemoStep(0);
    setDemoSkipped(false);
    setDemoCompleted(true);
    setPersonalBillFocus(true);
  };

  const closeDemoComplete = () => {
    setDemoCompleted(false);
    setDemoStep(0);
  };

  const viewPersonalBill = () => {
    const demoPlan = safePlans.find((plan) => plan.demoRun) || safePlans.find((plan) => plan.title === "KBBQ Friday");
    setPersonalBillFocus(true);
    setDemoCompleted(false);
    setDemoStep(0);
    if (demoPlan) {
      setLinkedPlanId(demoPlan.id);
      go(`split-plan/${demoPlan.id}`);
    } else {
      go("split");
    }
  };

  const copyPitchSummary = async () => {
    const text = "Sync helps friend groups turn maybes into confirmed plans. After the hangout, Sync combines receipts, calculates exactly who pays who, and generates personal bill cards ready to share.";
    try {
      if (navigator.clipboard) await navigator.clipboard.writeText(text);
      else throw new Error("clipboard fallback");
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
    }
    flash("Copied");
  };

  const saveReceipt = (receipt) => {
    const nextReceipt = normalizeReceipt({
      ...receipt,
      total: Number(receipt.total || 0),
      updatedAt: new Date().toISOString(),
    });
    setReceipts((current) => {
      const exists = current.some((item) => item.id === nextReceipt.id);
      return exists
        ? current.map((item) => (item.id === nextReceipt.id ? nextReceipt : item))
        : [nextReceipt, ...current];
    });
    if (nextReceipt.planId) go(`plan/${nextReceipt.planId}`);
    else go(`receipt/${nextReceipt.id}`);
  };

  const deleteReceipt = (id) => {
    setReceipts((current) => current.filter((receipt) => receipt.id !== id));
    setSplits((current) => current.filter((split) => split.receiptId !== id));
    go("receipts");
  };

  const saveSplit = (split) => {
    setSplits((current) => {
      const exists = current.some((item) => item.receiptId === split.receiptId);
      return exists ? current.map((item) => (item.receiptId === split.receiptId ? split : item)) : [split, ...current];
    });
  };

  const addSampleReceipts = (planId) => {
    const samples = demoReceiptDrafts(planId);
    setReceipts((current) => [...samples, ...current.filter((receipt) => !(receipt.demoRun && receipt.planId === planId))]);
    flash("Sample receipts added");
    setDemoStepSafe(7);
  };

  const savePlan = (plan) => {
    const nextPlan = { ...plan, unlocked: planIsUnlocked(plan) };
    setPlans((current) => {
      const exists = current.some((item) => item.id === nextPlan.id);
      return exists ? current.map((item) => (item.id === nextPlan.id ? nextPlan : item)) : [nextPlan, ...current];
    });
    go(`plan/${nextPlan.id}`);
  };

  const updatePlan = (id, updater) => {
    setPlans((current) =>
      current.map((plan) => {
        if (plan.id !== id) return plan;
        const updated = typeof updater === "function" ? updater(plan) : updater;
        return { ...updated, unlocked: updated.unlocked || planIsUnlocked(updated) };
      }),
    );
  };

  const routeId = rawRoute.split("/")[1];
  const splitPlanId = rawRoute.startsWith("split-plan/") ? rawRoute.split("/")[1] : "";
  const settlementContext = route.startsWith("bills-ready/")
    ? buildSettlementContext({ route, plans: safePlans, receipts: safeReceipts, splits, friends })
    : null;
  const selectedPlan = route.startsWith("plan/") ? safePlans.find((plan) => plan.id === routeId) : null;
  const linkedPlan = safePlans.find((plan) => plan.id === (splitPlanId || linkedPlanId)) || null;
  const selectedReceipt = route.startsWith("receipt/")
    ? safeReceipts.find((receipt) => receipt.id === routeId)
    : null;
  const editingReceipt = route.startsWith("scan/")
    ? safeReceipts.find((receipt) => receipt.id === routeId)
    : null;

  return (
    <div className="threshold-shell min-h-screen text-white">
          <FloatingNav route={route} go={go} friends={friends} plans={safePlans} startDemo={startDemo} resetAndStartDemo={resetAndStartDemo} />
      {toast && <Toast message={toast} />}
      <div className="mx-auto min-h-screen w-full max-w-7xl px-4 pb-24 pt-28 lg:px-6 lg:pt-32">
        <main className="min-w-0">
          <DemoGuide demoStep={demoSkipped || demoCompleted ? 0 : demoStep} setDemoStep={setDemoStepSafe} route={route} go={go} plans={safePlans} resetDemo={resetDemo} resetAndStartDemo={resetAndStartDemo} skipDemo={skipDemo} finishDemo={finishDemo} />
          {demoCompleted && (
            <DemoComplete
              restartDemo={resetAndStartDemo}
              viewPersonalBill={viewPersonalBill}
              copyPitchSummary={copyPitchSummary}
              close={closeDemoComplete}
            />
          )}
          <div className="page-surface">
            {route === "home" && <Home plans={safePlans} receipts={safeReceipts} splits={splits} friends={friends} go={go} startDemo={startDemo} resetAndStartDemo={resetAndStartDemo} />}
            {route === "plans" && <PlansPage plans={safePlans} go={go} />}
            {route === "create" && <CreatePlan friends={friends} setFriends={setFriends} savePlan={savePlan} demoStep={demoSkipped ? 0 : demoStep} setDemoStep={setDemoStepSafe} />}
            {route.startsWith("plan/") && selectedPlan && (
              <PlanDetail
                plan={selectedPlan}
                updatePlan={updatePlan}
                go={go}
                setLinkedPlanId={setLinkedPlanId}
                flash={flash}
                demoStep={demoSkipped ? 0 : demoStep}
                setDemoStep={setDemoStepSafe}
                receipts={safeReceipts}
                addSampleReceipts={addSampleReceipts}
              />
            )}
            {route === "receipts" && <ReceiptGallery receipts={safeReceipts} go={go} linkedPlan={linkedPlan} />}
            {route.startsWith("scan") && (
              <ScanReceipt
                saveReceipt={saveReceipt}
                initialReceipt={editingReceipt}
                friends={friends}
                setFriends={setFriends}
                linkedPlan={linkedPlan}
              />
            )}
            {route.startsWith("receipt/") && selectedReceipt && (
              <ReceiptDetail
                receipt={selectedReceipt}
                split={splits.find((item) => item.receiptId === selectedReceipt.id)}
                deleteReceipt={deleteReceipt}
                go={go}
              />
            )}
            {route.startsWith("split") && (
              <SplitBill
                receipts={safeReceipts}
                splits={splits}
                saveSplit={saveSplit}
                initialReceiptId={routeId}
                friends={friends}
                setFriends={setFriends}
                linkedPlan={linkedPlan}
                splitPlanId={splitPlanId}
                demoStep={demoSkipped ? 0 : demoStep}
                setDemoStep={setDemoStepSafe}
                personalBillFocus={personalBillFocus}
                go={go}
              />
            )}
            {route.startsWith("bills-ready/") && settlementContext && (
              <SettlementCompletePage
                context={settlementContext}
                go={go}
                resetAndStartDemo={resetAndStartDemo}
                flash={flash}
              />
            )}
            {route === "insights" && <Insights receipts={safeReceipts} plans={safePlans} splits={splits} friends={friends} />}
          </div>
        </main>
      </div>
    </div>
  );
}

function mergeDemoPlans(current) {
  const demos = demoPlans();
  const byTitle = new Set((current || []).map((plan) => plan.title));
  return [...(current || []), ...demos.filter((plan) => !byTitle.has(plan.title))];
}

function FloatingNav({ route, go, friends, plans, startDemo, resetAndStartDemo }) {
  const items = [
    ["home", "Home"],
    ["plans", "Plans"],
    ["create", "Create"],
    ["split", "Split"],
  ];
  const unlocked = plans.filter(planIsUnlocked).length;
  return (
    <header className="floating-nav">
      <button onClick={() => go("home")} className="flex items-center gap-3">
        <SyncLogo size="medium" wordmark tagline />
      </button>
      <nav className="nav-pills">
        {items.map(([id, label]) => {
          const active = route === id || route.startsWith(`${id}/`) || (id === "plans" && route.startsWith("plan/"));
          return (
            <button key={id} onClick={() => go(id)} className={active ? "is-active" : ""}>
              {label}
            </button>
          );
        })}
      </nav>
      <div className="hidden items-center gap-3 lg:flex">
        <button onClick={startDemo} className="glass-button rounded-2xl px-4 py-3 text-sm font-black">
          Start 60-sec demo
        </button>
        <button onClick={resetAndStartDemo} className="premium-button rounded-2xl px-4 py-3 text-sm font-black">
          Reset + Start Demo
        </button>
        <div className="profile-pill">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-300 shadow-[0_0_18px_rgba(134,239,172,.9)]"></span>
          <strong>{friends[0] || "Weng Yee"}</strong>
          <small>{unlocked} synced</small>
        </div>
      </div>
    </header>
  );
}

function Toast({ message }) {
  return <div className="toast">{message}</div>;
}

function SyncLogo({ size = "medium", wordmark = false, tagline = false, appIcon = false }) {
  return (
    <span className={`sync-logo ${size} ${appIcon ? "app-icon" : ""}`}>
      <span className="sync-mark" aria-hidden="true">
        <i className="sync-blob blob-one"></i>
        <i className="sync-blob blob-two"></i>
        <i className="sync-blob blob-three"></i>
      </span>
      {(wordmark || tagline) && (
        <span className="sync-wordmark">
          {wordmark && <strong>{APP_NAME}</strong>}
          {tagline && <small>From maybe to synced.</small>}
        </span>
      )}
    </span>
  );
}

function DemoGuide({ demoStep, setDemoStep, route, go, plans, resetDemo, resetAndStartDemo, skipDemo, finishDemo }) {
  if (!demoStep) return null;
  const steps = [
    { title: "Create a plan", instruction: "Use Create demo plan to set up KBBQ Friday." },
    { title: "Invite friends", instruction: "Simulate responses from the four invited friends." },
    { title: "Sync plan", instruction: "Watch the threshold fill when everyone says yes." },
    { title: "Start hangout", instruction: "The plan is synced. Start the real outing." },
    { title: "End hangout", instruction: "Receipts stay hidden until the hangout ends." },
    { title: "Add demo receipts", instruction: "Add realistic receipts with who-paid data." },
    { title: "Settle this hangout", instruction: "Open Split to settle all linked receipts." },
    { title: "Review Sync Settlement", instruction: "Show who pays who with exact transfer amounts." },
    { title: "Generate personal bill", instruction: "Switch to a personal card and share the payment message." },
  ];
  const next = () => {
    if (demoStep >= steps.length) {
      finishDemo();
      return;
    }
    const nextStep = Math.min(demoStep + 1, steps.length);
    setDemoStep(nextStep);
    if (nextStep === 1) go("create");
  };
  const step = steps[demoStep - 1] || steps[0];
  return (
    <div className="demo-guide">
      <SyncLogo size="small" wordmark />
      <div>
        <span>{demoStep} / {steps.length}</span>
        <strong>{step.title}</strong>
        <small>{step.instruction}</small>
        <div className="demo-progress"><i style={{ width: `${(demoStep / steps.length) * 100}%` }}></i></div>
      </div>
      <div className="demo-actions">
        <button onClick={next}>{demoStep >= steps.length ? "Finish" : "Next"}</button>
        <button onClick={resetAndStartDemo}>Reset + Start Demo</button>
        <button onClick={resetDemo}>Reset Demo</button>
        <button onClick={skipDemo}>Skip</button>
      </div>
    </div>
  );
}

function DemoComplete({ restartDemo, viewPersonalBill, copyPitchSummary, close }) {
  const stats = [
    "1 plan synced",
    "3 receipts added",
    "RM228.40 settled",
    "9 payments simplified",
    "4 personal bills ready",
  ];
  return (
    <div className="demo-complete-backdrop" role="dialog" aria-modal="true">
      <section className="demo-complete-card">
        <span className="complete-glow"></span>
        <div className="relative">
          <div className="mb-4 flex justify-center">
            <SyncLogo size="large" appIcon />
          </div>
          <h2>Demo complete</h2>
          <p>You just synced a plan, added receipts, and settled the hangout.</p>
          <div className="demo-complete-stats">
            {stats.map((stat, index) => (
              <article key={stat} style={{ animationDelay: `${index * 90}ms` }}>
                <span>{index + 1}</span>
                <strong>{stat}</strong>
              </article>
            ))}
          </div>
          <div className="demo-complete-actions">
            <Button onClick={restartDemo}>Restart demo</Button>
            <Button variant="glass" onClick={viewPersonalBill}>View personal bill</Button>
            <Button variant="glass" onClick={copyPitchSummary}>Copy pitch summary</Button>
            <Button variant="dark" onClick={close}>Close</Button>
          </div>
        </div>
      </section>
    </div>
  );
}

function Sidebar({ route, go }) {
  const items = [
    ["home", "Home", "home"],
    ["plans", "Plans", "plans"],
    ["create", "Create", "create"],
    ["receipts", "Receipts", "receipts"],
    ["split", "Split", "split"],
    ["insights", "Insights", "insights"],
  ];
  return (
    <aside className="glass-panel sticky top-4 hidden h-[calc(100vh-32px)] w-64 shrink-0 rounded-[30px] p-4 lg:block">
      <button onClick={() => go("home")} className="group mb-8 flex items-center gap-3 rounded-3xl p-2 text-left">
        <SyncLogo size="medium" wordmark tagline />
      </button>
      <nav className="grid gap-2">
        {items.map(([id, label, icon]) => {
          const active = route === id || route.startsWith(`${id}/`) || (id === "plans" && route.startsWith("plan/"));
          return (
            <button
              key={id}
              onClick={() => go(id)}
              className={`nav-item ${active ? "is-active" : ""}`}
            >
              <span className="grid h-9 w-9 place-items-center rounded-2xl bg-white/6">
                <Icon name={icon} />
              </span>
              {label}
            </button>
          );
        })}
      </nav>
      <div className="absolute bottom-4 left-4 right-4 overflow-hidden rounded-[26px] border border-violet-400/20 bg-violet-500/10 p-4">
        <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-violet-500/30 blur-2xl"></div>
        <p className="relative mb-3 text-sm font-bold text-zinc-300">Built for student friend groups.</p>
        <button onClick={() => go("create")} className="premium-button relative h-11 w-full rounded-2xl text-sm">
          Create plan
        </button>
      </div>
    </aside>
  );
}

function MobileTop({ go }) {
  return (
    <header className="mb-4 flex items-center justify-between lg:hidden">
      <button onClick={() => go("home")} className="flex items-center gap-3">
        <SyncLogo size="medium" wordmark tagline />
      </button>
      <button onClick={() => go("create")} className="premium-button rounded-2xl px-4 py-3 text-sm">
        Create
      </button>
    </header>
  );
}

function MobileNav({ route, go }) {
  const items = [
    ["home", "Home"],
    ["plans", "Plans"],
    ["create", "Create"],
    ["receipts", "Receipts"],
    ["split", "Split"],
    ["insights", "Stats"],
  ];
  return (
    <nav className="fixed bottom-3 left-3 right-3 z-20 grid grid-cols-6 rounded-[26px] border border-white/10 bg-black/80 p-2 shadow-2xl backdrop-blur-xl lg:hidden">
      {items.map(([id, label]) => (
        <button
          key={id}
          onClick={() => go(id)}
          className={`h-12 rounded-2xl text-[11px] font-black transition ${
            route === id || route.startsWith(`${id}/`) || (id === "plans" && route.startsWith("plan/"))
              ? "bg-white text-black"
              : "text-zinc-500"
          }`}
        >
          {label}
        </button>
      ))}
    </nav>
  );
}

function TopGreeting({ friends, plans }) {
  const unlocked = plans.filter(planIsUnlocked).length;
  return (
    <div className="mb-4 hidden items-center justify-between lg:flex">
        <p className="text-sm font-bold text-zinc-500">From maybe to synced. Then settled.</p>
      <div className="glass-panel flex items-center gap-3 rounded-2xl px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-300 shadow-[0_0_18px_rgba(110,231,183,.9)]"></span>
        <strong className="text-sm">Hi, {friends[0] || "Weng Yee"}</strong>
        <span className="text-sm text-zinc-500">{unlocked} synced</span>
      </div>
    </div>
  );
}

function Home({ plans, receipts, splits, friends, go, startDemo, resetAndStartDemo }) {
  const featured = plans.find((plan) => plan.title === "KBBQ Friday") || plans[0] || demoPlans()[1];
  const totalSpent = receipts.reduce((sum, receipt) => sum + Number(receipt.total || 0), 0);
  const latestSplit = splits[0];
  const yes = yesCount(featured);
  const remaining = Math.max(0, Number(featured.minimumPeople || 1) - yes);
  return (
    <div className="social-home space-y-10">
      <section className="landing-hero relative overflow-hidden">
        <div className="ambient ambient-violet"></div>
        <div className="ambient ambient-blue"></div>
        <span className="home-orb orb-one"></span>
        <span className="home-orb orb-two"></span>
        <span className="home-orb orb-three"></span>
        <div className="relative mx-auto max-w-5xl text-center">
          <div className="mb-6 flex justify-center">
            <SyncLogo size="large" wordmark tagline appIcon />
          </div>
          <p className="mx-auto mb-5 inline-flex rounded-full border border-violet-300/20 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-violet-100">
            From maybe to confirmed
          </p>
          <h1 className="hero-headline">Plans, <span>Synced.</span></h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-zinc-400 sm:text-lg">
            Your group plan becomes real only when everyone syncs — then the bill settles itself.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button onClick={startDemo}>Start 60-sec demo</Button>
            <Button variant="glass" onClick={resetAndStartDemo}>Reset + Start Demo</Button>
            <Button variant="glass" onClick={() => go("create")}>Create plan</Button>
          </div>
        </div>

        <div className="phone-preview">
          <div className="phone-glow"></div>
          <div className="phone-shell">
            <div className="phone-topline">
              <span>KBBQ Solaris</span>
              <LockBadge unlocked={planIsUnlocked(featured)} />
            </div>
            <div className="hero-ring-wrap">
              <CircularThreshold plan={featured} />
            </div>
            <div className="mt-5 text-center">
              <p className="text-sm text-zinc-500">{yes} / {featured.minimumPeople} friends in</p>
              <h3 className="mt-1 text-2xl font-black">{remaining ? `${remaining} more yes to sync` : "Plan synced"}</h3>
            </div>
            <div className="floating-avatar-row">
              {featured.invitedFriends.map((friend, index) => (
                <span key={friend} className={`avatar-chip ${featured.votes?.[friend] || "pending"}`} style={{ animationDelay: `${index * 90}ms` }}>
                  <Avatar name={friend} small />
                  {friend}
                </span>
              ))}
            </div>
          </div>
          <div className="floating-social-card mini-plan-float">
            <span>{APP_NAME}</span>
            <strong>KBBQ Friday</strong>
            <small>3 friends in · 1 pending</small>
          </div>
          <div className="floating-social-card mini-bill-float">
            <span>Sync Settlement</span>
            <strong>Who pays who</strong>
            <small>Weng Yee → Ken Meng {money(44.6)}</small>
            <small>Weng Yan → Cherrie {money(10.5)}</small>
          </div>
        </div>
      </section>

      <section className="home-features">
        <FeatureCard title="No more dead group chats" copy="Plans only sync when enough friends commit." tone="violet" />
        <FeatureCard title="No awkward bill chasing" copy="Receipts become personal payment instructions." tone="green" />
        <FeatureCard title="One clean social flow" copy="Plan, meet, split, settle." tone="gold" />
      </section>
      <section className="pitch-strip">
        <p>Why {APP_NAME} matters</p>
        <h2>Plan together. Meet for real. Settle without the awkward chase.</h2>
      </section>
      <section className="plan-invite-strip">
        {plans.slice(0, 3).map((plan) => (
          <button key={plan.id} onClick={() => go(`plan/${plan.id}`)} className="plan-preview-card text-left">
            <div className="mb-4 flex items-center justify-between">
              <span className="tag-pill">{plan.activityTag}</span>
              <LockBadge unlocked={planIsUnlocked(plan)} />
            </div>
            <h3 className="text-2xl font-black">{plan.title}</h3>
            <p className="mt-1 font-semibold text-zinc-500">{plan.location}</p>
            <p className="mt-4 text-sm text-zinc-400">{statusCopy(plan)}</p>
          </button>
        ))}
      </section>
    </div>
  );
}

function PlansPage({ plans, go }) {
  return (
    <Page title="Plans" kicker="From maybe to confirmed">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl font-semibold text-zinc-400">
          Plans stay locked in the dark until enough friends say yes.
        </p>
        <Button onClick={() => go("create")}>Create Plan</Button>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        {plans.map((plan, index) => (
          <button
            key={plan.id}
            onClick={() => go(`plan/${plan.id}`)}
            className="plan-card tilt-card page-enter text-left"
            style={{ animationDelay: `${index * 70}ms` }}
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <span className="tag-pill">{plan.activityTag}</span>
                <h2 className="mt-4 text-3xl font-black">{plan.title}</h2>
                <p className="mt-2 font-semibold text-zinc-400">{plan.date} · {plan.time}</p>
                <p className="font-semibold text-zinc-500">{plan.location}</p>
              </div>
              <LockBadge unlocked={planIsUnlocked(plan)} />
            </div>
            <div className="mb-4 flex items-center justify-between gap-4">
              <span className="text-sm font-black text-zinc-500">Budget {money(plan.budget)}</span>
              <span className="text-sm font-black text-zinc-400">{yesCount(plan)} / {plan.minimumPeople} yes</span>
            </div>
            <div className="mb-4 grid gap-3 sm:grid-cols-2">
              <UnlockChanceMeter plan={plan} compact />
              <BudgetComfort budget={plan.budget} compact />
            </div>
            <ThresholdBar plan={plan} />
            <BlurredGuests plan={plan} />
          </button>
        ))}
      </div>
    </Page>
  );
}

function CreatePlan({ friends, setFriends, savePlan, demoStep, setDemoStep }) {
  const [form, setForm] = useState({
    title: "Cafe study reset",
    description: "Quick study session with drinks after class. Unlock only if enough people are in.",
    date: new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10),
    time: "16:30",
    location: "BookXcess Cafe",
    minimumPeople: 3,
    budget: 18,
    activityTag: "Cafe",
    invitedFriends: [...friends],
  });
  const [filled, setFilled] = useState(false);

  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const suggest = () => {
    const idea = planIdeas[Math.floor(Math.random() * planIdeas.length)];
    setFilled(true);
    setForm((current) => ({
      ...current,
      ...idea,
      date: new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10),
      time: idea.activityTag === "Cafe" || idea.activityTag === "Study" ? "16:30" : "19:30",
    }));
    setTimeout(() => setFilled(false), 700);
  };
  const toggleFriend = (friend) => {
    setField(
      "invitedFriends",
      form.invitedFriends.includes(friend)
        ? form.invitedFriends.filter((item) => item !== friend)
        : [...form.invitedFriends, friend],
    );
  };
  const create = () => {
    const invited = form.invitedFriends.length ? form.invitedFriends : friends;
    savePlan({
      ...form,
      id: uid(),
      minimumPeople: Math.max(1, Number(form.minimumPeople || 1)),
      budget: Number(form.budget || 0),
      invitedFriends: invited,
      votes: Object.fromEntries(invited.map((friend) => [friend, "pending"])),
      unlocked: false,
      createdAt: new Date().toISOString(),
    });
  };
  const createDemo = () => {
    setFilled(true);
    const plan = createDemoPlan();
    setForm(plan);
    setTimeout(() => {
      savePlan(plan);
      setDemoStep?.(2);
    }, 360);
    setTimeout(() => setFilled(false), 900);
  };

  return (
    <Page title="Create Plan" kicker="Invite friends, set the threshold">
      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <section className={`creation-studio glass-card rounded-[30px] p-5 ${filled ? "is-filled" : ""}`}>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-black">Plan setup studio</h2>
              <p className="font-semibold text-zinc-500">Design a low-friction outing in under a minute.</p>
            </div>
            <button onClick={suggest} className="glass-button rounded-2xl px-4 py-3 text-sm font-black">
              Suggest a plan
            </button>
          </div>
          {demoStep === 1 && (
            <div className="demo-action-card mb-5">
              <div>
                <span>Step 1</span>
                <strong>Create the demo KBBQ plan</strong>
                <p>This sets the date, friends, budget, and 4-person threshold.</p>
              </div>
              <Button onClick={createDemo}>Create demo plan</Button>
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Plan title" value={form.title} onChange={(value) => setField("title", value)} />
            <Field label="Location" value={form.location} onChange={(value) => setField("location", value)} />
            <Field label="Date" type="date" value={form.date} onChange={(value) => setField("date", value)} />
            <Field label="Time" type="time" value={form.time} onChange={(value) => setField("time", value)} />
            <Field label="Minimum people required" type="number" value={form.minimumPeople} onChange={(value) => setField("minimumPeople", value)} />
            <Field label="Budget estimate" type="number" value={form.budget} onChange={(value) => setField("budget", value)} />
            <Select label="Activity tag" value={form.activityTag} options={activityTags} onChange={(value) => setField("activityTag", value)} />
          </div>
          <label className="mt-4 grid gap-2">
            <span className="text-sm font-black text-zinc-500">Description</span>
            <textarea
              className="input min-h-28 py-3"
              value={form.description}
              onChange={(event) => setField("description", event.target.value)}
            />
          </label>
          <div className="mt-5">
            <p className="mb-3 text-sm font-black text-zinc-500">Friends invited</p>
            <div className="flex flex-wrap gap-2">
              {friends.map((friend) => (
                <button
                  key={friend}
                  onClick={() => toggleFriend(friend)}
                  className={`friend-chip ${form.invitedFriends.includes(friend) ? "is-on" : ""}`}
                >
                  {friend}
                </button>
              ))}
            </div>
          </div>
          <Button className="mt-6 w-full" onClick={create}>Create Sync plan</Button>
        </section>
        <aside className="space-y-5">
          <AISuggestionCard plan={form} />
          <BudgetComfort budget={form.budget} />
          <div className="plan-card">
            <p className="mb-3 text-sm font-black text-violet-200">Live preview</p>
            <h3 className="text-3xl font-black">{form.title}</h3>
            <p className="mt-2 font-semibold text-zinc-400">{form.location}</p>
            <UnlockChanceMeter plan={{ ...form, votes: {}, minimumPeople: form.minimumPeople }} />
            <ThresholdBar plan={{ ...form, votes: {}, minimumPeople: form.minimumPeople }} />
            <p className="mt-4 text-sm font-semibold text-zinc-500">
              Waiting for {form.minimumPeople} yes votes to sync.
            </p>
          </div>
          <FriendManager friends={friends} setFriends={setFriends} compact />
        </aside>
      </div>
    </Page>
  );
}

function PlanDetail({ plan, updatePlan, go, setLinkedPlanId, flash, demoStep, setDemoStep, receipts, addSampleReceipts }) {
  const unlocked = planIsUnlocked(plan);
  const status = planStatus(plan);
  const [celebrate, setCelebrate] = useState(false);
  const [viewingAs, setViewingAs] = useState(plan.invitedFriends[0] || defaultFriends[0]);
  const [simulating, setSimulating] = useState(false);
  const remaining = Math.max(0, Number(plan.minimumPeople || 1) - yesCount(plan));
  const attendees = confirmedAttendees(plan);
  const planReceipts = receipts.filter((receipt) => receipt.planId === plan.id);
  const hangoutTotal = planReceipts.reduce((sum, receipt) => sum + Number(receipt.total || 0), 0);

  useEffect(() => {
    if (unlocked) {
      setCelebrate(true);
      const timer = setTimeout(() => setCelebrate(false), 2200);
      return () => clearTimeout(timer);
    }
  }, [unlocked]);

  const setVote = (friend, vote) => {
    updatePlan(plan.id, (current) => ({
      ...current,
      votes: { ...(current.votes || {}), [friend]: vote },
    }));
  };
  const copyInvite = async () => {
    const link = `https://threshold.demo/invite/${plan.id}`;
    try {
      if (navigator.clipboard) await navigator.clipboard.writeText(link);
      else {
        const textarea = document.createElement("textarea");
        textarea.value = link;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        textarea.remove();
      }
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = link;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
    }
    flash("Invite link copied");
  };
  const simulate = () => {
    setSimulating(true);
    setDemoStep?.(3);
    const sequence = plan.invitedFriends.map((friend) => [friend, "yes"]);
    sequence.forEach(([friend, vote], index) => {
      setTimeout(() => {
        setVote(friend, vote);
        if (index === sequence.length - 1) {
          setSimulating(false);
          setDemoStep?.(4);
        }
      }, 420 * (index + 1));
    });
  };
  const addReceipt = () => {
    setLinkedPlanId(plan.id);
    setDemoStep?.(4);
    go("scan");
  };
  const setStatus = (nextStatus) => {
    updatePlan(plan.id, (current) => ({
      ...current,
      status: nextStatus,
      confirmedAttendees: current.confirmedAttendees?.length ? current.confirmedAttendees : yesVoters(current),
    }));
    if (nextStatus === "happening") setDemoStep?.(5);
    if (nextStatus === "ended") setDemoStep?.(6);
  };
  const toggleAttendee = (friend) => {
    updatePlan(plan.id, (current) => {
      const currentAttendees = current.confirmedAttendees?.length ? current.confirmedAttendees : yesVoters(current);
      return {
        ...current,
        confirmedAttendees: currentAttendees.includes(friend)
          ? currentAttendees.filter((item) => item !== friend)
          : [...currentAttendees, friend],
      };
    });
  };
  const splitAllReceipts = () => {
    setLinkedPlanId(plan.id);
    setDemoStep?.(8);
    go(`split-plan/${plan.id}`);
  };

  return (
    <Page title={plan.title} kicker={unlocked ? "Plan Synced" : `Waiting for ${remaining} more yes`}>
      <section className={`unlock-scene ${unlocked ? "is-unlocked" : ""}`}>
        {celebrate && <UnlockBurst />}
        <PlanJourneyTimeline status={status} receiptsCount={planReceipts.length} />
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-5 flex flex-wrap justify-center gap-3">
            <span className="tag-pill">{plan.activityTag}</span>
            <StatusPill status={status} />
            <span className="rounded-full border border-white/10 px-3 py-2 text-sm text-zinc-400">{money(plan.budget)} · {budgetComfort(plan.budget).label}</span>
          </div>
          <h2 className="text-5xl font-black leading-none tracking-tight sm:text-7xl">{plan.title}</h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-zinc-400">{plan.location} · {plan.date} at {plan.time}</p>
          <div className="unlock-centerpiece">
            {plan.invitedFriends.map((friend, index) => (
              <span key={friend} className={`orbit-avatar orbit-${index + 1} ${plan.votes?.[friend] || "pending"}`}>
                <Avatar name={friend} small />
              </span>
            ))}
            <CircularThreshold plan={plan} large />
          </div>
          <h3 className={`unlock-copy ${unlocked ? "is-on" : ""}`}>
            {unlocked ? "Plan Synced" : `Waiting for ${remaining} more yes`}
          </h3>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-zinc-500">{plan.description}</p>
        </div>

        <div className="unlock-bottom-grid">
          <section className="vote-stage">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm text-zinc-500">Demo Voting Mode</p>
                <h3 className="text-2xl font-black">Vote as a friend</h3>
              </div>
              <select className="mini-select" value={viewingAs} onChange={(event) => setViewingAs(event.target.value)}>
                {plan.invitedFriends.map((friend) => <option key={friend}>{friend}</option>)}
              </select>
            </div>
            <div className="friend-vote-hero">
              <Avatar name={viewingAs} />
              <div>
                <strong>{viewingAs}</strong>
                <small>{plan.votes?.[viewingAs] || "pending"}</small>
              </div>
              <div className="vote-pill-row">
                {["yes", "maybe", "no"].map((vote) => (
                  <button
                    key={vote}
                    onClick={() => setVote(viewingAs, vote)}
                    className={`vote-button ${vote} ${plan.votes?.[viewingAs] === vote ? "is-active" : ""}`}
                  >
                    {vote}
                  </button>
                ))}
              </div>
            </div>
            <div className={`guest-list-line ${unlocked ? "guest-reveal" : "guest-blur"}`}>
              {plan.invitedFriends.map((friend, index) => (
                <span key={friend} style={{ animationDelay: `${index * 80}ms` }}>
                  <Avatar name={friend} small />
                  {friend}
                  <VoteState vote={plan.votes?.[friend]} />
                </span>
              ))}
            </div>
            <p className="mt-4 text-xs text-zinc-500">Demo mode: friend responses are simulated locally for this MVP.</p>
          </section>
          <aside className="plan-side-panel">
            <UnlockChanceMeter plan={plan} />
            <AISuggestionCard plan={plan} />
            <div className="grid gap-3">
              <Button onClick={simulate}>{simulating ? "Simulating..." : "Simulate friend responses"}</Button>
              <Button variant="glass" onClick={copyInvite}>Copy invite link</Button>
              {status === "unlocked" && <Button onClick={() => setStatus("happening")}>Start Hangout</Button>}
              {status === "happening" && <Button onClick={() => setStatus("ended")}>End Hangout</Button>}
              {status === "ended" && <Button onClick={addReceipt}>Add receipt for this outing</Button>}
              {status === "ended" && demoStep > 0 && <Button variant="glass" onClick={() => addSampleReceipts(plan.id)}>Add demo receipts</Button>}
              {!unlocked && <Button variant="glass" onClick={() => go("plans")}>Back to plans</Button>}
            </div>
            <p className="text-xs leading-6 text-zinc-500">In the full version, friends can open the invite link to vote live.</p>
          </aside>
        </div>
        {status !== "planning" && (
          <section className="hangout-lifecycle">
            <p className="attendee-mini-label">Attendees</p>
            <div className="attendee-toggle-list">
              {plan.invitedFriends.map((friend) => (
                <button key={friend} className={attendees.includes(friend) ? "is-on" : ""} onClick={() => toggleAttendee(friend)}>
                  <Avatar name={friend} small />
                  {friend}
                </button>
              ))}
            </div>
          </section>
        )}
        {status === "ended" && (
          <section className="hangout-receipts">
            <div className="hangout-receipts-head">
              <div>
                <p>Hangout Receipts</p>
                <h3>{plan.title} receipts</h3>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button variant="glass" onClick={addReceipt}>Add another receipt</Button>
                {demoStep > 0 && <Button variant="glass" onClick={() => addSampleReceipts(plan.id)}>Add demo receipts</Button>}
                <Button onClick={splitAllReceipts}>Settle this hangout</Button>
              </div>
            </div>
            <div className="hangout-total-row">
              <span>Total hangout cost</span>
              <strong>{money(hangoutTotal)}</strong>
              <small>{planReceipts.length} receipt{planReceipts.length === 1 ? "" : "s"} · Suggested split: confirmed attendees</small>
            </div>
            <div className="hangout-receipt-list">
              {planReceipts.length ? planReceipts.map((receipt) => (
                <article key={receipt.id}>
                  <div>
                    <strong>{receipt.merchant}</strong>
                    <small>{receipt.date} · {receipt.items.length} items · Paid by {receipt.paidBy}</small>
                  </div>
                  <span>{money(receipt.total)}</span>
                  <button onClick={() => go(`scan/${receipt.id}`)}>Edit</button>
                </article>
              )) : (
                <p className="text-sm text-zinc-500">No receipts yet. Add the first receipt after the hangout.</p>
              )}
            </div>
          </section>
        )}
      </section>
    </Page>
  );
}

function ScanReceipt({ saveReceipt, initialReceipt, friends, setFriends, linkedPlan }) {
  const payerOptions = linkedPlan ? confirmedAttendees(linkedPlan) : friends;
  const [image, setImage] = useState(initialReceipt?.image || "");
  const [form, setForm] = useState({
    id: initialReceipt?.id || uid(),
    planId: initialReceipt?.planId || linkedPlan?.id || "",
    paidBy: initialReceipt?.paidBy || payerOptions[0] || defaultFriends[0],
    date: initialReceipt?.date || new Date().toISOString().slice(0, 10),
    merchant: initialReceipt?.merchant || "KBBQ Solaris",
    category: initialReceipt?.category || "Food",
    total: initialReceipt?.total || 178.4,
    items: (initialReceipt?.items || [
      { id: uid(), name: "KBBQ set", price: 89.8, assigned: "Weng Yee" },
      { id: uid(), name: "Kimchi stew", price: 34.9, assigned: "Cherrie" },
      { id: uid(), name: "Drinks", price: 53.7, assigned: "Ken Meng" },
    ]).map((item) => ({ ...item, assigned: item.assigned || "" })),
  });

  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const updateItem = (id, field, value) =>
    setForm((current) => ({
      ...current,
      items: current.items.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    }));
  const totalFromItems = form.items.reduce((sum, item) => sum + Number(item.price || 0), 0);

  const upload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImage(reader.result);
    reader.readAsDataURL(file);
  };

  const save = () => {
    if (!form.paidBy) {
      alert("Choose who paid this receipt first.");
      return;
    }
    saveReceipt({
      ...form,
      image,
      planId: form.planId || linkedPlan?.id || "",
      paidBy: form.paidBy || payerOptions[0] || defaultFriends[0],
      items: form.items.map((item) => ({ ...item, price: Number(item.price || 0), assigned: item.assigned || "" })),
      total: Number(form.total || totalFromItems),
      createdAt: initialReceipt?.createdAt || new Date().toISOString(),
    });
  };

  return (
    <Page title="AI Receipt Scan" kicker="Add the receipt for this outing">
      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="glass-card rounded-[30px] p-5">
          {linkedPlan && (
            <div className="linked-plan-banner mb-4">
              <span>Adding receipt for:</span>
              <strong>{linkedPlan.title}</strong>
            </div>
          )}
          <label className="scanner-zone grid min-h-[420px] place-items-center rounded-[26px] p-4 text-center">
            {image ? (
              <span className="relative block">
                <img src={image} alt="Receipt preview" className="max-h-[390px] rounded-3xl object-contain shadow-2xl" />
                <span className="scan-line"></span>
              </span>
            ) : (
              <span>
                <strong className="block text-2xl">Upload receipt image</strong>
                <small className="mt-2 block font-semibold text-zinc-500">Simulated AI draft, no real OCR yet</small>
              </span>
            )}
            <input className="sr-only" type="file" accept="image/*" onChange={upload} />
          </label>
          <div className="mt-5">
            <FriendManager friends={friends} setFriends={setFriends} />
          </div>
        </section>
        <section className="glass-card rounded-[30px] p-5">
          <div className="mb-5 rounded-3xl border border-violet-300/20 bg-violet-400/10 p-4">
            <strong>AI receipt draft ready.</strong>
            <p className="mt-1 text-sm font-semibold text-zinc-400">
              Edit the draft, assign items, choose who paid, then use Sync Split after the event.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Date" type="date" value={form.date} onChange={(value) => setField("date", value)} />
            <Field label="Merchant" value={form.merchant} onChange={(value) => setField("merchant", value)} />
            <Select label="Category" value={form.category} options={categories} onChange={(value) => setField("category", value)} />
            <Field label="Total amount" type="number" value={form.total} onChange={(value) => setField("total", value)} />
            <div className="who-paid-field">
              <Select label="Who paid this receipt?" value={form.paidBy} options={payerOptions.length ? payerOptions : friends} onChange={(value) => setField("paidBy", value)} />
              <p>This person gets reimbursed in Sync Settlement.</p>
            </div>
          </div>
          <div className="mt-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-black">Item assignments</h3>
              <button
                className="small-glass-button"
                onClick={() => setField("items", [...form.items, { id: uid(), name: "New item", price: 0, assigned: friends[0] || "" }])}
              >
                Add item
              </button>
            </div>
            <div className="grid gap-3">
              {form.items.map((item) => (
                <div key={item.id} className="rounded-3xl bg-white/[0.04] p-3">
                  <div className="grid gap-2 lg:grid-cols-[1fr_130px_44px]">
                    <input className="input" value={item.name} onChange={(event) => updateItem(item.id, "name", event.target.value)} />
                    <input className="input" type="number" value={item.price} onChange={(event) => updateItem(item.id, "price", event.target.value)} />
                    <button
                      className="rounded-2xl bg-red-400/10 font-black text-red-200 transition hover:bg-red-400/20"
                      onClick={() => setField("items", form.items.filter((current) => current.id !== item.id))}
                    >
                      ×
                    </button>
                  </div>
                  <div className="mt-3 grid gap-2">
                    <label className="grid gap-2">
                      <span className="text-sm font-black text-zinc-500">Who ordered this?</span>
                      <input className="input" value={item.assigned || ""} placeholder="Type a name" onChange={(event) => updateItem(item.id, "assigned", event.target.value)} />
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {friends.map((friend) => (
                        <button
                          key={friend}
                          className={`friend-chip ${item.assigned === friend ? "is-on" : ""}`}
                          onClick={() => updateItem(item.id, "assigned", friend)}
                        >
                          {friend}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <Button className="mt-6 w-full" onClick={save}>Save receipt</Button>
        </section>
      </div>
    </Page>
  );
}

function ReceiptGallery({ receipts, go, linkedPlan }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const filtered = receipts.filter((receipt) => {
    const text = `${receipt.merchant} ${receipt.category} ${receipt.date}`.toLowerCase();
    return text.includes(query.toLowerCase()) && (category === "All" || receipt.category === category);
  });
  return (
    <Page title="Receipts" kicker="After-event money clarity">
      {linkedPlan && (
        <div className="linked-plan-banner mb-4">
          <span>Adding receipt for:</span>
          <strong>{linkedPlan.title}</strong>
        </div>
      )}
      <div className="mb-5 grid gap-3 md:grid-cols-[1fr_220px_auto]">
        <input className="input" placeholder="Search receipts" value={query} onChange={(event) => setQuery(event.target.value)} />
        <select className="input" value={category} onChange={(event) => setCategory(event.target.value)}>
          {["All", ...categories].map((item) => <option key={item}>{item}</option>)}
        </select>
        <Button onClick={() => go("scan")}>Add Receipt</Button>
      </div>
      {filtered.length === 0 ? (
        <Empty title="No receipts yet" action="Add receipt after event" onClick={() => go("scan")} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((receipt, index) => (
            <button
              key={receipt.id}
              onClick={() => go(`receipt/${receipt.id}`)}
              className="receipt-card page-enter text-left"
              style={{ animationDelay: `${index * 60}ms` }}
            >
              <ReceiptThumb receipt={receipt} />
              <div className="p-5">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-black">{receipt.merchant}</h3>
                    <p className="font-semibold text-zinc-500">{receipt.date}</p>
                  </div>
                  <strong className="text-lg text-emerald-200">{money(receipt.total)}</strong>
                </div>
                <span className="tag-pill">{receipt.category}</span>
                <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/[0.06] px-3 py-2 text-sm font-black text-zinc-300">
                  <Avatar name={receipt.paidBy} small />
                  Paid by {receipt.paidBy}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </Page>
  );
}

function ReceiptDetail({ receipt, split, deleteReceipt, go }) {
  return (
    <Page title={receipt.merchant} kicker="Receipt detail">
      <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
        <section className="receipt-card overflow-hidden rounded-[30px]">
          <ReceiptThumb receipt={receipt} tall />
        </section>
        <section className="space-y-4">
          <div className="glass-card rounded-[30px] p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-bold text-zinc-500">{receipt.date} · {receipt.category}</p>
                <h2 className="text-4xl font-black">{money(receipt.total)}</h2>
                <p className="mt-1 text-sm text-zinc-500">Paid by {receipt.paidBy}</p>
              </div>
              <Button onClick={() => go(`split/${receipt.id}`)}>Settle hangout</Button>
            </div>
            <div className="grid gap-3">
              {receipt.items.map((item) => (
                <div key={item.id} className="flex justify-between gap-3 rounded-2xl bg-white/[0.04] p-4 font-bold">
                  <span>
                    {item.name}
                    {item.assigned && <small className="ml-2 font-black text-violet-200">for {item.assigned}</small>}
                  </span>
                  <span>{money(item.price)}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="glow-card rounded-[30px] p-5">
            <strong className="text-xl">AI summary</strong>
            <p className="mt-2 font-semibold text-zinc-300">
              This looks like a {receipt.category.toLowerCase()} outing from {receipt.merchant}. Sync can split equally or by assigned items.
            </p>
          </div>
          {split && <SplitSnapshot split={split} />}
          <div className="flex flex-wrap gap-3">
            <Button variant="glass" onClick={() => go(`scan/${receipt.id}`)}>Edit receipt</Button>
            <button onClick={() => deleteReceipt(receipt.id)} className="rounded-2xl bg-red-400/10 px-5 py-3 font-black text-red-200 transition hover:bg-red-400/20">
              Delete
            </button>
          </div>
        </section>
      </div>
    </Page>
  );
}

function SplitBill({ receipts, splits, saveSplit, initialReceiptId, friends, setFriends, linkedPlan, splitPlanId, demoStep, setDemoStep, personalBillFocus, go }) {
  const hangoutReceipts = linkedPlan ? receipts.filter((receipt) => receipt.planId === linkedPlan.id) : [];
  const [splitScope, setSplitScope] = useState(splitPlanId ? "all" : "current");
  const [receiptId, setReceiptId] = useState(initialReceiptId || hangoutReceipts[0]?.id || receipts[0]?.id || "");
  const currentCandidates = linkedPlan && hangoutReceipts.length ? hangoutReceipts : receipts;
  const allScopeAvailable = Boolean(linkedPlan && hangoutReceipts.length);
  const validCurrentReceipt = currentCandidates.find((item) => item.id === receiptId) || currentCandidates[0] || receipts[0] || null;
  const activeScope = splitScope === "all" && allScopeAvailable ? "all" : "current";
  const currentReceipt = validCurrentReceipt;
  const includedReceipts = activeScope === "all" ? hangoutReceipts : currentReceipt ? [currentReceipt] : [];
  const receipt = combineReceipts(includedReceipts, linkedPlan);
  const splitKey = activeScope === "all" && linkedPlan ? `plan-${linkedPlan.id}-all` : currentReceipt?.id || receiptId;
  const existing = splits.find((item) => item.receiptId === splitKey);
  const defaultSplitNames = linkedPlan ? confirmedAttendees(linkedPlan) : friends;
  const [splitMode, setSplitMode] = useState(existing?.mode || "equal");
  const [names, setNames] = useState(existing?.people.map((person) => person.name) || defaultSplitNames);
  const [people, setPeople] = useState(existing?.people || []);

  useEffect(() => {
    if (receipts.length && activeScope === "current" && currentReceipt && receiptId !== currentReceipt.id) {
      setReceiptId(currentReceipt.id);
      return;
    }
    if (splitScope === "all" && !allScopeAvailable) {
      setSplitScope("current");
      return;
    }
    const nextExisting = splits.find((item) => item.receiptId === splitKey);
    setSplitMode(nextExisting?.mode || "equal");
    setNames(nextExisting?.people.map((person) => person.name) || defaultSplitNames);
    setPeople(nextExisting?.people || []);
  }, [receiptId, friends.join("|"), linkedPlan?.id, splitScope, hangoutReceipts.length, receipts.length, splitKey]);

  const changeScope = (scope) => {
    if (scope === "all") {
      if (!allScopeAvailable) return;
      setSplitScope("all");
      return;
    }
    const nextReceipt = currentCandidates.find((item) => item.id === receiptId) || currentCandidates[0] || receipts[0];
    if (nextReceipt) setReceiptId(nextReceipt.id);
    setSplitScope("current");
  };

  const assignedItems = receipt?.items.filter((item) => item.assigned?.trim()) || [];
  const canSplitByItems = assignedItems.length > 0;
  const effectiveMode = splitMode === "items" && canSplitByItems ? "items" : "equal";
  const equalAmount = receipt ? Number(receipt.total || 0) / Math.max(names.length, 1) : 0;
  const paidByName = Object.fromEntries(people.map((person) => [person.name, person.paid]));
  const idByName = Object.fromEntries(people.map((person) => [person.name, person.id]));

  const split = useMemo(() => {
    if (!receipt) return null;
    let mapped;
    if (effectiveMode === "items") {
      const grouped = assignedItems.reduce((acc, item) => {
        const name = item.assigned.trim();
        acc[name] = (acc[name] || 0) + Number(item.price || 0);
        return acc;
      }, {});
      mapped = Object.entries(grouped).map(([name, amount]) => ({
        id: idByName[name] || uid(),
        name,
        paid: paidByName[name] || false,
        amount,
      }));
    } else {
      mapped = names.map((name, index) => ({
        id: idByName[name] || uid(),
        name: name || `Friend ${index + 1}`,
        paid: paidByName[name] || false,
        amount: equalAmount,
      }));
    }
    return {
      id: existing?.id || uid(),
      receiptId: splitKey,
      merchant: receipt.merchant,
      date: receipt.date,
      total: Number(receipt.total || 0),
      amountPerPerson: effectiveMode === "equal" ? equalAmount : 0,
      mode: effectiveMode,
      people: mapped,
      receiptCount: includedReceipts.length,
      updatedAt: new Date().toISOString(),
    };
  }, [receipt, names, people, equalAmount, effectiveMode, splitKey, includedReceipts.length]);
  const transfers = useMemo(() => settlementTransfers(split, includedReceipts), [split, includedReceipts]);

  if (receipts.length === 0) {
    return (
      <Page title="Post-event Split" kicker="No more awkward payment chasing">
        <Empty title="No receipts to split" action="Add receipt after event" onClick={() => (location.hash = "scan")} />
      </Page>
    );
  }

  if (!receipt || !split) return null;

  const persist = (nextPeople = split.people) => saveSplit({ ...split, people: nextPeople, demoRun: demoStep > 0 });
  const paidTotal = split.people.filter((person) => person.paid).reduce((sum, person) => sum + person.amount, 0);
  const unpaidTotal = Math.max(split.total - paidTotal, 0);
  const showPersonalDemo = () => setDemoStep?.(9);
  const continueToBills = () => {
    persist();
    if (linkedPlan && activeScope === "all") go(`bills-ready/plan/${linkedPlan.id}`);
    else go(`bills-ready/receipt/${currentReceipt.id}`);
  };

  return (
    <Page title="Settle hangout" kicker="No more awkward payment chasing">
      <section className="split-top-summary">
        <MiniStat label="Total" value={money(split.total)} />
        <MiniStat label="Paid" value={money(paidTotal)} />
        <MiniStat label="Unpaid" value={money(unpaidTotal)} />
        <MiniStat label="People" value={split.people.length} />
      </section>
      <div className="split-settlement">
        <section className="split-control-zone">
          {linkedPlan && (
            <div className="linked-plan-banner mb-5">
              <span>Linked to:</span>
              <strong>{linkedPlan.title}</strong>
              <small>Status: {planStatus(linkedPlan)} · Receipts included: {includedReceipts.length} · Total hangout cost: {money(receipt.total)}</small>
            </div>
          )}
          <WhoPaidSummary receipts={includedReceipts} />
          {linkedPlan && (
            <Segmented
              label="Receipt scope"
              value={activeScope}
              options={[
                ["current", "Current receipt"],
                ["all", allScopeAvailable ? "All hangout receipts" : "All hangout receipts unavailable"],
              ]}
              onChange={changeScope}
            />
          )}
          {linkedPlan && !allScopeAvailable && (
            <p className="mt-2 text-xs font-bold text-zinc-500">Add receipts to this hangout before using all hangout receipts.</p>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            <Select
              label="Saved receipt"
              value={currentReceipt?.id || ""}
              options={currentCandidates.map((item) => ({ value: item.id, label: `${item.merchant} · ${money(item.total)}` }))}
              onChange={setReceiptId}
            />
            <Segmented
              label="Split mode"
              value={splitMode}
              options={[
                ["equal", "Equal Split"],
                ["items", "Split by Items"],
              ]}
              onChange={setSplitMode}
            />
          </div>
          <div className="mt-5">
            <FriendManager friends={friends} setFriends={setFriends} compact />
          </div>
          {effectiveMode === "equal" && (
            <div className="split-people-editor">
              <Field label="Number of people" type="number" value={names.length} onChange={(value) => {
                const count = Math.max(1, Number(value || 1));
                setNames(Array.from({ length: count }, (_, index) => names[index] || friends[index] || `Friend ${index + 1}`));
              }} />
              <div className="grid gap-2">
                <span className="text-sm font-black text-zinc-500">People included</span>
                {names.map((name, index) => (
                  <input
                    key={index}
                    className="input"
                    value={name}
                    onChange={(event) => setNames(names.map((item, itemIndex) => itemIndex === index ? event.target.value : item))}
                  />
                ))}
              </div>
              <div>
                <span className="text-sm font-black text-zinc-500">Auto-fill from friends</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {friends.map((friend) => (
                    <button key={friend} className="friend-chip" onClick={() => !names.includes(friend) && setNames([...names, friend])}>
                      {friend}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          {splitMode === "items" && !canSplitByItems && (
            <div className="mt-5 rounded-3xl bg-amber-300/10 p-4 font-bold text-amber-100">
              No items have assigned people yet, so Sync is falling back to equal split.
            </div>
          )}
          <Button className="mt-5 w-full" onClick={() => persist()}>Save payment status</Button>
        </section>
        <section className="payment-list-zone">
          <div className="payment-list-head">
            <div>
              <p>Payment list</p>
              <h3>Everyone’s share</h3>
            </div>
            <span>{split.people.length} people</span>
          </div>
          <div className="payment-list">
            {split.people.map((person, index) => (
              <div key={person.id} className="payment-row" style={{ animationDelay: `${index * 70}ms` }}>
                <div className="payment-person">
                  <Avatar name={person.name} small />
                  <div>
                    <strong>{person.name}</strong>
                    <small>{effectiveMode === "items" ? "Assigned items" : "Equal share"}</small>
                  </div>
                </div>
                <div className="owed-total">
                  <span>Owes</span>
                  <strong>{money(person.amount)}</strong>
                </div>
                <label className={`paid-toggle ${person.paid ? "is-paid" : ""}`}>
                  <input className="sr-only" type="checkbox" checked={person.paid || false} onChange={(event) => {
                    const next = split.people.map((current) => current.id === person.id ? { ...current, paid: event.target.checked } : current);
                    setPeople(next);
                    persist(next);
                  }} />
                  {person.paid ? "Paid" : "Unpaid"}
                </label>
              </div>
            ))}
          </div>
          <SyncSettlement split={split} receipts={includedReceipts} transfers={transfers} />
          <HistoryPanel
            receipts={receipts}
            splits={splits}
            setReceiptId={setReceiptId}
            setSplitScope={setSplitScope}
            setSplitMode={setSplitMode}
            setNames={setNames}
            setPeople={setPeople}
          />
        </section>
        <aside className="share-zone">
          {demoStep === 8 && (
            <div className="demo-action-card mb-4">
              <div>
                <span>Final step</span>
                <strong>Generate a personal bill</strong>
                <p>Switch to Weng Yee’s card to answer exactly who they pay.</p>
              </div>
              <Button onClick={showPersonalDemo}>Show personal card</Button>
            </div>
          )}
          <ShareComposer split={split} receipt={receipt} receipts={includedReceipts} transfers={transfers} demoStep={demoStep} personalBillFocus={personalBillFocus} />
          <div className="bills-ready-cta">
            <SyncLogo size="small" wordmark />
            <div>
              <strong>Bills are ready to send</strong>
              <p>Turn this settlement into clean personal bill tiles.</p>
            </div>
            <Button onClick={continueToBills}>Continue to Bills Ready</Button>
          </div>
        </aside>
      </div>
    </Page>
  );
}

function SettlementCompletePage({ context, go, resetAndStartDemo, flash }) {
  const [selectedPerson, setSelectedPerson] = useState(null);
  const { linkedPlan, receipts, receipt, split, transfers } = context;
  const title = linkedPlan?.title || split.merchant;
  const copyText = () => {
    const lines = [
      `Sync Settlement for ${title}`,
      "",
      `Total settled: ${money(split.total)}`,
      "",
      ...split.people.flatMap((person) => {
        const personalTransfers = transfersForPerson(transfers, person.name);
        return [
          `${person.name}:`,
          ...(personalTransfers.length
            ? personalTransfers.map((transfer) => `Pay ${transfer.to} ${money(transfer.amount)}`)
            : ["You're settled."]),
          "",
        ];
      }),
      "Personal bills are ready.",
    ];
    return lines.join("\n");
  };
  const copyAll = async () => {
    const text = copyText();
    try {
      if (navigator.clipboard) await navigator.clipboard.writeText(text);
      else throw new Error("clipboard fallback");
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
    }
    flash("Copied");
  };
  const backRoute = linkedPlan ? `split-plan/${linkedPlan.id}` : `split/${receipt.id}`;

  return (
    <div className="settlement-complete page-enter">
      <section className="settlement-hero">
        <span className="complete-glow"></span>
        <div className="relative">
          <SyncLogo size="large" appIcon wordmark tagline />
          <h1>Settlement Complete</h1>
          <p>Everyone now knows exactly who to pay.</p>
          <div className="settlement-complete-stats">
            <MiniStat label="Plan synced" value={linkedPlan ? "1 plan" : "1 split"} />
            <MiniStat label="Receipts added" value={`${receipts.length} receipts`} />
            <MiniStat label="Settled" value={money(split.total)} />
            <MiniStat label="Payments simplified" value={`${transfers.length} payments`} />
            <MiniStat label="Personal bills ready" value={`${split.people.length} bills`} />
          </div>
        </div>
      </section>

      <section className="bill-tile-grid">
        {split.people.map((person, index) => {
          const personalTransfers = transfersForPerson(transfers, person.name);
          const totalToPay = personalTransfers.reduce((sum, transfer) => sum + transfer.amount, 0);
          const message = buildPersonalShareText(split, receipt, receipts, person, personalTransfers);
          const copyMessage = async () => {
            try {
              if (navigator.clipboard) await navigator.clipboard.writeText(message);
              else throw new Error("clipboard fallback");
            } catch {
              const textarea = document.createElement("textarea");
              textarea.value = message;
              document.body.appendChild(textarea);
              textarea.select();
              document.execCommand("copy");
              textarea.remove();
            }
            flash("Copied");
          };
          return (
            <article className="personal-bill-tile" key={person.id} style={{ animationDelay: `${index * 90}ms` }}>
              <div className="bill-tile-head">
                <Avatar name={person.name} />
                <div>
                  <h3>{person.name}</h3>
                  <span>{person.paid ? "paid" : totalToPay > 0 ? "unpaid" : "settled"}</span>
                </div>
              </div>
              <div className="bill-total-line">
                <span>Total to pay</span>
                <strong>{money(totalToPay)}</strong>
              </div>
              <div className="bill-pay-preview">
                {personalTransfers.length ? personalTransfers.map((transfer) => (
                  <p key={`${transfer.from}-${transfer.to}`}>
                    <span>{transfer.to}</span>
                    <strong>{money(transfer.amount)}</strong>
                  </p>
                )) : <p><span>You’re settled.</span></p>}
              </div>
              <div className="bill-tile-actions">
                <button onClick={() => setSelectedPerson(person.name)}>View bill</button>
                <button onClick={copyMessage}>Copy message</button>
                <a target="_blank" href={`https://wa.me/?text=${encodeURIComponent(message)}`}>Share WhatsApp</a>
              </div>
            </article>
          );
        })}
      </section>

      <section className="settlement-final-actions">
        <Button onClick={copyAll}>Copy all payment messages</Button>
        <a className="whatsapp-button" target="_blank" href={`https://wa.me/?text=${encodeURIComponent(copyText())}`}>
          Share settlement summary to WhatsApp
        </a>
        <Button variant="glass" onClick={() => go(backRoute)}>Back to Settle hangout</Button>
        <Button variant="dark" onClick={resetAndStartDemo}>Restart demo</Button>
      </section>

      {selectedPerson && (
        <div className="bill-modal-backdrop">
          <div className="bill-modal-card">
            <button className="bill-modal-close" onClick={() => setSelectedPerson(null)}>Close</button>
            <PersonalBillCard
              refEl={null}
              split={split}
              receipt={receipt}
              receipts={receipts}
              person={split.people.find((person) => person.name === selectedPerson)}
              transfers={transfersForPerson(transfers, selectedPerson)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function Insights({ receipts, plans, splits, friends }) {
  const total = receipts.reduce((sum, receipt) => sum + Number(receipt.total || 0), 0);
  const average = receipts.length ? total / receipts.length : 0;
  const unlocked = plans.filter(planIsUnlocked).length;
  const stats = socialStats(plans, receipts, splits, friends);
  const byCategory = categories
    .map((category) => ({
      category,
      total: receipts.filter((receipt) => receipt.category === category).reduce((sum, receipt) => sum + Number(receipt.total || 0), 0),
    }))
    .filter((item) => item.total > 0);
  const biggest = byCategory.slice().sort((a, b) => b.total - a.total)[0]?.category || "None yet";
  const maxCategory = Math.max(...byCategory.map((item) => item.total), 1);
  const weekly = [0, 0, 0, 0, 0, 0, 0];
  receipts.forEach((receipt) => {
    weekly[new Date(receipt.date).getDay()] += Number(receipt.total || 0);
  });
  const maxWeek = Math.max(...weekly, 1);

  return (
    <Page title="Insights" kicker="Social and money friction reduced">
      <section className="mb-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MiniStat label="Total spent" value={money(total)} animatedValue={total} />
        <MiniStat label="Receipts" value={receipts.length} />
        <MiniStat label="Synced plans" value={unlocked} />
        <MiniStat label="Average receipt" value={money(average)} />
      </section>
      <section className="social-stats mb-5">
        <MiniStat label="Plans synced this month" value={`${stats.unlocked} plans`} />
        <MiniStat label="Outings completed" value={`${stats.outings} outings`} />
        <MiniStat label="Total split smoothly" value={money(stats.totalSplit)} />
        <MiniStat label="Friends involved" value={`${stats.friends} friends`} />
      </section>
      <section className="grid gap-5 xl:grid-cols-2">
        <div className="glass-card rounded-[30px] p-5">
          <h3 className="mb-5 text-xl font-black">Spending by category</h3>
          <div className="grid gap-4">
            {(byCategory.length ? byCategory : [{ category: "No data", total: 1 }]).map((item) => (
              <div key={item.category}>
                <div className="mb-2 flex justify-between font-bold">
                  <span>{item.category}</span>
                  <span>{item.category === "No data" ? "RM0.00" : money(item.total)}</span>
                </div>
                <div className="h-4 rounded-full bg-white/[0.06]">
                  <div className="h-4 rounded-full bg-gradient-to-r from-violet-400 to-amber-200" style={{ width: `${Math.max(8, (item.total / maxCategory) * 100)}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="glass-card rounded-[30px] p-5">
          <h3 className="mb-5 text-xl font-black">Weekly spending trend</h3>
          <div className="flex h-64 items-end gap-3">
            {weekly.map((value, index) => (
              <div key={index} className="flex flex-1 flex-col items-center gap-2">
                <div className="chart-bar w-full rounded-t-2xl bg-gradient-to-t from-blue-500 to-violet-300" style={{ height: `${Math.max(8, (value / maxWeek) * 210)}px` }}></div>
                <small className="font-black text-zinc-500">{["S", "M", "T", "W", "T", "F", "S"][index]}</small>
              </div>
            ))}
          </div>
        </div>
      </section>
      <div className="glow-card mt-5 rounded-[30px] p-6">
        <strong className="text-2xl">AI insight</strong>
        <p className="mt-2 max-w-3xl font-semibold leading-7 text-zinc-300">
          Plans with clear thresholds reduce social hesitation. Sync Settlement turns receipts into exact payment instructions.
        </p>
      </div>
    </Page>
  );
}

function FriendManager({ friends, setFriends, compact = false }) {
  const [draft, setDraft] = useState("");
  const addFriend = () => {
    const name = draft.trim();
    if (!name || friends.some((friend) => friend.toLowerCase() === name.toLowerCase())) return;
    setFriends([...friends, name]);
    setDraft("");
  };
  const editFriend = (index, value) => {
    const next = friends.map((friend, friendIndex) => (friendIndex === index ? value : friend)).filter(Boolean);
    setFriends(next.length ? next : defaultFriends);
  };
  const removeFriend = (index) => {
    const next = friends.filter((_, friendIndex) => friendIndex !== index);
    setFriends(next.length ? next : defaultFriends);
  };
  return (
    <section className={`glass-card rounded-[28px] p-4 ${compact ? "" : ""}`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-black">Friend group</h3>
          <p className="text-sm font-semibold text-zinc-500">Used for plans, item assignment, and splits.</p>
        </div>
        <span className="tag-pill">{friends.length}</span>
      </div>
      <div className="grid gap-2">
        {friends.map((friend, index) => (
          <div key={index} className="grid gap-2 sm:grid-cols-[1fr_44px]">
            <input className="input" value={friend} onChange={(event) => editFriend(index, event.target.value)} />
            <button className="rounded-2xl bg-red-400/10 font-black text-red-200 transition hover:bg-red-400/20" onClick={() => removeFriend(index)}>
              ×
            </button>
          </div>
        ))}
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
        <input className="input" placeholder="Add friend" value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => event.key === "Enter" && addFriend()} />
        <Button onClick={addFriend}>Add</Button>
      </div>
    </section>
  );
}

function Page({ title, kicker, children }) {
  return (
    <div className="page-enter">
      <div className="mb-5 rounded-[30px] border border-white/10 bg-white/[0.035] p-5 backdrop-blur">
        <p className="font-black text-violet-200">{kicker}</p>
        <h1 className="text-4xl font-black leading-tight tracking-tight sm:text-5xl">{title}</h1>
      </div>
      {children}
    </div>
  );
}

function Button({ children, onClick, variant = "primary", className = "" }) {
  const styles = {
    primary: "premium-button",
    glass: "glass-button",
    dark: "dark-button",
  };
  return (
    <button onClick={onClick} className={`${styles[variant]} rounded-2xl px-5 py-3 font-black transition duration-300 hover:-translate-y-0.5 ${className}`}>
      {children}
    </button>
  );
}

function Field({ label, value, onChange, type = "text" }) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-black text-zinc-500">{label}</span>
      <input className="input" type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function Select({ label, value, options, onChange }) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-black text-zinc-500">{label}</span>
      <select className="input" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => {
          const item = typeof option === "string" ? { value: option, label: option } : option;
          return <option key={item.value} value={item.value}>{item.label}</option>;
        })}
      </select>
    </label>
  );
}

function Segmented({ label, value, options, onChange }) {
  return (
    <div className="grid gap-2">
      <span className="text-sm font-black text-zinc-500">{label}</span>
      <div className="grid min-h-12 grid-cols-2 rounded-2xl bg-white/[0.04] p-1">
        {options.map(([id, text]) => (
          <button
            key={id}
            onClick={() => onChange(id)}
            className={`rounded-xl text-sm font-black transition ${value === id ? "bg-white text-black" : "text-zinc-500 hover:text-white"}`}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}

function ThresholdBar({ plan, large = false }) {
  if (!plan) return null;
  const yes = yesCount(plan);
  const minimum = Number(plan.minimumPeople || 1);
  const percent = Math.min(100, (yes / minimum) * 100);
  const unlocked = yes >= minimum;
  return (
    <div className={large ? "mt-6" : "mt-5"}>
      <div className="mb-2 flex justify-between text-sm font-black text-zinc-500">
        <span>Sync threshold</span>
        <span>{yes} / {minimum} yes</span>
      </div>
      <div className={`threshold-track ${large ? "is-large" : ""}`}>
        <div className={`threshold-fill ${unlocked ? "is-unlocked" : ""}`} style={{ width: `${percent}%` }}></div>
      </div>
    </div>
  );
}

function CircularThreshold({ plan, large = false }) {
  if (!plan) return null;
  const yes = yesCount(plan);
  const minimum = Math.max(1, Number(plan.minimumPeople || 1));
  const percent = Math.min(100, Math.round((yes / minimum) * 100));
  const unlocked = planIsUnlocked(plan);
  return (
    <div className={`circle-threshold ${large ? "is-large" : ""} ${unlocked ? "is-unlocked" : ""}`} style={{ "--score": `${percent}%` }}>
      <div>
        <span>{unlocked ? "Synced" : "Waiting"}</span>
        <strong>{yes}/{minimum}</strong>
        <small>{unlocked ? "Plan is synced" : "friends in"}</small>
      </div>
    </div>
  );
}

function UnlockChanceMeter({ plan, compact = false }) {
  const chance = unlockChance(plan);
  return (
    <article className={`unlock-meter ${compact ? "is-compact" : ""}`}>
      <div className="meter-ring" style={{ "--score": `${chance.score}%` }}>
        <strong>{chance.score}%</strong>
      </div>
      <div>
        <span>Unlock Chance</span>
        <p>{chance.copy}</p>
      </div>
    </article>
  );
}

function BudgetComfort({ budget, compact = false }) {
  const comfort = budgetComfort(budget);
  return (
    <article className={`budget-comfort ${comfort.tone} ${compact ? "is-compact" : ""}`}>
      <span>Budget Comfort</span>
      <strong>{comfort.label}</strong>
      {!compact && <p>{comfort.copy}</p>}
    </article>
  );
}

function PlanJourneyTimeline({ status, receiptsCount = 0 }) {
  const activeIndex = status === "planning" ? 1 : status === "unlocked" ? 2 : status === "happening" ? 3 : receiptsCount > 0 ? 5 : 4;
  const steps = ["Create", "Vote", "Sync", "Hangout", "Receipts", "Settlement"];
  return (
    <div className="journey-timeline" aria-label="Plan journey">
      {steps.map((step, index) => {
        const state = index < activeIndex ? "is-done" : index === activeIndex ? "is-current" : "";
        return (
          <span key={step} className={state}>
            <i>{index < activeIndex ? "✓" : index + 1}</i>
            <b>{step}</b>
          </span>
        );
      })}
    </div>
  );
}

function AISuggestionCard({ plan }) {
  return (
    <article className="ai-card">
      <span className="ai-badge">AI</span>
      <div>
        <strong>AI Plan Suggestion</strong>
        <p>{aiPlanSuggestion(plan)}</p>
      </div>
    </article>
  );
}

function BlurredGuests({ plan, compact = false }) {
  if (!plan) return null;
  const unlocked = planIsUnlocked(plan);
  return (
    <div className={`mt-4 flex ${compact ? "-space-x-2" : "gap-2"} ${unlocked ? "guest-reveal" : "guest-blur"}`}>
      {plan.invitedFriends.map((friend, index) => (
        <Avatar key={friend} name={friend} style={{ animationDelay: `${index * 80}ms` }} />
      ))}
    </div>
  );
}

function Avatar({ name, small = false, style }) {
  const initials = name.split(" ").map((part) => part[0]).join("").slice(0, 2);
  return (
    <span style={style} className={`avatar ${small ? "is-small" : ""}`}>
      {initials}
    </span>
  );
}

function LockBadge({ unlocked }) {
  return (
    <span className={`lock-badge ${unlocked ? "is-unlocked" : ""}`}>
      {unlocked ? "Synced" : "Waiting"}
    </span>
  );
}

function StatusPill({ status }) {
  const label = status === "unlocked" ? "synced" : status;
  return <span className={`status-pill ${status}`}>{label}</span>;
}

function VoteState({ vote = "pending" }) {
  return <span className={`vote-state ${vote}`}>{vote}</span>;
}

function InfoTile({ label, value }) {
  return (
    <article className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
      <span className="text-xs font-black uppercase text-zinc-500">{label}</span>
      <strong className="mt-2 block text-lg">{value}</strong>
    </article>
  );
}

function FeatureCard({ title, copy, tone }) {
  return (
    <article className={`feature-card ${tone}`}>
      <span></span>
      <h3>{title}</h3>
      <p>{copy}</p>
    </article>
  );
}

function MiniStat({ label, value }) {
  const numeric = typeof value === "number" ? value : Number(String(value).replace(/[^0-9.]/g, ""));
  const [shown, setShown] = useState(Number.isFinite(numeric) ? 0 : value);
  useEffect(() => {
    if (!Number.isFinite(numeric)) {
      setShown(value);
      return;
    }
    let frame = 0;
    const frames = 24;
    const timer = setInterval(() => {
      frame += 1;
      const eased = 1 - Math.pow(1 - frame / frames, 3);
      setShown(numeric * eased);
      if (frame >= frames) clearInterval(timer);
    }, 18);
    return () => clearInterval(timer);
  }, [value]);
  const display = typeof value === "string" && value.startsWith("RM")
    ? money(shown)
    : typeof value === "string" && value.includes(" ")
      ? `${Math.round(shown)} ${value.split(" ").slice(1).join(" ")}`
      : Number.isFinite(numeric)
        ? Math.round(shown)
        : value;
  return (
    <article className="glass-card rounded-[26px] p-5">
      <span className="text-sm font-black uppercase text-zinc-500">{label}</span>
      <strong className="mt-2 block text-2xl">{display}</strong>
    </article>
  );
}

function ReceiptThumb({ receipt, tall = false }) {
  return (
    <div className={`receipt-image grid place-items-center overflow-hidden ${tall ? "min-h-[520px]" : "h-52"}`}>
      {receipt.image ? (
        <img src={receipt.image} alt={`${receipt.merchant} receipt`} className="h-full w-full object-cover" />
      ) : (
        <div className="m-5 w-64 rounded-3xl bg-black/80 p-5 text-center shadow-2xl">
          <strong className="block text-xl">{receipt.merchant}</strong>
          <small className="font-bold text-zinc-500">{receipt.date}</small>
          <div className="my-4 border-t border-dashed border-white/20"></div>
          <strong className="text-3xl text-emerald-200">{money(receipt.total)}</strong>
        </div>
      )}
    </div>
  );
}

function Empty({ title, action, onClick }) {
  return (
    <div className="glass-card grid min-h-72 place-items-center rounded-[30px] p-8 text-center">
      <div>
        <div className="mb-4 flex justify-center"><SyncLogo size="large" appIcon /></div>
        <h2 className="text-3xl font-black">{title}</h2>
        <p className="mb-5 mt-2 font-semibold text-zinc-500">Sync is ready for your next outing.</p>
        <Button onClick={onClick}>{action}</Button>
      </div>
    </div>
  );
}

function SplitSnapshot({ split }) {
  return (
    <div className="glass-card rounded-[30px] p-5">
      <h3 className="mb-3 text-xl font-black">Payment status</h3>
      <div className="grid gap-2">
        {split.people.map((person) => (
          <div key={person.id} className="flex justify-between rounded-2xl bg-white/[0.04] p-3 font-bold">
            <span>{person.name}</span>
            <span className={person.paid ? "text-emerald-200" : "text-amber-200"}>{person.paid ? "Paid" : "Unpaid"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function HistoryPanel({ receipts, splits, setReceiptId, setSplitScope, setSplitMode, setNames, setPeople }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="history-panel">
      <button className="history-toggle" onClick={() => setOpen(!open)}>
        <span>History</span>
        <strong>{open ? "Hide ▲" : "Show ▼"}</strong>
      </button>
      {open && (
        <div className="history-content">
          <h4>Previous Receipts</h4>
          {receipts.slice(0, 5).map((receipt) => (
            <button key={receipt.id} onClick={() => { setReceiptId(receipt.id); setSplitScope("current"); }}>
              <span>{receipt.merchant}</span>
              <small>{receipt.date} · {money(receipt.total)} · {receipt.items.length} items{receipt.planId ? " · linked hangout" : ""}</small>
            </button>
          ))}
          <h4>Previous Splits</h4>
          {splits.slice(0, 5).map((split) => (
            <button key={split.receiptId} onClick={() => {
              if (!String(split.receiptId).startsWith("plan-")) setReceiptId(split.receiptId);
              setSplitMode(split.mode || "equal");
              setNames(split.people.map((person) => person.name));
              setPeople(split.people);
            }}>
              <span>{split.merchant}</span>
              <small>{split.date} · {money(split.total)} · {split.mode} · {split.people.length} people</small>
            </button>
          ))}
          <h4>Generated Cards</h4>
          {splits.slice(0, 3).map((split) => (
            <button key={`${split.receiptId}-cards`}>
              <span>{split.merchant}</span>
              <small>Group Card · {split.people.map((person) => `Personal Card for ${person.name}`).join(" · ")}</small>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function WhoPaidSummary({ receipts }) {
  const payers = receiptPayers(receipts);
  return (
    <section className="who-paid-summary">
      <div>
        <span>Who paid?</span>
        <strong>{receipts.length > 1 ? "Receipt payers" : `Paid by ${payers[0]?.payer || defaultFriends[0]}`}</strong>
      </div>
      <div className="who-paid-list">
        {payers.map((payer) => (
          <article key={`${payer.merchant}-${payer.payer}`}>
            <Avatar name={payer.payer} small />
            <span>{payer.payer} paid {payer.merchant}</span>
            <strong>{money(payer.total)}</strong>
          </article>
        ))}
      </div>
    </section>
  );
}

function SyncSettlement({ split, receipts, transfers }) {
  const total = transfers.reduce((sum, transfer) => sum + transfer.amount, 0);
  return (
    <section className="magic-settlement">
      <div className="magic-settlement-head">
        <div>
          <span>Sync Settlement</span>
          <strong>Payments simplified.</strong>
        </div>
        <small>{transfers.length} transfers routed</small>
      </div>
      <div className="settlement-stats">
        <MiniStat label="Receipts" value={receipts.length} />
        <MiniStat label="Friends" value={split.people.length} />
        <MiniStat label="Total" value={money(split.total)} />
      </div>
      <p className="magic-copy">No more guessing who to transfer.</p>
      <div className="transfer-list">
        {transfers.length ? transfers.map((transfer, index) => (
          <article key={`${transfer.from}-${transfer.to}`} className="transfer-card" style={{ animationDelay: `${index * 75}ms` }}>
            <div className="transfer-name">
              <Avatar name={transfer.from} small />
              <span>{transfer.from}</span>
            </div>
            <span className="transfer-arrow">→</span>
            <div className="transfer-name">
              <Avatar name={transfer.to} small />
              <span>{transfer.to}</span>
            </div>
            <strong>{money(transfer.amount)}</strong>
          </article>
        )) : (
          <p className="text-sm text-zinc-500">No transfers needed yet.</p>
        )}
      </div>
    </section>
  );
}

function ShareComposer({ split, receipt, receipts, transfers = [], demoStep, personalBillFocus }) {
  const [mode, setMode] = useState(demoStep >= 9 || personalBillFocus ? "personal" : "group");
  const [selectedFriend, setSelectedFriend] = useState(split.people[0]?.name || "");
  const cardRef = useRef(null);
  const person = split.people.find((item) => item.name === selectedFriend) || split.people[0];

  useEffect(() => {
    if (demoStep >= 9 || personalBillFocus) {
      setMode("personal");
      if (split.people.some((item) => item.name === "Weng Yee")) setSelectedFriend("Weng Yee");
    }
  }, [demoStep, personalBillFocus]);

  useEffect(() => {
    if (!split.people.some((item) => item.name === selectedFriend)) {
      setSelectedFriend(split.people[0]?.name || "");
    }
  }, [split.people.map((item) => item.name).join("|")]);

  const personTransfers = transfersForPerson(transfers, person?.name);
  const text = mode === "group" ? buildShareText(split, transfers) : buildPersonalShareText(split, receipt, receipts, person, personTransfers);
  const copy = async () => {
    try {
      if (navigator.clipboard) await navigator.clipboard.writeText(text);
      else throw new Error("clipboard fallback");
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
    }
    const event = new CustomEvent("sync-toast", { detail: mode === "group" ? "Group bill copied" : "Copied" });
    window.dispatchEvent(event);
  };
  const download = async () => {
    if (!cardRef.current || !window.html2canvas) return alert("Image export is loading. Try again in a moment.");
    const canvas = await html2canvas(cardRef.current, { backgroundColor: null, scale: 2 });
    downloadCanvas(canvas, mode === "group" ? "threshold-group-split.png" : `threshold-${person.name.replaceAll(" ", "-").toLowerCase()}-bill.png`);
  };

  return (
    <div className="share-composer">
      <div className="share-tabs">
        <button className={mode === "group" ? "is-active" : ""} onClick={() => setMode("group")}>Group Card</button>
        <button className={mode === "personal" ? "is-active" : ""} onClick={() => setMode("personal")}>Personal Card</button>
      </div>
      {mode === "personal" && (
        <div className="personal-selector">
          <span>Generate card for:</span>
          <div>
            {split.people.map((item) => (
              <button key={item.id} className={item.name === person.name ? "is-active" : ""} onClick={() => setSelectedFriend(item.name)}>
                {item.name}
              </button>
            ))}
          </div>
        </div>
      )}
      {mode === "group" ? <ShareCard refEl={cardRef} split={split} transfers={transfers} receipts={receipts} /> : <PersonalBillCard refEl={cardRef} split={split} receipt={receipt} receipts={receipts} person={person} transfers={personTransfers} />}
      <div className="mt-4 grid gap-3">
        <Button onClick={copy}>{mode === "group" ? "Copy group bill text" : "Copy payment message"}</Button>
        <a className="whatsapp-button" target="_blank" href={`https://wa.me/?text=${encodeURIComponent(text)}`}>
          {mode === "group" ? "Share to WhatsApp" : "Share payment message to WhatsApp"}
        </a>
        <Button variant="dark" onClick={download}>Generate {mode === "group" ? "group" : "personal payment"} image</Button>
      </div>
    </div>
  );
}

function ShareCard({ split, refEl, transfers = [], receipts = [] }) {
  return (
    <div ref={refEl} className="share-card rounded-[32px] p-6 text-white shadow-2xl">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <SyncLogo size="small" wordmark />
          <strong className="mt-3 block text-3xl">{SPLIT_NAME}</strong>
          <span className="font-bold opacity-80">Plan together. Split smoothly.</span>
        </div>
        <span className="rounded-2xl bg-white/15 px-3 py-2 font-black">
          {split.receiptCount > 1 ? `${split.receiptCount} receipts` : `${split.people.length} people`}
        </span>
      </div>
      <div className="rounded-3xl bg-black/25 p-4">
        <div className="mb-4 flex justify-between gap-3">
          <div>
            <span className="font-bold opacity-70">{split.date}</span>
            <h3 className="text-2xl font-black">{split.merchant}</h3>
          </div>
          <strong className="text-2xl">{money(split.total)}</strong>
        </div>
        {split.receiptCount > 1 && (
          <p className="mb-4 rounded-2xl bg-white/10 px-3 py-2 text-sm font-bold">
            Total hangout cost · {split.receiptCount} receipts
          </p>
        )}
        <div className="mb-4 rounded-2xl bg-white p-4 text-black">
          <span className="text-sm font-black text-zinc-500">{split.mode === "items" ? "Split type" : "Amount per person"}</span>
          <strong className="block text-3xl">{split.mode === "items" ? "By items" : money(split.amountPerPerson)}</strong>
        </div>
        <div className="grid gap-2">
          {split.people.map((person) => (
            <div key={person.id} className="flex justify-between rounded-2xl bg-white/15 px-3 py-2 font-bold">
              <span>{person.name}</span>
              <span>{money(person.amount)} · {person.paid ? "Paid" : "Unpaid"}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-2xl bg-white/10 p-3">
          <span className="text-sm font-black opacity-70">Who paid</span>
          {receiptPayers(receipts).map((payer) => (
            <div key={`${payer.payer}-${payer.merchant}`} className="mt-2 flex justify-between text-sm font-bold">
              <span>{payer.payer} paid {payer.merchant}</span>
              <span>{money(payer.total)}</span>
            </div>
          ))}
        </div>
        {transfers.length > 0 && (
          <div className="mt-4 rounded-2xl bg-white/10 p-3">
            <span className="text-sm font-black opacity-70">Who pays who</span>
            {transfers.slice(0, 4).map((transfer) => (
              <div key={`${transfer.from}-${transfer.to}`} className="mt-2 flex justify-between text-sm font-bold">
                <span>{transfer.from} → {transfer.to}</span>
                <span>{money(transfer.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PersonalBillCard({ split, receipt, receipts, person, refEl, transfers = [] }) {
  const transferTotal = transfers.reduce((sum, transfer) => sum + transfer.amount, 0);
  const shareRows = personReceiptShares(person.name, split, receipts);
  const selfPaid = receipts.filter((item) => item.paidBy === person.name).reduce((sum, item) => sum + Number(item.total || 0), 0);
  const assignedItems = split.mode === "items"
    ? receipt.items.filter((item) => item.assigned === person.name)
    : [];
  const rows = split.mode === "items" && assignedItems.length
    ? assignedItems.map((item) => ({ name: item.name, price: Number(item.price || 0) }))
    : [{ name: `Equal share of ${split.merchant}`, price: person.amount }];
  return (
    <div ref={refEl} className="personal-card">
      <div className="personal-card-head">
        <span className="personal-logo-row"><SyncLogo size="small" /><strong>{SPLIT_NAME}</strong></span>
        <span>Personal bill</span>
      </div>
      <div className="personal-meta">
        <h3>{split.merchant}</h3>
        <p>Date: {split.date}</p>
      </div>
      <div className="personal-name">{person.name}</div>
      <div className="personal-payments">
        <span>Your share</span>
        {shareRows.map((row) => (
          <div key={`${row.merchant}-${row.paidBy}`}>
            <strong>{row.merchant}</strong>
            <em>{money(row.amount)}</em>
          </div>
        ))}
      </div>
      {split.mode === "items" && assignedItems.length && (
        <div className="personal-lines">
          {groupItemsByMerchant(assignedItems).map((group) => (
            <section key={group.merchant}>
              <h4>{group.merchant}</h4>
              {group.items.map((row, index) => (
                <div key={`${row.name}-${index}`}>
                  <span>{row.name}</span>
                  <strong>{money(row.price)}</strong>
                </div>
              ))}
            </section>
          ))}
        </div>
      )}
      <div className="personal-total">
        <span>Total share</span>
        <strong>{money(person.amount)}</strong>
      </div>
      <div className="personal-payments">
        <span>Who to pay</span>
        {transfers.length ? transfers.map((transfer) => (
          <div key={`${transfer.from}-${transfer.to}`}>
            <strong>Pay {transfer.to}</strong>
            <em>{money(transfer.amount)}</em>
          </div>
        )) : (
          <div>
            <strong>No payment needed</strong>
            <em>{money(0)}</em>
          </div>
        )}
        <div className="personal-pay-total">
          <strong>Total to pay</strong>
          <em>{money(transferTotal)}</em>
        </div>
        {selfPaid > 0 && (
          <div>
            <strong>You paid first</strong>
            <em>{money(selfPaid)}</em>
          </div>
        )}
      </div>
      <div className={`personal-status ${person.paid ? "is-paid" : ""}`}>
        <span>Settlement</span>
        <strong>{transferTotal > 0 ? "Transfer needed" : "You’re settled"}</strong>
      </div>
      <div className={`personal-status ${person.paid ? "is-paid" : ""}`}>
        <span>Status</span>
        <strong>{person.paid ? "Paid" : "Unpaid"}</strong>
      </div>
    </div>
  );
}

function UnlockBurst() {
  return (
    <div className="unlock-burst" aria-hidden="true">
      {Array.from({ length: 12 }).map((_, index) => <span key={index}></span>)}
    </div>
  );
}

function Icon({ name }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2.1,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };
  const paths = {
    home: <><path d="M3 10.5 12 3l9 7.5" /><path d="M5.5 9.5V21h13V9.5" /><path d="M9.5 21v-6h5v6" /></>,
    plans: <><path d="M5 6h14" /><path d="M5 12h14" /><path d="M5 18h8" /><path d="M17 16l2 2 3-4" /></>,
    create: <><path d="M12 5v14" /><path d="M5 12h14" /></>,
    receipts: <><path d="M7 3h10v18l-2-1-2 1-2-1-2 1-2-1V3Z" /><path d="M9 8h6" /><path d="M9 12h6" /><path d="M9 16h4" /></>,
    split: <><path d="M12 4v5" /><path d="M6 20v-4a6 6 0 0 1 12 0v4" /><path d="M8 13 5 10" /><path d="m16 13 3-3" /></>,
    insights: <><path d="M4 19V9" /><path d="M10 19V5" /><path d="M16 19v-7" /><path d="M22 19H2" /></>,
  };
  return <svg width="19" height="19" viewBox="0 0 24 24" aria-hidden="true" {...common}>{paths[name]}</svg>;
}

function buildShareText(split, transfers = []) {
  const people = split.people.map((person) => `${person.name}: ${money(person.amount)} · ${person.paid ? "Paid" : "Unpaid"}`).join("\n");
  const transferText = transfers.length
    ? `\n\nWho pays who\n${transfers.map((transfer) => `${transfer.from} → ${transfer.to}: ${money(transfer.amount)}`).join("\n")}`
    : "";
  return `${SPLIT_NAME}\n${split.merchant} · ${split.date}\n${split.receiptCount > 1 ? `Receipts: ${split.receiptCount}\n` : ""}Total: ${money(split.total)}\nPeople: ${split.people.length}\n${split.mode === "items" ? "Split: by assigned items" : `Each: ${money(split.amountPerPerson)}`}\n\n${people}${transferText}`;
}

function groupItemsByMerchant(items) {
  return Object.values(items.reduce((acc, item) => {
    const merchant = item.merchant || "Receipt";
    acc[merchant] ||= { merchant, items: [] };
    acc[merchant].items.push(item);
    return acc;
  }, {}));
}

function buildPersonalShareText(split, receipt, receipts, person, transfers = []) {
  const assignedItems = split.mode === "items"
    ? receipt.items.filter((item) => item.assigned === person.name)
    : [];
  const rows = split.mode === "items" && assignedItems.length
    ? groupItemsByMerchant(assignedItems).map((group) => `${group.merchant}\n${group.items.map((item) => `${item.name} — ${money(item.price)}`).join("\n")}`).join("\n\n")
    : `Equal share of ${split.merchant} — ${money(person.amount)}`;
  const payTo = receipt.paidBy || receipts?.[0]?.paidBy || defaultFriends[0];
  const transferTotal = transfers.reduce((sum, transfer) => sum + transfer.amount, 0);
  const instructions = transfers.length
    ? transfers.map((transfer) => `- ${money(transfer.amount)} to ${transfer.to}`).join("\n")
    : "- You’re settled.";
  return `Hi ${person.name}, your total for ${split.merchant} is ${money(person.amount)}.\n\nPlease transfer:\n${instructions}\n\nTotal to pay: ${money(transferTotal)}\nThanks!`;
}

function statusCopy(plan) {
  const remaining = Math.max(0, Number(plan.minimumPeople || 1) - yesCount(plan));
  return planIsUnlocked(plan) ? "Synced and ready" : `${remaining} more yes to sync`;
}

function downloadCanvas(canvas, filename = "threshold-split.png") {
  const link = document.createElement("a");
  link.download = filename;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
