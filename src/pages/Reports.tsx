import { useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getStockStatus, formatStock, CATEGORIES, Item } from "@/lib/types";
import { format, startOfMonth, endOfMonth, isWithinInterval, isBefore, isAfter, addMonths } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { Package, ArrowDownUp, TrendingUp, AlertTriangle, FileDown, FileSpreadsheet, Loader2 } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { useToast } from "@/hooks/use-toast";
import { useItems, useTransactions } from "@/hooks/use-inventory";

const STATUS_STYLES: Record<string, string> = {
  safe: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  mid: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  low: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};
const STATUS_LABEL: Record<string, string> = { safe: "Aman", mid: "Menipis", low: "Kritis" };

function downloadCSV(filename: string, headers: string[], rows: string[][]) {
  const csvContent = [headers.join(","), ...rows.map(r => r.map(c => `"${c}"`).join(","))].join("\n");
  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

function exportPDF(title: string) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;
  const content = document.querySelector("[data-print-area]");
  if (!content) return;
  printWindow.document.write(`<!DOCTYPE html><html><head><title>${title}</title><style>body{font-family:Arial,sans-serif;padding:20px;color:#333}h1{font-size:20px;margin-bottom:4px}h2{font-size:14px;color:#666;margin-bottom:16px}table{width:100%;border-collapse:collapse;margin-top:12px;font-size:12px}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f5f5f5;font-weight:600}.badge{padding:2px 8px;border-radius:4px;font-size:11px;font-weight:500}.safe{background:#dcfce7;color:#16a34a}.mid{background:#fef3c7;color:#d97706}.low{background:#fee2e2;color:#dc2626}@media print{body{padding:0}}</style></head><body><h1>PrintStock - ${title}</h1><h2>Tanggal: ${format(new Date(), "dd MMMM yyyy", { locale: idLocale })}</h2>${content.innerHTML}<script>window.print();window.close();</script></body></html>`);
  printWindow.document.close();
}

const Reports = () => {
  const { toast } = useToast();
  const { data: items = [], isLoading: itemsLoading } = useItems();
  const { data: transactions = [], isLoading: txLoading } = useTransactions();
  const [monthFilter, setMonthFilter] = useState(() => format(new Date(), "yyyy-MM"));
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Generate months from Jan 2026 to current month
  const monthOptions = useMemo(() => {
    const opts: { value: string; label: string }[] = [];
    let d = new Date(2026, 0, 1); // Jan 2026
    const now = new Date();
    while (!isAfter(d, now)) {
      opts.push({ value: format(d, "yyyy-MM"), label: format(d, "MMMM yyyy", { locale: idLocale }) });
      d = addMonths(d, 1);
    }
    return opts.reverse();
  }, []);

  // Selected month boundaries
  const selectedRange = useMemo(() => {
    const [y, m] = monthFilter.split("-").map(Number);
    const start = startOfMonth(new Date(y, m - 1));
    const end = endOfMonth(new Date(y, m - 1));
    const now = new Date();
    // If selected month is current month, end = now
    const effectiveEnd = isAfter(end, now) ? now : end;
    return { start, end: effectiveEnd, isCurrentMonth: isAfter(end, now) };
  }, [monthFilter]);

  // Transactions within selected month
  const filteredTx = useMemo(() => {
    let txs = transactions.filter(tx => isWithinInterval(new Date(tx.timestamp), { start: selectedRange.start, end: selectedRange.end }));
    if (categoryFilter !== "all") {
      txs = txs.filter(tx => {
        const item = items.find(i => i.id === tx.itemId);
        return item?.category === categoryFilter;
      });
    }
    return txs;
  }, [transactions, selectedRange, categoryFilter, items]);

  // Stock snapshot: current stock adjusted by transactions after the selected period
  // For current month: just current stock (filtered by category)
  // For past months: current stock - transactions after end of that month (reverse calculate)
  const stockSnapshot = useMemo(() => {
    const now = new Date();
    const isCurrentMonth = isAfter(endOfMonth(selectedRange.start), now) || format(now, "yyyy-MM") === monthFilter;

    return items.map(item => {
      let snapshotStock = item.stock;

      if (!isCurrentMonth) {
        // Subtract all transactions AFTER the selected month end to get historical stock
        const txAfter = transactions.filter(tx =>
          tx.itemId === item.id && isAfter(new Date(tx.timestamp), selectedRange.end)
        );
        txAfter.forEach(tx => {
          if (tx.type === "in") snapshotStock -= tx.baseQuantity;
          else snapshotStock += tx.baseQuantity;
        });
      }

      const status = getStockStatus(snapshotStock, item.minStock);
      return { ...item, stock: Math.max(0, snapshotStock), status, stockDisplay: formatStock(Math.max(0, snapshotStock), item.baseUnit, item.units) };
    })
    .filter(item => categoryFilter === "all" || item.category === categoryFilter)
    .sort((a, b) => {
      const order = { low: 0, mid: 1, safe: 2 };
      return order[a.status] - order[b.status];
    });
  }, [items, transactions, selectedRange, monthFilter, categoryFilter]);

  const categoryData = useMemo(() => {
    const map: Record<string, { category: string; masuk: number; keluar: number }> = {};
    CATEGORIES.forEach(c => (map[c] = { category: c, masuk: 0, keluar: 0 }));
    filteredTx.forEach(tx => {
      const item = items.find(i => i.id === tx.itemId);
      if (item && map[item.category]) {
        if (tx.type === "in") map[item.category].masuk += tx.baseQuantity;
        else map[item.category].keluar += tx.baseQuantity;
      }
    });
    return Object.values(map).filter(d => d.masuk > 0 || d.keluar > 0);
  }, [filteredTx, items]);

  const chartConfig: ChartConfig = {
    masuk: { label: "Masuk", color: "hsl(var(--primary))" },
    keluar: { label: "Keluar", color: "hsl(var(--destructive, 0 84% 60%))" },
  };

  const stats = useMemo(() => {
    const totalIn = filteredTx.filter(t => t.type === "in").reduce((s, t) => s + t.baseQuantity, 0);
    const totalOut = filteredTx.filter(t => t.type === "out").reduce((s, t) => s + t.baseQuantity, 0);
    const lowItems = stockSnapshot.filter(i => i.status === "low").length;
    return { totalIn, totalOut, txCount: filteredTx.length, lowItems };
  }, [filteredTx, stockSnapshot]);

  const handleExportStockCSV = () => {
    const headers = ["Nama", "SKU", "Kategori", "Stok", "Min Stok", "Status"];
    const rows = stockSnapshot.map(i => [i.name, i.sku, i.category, i.stockDisplay, `${i.minStock} ${i.baseUnit}`, STATUS_LABEL[i.status]]);
    downloadCSV(`stok_${monthFilter}.csv`, headers, rows);
    toast({ title: "Berhasil", description: "Data stok berhasil diexport ke CSV" });
  };

  const handleExportTxCSV = () => {
    const headers = ["Tanggal", "Barang", "Tipe", "Jumlah", "Referensi", "User"];
    const rows = filteredTx.map(tx => [
      format(new Date(tx.timestamp), "dd/MM/yyyy HH:mm"), tx.itemName,
      tx.type === "in" ? "Masuk" : "Keluar", `${tx.quantity} ${tx.unit}`, tx.reference || "-", tx.user,
    ]);
    downloadCSV(`transaksi_${monthFilter}.csv`, headers, rows);
    toast({ title: "Berhasil", description: "Riwayat transaksi berhasil diexport ke CSV" });
  };

  if (itemsLoading || txLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl font-bold text-foreground">Laporan</h1>
          <div className="flex gap-2">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Kategori" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Kategori</SelectItem>
                {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={monthFilter} onValueChange={setMonthFilter}>
              <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {monthOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card><CardContent className="p-4 flex items-center gap-3"><div className="rounded-lg bg-primary/10 p-2.5"><Package className="h-5 w-5 text-primary" /></div><div><p className="text-xs text-muted-foreground">Total Transaksi</p><p className="text-xl font-bold text-foreground">{stats.txCount}</p></div></CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3"><div className="rounded-lg bg-safe/10 p-2.5"><TrendingUp className="h-5 w-5 text-safe" /></div><div><p className="text-xs text-muted-foreground">Barang Masuk</p><p className="text-xl font-bold text-foreground">{stats.totalIn.toLocaleString()}</p></div></CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3"><div className="rounded-lg bg-primary/10 p-2.5"><ArrowDownUp className="h-5 w-5 text-primary" /></div><div><p className="text-xs text-muted-foreground">Barang Keluar</p><p className="text-xl font-bold text-foreground">{stats.totalOut.toLocaleString()}</p></div></CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3"><div className="rounded-lg bg-low/10 p-2.5"><AlertTriangle className="h-5 w-5 text-low" /></div><div><p className="text-xs text-muted-foreground">Stok Kritis</p><p className="text-xl font-bold text-foreground">{stats.lowItems}</p></div></CardContent></Card>
        </div>

        <Tabs defaultValue="stock" className="space-y-4">
          <TabsList>
            <TabsTrigger value="stock">Ringkasan Stok</TabsTrigger>
            <TabsTrigger value="transactions">Riwayat Transaksi</TabsTrigger>
            <TabsTrigger value="chart">Grafik Kategori</TabsTrigger>
          </TabsList>

          <TabsContent value="stock">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">
                  Ringkasan Stok — {monthOptions.find(o => o.value === monthFilter)?.label}
                </CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExportStockCSV}><FileSpreadsheet className="h-4 w-4" /> Excel/CSV</Button>
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => exportPDF("Ringkasan Stok")}><FileDown className="h-4 w-4" /> PDF</Button>
                </div>
              </CardHeader>
              <CardContent data-print-area>
                {stockSnapshot.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Belum ada data barang.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader><TableRow><TableHead>Nama Barang</TableHead><TableHead>SKU</TableHead><TableHead>Kategori</TableHead><TableHead className="text-right">Stok</TableHead><TableHead className="text-right">Min. Stok</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {stockSnapshot.map(item => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.name}</TableCell>
                            <TableCell className="text-muted-foreground">{item.sku}</TableCell>
                            <TableCell>{item.category}</TableCell>
                            <TableCell className="text-right">{item.stockDisplay}</TableCell>
                            <TableCell className="text-right">{item.minStock} {item.baseUnit}</TableCell>
                            <TableCell><Badge variant="secondary" className={STATUS_STYLES[item.status]}>{STATUS_LABEL[item.status]}</Badge></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transactions">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Riwayat Transaksi</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExportTxCSV}><FileSpreadsheet className="h-4 w-4" /> Excel/CSV</Button>
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => exportPDF("Riwayat Transaksi")}><FileDown className="h-4 w-4" /> PDF</Button>
                </div>
              </CardHeader>
              <CardContent data-print-area>
                {filteredTx.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Tidak ada transaksi di bulan ini.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader><TableRow><TableHead>Tanggal</TableHead><TableHead>Barang</TableHead><TableHead>Tipe</TableHead><TableHead className="text-right">Jumlah</TableHead><TableHead>Referensi</TableHead><TableHead>User</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {filteredTx.map(tx => (
                          <TableRow key={tx.id}>
                            <TableCell className="text-muted-foreground whitespace-nowrap">{format(new Date(tx.timestamp), "dd MMM yyyy HH:mm", { locale: idLocale })}</TableCell>
                            <TableCell className="font-medium">{tx.itemName}</TableCell>
                            <TableCell>
                              <Badge variant="secondary" className={tx.type === "in" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"}>
                                {tx.type === "in" ? "Masuk" : "Keluar"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">{tx.quantity} {tx.unit}</TableCell>
                            <TableCell className="text-muted-foreground">{tx.reference || "-"}</TableCell>
                            <TableCell className="text-muted-foreground">{tx.user}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="chart">
            <Card>
              <CardHeader><CardTitle className="text-lg">Pergerakan per Kategori</CardTitle></CardHeader>
              <CardContent>
                {categoryData.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Tidak ada data transaksi di bulan ini.</p>
                ) : (
                  <ChartContainer config={chartConfig} className="h-[350px] w-full">
                    <BarChart data={categoryData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="category" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="masuk" fill="var(--color-masuk)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="keluar" fill="var(--color-keluar)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Reports;
