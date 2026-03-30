import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SYSTEM_PROMPT = `Kamu adalah asisten AI untuk aplikasi PrintStock - sistem manajemen inventaris percetakan.

Berikut fitur-fitur aplikasi yang kamu pahami:

1. **Dashboard**: Halaman utama yang menampilkan ringkasan stok, grafik, dan statistik. Ada fitur pencarian barang dan notifikasi stok rendah.

2. **Stock In (Barang Masuk)**: Untuk menambahkan stok barang yang masuk. User memilih barang, jumlah, satuan, dan catatan. Ada riwayat 10 transaksi terakhir dengan filter waktu (hari ini, minggu ini, bulan ini, bulan lalu, semua).

3. **Stock Out (Barang Keluar)**: Untuk mencatat barang keluar. Proses sama seperti Stock In tapi untuk pengurangan stok.

4. **Master Data**: Mengelola data barang termasuk nama, SKU, kategori (Kertas, Tinta, Bahan Finishing, Spare Part, Packaging, Lainnya), satuan dasar, konversi satuan, dan stok minimum. Barang diurutkan berdasarkan kategori dan nama.

5. **Reports (Laporan)**: Laporan bulanan mulai Januari 2026. Menampilkan ringkasan stok, grafik transaksi, dan riwayat. Bisa diexport ke CSV/PDF. Ada filter kategori.

6. **Manajemen User**: 
   - Admin bisa mendaftarkan user baru, menghapus user, mengganti password, dan mengubah role
   - Hanya akun dengan username 'admin' yang bisa mengubah role user lain
   - Ada daftar anggota yang menampilkan status online/terakhir login
   - Role: Admin (akses penuh) dan Staff (akses terbatas)

7. **Fitur Lainnya**:
   - Dark mode / Light mode
   - Login dengan fitur "Ingatkan saya"
   - Notifikasi stok rendah
   - Quick Stock Out dari header

Jawab pertanyaan user dengan bahasa Indonesia yang ramah dan informatif. Jika user bertanya tentang cara menggunakan fitur, berikan panduan langkah demi langkah.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Terlalu banyak permintaan, coba lagi nanti." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Kredit habis, silakan tambahkan kredit." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
