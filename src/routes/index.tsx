import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
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

  const r = useMemo(() => {
    const p = parseFloat(payout) || 0;
    const m = parseFloat(miles) || 0;
    const mp = parseFloat(mpg) || 0;
    const gp = parseFloat(gasPrice) || 0;
    const w = parseFloat(wear) || 0;
    if (!m || !mp) return null;
    const gallons = m / mp;
    const gasCost = gallons * gp;
    const net = p - gasCost - w;
    const ppm = net / m;
    return { gallons, gasCost, net, ppm, worth: net > 0 && ppm >= 0.5 };
  }, [payout, miles, mpg, gasPrice, wear]);

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
        <Card className="mb-5 border-border bg-card p-5">
          <div className="flex items-baseline justify-between">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Net Profit</span>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                r?.worth ? "bg-primary text-primary-foreground" : "bg-destructive text-destructive-foreground"
              }`}
            >
              {r ? (r.worth ? "WORTH IT" : "SKIP") : "—"}
            </span>
          </div>
          <div className="mt-1 text-5xl font-bold tabular-nums">
            {r ? `$${r.net.toFixed(2)}` : "$0.00"}
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            <Stat label="$/mile" value={r ? `$${r.ppm.toFixed(2)}` : "—"} />
            <Stat label="Gas cost" value={r ? `$${r.gasCost.toFixed(2)}` : "—"} />
            <Stat label="Gallons" value={r ? r.gallons.toFixed(2) : "—"} />
          </div>
        </Card>

        {/* Inputs */}
        <Card className="space-y-4 border-border bg-card p-5">
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
          </Field>

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

          <Field label="Wear & tear ($, optional)">
            <Input
              inputMode="decimal"
              placeholder="0.00"
              value={wear}
              onChange={(e) => setWear(e.target.value)}
              className="h-12 text-lg"
            />
          </Field>

          <Button
            variant="secondary"
            className="h-12 w-full text-base"
            onClick={() => {
              setPayout(""); setMiles(""); setWear("");
            }}
          >
            Clear order
          </Button>
        </Card>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          "Worth it" = net profit positive and ≥ $0.50/mile. Adjust as you like.
        </p>
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-secondary p-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-base font-semibold tabular-nums">{value}</div>
    </div>
  );
}
