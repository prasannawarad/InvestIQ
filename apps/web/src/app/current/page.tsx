"use client";

import { useEffect, useMemo, useState } from "react";
import { colors, radii, shadows, typography } from "@investiq/ui/tokens";
import { HoldingCard } from "../components/HoldingCard";
import { useAuth } from "../components/auth/AuthProvider";
import { getDashboardData, type HoldingRow } from "../../lib/supabaseData";

type Filter = "All" | "Stocks" | "Funds" | "Bonds" | "Gold";

const filters: Filter[] = ["All", "Stocks", "Funds", "Bonds", "Gold"];

function toCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function toTypeLabel(subcategory: string): string {
  const map: Record<string, string> = {
    large_cap: "Big established company",
    index_fund: "Broad market fund",
    large_cap_active: "Large cap mutual fund",
    corporate_bond: "Corporate bond fund",
    gold_etf: "Gold ETF",
    bond_etf: "Bond ETF",
    money_market: "Cash equivalent",
  };
  return map[subcategory] ?? "Diversified holding";
}

function toFilterBucket(assetClass: string, name: string): Filter {
  if (assetClass === "debt") return "Bonds";
  if (assetClass === "gold") return "Gold";
  if (name.toLowerCase().includes("fund") || name.toLowerCase().includes("etf")) return "Funds";
  return "Stocks";
}

function fitFromHolding(holding: HoldingRow): number {
  if (holding.asset_class === "debt") return 83;
  if (holding.asset_class === "gold") return 76;
  if (holding.asset_class === "cash") return 82;
  return 85;
}

export default function CurrentPage() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<Filter>("All");
  const [rows, setRows] = useState<
    {
      id: string;
      name: string;
      type: string;
      value: string;
      fitScore: number;
      logo: string;
      percentage: string;
      bucket: Filter;
    }[]
  >([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function init() {
      if (!user?.id) return;

      try {
        const data = await getDashboardData(user.id);
        const mapped = data.holdings.map((holding) => ({
          id: holding.symbol,
          name: holding.name,
          type: toTypeLabel(holding.subcategory),
          value: toCurrency(holding.current_value),
          fitScore: fitFromHolding(holding),
          logo: holding.name
            .split(" ")
            .slice(0, 2)
            .map((word) => word[0])
            .join("")
            .toUpperCase(),
          percentage: `${Math.round(holding.weight_in_portfolio)}%`,
          bucket: toFilterBucket(holding.asset_class, holding.name),
        }));

        if (mounted) {
          setRows(mapped);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Failed to load holdings");
        }
      }
    }

    void init();
    return () => {
      mounted = false;
    };
  }, [user?.id]);

  const filtered = useMemo(() => {
    if (filter === "All") return rows;
    return rows.filter((row) => row.bucket === filter);
  }, [filter, rows]);

  return (
    <main className="ml-60 px-8 py-12">
      <h1 className="mb-8 text-4xl" style={{ color: colors.text, fontFamily: typography.serif }}>
        Your holdings
      </h1>

      {error ? (
        <div className="mb-6 text-sm" style={{ color: colors.coral }}>
          {error}
        </div>
      ) : null}

      <div className="mb-8 flex gap-3">
        {filters.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setFilter(item)}
            className="px-6 py-2 text-sm transition-colors"
            style={{
              borderRadius: radii.pill,
              backgroundColor: filter === item ? colors.accent : colors.cardBg,
              color: filter === item ? colors.cardBg : colors.text,
              boxShadow: filter === item ? "none" : shadows.card,
            }}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {filtered.map((holding) => (
          <HoldingCard key={holding.id} {...holding} />
        ))}
      </div>
    </main>
  );
}
