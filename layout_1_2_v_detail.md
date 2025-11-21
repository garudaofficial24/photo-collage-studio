# Detail Template Layout: 1+2 (V) - Portrait

## Identifikasi Layout
- **ID**: `1-large-portrait`
- **Nama Display**: `1+2 (V)`
- **Icon**: `◨`
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
┌─────────────────────────┐
│                         │
│      FOTO BESAR 1       │
│     (col-span-2)        │
│    Memakan 2 kolom      │
│                         │
├────────────┬────────────┤
│            │            │
│  FOTO 2    │  FOTO 3    │
│  (kecil)   │  (kecil)   │
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
className: 'col-span-2'
// Foto pertama mengambil 2 kolom (full width)
// Hanya mengambil 1 baris
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
// Line 809 di CollageEditor.jsx
${(layout === '1-large-portrait' && index === 0) ? 'col-span-2' : ''}

// Artinya:
// - Jika layout adalah '1-large-portrait' DAN index foto adalah 0
// - Maka tambahkan class 'col-span-2' (foto memakan 2 kolom)
// - Jika tidak, foto hanya mengambil 1 kolom (default)
```

### Empty Slots Logic
```javascript
// Line 844 di CollageEditor.jsx  
${(layout === '1-large-portrait' && photos.length === 0 && i === 0) ? 'col-span-2' : ''}

// Artinya:
// - Jika belum ada foto sama sekali (photos.length === 0)
// - Dan ini adalah slot pertama (i === 0)
// - Maka empty slot pertama juga mengambil 2 kolom
```

---

## Karakteristik Layout

### ✅ Kelebihan
1. **Foto utama dominan** - Foto pertama sangat menonjol (2x lebih besar)
2. **Cocok untuk portrait** - Foto utama berbentuk landscape di atas, 2 foto kecil di bawah
3. **Efisien ruang** - Hanya butuh 3 foto untuk layout yang balanced
4. **Aspect ratio konsisten** - Semua foto tetap aspect-square

### 💡 Use Cases
- Dokumentasi dengan 1 foto grup besar + 2 foto detail
- Layout untuk highlight 1 momen utama dengan 2 pendukung
- Portofolio dengan 1 showcase piece + 2 supporting works

### 📐 Proporsi Visual
```
Foto 1: 50% dari total area (2/4 cells)
Foto 2: 25% dari total area (1/4 cells)
Foto 3: 25% dari total area (1/4 cells)
```

---

## Contoh Penggunaan

### Skenario 1: Acara Perusahaan
- **Foto 1 (besar)**: Foto seluruh tim
- **Foto 2 (kecil)**: Detail presentasi
- **Foto 3 (kecil)**: Detail award/penghargaan

### Skenario 2: Dokumentasi Proyek
- **Foto 1 (besar)**: Overview/hasil akhir proyek
- **Foto 2 (kecil)**: Proses kerja 1
- **Foto 3 (kecil)**: Proses kerja 2

---

## Cara Menggunakan

1. **Pilih Layout**: Klik tab "Layout" di sidebar
2. **Pilih Template**: Klik card "1+2 (V)" dengan icon ◨
3. **Upload Foto**: Upload minimal 1 foto (maksimal 3 foto akan digunakan)
4. **Urutan Foto**:
   - Foto pertama yang diupload → Posisi besar (atas)
   - Foto kedua → Posisi kecil (kiri bawah)
   - Foto ketiga → Posisi kecil (kanan bawah)

---

## Perbandingan dengan Layout Serupa

| Layout | Grid | Foto | Orientasi Foto Utama |
|--------|------|------|---------------------|
| **1+2 (V)** | 2×2 | 3 | Landscape (horizontal) |
| 1+2 (H) | 2×2 | 3 | Portrait (vertical) |
| 4+1 | 4×2 | 5 | Besar di tengah |

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

/* Foto Besar (Index 0) */
.col-span-2 {
  grid-column: span 2 / span 2;
  /* Mengambil 2 kolom */
}

/* Foto Kecil (Index 1, 2) */
.aspect-square {
  aspect-ratio: 1 / 1;
  /* Persegi sempurna */
}
```

---

## Tips Optimasi

1. **Pilih foto utama yang berkualitas tinggi** - Foto pertama akan ditampilkan 2x lebih besar
2. **Komposisi horizontal untuk foto utama** - Foto landscape lebih cocok untuk posisi ini
3. **Foto detail untuk posisi 2 & 3** - Close-up atau detail shots cocok untuk posisi kecil
4. **Kontras warna** - Gunakan foto dengan warna berbeda untuk visual yang menarik

---

## File Reference
- **File**: `/app/frontend/src/components/CollageEditor.jsx`
- **Lines**: 
  - Layout definition: Line 249, 266, 283
  - Rendering logic: Line 809
  - Empty slot logic: Line 844
