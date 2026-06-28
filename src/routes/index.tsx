import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Delivery Profit Calculator" },
      { name: "description", content: "Quickly calculate gas cost, net profit, and profit per mile for delivery orders." },
      { property: "og:title", content: "Delivery Profit Calculator" },
      { property: "og:description", content: "Quickly calculate gas cost, net profit, and profit per mile for delivery orders." },
    ],
  }),
  component: Index,
});

// Virginia regional gas price averages (USD/gal), editable by the driver.
const VA_AREAS: { name: string; price: number }[] = [
  { name: "Virginia Average", price: 3.05 },
  { name: "Richmond", price: 2.98 },
  { name: "Northern Virginia", price: 3.25 },
  { name: "Virginia Beach / Norfolk", price: 3.02 },
  { name: "Roanoke", price: 2.94 },
  { name: "Charlottesville", price: 3.10 },
  { name: "Lynchburg", price: 2.96 },
];

const VEHICLES: { name: string; mpg: number }[] = [
  { name: "2008 Toyota RAV4 (default)", mpg: 22 },
  { name: "Toyota Prius", mpg: 50 },
  { name: "Honda Civic", mpg: 33 },
  { name: "Toyota Camry", mpg: 32 },
  { name: "Ford F-150", mpg: 20 },
  { name: "Custom", mpg: 0 },
];

function Index() {
  const [payout, setPayout] = useState("");
  const [miles, setMiles] = useState("");
  const [vehicleIdx, setVehicleIdx] = useState("0");
  const [mpg, setMpg] = useState("22");
  const [areaIdx, setAreaIdx] = useState("0");
  const [gasPrice, setGasPrice] = useState(String(VA_AREAS[0].price));
  const [wear, setWear] = useState("");
  const [driveMin, setDriveMin] = useState("");
  const [waitMin, setWaitMin] = useState("");

  // Shift log
  type ShiftEntry = {
    id: number;
    payout: number;
    miles: number;
    gasCost: number;
    net: number;
    minutes: number;
    at: number;
  };
  const [shiftStart, setShiftStart] = useState<number | null>(null);
  const [shiftEnd, setShiftEnd] = useState<number | null>(null);
  const [entries, setEntries] = useState<ShiftEntry[]>([]);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!shiftStart || shiftEnd) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [shiftStart, shiftEnd]);

  const shiftMs = shiftStart ? (shiftEnd ?? now) - shiftStart : 0;
  const fmtDur = (ms: number) => {
    const s = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  const shiftTotals = useMemo(() => {
    const t = entries.reduce(
      (a, e) => ({
        payout: a.payout + e.payout,
        miles: a.miles + e.miles,
        gas: a.gas + e.gasCost,
        net: a.net + e.net,
      }),
      { payout: 0, miles: 0, gas: 0, net: 0 },
    );
    const hours = shiftMs / 3_600_000;
    return { ...t, hours, pph: hours > 0 ? t.net / hours : 0 };
  }, [entries, shiftMs]);

  const r = useMemo(() => {
    const p = parseFloat(payout) || 0;
    const m = parseFloat(miles) || 0;
    const mp = parseFloat(mpg) || 0;
    const gp = parseFloat(gasPrice) || 0;
    const w = parseFloat(wear) || 0;
    const dm = parseFloat(driveMin) || 0;
    const wm = parseFloat(waitMin) || 0;
    if (!m || !mp) return null;
    const gallons = m / mp;
    const gasCost = gallons * gp;
    const net = p - gasCost - w;
    const ppm = net / m;
    const totalMin = dm + wm;
    const hours = totalMin / 60;
    const pph = hours > 0 ? net / hours : null;
    // Worth it: positive net, >= $0.50/mile, and (if time entered) >= $20/hr
    const worth =
      net > 0 && ppm >= 0.5 && (pph === null || pph >= 20);
    return { gallons, gasCost, net, ppm, pph, totalMin, worth };
  }, [payout, miles, mpg, gasPrice, wear, driveMin, waitMin]);

  const logOrder = () => {
    if (!r) return;
    setEntries((prev) => [
      {
        id: Date.now(),
        payout: parseFloat(payout) || 0,
        miles: parseFloat(miles) || 0,
        gasCost: r.gasCost,
        net: r.net,
        minutes: r.totalMin,
        at: Date.now(),
      },
      ...prev,
    ]);
    setPayout(""); setMiles(""); setWear(""); setDriveMin(""); setWaitMin("");
  };

  const onVehicle = (v: string) => {
    setVehicleIdx(v);
    const veh = VEHICLES[parseInt(v)];
    if (veh && veh.mpg) setMpg(String(veh.mpg));
  };
  const onArea = (v: string) => {
    setAreaIdx(v);
    const a = VA_AREAS[parseInt(v)];
    if (a) setGasPrice(String(a.price));
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-xl px-4 py-6 pb-12">
        <header className="mb-4">
          <h1 className="text-2xl font-bold tracking-tight">Delivery Profit</h1>
          <p className="text-sm text-muted-foreground">Fast math while you wait for the next ping.</p>
        </header>

        {/* Result dashboard */}
        <Card
          className={`mb-5 border-transparent p-5 transition-colors ${
            r
              ? r.worth
                ? "bg-primary text-primary-foreground"
                : "bg-destructive text-destructive-foreground"
              : "border-border bg-card"
          }`}
        >
          <div className="text-xs font-semibold uppercase tracking-wider opacity-80">
            {r ? (r.worth ? "Worth it — Net Profit" : "Skip — Net Profit") : "Net Profit"}
          </div>
          <div className="mt-1 text-5xl font-bold tabular-nums">
            {r ? `$${r.net.toFixed(2)}` : "$0.00"}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
            <Stat label="$/mile" value={r ? `$${r.ppm.toFixed(2)}` : "—"} tinted={!!r} />
            <Stat label="$/hour" value={r && r.pph !== null ? `$${r.pph.toFixed(2)}` : "—"} tinted={!!r} />
            <Stat label="Gas cost" value={r ? `$${r.gasCost.toFixed(2)}` : "—"} tinted={!!r} />
            <Stat label="Total time" value={r && r.totalMin > 0 ? `${r.totalMin} min` : "—"} tinted={!!r} />
          </div>
        </Card>

        {/* Inputs */}
        <Card className="space-y-0 border-border bg-card p-5">
          {/* Order */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Payout ($)">
                <Input
                  inputMode="decimal"
                  placeholder="0.00"
                  value={payout}
                  onChange={(e) => setPayout(e.target.value)}
                  className="h-12 text-lg"
                />
              </Field>
              <Field label="Miles">
                <Input
                  inputMode="decimal"
                  placeholder="0"
                  value={miles}
                  onChange={(e) => setMiles(e.target.value)}
                  className="h-12 text-lg"
                />
              </Field>
            </div>
          </div>

          <div className="my-4 h-px bg-border" />

          {/* Vehicle */}
          <div className="space-y-4">
            <Field label="Vehicle">
              <Select value={vehicleIdx} onValueChange={onVehicle}>
                <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {VEHICLES.map((v, i) => (
                    <SelectItem key={v.name} value={String(i)}>{v.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="MPG">
              <Input
                inputMode="decimal"
                value={mpg}
                onChange={(e) => setMpg(e.target.value)}
                className="h-12 text-lg"
              />
              <a
                href="https://www.calculator.net/gas-mileage-calculator.html"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-block text-xs text-accent underline underline-offset-2 hover:opacity-80"
              >
                Note: Find out your MPG Here
              </a>
            </Field>
          </div>

          <div className="my-4 h-px bg-border" />

          {/* Time */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Drive time (min)">
                <Input
                  inputMode="decimal"
                  placeholder="0"
                  value={driveMin}
                  onChange={(e) => setDriveMin(e.target.value)}
                  className="h-12 text-lg"
                />
              </Field>
              <Field label="Pickup wait (min, optional)">
                <Input
                  inputMode="decimal"
                  placeholder="0"
                  value={waitMin}
                  onChange={(e) => setWaitMin(e.target.value)}
                  className="h-12 text-lg"
                />
              </Field>
            </div>
          </div>

          <div className="my-4 h-px bg-border" />

          {/* Fuel */}
          <div className="space-y-4">
            <Field label="Area (Virginia)">
              <Select value={areaIdx} onValueChange={onArea}>
                <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {VA_AREAS.map((a, i) => (
                    <SelectItem key={a.name} value={String(i)}>
                      {a.name} — ${a.price.toFixed(2)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Gas price ($/gal)">
              <Input
                inputMode="decimal"
                value={gasPrice}
                onChange={(e) => setGasPrice(e.target.value)}
                className="h-12 text-lg"
              />
            </Field>
          </div>

          <div className="my-4 h-px bg-border" />

          {/* Costs */}
          <div className="space-y-4">
            <Field label="Wear & tear ($, optional)">
              <Input
                inputMode="decimal"
                placeholder="0.00"
                value={wear}
                onChange={(e) => setWear(e.target.value)}
                className="h-12 text-lg"
              />
            </Field>
          </div>

          <div className="my-4 h-px bg-border" />

          <Button
            variant="secondary"
            className="h-12 w-full text-base"
            onClick={() => {
              setPayout(""); setMiles(""); setWear(""); setDriveMin(""); setWaitMin("");
            }}
          >
            Clear order
          </Button>
        </Card>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          "Worth it" = net profit positive, ≥ $0.50/mile, and ≥ $20/hr when time is entered.
        </p>

        {/* Shift log */}
        <Card className="mt-5 border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Shift
              </div>
              <div className="mt-1 text-3xl font-bold tabular-nums">
                {shiftStart ? fmtDur(shiftMs) : "0:00:00"}
              </div>
              <div className="text-xs text-muted-foreground">
                {shiftStart
                  ? shiftEnd
                    ? "Shift ended"
                    : "Recording…"
                  : "Not started"}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {!shiftStart || shiftEnd ? (
                <Button
                  className="h-12 px-5"
                  onClick={() => {
                    setShiftStart(Date.now());
                    setShiftEnd(null);
                    setEntries([]);
                  }}
                >
                  Start shift
                </Button>
              ) : (
                <Button
                  variant="destructive"
                  className="h-12 px-5"
                  onClick={() => setShiftEnd(Date.now())}
                >
                  End shift
                </Button>
              )}
              {shiftStart && !shiftEnd && (
                <Button
                  variant="secondary"
                  className="h-10 px-5"
                  disabled={!r}
                  onClick={logOrder}
                >
                  Log this order
                </Button>
              )}
            </div>
          </div>

          {entries.length > 0 && (
            <>
              <div className="my-4 h-px bg-border" />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat label="Orders" value={String(entries.length)} />
                <Stat label="Net" value={`$${shiftTotals.net.toFixed(2)}`} />
                <Stat label="Miles" value={shiftTotals.miles.toFixed(1)} />
                <Stat label="$/hour" value={`$${shiftTotals.pph.toFixed(2)}`} />
              </div>
              <div className="my-4 h-px bg-border" />
              <ul className="space-y-2">
                {entries.map((e) => (
                  <li
                    key={e.id}
                    className="flex items-center justify-between rounded-md bg-secondary px-3 py-2 text-sm"
                  >
                    <span className="tabular-nums">
                      ${e.payout.toFixed(2)} · {e.miles.toFixed(1)} mi
                      {e.minutes > 0 ? ` · ${e.minutes}m` : ""}
                    </span>
                    <span className="flex items-center gap-3">
                      <span className="font-semibold tabular-nums">
                        ${e.net.toFixed(2)}
                      </span>
                      <button
                        onClick={() =>
                          setEntries((prev) => prev.filter((x) => x.id !== e.id))
                        }
                        className="text-xs text-muted-foreground hover:text-foreground"
                        aria-label="Remove entry"
                      >
                        ✕
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function Stat({ label, value, tinted }: { label: string; value: string; tinted?: boolean }) {
  return (
    <div className={`rounded-md p-2 ${tinted ? "bg-black/15" : "bg-secondary"}`}>
      <div className={`text-[10px] uppercase tracking-wider ${tinted ? "opacity-80" : "text-muted-foreground"}`}>
        {label}
      </div>
      <div className="text-base font-semibold tabular-nums">{value}</div>
    </div>
  );
}
