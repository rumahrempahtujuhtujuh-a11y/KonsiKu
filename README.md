# KonsiKu

Aplikasi web sederhana untuk mencatat titipan (konsinyasi) ke banyak outlet, menagih per periode, mencatat pembayaran, menganalisa produk, dan mengelola stok bahan baku. Cocok untuk UMKM makanan, kue, roti, kopi, dan produk titipan lainnya.
Satu file tampilan (`index.html`) dan satu fungsi server (`api/data.js`), tanpa build dan tanpa dependensi npm.

## Isi folder
- `index.html` : seluruh tampilan dan logika aplikasi
- `api/data.js` : penyimpanan data di server (Upstash Redis), satu akun per PIN
- `api/_seed.js` : data awal, hanya dibaca server
- `manifest.webmanifest`, `icon.svg`, `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon.png` : agar bisa dipasang di layar utama HP (logo KonsiKu bawaan)
- `vercel.json` : pengaturan Vercel (header keamanan, tidak diindeks mesin pencari)
- `robots.txt` : meminta mesin pencari tidak mengindeks

## Deploy ke GitHub dan Vercel
1. Buat repository baru di GitHub (Private) dan unggah semua file, termasuk folder `api/`.
2. Di vercel.com pilih *Add New > Project*, impor repository. Framework Preset: **Other**. Build Command dan Output Directory kosongkan, lalu *Deploy*.
3. **Hubungkan database.** Di project Vercel buka tab *Storage > Create Database*, pilih **Upstash Redis** (paket gratis cukup), lalu *Connect* ke project ini. Vercel otomatis mengisi variabel `KV_REST_API_URL` dan `KV_REST_API_TOKEN` (atau `UPSTASH_REDIS_REST_URL` dan `UPSTASH_REDIS_REST_TOKEN`; keduanya didukung).
4. **Tidak perlu membuat PIN di Vercel.** Tiap pengguna membuat PINnya sendiri saat mendaftar di aplikasi. (Opsional: `APP_SALT` berisi teks acak untuk mengacak PIN di database; isi sekali sebelum ada pengguna dan jangan diganti lagi. Opsional: `APP_PIN` bila sudah punya data lama, supaya data lama tetap terbuka dengan PIN itu.)
5. **Redeploy** (tab *Deployments* > titik tiga > *Redeploy*) bila baru mengubah variabel.
6. Buka alamat `.vercel.app`. Pengguna baru menekan *Daftar usaha baru*, pengguna lama cukup memasukkan PIN. Lalu pilih *Tambahkan ke layar utama*.

## Masuk dan pendaftaran (v1.7)
- **Halaman utama hanya PIN.** Pengguna yang sudah terdaftar cukup memasukkan PIN untuk membuka usahanya. PIN yang belum terdaftar ditolak.
- **Pengguna baru** menekan *Daftar usaha baru*: layar sambutan (atur usaha / data contoh / pulihkan cadangan), 4 langkah isian, lalu langkah terakhir **Buat PIN** (minimal 6 karakter, diulang dua kali). Akun dibuat saat langkah terakhir selesai. PIN yang sudah dipakai orang lain ditolak.
- **Data tiap pengguna terpisah.** Server menyimpan data di kunci `kk:a:<hash PIN>:d` (revisi `:r`, titik pulih `:bak:TANGGAL`). Satu PIN hanya bisa membaca dan mengubah datanya sendiri. Di perangkat, salinan data hanya milik satu PIN; saat masuk dengan PIN berbeda, salinan pengguna sebelumnya dibuang sehingga tidak bercampur. Tombol keluar menghapus salinan di perangkat.
- **Akun lama** (`APP_PIN` + kunci `rr77:data`) tetap terbuka dengan PIN lamanya, tanpa perubahan data.
- Pembatas percobaan: 10 PIN salah per 10 menit per IP (juga berlaku saat mencoba PIN yang sudah dipakai); pendaftaran maksimal 10 per hari per IP.
- **Ganti PIN**: Lainnya > Ganti PIN (isi PIN lama, PIN baru dua kali). Data dipindah ke PIN baru di server, isinya tetap. Untuk akun lama yang masih memakai `APP_PIN`, hapus `APP_PIN` di Vercel setelah mengganti PIN.
- **Simpan ke file / Pulihkan dari file**: Lainnya > Cadangkan data > *Simpan ke file* mengunduh berkas .json; Pulihkan data > *Pilih file cadangan* menimpa seluruh data akun ini dengan isi berkas (ada konfirmasi). Salin/tempel teks cadangan tetap tersedia.
- PIN tidak bisa dipulihkan bila lupa: ingatkan pengguna untuk rutin memakai *Salin cadangan*.

## Penyimpanan data
- Data utama ada di server (Upstash Redis lewat `api/data.js`), jadi sama di semua perangkat. Browser hanya menyimpan salinan agar cepat dan tetap terbuka saat sinyal buruk.
- Perubahan saat offline tersimpan di perangkat dan dikirim otomatis begitu online.
- Setiap data punya nomor revisi. Bila dua perangkat mengubah data bersamaan, yang kalah dimuat ulang dari server dan salinannya disimpan di menu **Lainnya > Data yang tertimpa**.
- Titik pulih harian: server menyimpan keadaan data sebelum perubahan pertama tiap hari, selama 30 hari (kunci `rr77:bak:TANGGAL`, bisa dibaca di konsol Upstash).
- Data awal ada di `api/_seed.js`: hanya satu outlet contoh bernama "Contoh" tanpa titipan (ganti namanya lewat tombol pensil di menu Outlet). Berkas ini tidak dilayani ke publik dan hanya dipakai bila server masih kosong.
- Cadangan manual lewat **Lainnya > Salin cadangan** tetap tersedia.

## Titipan: terjual dan retur (v1.9.2)
- Form titipan punya kolom *Jumlah titipan*, *Terjual*, dan *Retur*. Sisa di outlet = titipan - terjual - retur, dihitung otomatis.
- **Tagihan dihitung dari jumlah terjual**, bukan jumlah titipan. Retur tidak ditagih. Terjual terisi otomatis sama dengan titipan dikurangi retur sampai Anda mengubahnya; ubah titipan lewat tombol pensil saat laporan penjualan masuk.
- Titipan lama (tanpa data terjual) dianggap terjual semua, sehingga tagihan lama tidak berubah.

## Menu Outlet: tabel dan kelompok (v1.9.3)
- Titipan tiap outlet tampil sebagai **tabel** (Tanggal, Produk, Jml terjual, Subtotal, Aksi ubah/hapus).
- Dikelompokkan **per bulan**, lalu per status: *Belum lunas* (terbuka) dan *Lunas* (terlipat). Tekan judul kelompok untuk membuka/menutup.

## Daftar produk & harga (v1.9.4)
- Lainnya > Daftar produk & harga berupa baris isian (Nama, Harga, tombol hapus), bukan lagi teks `Nama = harga`. Ada *Tambah produk*, *Urutkan A-Z*, dan *Simpan produk*.
- Validasi saat simpan: nama wajib, harga bilangan bulat 1 sampai 10.000.000, nama tidak boleh kembar (huruf besar/kecil dianggap sama), maksimal 60 produk. Baris yang salah ditandai merah. Baris kosong diabaikan.
- Mengganti nama produk tidak mengubah titipan lama.

## Persiapan Play Store (v1.9.5)
- Tambahan: `sw.js` (bisa dibuka tanpa internet), `privacy.html` (kebijakan privasi), `hapus-akun.html` + menu *Lainnya > Hapus akun* (metode `DELETE` di `api/data.js`), `.well-known/assetlinks.json` (isi saat rilis), manifest lengkap.
- `syarat.html` (Syarat Penggunaan, v1.9.6), tertaut dari aplikasi dan halaman privasi.
- Panduan lengkap dan daftar cek: lihat `PLAYSTORE.md`.

## Menu Bayar
- Catat pembayaran dari tiap outlet (tanggal, jumlah, cara bayar, catatan). Tombol *Lunasi* mengisi jumlah sisa tagihan.
- **Sisa tagihan = total titipan outlet dikurangi total pembayaran**, dihitung otomatis. Menghapus pembayaran mengembalikan sisa tagihan.
- **Pilih titipan yang dibayar (v1.9.1):** di form *Catat pembayaran* tampil daftar titipan outlet yang belum lunas. Centang titipan yang dibayar, jumlah terisi otomatis (bisa diubah). Titipan yang sudah lunas tidak tampil lagi. Bila tidak ada yang dicentang, pembayaran tetap dialokasikan ke titipan paling lama lebih dulu.
- Pembayaran dialokasikan ke titipan paling lama lebih dulu, sehingga tiap titipan di tab Outlet berlabel *Lunas*, *Sebagian*, atau *Belum*.
- Beranda menampilkan *Belum dibayar* dan *Sudah diterima*. Laporan WhatsApp menambahkan baris *Sudah dibayar* dan *Sisa* bila sudah ada pembayaran.

## Alur tagihan per periode
- Titipan dicatat tiap hari. Setelah sekitar 7 sampai 8 hari, tagih ke outlet lalu tekan **Tutup tagihan** (menu Bayar, per outlet).
- Titipan dan pembayaran periode itu ditandai tertutup, sehingga **tagihan kembali 0** dan dihitung lagi dari awal. Data lama tidak dihapus: tetap dipakai untuk analisa dan tersimpan di *Tagihan yang sudah ditutup* (ada tombol Salin untuk laporannya).
- Sisa yang belum dibayar saat tutup tidak dibawa ke periode baru, hanya tercatat di riwayat.

## Menu Beranda dan Analisa
Menu Analisa digabung ke Beranda: ringkasan di atas, analisa produk (pilih Bulan ini / 7 hari / Semua) di bawahnya.

## Beranda, Laporan, dan Ubah data
- Kartu utama Beranda adalah **Tagihan berjalan**: sisa dari titipan yang belum lunas (periode yang belum ditutup).
- **Laporan** berisi rekap per pembayaran (klaster). Tiap pembayaran yang masuk menjadi satu rekap berisi titipan yang dilunasinya (paling lama lebih dulu), dengan tombol *Salin rekap* untuk WhatsApp dan *Salin semua rekap*. Titipan yang belum dibayar tidak masuk rekap. Tombol *Salin tagihan* di Beranda menyalin daftar tagihan lengkap seperti laporan lama.
- Tombol pensil (ubah) tersedia di: titipan (Beranda dan Outlet), nama outlet, pembayaran (Bayar dan Laporan), bahan baku, serta riwayat belanja/pemakaian bahan. Titipan di periode yang sudah ditutup tidak bisa diubah; tekan *Buka lagi* di menu Bayar (Tagihan yang sudah ditutup) bila perlu memperbaikinya.

## Tampilan dan logo
- Tema biru-teal dengan aksen amber. Tiap menu punya warna sendiri. Mengikuti mode gelap/terang HP. Font Plus Jakarta Sans dari Google Fonts (font cadangan dipakai bila tidak ada internet).
- **Logo bawaan** adalah logo KonsiKu (`icon.svg`).
- **Ganti logo** di *Lainnya > Profil usaha > Pilih logo*. Satu logo itu otomatis dipakai di header, layar PIN, pratinjau pengaturan, ikon tab browser, dan ikon layar utama HP. Logo ikut tersimpan di server sehingga sama di semua perangkat. Tombol *Hapus* mengembalikan logo KonsiKu.
- Ikon layar utama HP: browser membaca ikon saat aplikasi dipasang. Setelah logo diganti, hapus pintasan lama lalu *Tambahkan ke layar utama* lagi agar ikon barunya terpakai.
- Nama usaha di *Lainnya > Profil usaha* dipakai di header dan di awal laporan WhatsApp.

## Catatan
- Keamanan: semua data lewat `/api/data` dengan PIN. Setelah 10 kali salah PIN, alamat IP itu dikunci 10 menit. Gunakan PIN yang tidak mudah ditebak (bukan 123456).
- Font memakai Google Fonts. Tanpa internet, tampilan memakai font cadangan.

## Biaya dan Laporan (v1.9)
- **Menu Biaya**: catat pengeluaran (tanggal, jumlah, kategori, keterangan), ubah/hapus, ringkasan per kategori, filter periode (bulan ini / 7 hari / semua).
- **Laporan** berbentuk tabel dan mengikuti filter periode: Pembayaran masuk, Per cara bayar, Rincian per pembayaran (satu klaster per pembayaran, berisi tabel titipan yang dilunasi), lalu di bagian bawah **Biaya** dan **Hasil** (pembayaran masuk dikurangi biaya = untung/rugi).
- Pembelian bahan baku di menu Bahan (selain stok awal) otomatis ikut dihitung sebagai biaya di Laporan, sebagai baris terpisah, sehingga tidak perlu dicatat dua kali.
- Semua teks di aplikasi tidak lagi menyebut nama server atau penyedia hosting.

## Laporan laba rugi (v1.9.8)
- Di bagian bawah menu **Biaya** ada *Laporan laba rugi* per bulan, default **bulan berjalan** (bisa pilih bulan lain yang punya data). Susunan: Pendapatan (tiap pembayaran masuk, kolom kredit), Piutang / tagihan aktif (informasi, kolom debet), Pengeluaran (biaya dan pembelian bahan, kolom debet), lalu **Laba / (Rugi) bersih** = pendapatan - beban.

## Versi
- **1.9.8** (24 Nov 2026): laporan laba rugi bulanan di bawah menu Biaya.
- **1.9.7** (24 Nov 2026): kata server/Vercel/Upstash dihapus dari teks aplikasi dan halaman privasi/syarat/hapus akun (disebut generik); data contoh memuat retur; panduan akun uji peninjau Google di `PLAYSTORE.md`; `sw.js` mengikuti versi 1.9.7.
- **1.9.0** (23 Nov 2026): menu Biaya, Laporan berbentuk tabel dengan klaster per pembayaran, hasil akhir di bawah Laporan, info server disembunyikan.
- **1.8.0** (23 Nov 2026): menu Lainnya: Ganti PIN, Simpan ke file (.json), Pulihkan dari file.
- **1.7.0** (23 Nov 2026): halaman utama hanya PIN; pendaftaran pengguna baru lewat layar sambutan 5 langkah (termasuk Buat PIN); data tiap pengguna terpisah di server dan di perangkat; `APP_PIN` tidak lagi wajib (akun lama tetap jalan).
- **1.6.1** (23 Nov 2026): layar pendaftaran awal selalu memakai logo dan nama KonsiKu, tidak lagi memakai logo/nama sisa dari data lama di browser.
- **1.6.0** (23 Nov 2026): pendaftaran pengguna baru. Bila data masih kosong, setelah memasukkan PIN muncul layar sambutan dengan tiga pilihan (atur usaha, coba data contoh, pulihkan dari cadangan) dan 4 langkah isian: identitas usaha, outlet, produk & harga, preferensi. Profil usaha kini memuat pemilik, WhatsApp, kota, dan rekening (rekening ikut di teks tagihan). Daftar produk & harga mengisi otomatis form titipan. Pengguna lama tidak terpengaruh.
- **1.5.1** (23 Nov 2026): bila server masih kosong dan salinan di perangkat hanya berisi data contoh kosong, aplikasi memakai data awal dari server (bukan salinan kosong itu), sehingga data awal langsung tampil setelah memasukkan PIN.
- **1.5.0** (23 Nov 2026): rebranding menjadi KonsiKu. Logo dan tema diganti (tidak lagi daun dan nasi bakar); satu logo pengguna dipakai di semua tampilan termasuk favicon dan ikon layar utama; produk dan harga bawaan di form titipan dikosongkan (nama produk wajib diisi); data awal berupa satu outlet contoh. Nama kunci penyimpanan internal (`rr77:*` di Redis dan `rr77*` di browser) sengaja tidak diubah supaya data pengguna lama tetap terbaca.
- **1.4.1** (23 Nov 2026): perbaikan hasil uji menyeluruh. Dua pengguna yang menyimpan bersamaan kini digabung otomatis (tidak ada lagi yang tertimpa); data diperbarui otomatis dari server tiap 2 menit dan saat aplikasi dibuka kembali; validasi form titipan (jumlah dan harga harus bilangan bulat positif, ada pesan kesalahan); batas angka pada form bahan dan pembayaran; "Hapus semua" kini meminta mengetik HAPUS; server menolak data tidak valid tanpa membuat aplikasi mencoba menyimpan berulang.
- **1.4.0** (20 Nov 2026): menu Bahan baku mengikuti alur persediaan standar (1 Bahan, 2 Masuk, 3 Keluar, 4 Opname); ringkasan mutasi Awal + Masuk - Keluar +/- Opname = Akhir; kartu stok per bahan dengan saldo berjalan; opname stok fisik yang mencatat selisih otomatis (tidak dihitung sebagai belanja).
- **1.3.0** (20 Nov 2026): ikon menu 3D berwarna tanpa kotak latar (rumah, toko, dompet, kotak, dokumen, roda gigi, keranjang); latar warna menu aktif dihapus, diganti garis penanda kecil di atas ikon.
- **1.2.0** (20 Nov 2026): ikon menu 3D berwarna (menu bawah, judul halaman, aksi cepat); tombol + Titipan di header dihapus; logo dan nama usaha di layar PIN sama dengan dashboard (disalin di perangkat); ikon aplikasi (layar utama) disamakan dengan logo daun.
- **1.1.0** (20 Nov 2026): ikon tambah pada tombol Titipan dan Bahan, ikon hapus (tempat sampah) untuk titipan, pembayaran, riwayat bahan, bahan, dan outlet; hapus outlet; nomor versi di Lainnya dan layar PIN; latar logo transparan (putih tepi dibuang saat unggah); ikon masuk dan keluar.
- Nomor versi ada di `APP_V` dalam `index.html`; naikkan setiap kali ada perubahan, dan samakan konstanta `V` di `sw.js` (mis. `konsiku-1.9.7`) agar cache lama di HP pengguna terganti.
