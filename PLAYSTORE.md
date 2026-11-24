# Panduan rilis KonsiKu ke Google Play Store

## A. Yang harus Anda isi sebelum deploy (wajib)
1. `privacy.html`, `syarat.html`, dan `hapus-akun.html`: email kontak (Rumahdigital77@gmail.com) sudah terpasang di ketiga berkas; cukup cek tampil benar.
2. Deploy ke Vercel (push ke GitHub). Cek alamat ini terbuka:
   - `https://DOMAIN-ANDA/privacy`
   - `https://DOMAIN-ANDA/syarat`
   - `https://DOMAIN-ANDA/hapus-akun`
   - `https://DOMAIN-ANDA/sw.js`
3. Setelah membuat aplikasi Android di PWABuilder (langkah B), ganti isi `.well-known/assetlinks.json` dengan nama paket dan fingerprint SHA-256 asli (lihat langkah C), lalu deploy ulang.

## B. Membuat file .aab
1. pwabuilder.com > masukkan alamat web > Start > **Package for stores > Android**.
2. Package ID mis. `com.namaanda.konsiku` (tidak bisa diganti setelah rilis). Nama: KonsiKu. Versi: 1 (kode versi harus naik setiap unggahan baru).
3. Signing key: pilih *New*, **simpan file .keystore dan password** (jika hilang, aplikasi tidak bisa diperbarui). Sebaiknya aktifkan *Play App Signing* di Play Console.
4. Unduh paket (.aab + assetlinks.json).

## C. Hubungkan domain (Digital Asset Links)
- Di Play Console: **Setup > App signing**, salin **SHA-256 certificate fingerprint** milik *App signing key* (bukan upload key).
- Isi `.well-known/assetlinks.json`:
  `package_name` = Package ID Anda, `sha256_cert_fingerprints` = fingerprint tadi. Deploy ulang.
- Cek: `https://DOMAIN-ANDA/.well-known/assetlinks.json` harus tampil JSON. Bila benar, aplikasi tampil layar penuh tanpa bilah alamat.

## D. Isi data aplikasi di Play Console
**Nama:** KonsiKu
**Deskripsi singkat (maks 80):** Catat titipan, terjual, retur, tagihan, dan pembayaran outlet dengan mudah.
**Deskripsi lengkap:**
KonsiKu membantu usaha kecil (kue, roti, nasi, kopi, dan produk titipan lain) mencatat titipan ke banyak outlet tanpa ribet.
- Catat titipan harian: jumlah titip, terjual, dan retur. Tagihan dihitung otomatis dari yang terjual.
- Lihat titipan per outlet dalam tabel, dikelompokkan per bulan dan status lunas.
- Catat pembayaran dan pilih titipan mana yang dibayar.
- Tutup tagihan per periode dan salin rekap untuk dikirim lewat WhatsApp.
- Catat biaya dan stok bahan baku, lengkap dengan laporan untung rugi dan analisa produk.
- Data tersimpan aman di akun Anda (dengan PIN), tetap bisa dibuka saat sinyal buruk.
- Tanpa iklan.

**Kategori:** Bisnis. **Kontak:** email Anda. **Kebijakan privasi:** `https://DOMAIN-ANDA/privacy`
**Grafis:** ikon 512x512 (`icon-512.png`), feature graphic 1024x500, minimal 2 screenshot HP.

## E. Formulir wajib
- **Data safety** (jawaban sesuai aplikasi ini):
  - Mengumpulkan data: **Ya**. Dibagikan ke pihak ketiga: **Tidak** (Vercel/Upstash hanya memproses atas nama Anda sebagai penyedia layanan).
  - Jenis data: *Info pribadi* (nama, nomor telepon yang diisi pengguna), *Info keuangan* (catatan pembayaran/tagihan pengguna), *File dan dokumen* tidak. Opsional isi: ya, semuanya dimasukkan sendiri oleh pengguna.
  - Tujuan: Fungsi aplikasi. Enkripsi saat transit: **Ya**. Pengguna dapat meminta data dihapus: **Ya**.
- **Penghapusan akun (Account deletion):** URL `https://DOMAIN-ANDA/hapus-akun`; di aplikasi: Lainnya > Hapus akun.
- **Content rating:** isi kuesioner (tidak ada kekerasan, dll) > hasil biasanya "Semua usia".
- **Target audience:** 18 tahun ke atas. **Ads:** Tidak ada iklan. **App access:** tulis bahwa aplikasi butuh PIN; berikan PIN akun demo (buat akun uji khusus peninjau).
- **Government apps / financial features:** pilih bahwa aplikasi bukan aplikasi keuangan yang memberi pinjaman/transaksi; ini hanya pencatatan.

## F. Pengujian dan produksi (akun personal baru)
1. **Testing > Closed testing > Create track**, unggah .aab, tambah email minimal 12 penguji, bagikan link opt-in.
2. Penguji harus tetap bergabung **14 hari berturut-turut**. Ajak lebih dari 12 orang.
3. Setelah 14 hari: **Apply for production**, jawab pertanyaan dengan jelas, lalu rilis ke Production.
4. Setiap pembaruan aplikasi web otomatis ikut (tanpa unggah ulang ke Play Store), kecuali Anda mengubah paket Android.

## F2. Akun uji untuk peninjau Google (wajib bila aplikasi butuh PIN)
Buat sekali di aplikasi yang sudah ter-deploy, tanpa perlu alat lain:
1. Buka aplikasi di browser > **Daftar usaha baru** > **Coba dulu dengan data contoh** (sudah berisi 2 outlet, titipan dengan terjual dan retur, pembayaran, stok bahan).
2. Buat PIN khusus peninjau, mis. `Review2026` (bukan PIN pribadi Anda). Selesai, akun langsung terisi.
3. Di Play Console > **App content > App access** pilih *All or some functionality is restricted*, lalu isi:
   - Petunjuk: `Buka aplikasi. Masukkan PIN pada halaman utama, lalu tekan Masuk. Semua fitur terbuka setelah masuk.`
   - PIN: PIN akun uji tadi. (Kolom username/password: tulis PIN di kolom password, username isi "-".)
4. Jangan hapus akun uji selama peninjauan. Jangan pakai untuk data asli.

## G. Daftar cek akhir
- [ ] Email Rumahdigital77@gmail.com sudah terpasang di privacy.html, syarat.html, dan hapus-akun.html
- [ ] assetlinks.json berisi paket dan fingerprint asli
- [ ] Akun uji untuk peninjau Google sudah dibuat (PIN diberikan di App access)
- [ ] Screenshot, ikon, feature graphic sudah diunggah
- [ ] Data safety dan penghapusan akun sudah diisi
- [ ] Penguji tertutup 12+ orang, 14 hari

## H. Lisensi
- Play Store tidak mewajibkan lisensi. Play Licensing hanya untuk aplikasi berbayar.
- Jaga repositori GitHub tetap **privat** bila tidak ingin kode ditiru. Bila dipublikasikan, tambahkan file LICENSE sesuai keinginan.
- Simpan file .keystore dan password di minimal dua tempat.
