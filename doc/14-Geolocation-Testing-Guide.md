# Geolocation Detection & Local Testing Guide

Dokumentasi ini menjelaskan mekanisme pendeteksian lokasi pengguna (Geolocation) di SeniQu, alasan teknis mengapa pendeteksian lokasi pada browser komputer/desktop sering kali salah (mengarah ke Jakarta), serta panduan lengkap cara melakukan simulasi (testing override) koordinat wilayah lain seperti Yogyakarta menggunakan Developer Tools.

---

## 1. Mekanisme Geolocation di SeniQu

Aplikasi SeniQu menggunakan modul peta interaktif untuk menampilkan museum, galeri, dan situs warisan budaya terdekat berdasarkan posisi real-time pengguna. Di frontend ([PublicNearbyPage.tsx](file:///home/wii-ros/Documents/Project/seniqu-webapp/frontend/src/features/gallery/pages/PublicNearbyPage/PublicNearbyPage.tsx)), lokasi diambil melalui HTML5 Geolocation API:

```typescript
navigator.geolocation.getCurrentPosition(
    (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        // Update user location & Map center
        setUserLocation({ latitude: lat, longitude: lng });
        setMapCenter({ lat, lng });
    },
    (err) => {
        console.error("Error getting location:", err);
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
);
```

### Parameter Keamanan & Akurasi:
* **`enableHighAccuracy: true`**: Memaksa perangkat menggunakan GPS (jika ada) demi koordinat yang paling akurat.
* **`timeout: 10000`**: Batas waktu pencarian lokasi maksimal 10 detik agar tidak terjadi *infinite loading*.
* **`maximumAge: 60000`**: Memperbolehkan cache lokasi selama maksimal 1 menit untuk menghemat baterai perangkat mobile.

---

## 2. Alasan Teknis Geolocation Mengarah ke Jakarta (pada Desktop)

Ketika Anda berada di Yogyakarta namun peta desktop/emulator selalu mengarah ke Jakarta, hal ini disebabkan oleh batasan platform berikut:

1. **Ketiadaan Hardware GPS di Komputer/Laptop:**
   Sebagian besar komputer desktop dan laptop tidak memiliki modul perangkat keras GPS. Akibatnya, browser harus menebak koordinat menggunakan **IP-based Geolocation** (mencocokkan IP Address internet Anda dengan database penyedia peta).

2. **Arsitektur Routing ISP di Indonesia:**
   Penyedia layanan internet di Indonesia (seperti IndiHome, Biznet, MyRepublic, Telkomsel, XL, dsb.) mengarahkan sebagian besar lalu lintas data daerah ke **Gateway Router Utama di Jakarta**. Karena alamat IP publik Anda terdaftar atau disalurkan melalui infrastruktur Jakarta, API Geolocation akan mengembalikan koordinat Jakarta (kisaran `lat: -6.19`, `lng: 106.82`).

3. **Cara Kerja di Smartphone Asli (Production):**
   Di perangkat mobile asli, browser meminta akses ke chip GPS internal ponsel. Selama izin lokasi diberikan oleh pengguna, browser akan mengembalikan koordinat presisi tinggi wilayah tempat Anda berdiri (Yogyakarta, Bali, Surabaya, dll.) tanpa tergantung lokasi IP Address.

---

## 3. Panduan Simulasi Lokasi (Override) di Google Chrome / Edge

Untuk mempermudah pengembangan dan pengujian fitur peta di berbagai kota di Indonesia tanpa berpindah tempat secara fisik, gunakan fitur **Sensors Location Override** di DevTools.

### Langkah-langkah Override:

1. Buka aplikasi SeniQu di browser (`http://localhost:5173/`).
2. Buka Developer Tools dengan menekan **`F12`** atau **`Ctrl + Shift + I`** (Windows/Linux) / **`Cmd + Option + I`** (macOS).
3. Di sudut kanan atas jendela DevTools, klik tombol **Menu Titik Tiga (Vertical Ellipsis)**.
4. Sorot menu **More tools** -> Pilih **Sensors**.
5. Di tab **Sensors** yang muncul di bagian bawah panel DevTools, cari dropdown **Location**.
6. Ubah pilihan default (*No override*) menjadi **Custom location...**.
7. Masukkan koordinat kota target Anda:

### Preset Koordinat Kota Besar di Indonesia:

| Kota / Wilayah | Latitude (Lintang) | Longitude (Bujur) | Keterangan |
|---|---|---|---|
| **Yogyakarta** | `-7.7956` | `110.3695` | Daerah Istimewa Yogyakarta |
| **Jakarta** | `-6.2088` | `106.8456` | Pusat Kota (Default Fallback) |
| **Bandung** | `-6.9175` | `107.6191` | Jawa Barat |
| **Surabaya** | `-7.2575` | `112.7521` | Jawa Timur |
| **Denpasar, Bali** | `-8.6705` | `115.2126` | Bali |
| **Medan** | `3.5952` | `98.6722` | Sumatera Utara |

8. Tekan **`F5`** untuk memuat ulang halaman. Pastikan pop-up izin lokasi diizinkan. Peta sekarang akan terpusat langsung ke koordinat baru dan memuat data museum/galeri lokal terdekat.

---

## 4. Penanganan Masalah & Troubleshooting Geolocation

### A. Location Permission Denied (Error Code 1)
* **Gejala:** Muncul alert *"Location permission denied."* di UI, peta jatuh kembali ke `DEFAULT_CENTER` (Jakarta).
* **Solusi:** Klik ikon gembok di sebelah kiri URL address bar browser Anda, ubah opsi **Location** menjadi **Allow**, lalu muat ulang halaman.

### B. Location Unavailable / Timeout (Error Code 2 & 3)
* **Gejala:** Pendeteksian lokasi terlalu lama atau gagal mendapatkan sinyal/data IP.
* **Solusi:** Periksa koneksi internet Anda. Pastikan tidak ada VPN aktif yang merutekan traffic Anda ke luar negeri (karena VPN akan memindahkan lokasi Anda ke negara server VPN tersebut).
