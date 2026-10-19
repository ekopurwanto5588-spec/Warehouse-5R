# Aplikasi Patroli & Checklist 5R Warehouse (CKD)

Aplikasi inspeksi 5R (Ringkas, Rapi, Resik, Rawat, Rajin) modern, responsif, dan siap digunakan di Smartphone (HP) maupun Desktop PC untuk operasional gudang (Warehouse Cikuda - CKD).

---

## 🚀 Fitur Utama

1. **Patroli Multi-Shift:**
   - **Awal Shift** (07:00 - 08:00)
   - **Mid Shift** (12:00 - 13:00)
   - **End Shift** (16:00 - 17:00)
   - Indikator shift aktif otomatis berdasarkan jam lokal.

2. **9 Item Checklist Standar Warehouse:**
   1. Lantai bersih, tidak ada tumpahan atau genangan air *(Resik/Ringkas)*
   2. Rack dan pallet bersih, tidak ada tumpahan atau sisa produk *(Resik)*
   3. Tidak ada produk rusak, bocor, expired atau tanpa label *(Ringkas/Rawat)*
   4. Produk tersusun rapi sesuai lokasi tidak di lantai langsung *(Rapi)*
   5. Dinding, lampu dan ventilasi / exhaust fan bersih dan berfungsi *(Rawat)*
   6. Tidak ada sampah, kardus bekas dan tanda hama (serangga & tikus) *(Resik)*
   7. Tidak ada kebocoran atap / rembesan air di area rack *(Rawat)*
   8. Gangway / bebas hambatan, APAR tidak terhalang *(Rapi/K3)*
   9. Alat kebersihan dan handpallet tersimpan ditempatnya *(Rajin)*
   - Fitur Khusus: **Deep Cleaning Rutin hari Sabtu (DC)**.

3. **Dokumentasi Bukti Foto & Watermark Otomatis:**
   - Direct camera capture atau upload galeri dari HP.
   - Watermark stempel otomatis: **Tanggal, Jam, Shift, Nama Area, dan Nama PIC**.
   - Foto bukti per item temuan dan foto overview area.
   - Galeri foto terpadu dengan filter dan Lightbox Zoom.

4. **Tracker & Kalender Bulanan 31 Hari:**
   - Matriks visual 1-31 hari (Shift Awal, Mid, End) seperti lembar form CKD.
   - Indikator status warna: Hijau (√ Sesuai), Merah (X Ada Temuan), Abu-abu (Belum ada data).
   - Log riwayat inspeksi harian lengkap dengan skor kepatuhan (%).

5. **Monitoring Temuan & CAPA (Corrective Action):**
   - Monitoring daftar temuan berstatus *Open* dan *Resolved*.
   - Fitur tindak lanjut perbaikan: input catatan tindakan dan unggah **Foto Sesudah Perbaikan (After Photo)** untuk komparasi Before/After.

6. **Tanda Tangan Digital & Laporan Resmi:**
   - Canvas tanda tangan digital PIC langsung di layar sentuh HP atau mouse.
   - Format cetak resmi dokumen standar (`CKD-5R-SOP-01 Rev 02`).
   - Ekspor data ke Excel/CSV dan Backup JSON.

---

## 📱 Cara Menjalankan

### Cara 1: Langsung Buka di Browser (PC / Laptop)
Cukup klik ganda (double-click) file:
`warehouse-5r\index.html`

### Cara 2: Akses Bersama dari HP (Smartphone via Wi-Fi)
1. Jalankan file `start-server.bat` di folder `warehouse-5r`.
2. Buka browser di HP yang terhubung ke jaringan Wi-Fi yang sama.
3. Masukkan URL yang tertera di jendela server (contoh: `http://192.168.x.x:8080/`).
