# Detail Template Layout: 1+2 (H) - Horizontal/Landscape

## Identifikasi Layout
- **ID**: `1-large-landscape`
- **Nama Display**: `1+2 (H)`
- **Icon**: `◧`
- **Total Foto**: `3 foto`

---

## Konfigurasi Grid

### Grid Structure
```
Grid System: CSS Grid
Grid Template: grid-cols-2 grid-rows-2
Total Cells: 4 (2 kolom × 2 baris)
```

### Visual Layout
```
┌────────────┬────────────┐
│            │            │
│            │  FOTO 2    │
│  FOTO      │  (kecil)   │
│  BESAR 1   │            │
│ (row-span) ├────────────┤
│            │            │
│            │  FOTO 3    │
│            │  (kecil)   │
│            │            │
└────────────┴────────────┘
```

---

## Detail Teknis

### 1. Grid Layout
```javascript
getGridLayout: 'grid-cols-2 grid-rows-2'
// Membuat grid 2 kolom × 2 baris
```

### 2. Photo Count
```javascript
getPhotoCount: 3
// Maksimal 3 foto yang akan ditampilkan
```

### 3. CSS Classes untuk Foto Pertama (Index 0)
```javascript
className: 'row-span-2'
// Foto pertama mengambil 2 baris (full height)
// Hanya mengambil 1 kolom
```

### 4. CSS Classes untuk Foto 2 & 3 (Index 1, 2)
```javascript
className: 'aspect-square'
// Foto 2 dan 3 berbentuk persegi
// Masing-masing mengambil 1 kolom, 1 baris
```

---

## Kode Implementasi

### Rendering Logic
```javascript
// Line 807 di CollageEditor.jsx
${(layout === '1-large-landscape' && index === 0) ? 'row-span-2' : ''}

// Artinya:
// - Jika layout adalah '1-large-landscape' DAN index foto adalah 0
// - Maka tambahkan class 'row-span-2' (foto memakan 2 baris)
// - Jika tidak, foto hanya mengambil 1 baris (default)
```

### Empty Slots Logic
```javascript
// Line 842 di CollageEditor.jsx  
${(layout === '1-large-landscape' && photos.length === 0 && i === 0) ? 'row-span-2' : ''}

// Artinya:
// - Jika belum ada foto sama sekali (photos.length === 0)
// - Dan ini adalah slot pertama (i === 0)
// - Maka empty slot pertama juga mengambil 2 baris
```

---

## Karakteristik Layout

### ✅ Kelebihan
1. **Foto utama dominan vertikal** - Foto pertama sangat menonjol dengan orientasi portrait
2. **Cocok untuk portrait photos** - Foto utama berbentuk portrait di kiri, 2 foto kecil di kanan
3. **Efisien ruang** - Hanya butuh 3 foto untuk layout yang balanced
4. **Komposisi vertikal** - Foto utama tinggi, cocok untuk foto manusia/bangunan

### 💡 Use Cases
- Foto profil/portrait utama dengan 2 foto detail
- Dokumentasi bangunan/arsitektur dengan 2 foto pendukung
- Layout untuk highlight 1 subjek vertikal + 2 detail horizontal
- Magazine-style layout dengan 1 hero image

### 📐 Proporsi Visual
```
Foto 1: 50% dari total area (2/4 cells) - VERTIKAL
Foto 2: 25% dari total area (1/4 cells) - Kanan atas
Foto 3: 25% dari total area (1/4 cells) - Kanan bawah
```

---

## Perbedaan dengan 1+2 (V)

| Aspek | 1+2 (H) | 1+2 (V) |
|-------|---------|---------|
| **Foto Utama** | Vertikal (portrait) | Horizontal (landscape) |
| **Posisi Besar** | Kiri (2 baris) | Atas (2 kolom) |
| **Posisi Kecil** | Kanan atas & bawah | Bawah kiri & kanan |
| **CSS Class** | `row-span-2` | `col-span-2` |
| **Orientasi Ideal** | Portrait/vertikal | Landscape/horizontal |

---

## Contoh Penggunaan

### Skenario 1: Profil Karyawan/Team Member
```
┌────────────┬────────────┐
│            │            │
│            │ Logo       │
│  Foto      │ Perusahaan │
│  Profil    │            │
│  Karyawan  ├────────────┤
│            │            │
│            │ Sertifikat │
│            │ atau Badge │
│            │            │
└────────────┴────────────┘
```

### Skenario 2: Dokumentasi Bangunan
```
┌────────────┬────────────┐
│            │            │
│            │ Detail     │
│  Foto      │ Eksterior  │
│  Bangunan  │            │
│  Penuh     ├────────────┤
│            │            │
│            │ Detail     │
│            │ Interior   │
│            │            │
└────────────┴────────────┘
```

### Skenario 3: Produk Fashion
```
┌────────────┬────────────┐
│            │            │
│            │ Detail     │
│  Model     │ Produk     │
│  Full      │ Close-up   │
│  Body      ├────────────┤
│            │            │
│            │ Detail     │
│            │ Material   │
│            │            │
└────────────┴────────────┘
```

---

## Cara Menggunakan

1. **Pilih Layout**: Klik tab "Layout" di sidebar
2. **Pilih Template**: Klik card "1+2 (H)" dengan icon ◧
3. **Upload Foto**: Upload minimal 1 foto (maksimal 3 foto akan digunakan)
4. **Urutan Foto**:
   - Foto pertama yang diupload → Posisi besar (kiri, vertikal)
   - Foto kedua → Posisi kecil (kanan atas)
   - Foto ketiga → Posisi kecil (kanan bawah)
5. **Tips**: Gunakan foto portrait/vertikal untuk foto pertama agar proporsional

---

## Perbandingan Lengkap Layout Serupa

| Layout | Grid | Foto | Foto Utama | Posisi Besar | CSS Class |
|--------|------|------|-----------|--------------|-----------|
| **1+2 (H)** | 2×2 | 3 | Portrait (vertikal) | Kiri | `row-span-2` |
| 1+2 (V) | 2×2 | 3 | Landscape (horizontal) | Atas | `col-span-2` |
| 4+1 | 4×2 | 5 | Besar di tengah | Tengah | `col-span-2 row-span-2` |

---

## CSS Classes Detail

```css
/* Grid Container */
.grid-cols-2 {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.grid-rows-2 {
  grid-template-rows: repeat(2, minmax(0, 1fr));
}

/* Foto Besar (Index 0) - KUNCI UTAMA */
.row-span-2 {
  grid-row: span 2 / span 2;
  /* Mengambil 2 BARIS (vertikal) */
}

/* Foto Kecil (Index 1, 2) */
.aspect-square {
  aspect-ratio: 1 / 1;
  /* Persegi sempurna */
}
```

---

## Visualisasi CSS Grid

```
Grid Layout Flow:
┌──────[col 1]───┬──────[col 2]───┐
│                │                │ ← Row 1
│   Cell 1       │   Cell 2       │
│   (Photo 1     │   (Photo 2)    │
│    row-span-2) │                │
│                ├────────────────┤
│                │                │ ← Row 2
│                │   Cell 3       │
│                │   (Photo 3)    │
│                │                │
└────────────────┴────────────────┘

Photo 1: Occupies Cell 1 + extends to Row 2 (row-span-2)
Photo 2: Occupies Cell 2 (Row 1)
Photo 3: Occupies Cell 3 (Row 2)
```

---

## Tips Optimasi

### ✅ DO (Lakukan)
1. **Gunakan foto portrait untuk posisi utama** - Rasio 2:3 atau 3:4 ideal
2. **Foto berkualitas tinggi** - Foto pertama akan ditampilkan 2x lebih tinggi
3. **Subjek centered** - Pastikan subjek utama di tengah foto untuk komposisi terbaik
4. **Foto detail landscape untuk posisi 2 & 3** - Cocok untuk detail horizontal

### ❌ DON'T (Hindari)
1. **Jangan gunakan foto landscape untuk posisi utama** - Akan terlihat stretched
2. **Hindari foto dengan subjek di tepi** - Akan terpotong atau tidak proporsional
3. **Jangan mix orientation yang bertolak belakang** - Konsistensi visual penting

---

## Kapan Menggunakan Layout Ini?

### ✅ Cocok untuk:
- 👤 Foto profil/portrait manusia
- 🏢 Dokumentasi bangunan vertikal
- 👗 Fashion/produk dengan model full body
- 📱 Screenshot aplikasi mobile
- 🖼️ Artwork/poster portrait
- 📄 Document/sertifikat vertikal

### ❌ Kurang cocok untuk:
- 🌄 Foto landscape pemandangan
- 🏞️ Panorama/wide shots
- 📊 Grafik/chart horizontal lebar
- 🖥️ Screenshot desktop landscape

---

## Kode Lengkap di File

**File**: `/app/frontend/src/components/CollageEditor.jsx`

**Line References**:
```javascript
// Line 248: Grid definition
case '1-large-landscape': return 'grid-cols-2 grid-rows-2';

// Line 265: Photo count
case '1-large-landscape': return 3;

// Line 282: Template definition
{ id: '1-large-landscape', name: '1+2 (H)', count: 3, icon: '◧' }

// Line 807: Photo rendering logic
${(layout === '1-large-landscape' && index === 0) ? 'row-span-2' : ''}

// Line 842: Empty slot logic
${(layout === '1-large-landscape' && photos.length === 0 && i === 0) ? 'row-span-2' : ''}
```

---

## Screenshot Contoh

Untuk melihat preview layout ini:
1. Buka aplikasi di browser
2. Klik tab "Layout"
3. Pilih template "1+2 (H)" dengan icon ◧
4. Klik "Preview Kolase" untuk melihat hasil

---

## FAQ

**Q: Apa perbedaan utama dengan 1+2 (V)?**  
A: Orientasi foto utama - (H) untuk portrait/vertikal, (V) untuk landscape/horizontal.

**Q: Berapa ukuran ideal foto untuk posisi utama?**  
A: Minimal 1200×1600 px untuk hasil print berkualitas tinggi.

**Q: Apakah foto kecil harus persegi?**  
A: Ya, dengan `aspect-square` class, foto akan di-crop menjadi persegi secara otomatis.

**Q: Bagaimana jika hanya upload 1 foto?**  
A: Foto akan muncul di posisi besar (kiri), posisi lain akan menampilkan placeholder.

---

## Related Layouts

Jika layout ini tidak sesuai, coba:
- **1+2 (V)** - Jika foto utama landscape
- **Portrait** - Untuk 8 foto dalam grid vertikal
- **4+1** - Untuk 5 foto dengan 1 highlight di tengah
