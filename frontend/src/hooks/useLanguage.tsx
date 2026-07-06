import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'en' | 'id';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const resolvePath = (object: any, path: string, defaultValue: string = ''): string => {
  const result = path.split('.').reduce((o, p) => (o && o[p] !== undefined ? o[p] : undefined), object);
  return typeof result === 'string' ? result : defaultValue;
};

export const translations = {
  en: {
    navbar: {
      home: 'Home',
      gallery: 'Gallery',
      collections: 'Collections',
      nearby: 'Nearby',
      reels: 'Reels',
      marketplace: 'Marketplace',
      community: 'Community',
      aiScanner: 'AI Scanner',
      signIn: 'Sign In',
      signOut: 'Sign Out',
      about: 'About',
      artists: 'Artists',
      howItWorks: 'How It Works',
      dashboard: 'Dashboard',
      profile: 'Profile',
      myPhotographyHub: 'My Photography Hub',
      explore: 'Explore',
      language: 'Language',
      theme: 'Theme'
    },
    hero: {
      label: 'SeniQu Gallery',
      title: "Preserving\nNusantara's Soul",
      subtitle: "A digital sanctuary for Indonesia's heritage spanning museums, galleries, & historical sites. Verified, digitized, and curated for cultural exploration.",
      explore: 'Explore Collections',
      signIn: 'Sign In'
    },
    searchBar: {
      placeholder: 'Search museums, artworks, cities...',
      explore: 'EXPLORE'
    },
    cities: {
      label: 'CULTURAL ATLAS',
      title: 'Explore by City',
      viewAll: 'View All Districts',
      curators: 'Curators',
      collection: 'Collection'
    },
    stats: {
      culturalLabel: 'Cultural Sites',
      culturalFact: 'From ancient temples of Borobudur to royal palaces of Yogyakarta — Indonesia holds one of the richest cultural tapestries in Southeast Asia.',
      museumsLabel: 'Museums',
      museumsFact: 'Spanning art, history, science, and heritage — Indonesian museums safeguard stories from over 17,000 islands.',
      heritageLabel: 'Heritage Items',
      heritageFact: 'UNESCO-listed and nationally registered artifacts, dances, textiles, and intangible heritage preserved for future generations.',
      islandsLabel: 'Islands',
      islandsFact: "The world's largest archipelago — each island carries unique traditions, languages, and artistic expressions."
    },
    about: {
      label: 'Why SeniQu',
      title: 'Bridging Culture & Technology',
      subtitle: "Only 54–68% of Indonesia's cultural assets are digitally structured. SeniQu transforms that gap into opportunity.",
      featureTitle0: 'Centralized Platform',
      featureDesc0: 'Unified ecosystem for heritage sites.',
      featureDetail0: 'One platform connecting 4,800+ cultural sites, museums, and heritage locations across Indonesia. Manage, explore, and preserve — all in one place.',
      featureTitle1: 'Immersive Experience',
      featureDesc1: 'Smart navigation & interactive tools.',
      featureDetail1: 'AR-powered exhibitions, 360° virtual tours, and interactive storytelling that brings centuries of heritage to life on your device.',
      featureTitle2: 'AI-Enhanced',
      featureDesc2: 'Automated insights & multilingual guides.',
      featureDetail2: 'Gemini-powered art analysis, genre identification, multilingual audio guides, and intelligent curation — heritage meets cutting-edge AI.',
      featureTitle3: 'Tourism Optimized',
      featureDesc3: 'Personalized routes & recommendations.',
      featureDetail3: 'Smart itineraries, nearby discovery with Google Maps integration, and community-driven recommendations for cultural tourism.'
    },
    featured: {
      label: 'Curated Gallery',
      title: 'Featured Artworks',
      subtitle: 'Discover our diverse collection of Indonesian masterpieces',
      refresh: 'Refresh Artworks'
    },
    howItWorks: {
      title: 'How It Works',
      subtitle: "Three simple steps to explore Indonesia's cultural heritage.",
      stepTitle0: 'Discover Cultural Spaces',
      stepDesc0: 'Browse museums, galleries & heritage buildings across the archipelago in one unified platform.',
      stepTitle1: 'AI-Powered Insights',
      stepDesc1: 'Get smart summaries, audio guides, and contextual storytelling personalized to your interests.',
      stepTitle2: 'Interactive Exploration',
      stepDesc2: 'Navigate with digital guides, curated routes, and immersive content that transforms every visit.'
    },
    cta: {
      title: 'Begin Your Journey',
      subtitle: "Experience the world's most diverse living civilization, one museum, one gallery, one heritage site at a time.",
      start: 'Start Exploring',
      learnMore: 'Learn more'
    },
    trustedBy: 'Trusted by Leading Institutions',
    artists: {
      label: 'Top Creators',
      title: 'Featured Artists',
      viewAll: 'View All Artists',
      bio: 'Biography',
      readWiki: 'Read on Wikipedia',
      failedBio: 'Failed to load biography.',
      radenSalehTitle: 'Master of Romanticism',
      affandiTitle: 'Expressionist Pioneer',
      basukiAbdullahTitle: 'Realist Painter'
    },
    footer: {
      stayUpdated: 'Stay Updated',
      newsletterDesc: 'Get the latest updates on new collections and drops.',
      emailPlaceholder: 'Enter your email',
      brandDesc: "Indonesia's leading digital cultural heritage infrastructure bridging museums, galleries, and heritage sites with AI-powered technology.",
      terms: 'Terms of Service',
      privacy: 'Privacy Policy',
      guidelines: 'Community Guidelines',
      support: 'Support',
      backToTop: 'Back to Top',
      privacyShort: 'Privacy',
      termsShort: 'Terms'
    }
  },
  id: {
    navbar: {
      home: 'Beranda',
      gallery: 'Galeri',
      collections: 'Koleksi',
      nearby: 'Terdekat',
      reels: 'Reels',
      marketplace: 'Pasar Seni',
      community: 'Komunitas',
      aiScanner: 'Pemindai AI',
      signIn: 'Masuk',
      signOut: 'Keluar',
      about: 'Tentang',
      artists: 'Seniman',
      howItWorks: 'Cara Kerja',
      dashboard: 'Dasbor',
      profile: 'Profil',
      myPhotographyHub: 'Pusat Fotografi Saya',
      explore: 'Jelajahi',
      language: 'Bahasa',
      theme: 'Tema'
    },
    hero: {
      label: 'Galeri SeniQu',
      title: 'Melestarikan\nJiwa Nusantara',
      subtitle: 'Suaka digital untuk warisan budaya Indonesia yang mencakup museum, galeri, & situs bersejarah. Terverifikasi, didigitalisasi, dan dikurasi untuk eksplorasi budaya.',
      explore: 'Jelajahi Koleksi',
      signIn: 'Masuk'
    },
    searchBar: {
      placeholder: 'Cari museum, karya seni, kota...',
      explore: 'JELAJAHI'
    },
    cities: {
      label: 'ATLAS BUDAYA',
      title: 'Jelajahi Berdasarkan Kota',
      viewAll: 'Lihat Semua Wilayah',
      curators: 'Kurator',
      collection: 'Koleksi'
    },
    stats: {
      culturalLabel: 'Situs Budaya',
      culturalFact: 'Dari candi kuno Borobudur hingga istana kerajaan Yogyakarta — Indonesia memiliki salah satu kekayaan warisan budaya terkaya di Asia Tenggara.',
      museumsLabel: 'Museum',
      museumsFact: 'Mencakup seni, sejarah, sains, dan pusaka — museum-museum Indonesia mengamankan kisah sejarah dari lebih dari 17.000 pulau.',
      heritageLabel: 'Benda Pusaka',
      heritageFact: 'Artefak, tarian, tekstil, dan warisan budaya takbenda yang terdaftar secara nasional dan UNESCO dipelihara untuk generasi mendatang.',
      islandsLabel: 'Pulau',
      islandsFact: 'Kepulauan terbesar di dunia — setiap pulau mengusung tradisi unik, bahasa, dan ekspresi artistik tersendiri.'
    },
    about: {
      label: 'Mengapa SeniQu',
      title: 'Menghubungkan Budaya & Teknologi',
      subtitle: 'Hanya 54–68% aset budaya Indonesia yang terstruktur secara digital. SeniQu mengubah kesenjangan itu menjadi peluang.',
      featureTitle0: 'Platform Terpusat',
      featureDesc0: 'Ekosistem terpadu untuk situs warisan budaya.',
      featureDetail0: 'Satu platform yang menghubungkan 4.800+ situs budaya, museum, dan lokasi warisan sejarah di seluruh Indonesia. Kelola, jelajahi, dan lestarikan — dalam satu tempat.',
      featureTitle1: 'Pengalaman Immersive',
      featureDesc1: 'Navigasi pintar & alat interaktif.',
      featureDetail1: 'Pameran berbasis AR, tur virtual 360°, dan penceritaan interaktif yang menghidupkan warisan budaya berabad-abad langsung di perangkat Anda.',
      featureTitle2: 'Berbasis AI',
      featureDesc2: 'Analisis otomatis & panduan multibahasa.',
      featureDetail2: 'Analisis seni berbasis Gemini, identifikasi aliran seni, panduan audio multibahasa, dan kurasi pintar — saat warisan budaya bertemu AI mutakhir.',
      featureTitle3: 'Optimasi Pariwisata',
      featureDesc3: 'Rute & rekomendasi yang dipersonalisasi.',
      featureDetail3: 'Rencana perjalanan pintar, penemuan lokasi terdekat terintegrasi Google Maps, dan rekomendasi berbasis komunitas untuk wisata budaya.'
    },
    featured: {
      label: 'Galeri Terpilih',
      title: 'Karya Seni Unggulan',
      subtitle: 'Temukan beragam koleksi karya seni mahakarya Indonesia',
      refresh: 'Perbarui Karya'
    },
    howItWorks: {
      title: 'Cara Kerja',
      subtitle: 'Tiga langkah mudah untuk menjelajahi warisan budaya Indonesia.',
      stepTitle0: 'Temukan Ruang Budaya',
      stepDesc0: 'Telusuri museum, galeri & bangunan bersejarah di seluruh penjuru nusantara dalam satu platform terpadu.',
      stepTitle1: 'Wawasan Berbasis AI',
      stepDesc1: 'Dapatkan ringkasan pintar, panduan audio, dan cerita kontekstual yang dipersonalisasi sesuai minat Anda.',
      stepTitle2: 'Eksplorasi Interaktif',
      stepDesc2: 'Navigasi dengan panduan digital, rute pilihan, dan konten interaktif yang mengubah setiap kunjungan Anda.'
    },
    cta: {
      title: 'Mulai Perjalanan Anda',
      subtitle: 'Rasakan peradaban hidup yang paling beragam di dunia, satu museum, satu galeri, satu situs warisan budaya pada satu waktu.',
      start: 'Mulai Jelajahi',
      learnMore: 'Pelajari lebih lanjut'
    },
    trustedBy: 'Dipercaya oleh Institusi Terkemuka',
    artists: {
      label: 'Kreator Teratas',
      title: 'Seniman Unggulan',
      viewAll: 'Lihat Semua Seniman',
      bio: 'Biografi',
      readWiki: 'Baca di Wikipedia',
      failedBio: 'Gagal memuat biografi.',
      radenSalehTitle: 'Pelopor Romantisisme',
      affandiTitle: 'Pelopor Ekspresionisme',
      basukiAbdullahTitle: 'Pelukis Realis'
    },
    footer: {
      stayUpdated: 'Tetap Terkini',
      newsletterDesc: 'Dapatkan pembaruan terbaru tentang koleksi baru dan karya rilis.',
      emailPlaceholder: 'Masukkan email Anda',
      brandDesc: 'Infrastruktur warisan budaya digital terkemuka di Indonesia yang menghubungkan museum, galeri, dan situs bersejarah dengan teknologi berbasis AI.',
      terms: 'Ketentuan Layanan',
      privacy: 'Kebijakan Privasi',
      guidelines: 'Panduan Komunitas',
      support: 'Dukungan',
      backToTop: 'Kembali ke Atas',
      privacyShort: 'Privasi',
      termsShort: 'Ketentuan'
    }
  }
};

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const savedLang = localStorage.getItem('seniqu-lang');
      if (savedLang === 'en' || savedLang === 'id') {
        return savedLang;
      }
    }
    return 'en';
  });

  useEffect(() => {
    localStorage.setItem('seniqu-lang', language);
  }, [language]);

  const t = (key: string): string => {
    const langDict = translations[language];
    return resolvePath(langDict, key, key);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
