# UML SIPUS Digital

Versi: 0.1 - Rancangan berdasarkan PRD 0.5  
Tanggal: 9 November 2026  
Mitra: Perpustakaan SMK Mutiara Ilmu  
Status: bahan desain dan implementasi; belum merupakan bukti sistem telah berjalan.

## 1. Acuan dan cara membaca

Acuan: [PRD_SIPUS_Digital.md](https://chatgpt.com/library?file_id=libfile_82db407304348191872468597aeafd92&account_id=personal), versi dokumen 0.5 yang diperiksa pada 9 November 2026.

Dokumen ini memisahkan kebutuhan yang telah disepakati dari usulan struktur kelas dan status. Diagram tidak menetapkan framework, engine database, penyedia WhatsApp, atau kebijakan yang masih terbuka. Class diagram merupakan model konseptual untuk dibahas, bukan DDL final.

- Use case dan activity ditulis dalam **PlantUML** agar memakai notasi UML asli: aktor, elips use case, batas sistem, aktivitas, serta node awal/akhir.
- Sequence, class, dan state ditulis dalam **Mermaid**, sehingga dapat ditampilkan pada pembaca Markdown yang mendukung Mermaid.
- Blok `plantuml` memerlukan renderer PlantUML atau ekstensi yang sesuai; sebagian pembaca Markdown akan menampilkannya sebagai teks kode.
- **Activity diagram berbeda dengan flowchart.** Activity menggunakan aksi berbentuk persegi panjang membulat, keputusan dengan guard, node awal terisi, serta node akhir UML. Jajar genjang untuk input/output merupakan konvensi flowchart, bukan kewajiban pada activity UML.
- Relasi `include` menunjuk dari use case utama ke fungsi yang selalu disertakan; `extend` menunjuk dari perilaku tambahan ke use case yang diperluas.
- Login merupakan use case tersendiri. Sesi petugas yang valid merupakan **prasyarat** pengelolaan/transaksi, bukan pemanggilan login ulang pada setiap operasi.

## 2. Aktor, lingkup, dan aturan

| Aktor | Interaksi |
|---|---|
| Siswa/peminjam | Membuka landing page dan katalog, presensi NIS, menerima pengingat WhatsApp; tanpa akun |
| Petugas perpustakaan | Login/logout, data siswa dan kontak, buku/stok, transaksi, denda/riwayat, laporan, pemantauan pesan |
| Layanan WhatsApp eksternal | Menerima permintaan pesan dan menyediakan hasil/status sesuai kemampuan layanan terpilih |

Kepala sekolah/yayasan menerima dokumen laporan dari petugas; tidak memiliki akun aplikasi dalam lingkup awal. Penjadwal merupakan proses internal sistem lokal, bukan pengguna manusia. Internet/komputer aktif merupakan prasyarat operasional pengiriman WA.

| ID aturan | Keputusan yang digunakan |
|---|---|
| A-01 | Siswa tanpa akun; NIS tetap identitas. Nomor WhatsApp merupakan data kontak. |
| A-02 | Masa pinjam lima hari sekolah, termasuk hari peminjaman sebagai hari ke-1. |
| A-03 | Sabtu, Minggu, dan tanggal merah dilewati untuk masa pinjam maupun denda. |
| A-04 | Setiap satu hari sekolah keterlambatan menambah Rp2.000 per buku. |
| A-05 | Buku boleh diterima fisik, tetapi sistem tetap belum dikembalikan sebelum denda lunas. Siswa bertunggakan tidak boleh meminjam lagi. |
| A-06 | Stok dikelola per judul; peminjaman mencatat jumlah. Kode unik per eksemplar tidak diwajibkan. |
| A-07 | Simpan pinjaman/pengurangan stok dan pengembalian/penambahan stok secara atomik; stok tidak negatif atau bertambah dua kali. |
| A-08 | Pengingat WA wajib otomatis dan benar-benar diterima pada demo. HTTP sukses atau log simulasi tidak mencukupi. |
| A-09 | Operasional PJBL lokal; data siswa boleh dummy. Nomor demo memakai nomor penguji yang menyetujui pesan. |

**Belum diputuskan:** denda setelah penerimaan fisik sebelum pelunasan, batas jumlah pinjaman, pengembalian/pembayaran sebagian, batas jam, libur sekolah selain tanggal merah, penanganan hilang/rusak, kewajiban nomor WA, dan alternatif siswa tanpa WA. H-1 hari sekolah pukul 09.00 WITA masih **usulan**. Jangan menafsirkan diagram sebagai persetujuan terhadap opsi tersebut.

## 3. Use case diagram

### 3.1 Layanan publik dan autentikasi

```plantuml
@startuml
left to right direction
actor "Siswa" as Siswa
actor "Petugas" as Petugas
rectangle "SIPUS Digital" {
  usecase "Melihat landing page" as UC_Landing
  usecase "Mencari dan melihat katalog" as UC_Katalog
  usecase "Melakukan presensi NIS" as UC_Presensi
  usecase "Memvalidasi NIS" as UC_ValidasiNIS
  usecase "Login petugas" as UC_Login
  usecase "Logout petugas" as UC_Logout
}
Siswa -- UC_Landing
Siswa -- UC_Katalog
Siswa -- UC_Presensi
UC_Presensi ..> UC_ValidasiNIS : <<include>>
Petugas -- UC_Login
Petugas -- UC_Logout
note bottom of UC_Presensi
  NIS tidak terdaftar tidak menghasilkan presensi.
  Riwayat pinjaman/denda bukan informasi publik.
end note
@enduml
```

### 3.2 Operasional dan pengingat

```plantuml
@startuml
left to right direction
actor "Petugas" as Petugas
actor "Siswa / penerima pesan" as Siswa
actor "Layanan WhatsApp" as WA
rectangle "SIPUS Digital" {
  usecase "Mengelola siswa dan kontak WA" as UC_Siswa
  usecase "Mengelola buku dan stok" as UC_Buku
  usecase "Memproses peminjaman" as UC_Pinjam
  usecase "Memeriksa tunggakan dan stok" as UC_Syarat
  usecase "Menghitung jatuh tempo" as UC_Tempo
  usecase "Memproses pengembalian" as UC_Kembali
  usecase "Menghitung denda" as UC_Denda
  usecase "Mengonfirmasi pelunasan" as UC_Lunas
  usecase "Melihat riwayat dan denda" as UC_Riwayat
  usecase "Menyaring dan mencetak laporan" as UC_Laporan
  usecase "Mengirim pengingat otomatis" as UC_Pengingat
  usecase "Memeriksa kelayakan dan duplikasi" as UC_Layak
  usecase "Memantau status pengiriman" as UC_Status
}
Petugas -- UC_Siswa
Petugas -- UC_Buku
Petugas -- UC_Pinjam
Petugas -- UC_Kembali
Petugas -- UC_Riwayat
Petugas -- UC_Laporan
Petugas -- UC_Status
UC_Pinjam ..> UC_Syarat : <<include>>
UC_Pinjam ..> UC_Tempo : <<include>>
UC_Kembali ..> UC_Denda : <<include>>
UC_Lunas ..> UC_Kembali : <<extend>>\n[denda > 0]
UC_Pengingat ..> UC_Layak : <<include>>
Siswa -- UC_Pengingat
WA -- UC_Pengingat
WA -- UC_Status
note bottom of UC_Lunas
  Jika belum lunas, pengembalian sistem belum selesai.
  Peminjaman baru siswa bertunggakan ditolak.
end note
note bottom of UC_Pengingat
  Dipicu penjadwal lokal sesuai konfigurasi.
  H-1 hari sekolah pukul 09.00 WITA masih usulan.
end note
note top of UC_Siswa
  Pengelolaan, transaksi, riwayat, laporan,
  dan pemantauan memerlukan sesi petugas valid.
end note
@enduml
```

### 3.3 Ringkasan skenario

| Use case | Pemicu/prasyarat | Hasil berhasil | Alternatif utama |
|---|---|---|---|
| Presensi | Siswa memasukkan NIS | Tanggal/jam kunjungan tercatat | NIS tidak dikenal ditolak |
| Peminjaman | Sesi petugas valid; siswa dan buku dipilih | Pinjaman tersimpan, jatuh tempo terbentuk, stok tersedia berkurang | Tunggakan, stok kurang, pembatalan, konflik penyimpanan |
| Pengembalian | Sesi petugas valid; pinjaman aktif dipilih | Denda lunas bila ada; pengembalian dan stok tersimpan | Belum lunas tetap belum dikembalikan; hilang/rusak menunggu aturan |
| Pengingat | Penjadwal aktif, pinjaman memenuhi jadwal | Pesan dikirim dan hasil dicatat sesuai bukti | Tidak layak, duplikat, layanan gagal, hasil belum diketahui |
| Laporan | Sesi petugas valid; jenis/filter dipilih | Pratinjau dan hasil cetak sesuai filter | Tidak ada data atau petugas tidak mencetak |

## 4. Activity diagram

### 4.1 Presensi siswa

```plantuml
@startuml
|Siswa|
start
:Memasukkan NIS;
|SIPUS Digital|
:Memvalidasi NIS terhadap data siswa;
if (NIS terdaftar?) then (ya)
  :Menyimpan tanggal dan jam kunjungan;
  :Menampilkan presensi berhasil;
else (tidak)
  :Menampilkan peringatan NIS tidak ditemukan;
endif
stop
@enduml
```

Input ulang berarti memulai percobaan presensi berikutnya. Kebijakan presensi berulang dan terminal yang diawasi petugas belum ditetapkan.

### 4.2 Peminjaman buku

```plantuml
@startuml
|Petugas|
start
:Memilih siswa berdasarkan NIS;
|SIPUS Digital|
:Memvalidasi siswa dan seluruh tunggakan;
if (Siswa valid dan tanpa tunggakan?) then (ya)
  |Petugas|
  :Memilih buku dan jumlah;
  |SIPUS Digital|
  :Memeriksa jumlah positif dan stok tersedia;
  if (Stok mencukupi?) then (ya)
    :Menghitung lima hari sekolah termasuk hari pinjam;
    :Menampilkan ringkasan peminjaman;
    |Petugas|
    if (Mengonfirmasi?) then (ya)
      |SIPUS Digital|
      :Memvalidasi ulang siswa, tunggakan, dan stok;
      :Mencoba menyimpan pinjaman dan mengurangi stok
      dalam satu transaksi data;
      if (Transaksi berhasil?) then (ya)
        :Menampilkan bukti peminjaman;
      else (tidak)
        :Membatalkan seluruh perubahan;
        :Menampilkan kegagalan atau konflik data;
      endif
    else (tidak)
      :Membatalkan peminjaman;
    endif
  else (tidak)
    :Menampilkan jumlah atau stok tidak memenuhi syarat;
  endif
else (tidak)
  :Menampilkan penolakan beserta alasannya;
endif
stop
@enduml
```

Prasyarat seluruh proses: sesi petugas valid. Pemeriksaan tunggakan mencakup denda yang sudah timbul pada pinjaman aktif, bukan hanya nominal yang pernah disimpan pada tabel pembayaran.

### 4.3 Pengembalian dan denda

```plantuml
@startuml
|Petugas|
start
:Mencari dan memilih pinjaman aktif;
:Memeriksa kondisi dan jumlah buku;
|SIPUS Digital|
if (Pinjaman masih aktif dan buku layak?) then (ya)
  :Menghitung hari sekolah keterlambatan;
  :Menghitung Rp2.000 per buku per hari sekolah;
  :Menampilkan rincian denda;
  if (Ada denda?) then (ya)
    |Petugas|
    :Memeriksa pembayaran;
    if (Denda telah lunas?) then (ya)
      :Mengonfirmasi pelunasan;
    else (tidak)
      |SIPUS Digital|
      :Tetap belum dikembalikan di sistem;
      :Menolak peminjaman baru karena tunggakan;
      :Menampilkan bahwa transaksi belum selesai;
      stop
    endif
  else (tidak)
    :Tidak memerlukan pembayaran denda;
  endif
  |Petugas|
  if (Mengonfirmasi penyelesaian?) then (ya)
    |SIPUS Digital|
    :Memvalidasi ulang pinjaman dan nominal pelunasan;
    :Mencoba menyimpan pelunasan bila ada,
    pengembalian, dan penambahan stok secara atomik;
    if (Transaksi berhasil?) then (ya)
      :Menampilkan pengembalian selesai;
    else (tidak)
      :Membatalkan seluruh perubahan;
      :Menampilkan kegagalan untuk rekonsiliasi petugas;
    endif
  else (tidak)
    :Mengakhiri sesi tanpa menyelesaikan transaksi;
  endif
else (tidak)
  :Menampilkan transaksi tidak valid
  atau kebutuhan penanganan hilang/rusak;
endif
stop
@enduml
```

**Batas interpretasi:** buku boleh diterima fisik sebelum lunas, tetapi status pengembalian sistem tetap belum selesai. Pencatatan waktu penerimaan fisik dan kelanjutan denda sesudahnya belum diputuskan. Diagram ini memodelkan pengembalian seluruh buku pada pinjaman yang dipilih; pengembalian sebagian belum ditetapkan. Pembatalan database tidak berarti uang tunai yang telah diserahkan siswa otomatis dikembalikan: petugas perlu memeriksa bukti pembayaran sebelum memproses ulang.

### 4.4 Pengingat WhatsApp otomatis

```plantuml
@startuml
|SIPUS Digital|
start
:Penjadwal lokal mulai memeriksa pinjaman;
while (Masih ada kandidat sesuai jadwal?) is (ya)
  :Mengambil kandidat berikutnya;
  :Memeriksa status aktif, jadwal, jatuh tempo,
  nomor tujuan, izin, dan riwayat pengingat;
  if (Layak dan belum diproses?) then (ya)
    :Mereservasi identitas pengingat unik;
    if (Reservasi berhasil?) then (ya)
      :Menyusun pesan dan mencatat percobaan;
      |Layanan WhatsApp|
      :Menerima permintaan pengiriman;
      |SIPUS Digital|
      if (Hasil permintaan diketahui?) then (ya)
        if (Diterima layanan?) then (ya)
          :Mencatat diproses layanan;
        else (tidak)
          :Mencatat gagal dan alasan jika tersedia;
        endif
      else (tidak)
        :Mencatat hasil belum diketahui;
        :Memerlukan pemeriksaan status sebelum kirim ulang;
      endif
    else (tidak)
      :Melewati kandidat yang sedang/sudah diproses;
    endif
  else (tidak)
    :Mencatat alasan dilewati;
  endif
endwhile (tidak)
:Mengevaluasi hasil/status pengiriman yang tersedia;
if (Ada bukti pesan masuk?) then (ya)
  :Memperbarui status diterima sesuai bukti;
else (belum)
  :Mempertahankan status sesuai bukti terakhir;
endif
stop
@enduml
```

Pembaruan status dapat tiba kemudian; diagram tidak mensyaratkan bukti diterima tersedia pada putaran penjadwal yang sama. Metode pemeriksaan status, polling atau webhook, ditentukan setelah layanan dipilih. Penjadwal tidak berjalan ketika komputer mati/tidur. Usulan penanganan jadwal terlewat: kirim susulan hanya sebelum jatuh tempo bila masih relevan; selain itu catat dilewati. Jangan mengirim ulang otomatis jika hasil permintaan sebelumnya belum diketahui.

### 4.5 Laporan

```plantuml
@startuml
|Petugas|
start
:Memilih laporan buku, peminjaman, atau kunjungan;
:Memasukkan filter/periode yang relevan;
|SIPUS Digital|
:Mengambil data sesuai filter;
if (Data tersedia?) then (ya)
  :Menyusun dan menampilkan pratinjau;
  |Petugas|
  if (Mencetak?) then (ya)
    :Mencetak laporan;
  else (tidak)
    :Mengakhiri pratinjau;
  endif
else (tidak)
  :Menampilkan hasil kosong;
endif
stop
@enduml
```

## 5. Sequence diagram

### 5.1 Presensi

```mermaid
sequenceDiagram
    actor S as Siswa
    participant U as Form Presensi
    participant L as Layanan Presensi
    participant D as Database
    S->>U: Masukkan NIS
    U->>L: catatKunjungan(NIS)
    L->>D: Cari siswa berdasarkan NIS
    D-->>L: Data siswa atau tidak ditemukan
    alt NIS ditemukan
        L->>D: Simpan tanggal dan jam kunjungan
        D-->>L: Hasil penyimpanan
        alt Penyimpanan berhasil
            L-->>U: Presensi berhasil
            U-->>S: Tampilkan konfirmasi
        else Penyimpanan gagal
            L-->>U: Gagal mencatat kunjungan
            U-->>S: Tampilkan pesan gagal
        end
    else NIS tidak ditemukan
        L-->>U: Tolak presensi
        U-->>S: Tampilkan peringatan
    end
```

### 5.2 Peminjaman

```mermaid
sequenceDiagram
    actor P as Petugas
    participant U as Form Peminjaman
    participant L as Layanan Peminjaman
    participant D as Database
    Note over P,L: Prasyarat sesi petugas valid
    P->>U: Pilih siswa, buku, dan jumlah
    U->>L: Periksa kelayakan pinjaman
    L->>D: Ambil siswa, pinjaman aktif, pelunasan, stok, kalender
    D-->>L: Data validasi
    L->>L: Hitung tunggakan terkini dan jatuh tempo
    alt Data valid, tanpa tunggakan, stok cukup
        L-->>U: Ringkasan dan jatuh tempo
        P->>U: Konfirmasi pinjaman
        U->>L: Simpan pinjaman
        L->>D: BEGIN dan validasi ulang dengan kendali konkurensi
        D-->>L: Hasil validasi ulang
        alt Syarat masih terpenuhi
            L->>D: Simpan pinjaman dan detail, kurangi stok
            alt Seluruh operasi berhasil
                L->>D: COMMIT
                D-->>L: Transaksi tersimpan
                L-->>U: Bukti peminjaman
                U-->>P: Tampilkan berhasil
            else Ada operasi gagal
                L->>D: ROLLBACK
                L-->>U: Penyimpanan gagal
            end
        else Syarat berubah atau konflik stok
            L->>D: ROLLBACK
            L-->>U: Tolak dan tampilkan alasan
        end
    else Syarat tidak terpenuhi
        L-->>U: Tolak tanpa perubahan stok
        U-->>P: Tampilkan alasan
    end
```

Peminjaman yang sudah sah tidak dibatalkan hanya karena pengiriman WhatsApp di kemudian hari gagal. Penjadwal mengambil pinjaman tersimpan secara terpisah.

### 5.3 Pengembalian dan pelunasan

```mermaid
sequenceDiagram
    actor P as Petugas
    participant U as Form Pengembalian
    participant L as Layanan Pengembalian
    participant D as Database
    Note over P,L: Sesi valid; pinjaman aktif; buku layak; pengembalian seluruh buku
    P->>U: Pilih pinjaman dan periksa buku
    U->>L: Hitung pengembalian
    L->>D: Ambil pinjaman, detail, kalender, dan pelunasan
    D-->>L: Data transaksi
    L->>L: Hitung hari sekolah dan denda per buku
    L-->>U: Rincian denda
    alt Ada denda dan belum lunas
        L-->>U: Belum dikembalikan, tidak boleh pinjam baru
        Note over U,D: Tidak menambah stok atau menyelesaikan pinjaman
    else Denda nol atau pelunasan dikonfirmasi
        P->>U: Konfirmasi pelunasan bila ada dan penyelesaian
        U->>L: Selesaikan pengembalian
        L->>D: BEGIN dan validasi ulang transaksi serta nominal
        D-->>L: Hasil validasi ulang
        alt Transaksi masih aktif dan nominal sesuai
            L->>D: Catat pelunasan bila ada, pengembalian, tambah stok
            alt Seluruh operasi berhasil
                L->>D: COMMIT
                D-->>L: Hasil transaksi
                L-->>U: Pengembalian selesai
                U-->>P: Tampilkan bukti
            else Ada operasi gagal
                L->>D: ROLLBACK
                L-->>U: Gagal, periksa pembayaran sebelum mengulang
            end
        else Transaksi tidak valid atau nominal berubah
            L->>D: ROLLBACK
            L-->>U: Tampilkan alasan dan hitung ulang bila diperlukan
        end
    end
```

Pemblokiran pinjaman berlaku selama **masih ada tunggakan siswa**, bukan hanya tunggakan pada pinjaman yang sedang dibuka. Melunasi satu pinjaman tidak otomatis menghapus blokir jika pinjaman lain masih memiliki denda.

### 5.4 Pengingat otomatis dan bukti penerimaan

```mermaid
sequenceDiagram
    participant J as Penjadwal Lokal
    participant L as Layanan Pengingat
    participant D as Database
    participant W as Layanan WhatsApp
    actor S as Siswa atau Penguji
    J->>L: Periksa jadwal pengingat
    L->>D: Ambil pinjaman, kalender, kontak, izin, riwayat
    D-->>L: Kandidat pengingat
    loop Setiap kandidat
        L->>L: Periksa kelayakan dan jatuh tempo
        alt Layak dikirim
            L->>D: Reservasi identitas pengingat unik secara atomik
            D-->>L: Hasil reservasi
            alt Reservasi baru berhasil
                L->>D: Catat percobaan dan nomor tujuan
                L->>W: Kirim pesan dengan identitas yang dilacak
                alt Permintaan diterima layanan
                    W-->>L: ID pesan atau bukti penerimaan layanan
                    L->>D: Catat diproses layanan
                    opt Pesan kemudian berhasil diterima
                        W-->>S: Pesan masuk ke WhatsApp
                        W-->>L: Bukti status jika layanan mendukung
                        L->>D: Perbarui status hanya sesuai bukti sah
                    end
                else Gagal secara pasti
                    W-->>L: Alasan gagal jika tersedia
                    L->>D: Catat gagal
                else Timeout atau hasil tidak diketahui
                    L->>D: Catat hasil belum diketahui
                    Note over L,W: Periksa status dahulu sebelum mencoba kirim ulang
                end
            else Sudah atau sedang diproses
                L->>D: Jangan membuat pengiriman kedua
            end
        else Tidak layak atau kedaluwarsa
            L->>D: Catat dilewati dan alasannya
        end
    end
    Note over J,S: Demo wajib memeriksa pesan di HP penerima; simulasi atau HTTP sukses tidak cukup
```

Layanan WA belum dipilih. Balasan status pada diagram adalah rancangan interaksi, bukan klaim semua penyedia otomatis menyediakan webhook yang dapat langsung diakses dari komputer lokal. Jika status diterima tidak tersedia dari penyedia, aplikasi tidak boleh menampilkan klaim diterima tanpa bukti; demo tetap memeriksa HP penerima.

## 6. Class diagram konseptual

### 6.1 Data siswa, buku, dan peminjaman

```mermaid
classDiagram
    direction TB
    class Siswa {
        +String nis
        +String nama
        +String kelas
        +String nomorWhatsApp
        +String pemilikNomor
        +Boolean izinPengingat
        +DateTime waktuPersetujuan
    }
    class Petugas {
        +String id
        +String nama
        +String identitasLogin
        -String passwordHash
    }
    class Buku {
        +String id
        +String judul
        +int stokTotal
        +int stokHilang
        +int stokDipinjam
        +int stokTersedia
        +cukupUntuk(jumlah) Boolean
    }
    class Peminjaman {
        +String id
        +Date tanggalPinjam
        +Date jatuhTempo
        +String statusSistem
        +DateTime waktuSelesai
    }
    class DetailPinjaman {
        +String id
        +int jumlah
        +int tarifDendaPerHari
    }
    Siswa "1" --> "0..*" Peminjaman : meminjam
    Petugas "1" --> "0..*" Peminjaman : mencatat
    Peminjaman "1" *-- "1..*" DetailPinjaman : memiliki
    Buku "1" <-- "0..*" DetailPinjaman : mengacu pada
```

Catatan model:

- NIS unik. Nomor WA tidak unik dan boleh berubah; aturan nomor wajib masih terbuka. Kepemilikan nomor, izin, dan waktu persetujuan adalah usulan atribut untuk kebutuhan pengingat.
- `stokDipinjam` dan `stokTersedia` merupakan nilai logis; boleh dihitung dari transaksi atau disimpan dengan penjagaan konsistensi. Jangan menganggap semua angka tersebut wajib menjadi kolom terpisah.
- Untuk kondisi normal model awal: `stokTersedia = stokTotal - stokHilang - stokDipinjam`. Jika kemudian ditambah stok rusak/dicadangkan, rumus perlu disesuaikan setelah kebijakannya disepakati.
- `stokDipinjam` masih mencakup buku yang sudah diserahkan fisik tetapi belum dikembalikan di sistem karena denda belum lunas, mengikuti aturan PRD saat ini. Ini membuat stok sistem dan keberadaan fisik buku bisa berbeda; jangan menambah stok tanpa transaksi penyelesaian yang sah.
- `tarifDendaPerHari` bernilai Rp2.000 per buku. Snapshot tarif merupakan usulan untuk menjaga riwayat; jumlah denda tidak cukup dihitung hanya saat halaman dibuka petugas.
- Satu peminjaman awal mempunyai satu tanggal pinjam dan jatuh tempo untuk seluruh detail. Pengembalian sebagian, perpanjangan, serta jatuh tempo berbeda di dalam satu transaksi belum ditetapkan.

### 6.2 Kalender, denda, dan pelunasan

```mermaid
classDiagram
    direction TB
    class KalenderSekolah {
        +Set tanggalMerah
        +hariSekolah(tanggal) Boolean
        +hitungJatuhTempo(tanggalPinjam) Date
        +hitungHariTerlambat(jatuhTempo, tanggalAcuan) int
    }
    class DetailPinjaman {
        +String id
        +int jumlah
        +int tarifDendaPerHari
    }
    class Denda {
        +String id
        +Date tanggalAcuan
        +int hariSekolahTerlambat
        +int nominalTerhitung
        +hitungUlang() int
    }
    class Pelunasan {
        +String id
        +int nominal
        +DateTime waktuBayar
        +String idPetugas
    }
    KalenderSekolah <.. Denda : digunakan untuk menghitung
    DetailPinjaman "1" --> "0..1" Denda : rincian kewajiban
    Denda "1" --> "0..1" Pelunasan : ditutup dengan
```

Catatan model:

- `KalenderSekolah` adalah layanan domain dan data kalender; tidak harus satu tabel bernama sama. Hari sekolah: Senin-Jumat kecuali tanggal merah. Hari pinjam adalah hari ke-1.
- Denda detail = jumlah hari sekolah terlambat × Rp2.000 × jumlah buku pada detail yang dikenai denda. Total siswa merupakan penjumlahan kewajiban yang belum lunas.
- Denda yang sudah timbul harus diperhitungkan ketika memeriksa kelayakan pinjaman, meskipun belum memiliki baris `Denda` tersimpan. Keberadaan baris tidak boleh menjadi satu-satunya dasar blokir.
- Model `0..1 Pelunasan` menggambarkan pelunasan penuh, **bukan cicilan**. Struktur penerimaan kas dan bukti pembayaran akhir diputuskan pada database; jangan menerapkan pembayaran sebagian dari diagram ini.
- Jika tidak terlambat, nominal nol dan tidak wajib membuat entitas denda/pelunasan.
- Tanggal acuan berhentinya denda saat buku diterima fisik tetapi belum lunas masih terbuka. Jangan mengunci pilihan tanggal lunas atau tanggal penerimaan tanpa keputusan.

### 6.3 Pengingat dan percobaan pengiriman

```mermaid
classDiagram
    direction TB
    class Siswa {
        +String nis
        +String nomorWhatsApp
        +Boolean izinPengingat
    }
    class Peminjaman {
        +String id
        +Date jatuhTempo
        +String statusSistem
    }
    class Pengingat {
        +String id
        +String kunciUnik
        +String jenis
        +Date jatuhTempoAcuan
        +DateTime jadwal
        +String status
    }
    class PercobaanKirim {
        +String id
        +String nomorTujuanSaatKirim
        +String isiPesan
        +DateTime waktuPercobaan
        +String idPesanPenyedia
        +String status
        +String alasanGagal
        +DateTime waktuBuktiDiterima
    }
    Siswa "1" --> "0..*" Peminjaman : meminjam
    Peminjaman "1" --> "0..*" Pengingat : dasar pengingat
    Pengingat "1" *-- "0..*" PercobaanKirim : memiliki riwayat
```

Catatan model:

- Kunci unik pengingat diusulkan dari identitas pinjaman + jenis pengingat + jatuh tempo acuan. Jadwal diperbarui pada pengingat yang sama, bukan membuat pengiriman ganda hanya karena penjadwal dijalankan ulang.
- Pengingat yang diterima atau masih diproses tidak dikirim ulang secara buta. `PercobaanKirim` mengizinkan pencatatan kegagalan dan percobaan ulang yang telah dinyatakan aman, bukan otomatis mengaktifkan retry tanpa batas.
- Nomor tujuan dan isi pesan disimpan sebagai snapshot agar riwayat tetap akurat ketika data kontak berubah.
- Jadwal H-1 pukul 09.00 WITA serta layanan WA masih usulan/keputusan terbuka. Pengingat keterlambatan berulang belum masuk lingkup.
- Kelas berulang di beberapa diagram adalah kelas yang sama, dipisah agar diagram tetap terbaca. Diagram ini bukan tambahan akun siswa atau aplikasi mobile.

## 7. State diagram pengembalian sistem

```mermaid
stateDiagram-v2
    [*] --> BelumDikembalikan: Peminjaman berhasil disimpan
    state BelumDikembalikan {
        [*] --> DalamMasaPinjam
        DalamMasaPinjam --> Terlambat: Lewat jatuh tempo pada hari sekolah
    }
    BelumDikembalikan --> BelumDikembalikan: Buku diterima fisik tetapi denda belum lunas
    BelumDikembalikan --> Selesai: Buku layak, denda nol atau lunas, simpan pengembalian berhasil
    Selesai --> [*]
```

Status pada diagram merupakan **model konseptual**, bukan keputusan enum database final. `DalamMasaPinjam` dan `Terlambat` boleh berupa hasil perhitungan, bukan kolom yang diperbarui tiap hari. Penerimaan fisik sebelum pelunasan tidak memindahkan pinjaman ke `Selesai`. Blokir siswa dihitung dari seluruh tunggakannya; tidak perlu mengubah data siswa menjadi nonaktif hanya karena ada denda.

## 8. Keterlacakan kebutuhan

| PRD | Model UML yang menjelaskan |
|---|---|
| FR-01, FR-02 | Use case layanan publik |
| FR-03 | Activity presensi dan sequence presensi |
| FR-04 | Use case login/logout dan prasyarat sesi petugas |
| FR-05, FR-12 | Use case data siswa/kontak dan class Siswa |
| FR-06 | Use case kelola buku, class Buku, validasi stok pada peminjaman |
| FR-07 | Activity/sequence peminjaman, KalenderSekolah |
| FR-08, FR-09 | Activity/sequence pengembalian, Denda/Pelunasan, state pengembalian |
| FR-10 | Use case riwayat/denda dan relasi siswa-pinjaman-detail |
| FR-11 | Use case laporan dan activity laporan |
| FR-13, FR-14, FR-15 | Activity/sequence pengingat, class Pengingat/PercobaanKirim |

## 9. Catatan untuk tahap berikutnya

1. Putuskan aturan terbuka sebelum menetapkan UML sebagai baseline final, terutama denda setelah penerimaan fisik dan kebijakan nomor WA.
2. Cocokkan layout Antigravity/Figcraft dengan alur utama serta keadaan gagal, stok kurang, tunggakan, dan status kirim yang belum diketahui.
3. Turunkan class konseptual menjadi database setelah kebijakan disepakati; tentukan atribut turunan, kendala unik, transaksi stok, serta pencatatan pembayaran.
4. Tetapkan framework, sesi petugas, penjadwal lokal, dan integrasi WA di architecture. Uji pesan masuk nyata lebih awal.
5. Flowchart dengan simbol input/output tetap berada pada PRD/proposal; jangan menggantikan activity UML dengan flowchart tanpa penjelasan notasi.
