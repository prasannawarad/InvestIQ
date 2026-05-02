"use client";

import { useEffect, useMemo, useState } from "react";
import { colors, typography } from "@investiq/ui/tokens";
import { investiqTabStyle } from "../../lib/investiqUi";
import { computeFitScore } from "@investiq/engine";
import { HoldingCard } from "../components/HoldingCard";
import { useAuth } from "../components/auth/AuthProvider";
import { supabase } from "../../lib/supabase";
import { getDashboardData } from "../../lib/supabaseData";
import { mapDashboardToPortfolio, mapDashboardToUserProfile } from "../../lib/engineAdapter";

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
        const data = await getDashboardData(supabase, user.id);
        const portfolio = mapDashboardToPortfolio(data);
        const userProfile = mapDashboardToUserProfile(data);
        const fitBySymbol = new Map(
          portfolio.holdings.map((holding) => [holding.symbol, computeFitScore(holding, userProfile)])
        );

        const mapped = data.holdings.map((holding) => ({
          id: holding.symbol,
          name: holding.name,
          type: toTypeLabel(holding.subcategory),
          value: toCurrency(holding.current_value),
          fitScore: fitBySymbol.get(holding.symbol) ?? 70,
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
    <main className="px-4 py-10 sm:px-6 md:ml-60 md:px-8 md:py-12">
      <h1 className="mb-8 text-4xl" style={{ color: colors.text, fontFamily: typography.serif }}>
        Your holdings
      </h1>

      {error ? (
        <div className="mb-6 text-sm" style={{ color: colors.coral }}>
          {error}
        </div>
      ) : null}

      <div className="mb-8 flex flex-wrap gap-3">
        {filters.map((item) => (
          <button key={item} type="button" onClick={() => setFilter(item)} style={investiqTabStyle(filter === item)}>
            {item}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((holding) => (
          <HoldingCard key={holding.id} {...holding} />
        ))}
      </div>
    </main>
  );
}
