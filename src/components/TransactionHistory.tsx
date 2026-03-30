import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowUpRight, ArrowDownRight, ChevronLeft, ChevronRight } from "lucide-react";
import { Transaction } from "@/lib/types";
import { startOfDay, startOfWeek, startOfMonth, subMonths, endOfMonth, isWithinInterval } from "date-fns";

type TimeFilter = "today" | "week" | "month" | "last_month" | "all";

const FILTER_LABELS: Record<TimeFilter, string> = {
  today: "Hari Ini",
  week: "Minggu Ini",
  month: "Bulan Ini",
  last_month: "Bulan Lalu",
  all: "Semua",
};

const PAGE_SIZE = 10;

interface TransactionHistoryProps {
  transactions: Transaction[];
  type: "in" | "out";
  title: string;
}

export function TransactionHistory({ transactions, type, title }: TransactionHistoryProps) {
  const [filter, setFilter] = useState<TimeFilter>("all");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const now = new Date();
    let txs = transactions.filter(t => t.type === type);

    if (filter === "today") {
      const start = startOfDay(now);
      txs = txs.filter(t => new Date(t.timestamp) >= start);
    } else if (filter === "week") {
      const start = startOfWeek(now, { weekStartsOn: 1 });
      txs = txs.filter(t => new Date(t.timestamp) >= start);
    } else if (filter === "month") {
      const start = startOfMonth(now);
      txs = txs.filter(t => new Date(t.timestamp) >= start);
    } else if (filter === "last_month") {
      const lastMonth = subMonths(now, 1);
      const start = startOfMonth(lastMonth);
      const end = endOfMonth(lastMonth);
      txs = txs.filter(t => isWithinInterval(new Date(t.timestamp), { start, end }));
    }

    return txs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [transactions, type, filter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // Reset page when filter changes
  const handleFilterChange = (val: TimeFilter) => {
    setFilter(val);
    setPage(0);
  };

  const isIn = type === "in";
  const colorClass = isIn ? "bg-safe/15 text-safe" : "bg-low/15 text-low";
  const Icon = isIn ? ArrowUpRight : ArrowDownRight;

  return (
    <Card className="shadow-md">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <Select value={filter} onValueChange={(v) => handleFilterChange(v as TimeFilter)}>
          <SelectTrigger className="h-8 w-[120px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {(Object.keys(FILTER_LABELS) as TimeFilter[]).map(k => (
              <SelectItem key={k} value={k}>{FILTER_LABELS[k]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {paged.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Tidak ada data.</p>
        ) : (
          <div className="space-y-3">
            {paged.map(tx => (
              <div key={tx.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                <div className={`rounded-full p-1.5 ${colorClass}`}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{tx.itemName}</p>
                  <p className="text-xs text-muted-foreground">
                    {isIn ? "+" : "-"}{tx.quantity} {tx.unit} • {tx.user}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(tx.timestamp).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}{' '}
                    {new Date(tx.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
            <Button variant="ghost" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Prev
            </Button>
            <span className="text-xs text-muted-foreground">{page + 1} / {totalPages}</span>
            <Button variant="ghost" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
