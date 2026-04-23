/**
 * AIDashboardPage — Create Artwork with AI
 * 3-screen flow matching the ART.AI design reference:
 *
 * Screen 1 (Hero):  Full-screen "Create artwork with AI" landing
 * Screen 2 (Dash):  Feed with For You, Featured Styles, Community Feed
 * Screen 3 (Edit):  Generated result grid with Regenerate/Variations/Edit + Share/Publish
 *
 * SECURITY:
 * - Prompt sanitized client-side before API call
 * - Backend rate-limited (3 req / 60s on generate)
 * - JWT required for all endpoints
 * - No sensitive data exposure
 */

import { useState, useCallback } from 'react';
import {
  Sparkles,
  Heart,
  Plus,
  X,
  Bell,
  Loader2,
  Star,
  RefreshCw,
  Wand2,
  Pencil,
  Lock,
  Download,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../../../stores/useAuthStore';
import { useAIFeed, useGenerateAIArtwork, type AIArtwork } from '../../../../hooks/useAIGeneration';
import './AIDashboardPage.css';

// ============================================
// SECURITY: Input sanitization
// ============================================

function sanitize(input: string, maxLen = 500): string {
  return input.replace(/<[^>]*>/g, '').replace(/[<>"']/g, '').slice(0, maxLen).trim();
}

// ============================================
// STYLE OPTIONS
// ============================================

const STYLE_OPTIONS = [
  { id: 'fantasy', label: 'Fantasy' },
  { id: 'anime', label: 'Anime' },
  { id: 'cyberpunk', label: 'Cyberpunk' },
  { id: 'watercolor', label: 'Watercolor' },
  { id: 'oil-painting', label: 'Oil Painting' },
  { id: 'digital-art', label: 'Digital Art' },
];

// Mock result images for Edit screen grid
const MOCK_RESULT_IMAGES = [
  'https://images.unsplash.com/photo-1578301978693-85fa9fd0c331?w=400&h=500&fit=crop',
  'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=400&h=500&fit=crop',
  'https://images.unsplash.com/photo-1547826039-bfc35e0f1ea8?w=400&h=500&fit=crop',
  'https://images.unsplash.com/photo-1549490349-8643362247b5?w=400&h=500&fit=crop',
];

// ============================================
// SCREEN TYPE
// ============================================

type Screen = 'hero' | 'dashboard' | 'edit';

// ============================================
// MAIN COMPONENT
// ============================================

export default function AIDashboardPage() {
  const { user } = useAuthStore();
  const { data: feed, isLoading: feedLoading } = useAIFeed();
  const generateMutation = useGenerateAIArtwork();

  const [screen, setScreen] = useState<Screen>('hero');
  const [showModal, setShowModal] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('fantasy');
  const [generatedResult, setGeneratedResult] = useState<AIArtwork | null>(null);

  const handleGenerate = useCallback(async () => {
    const cleanPrompt = sanitize(prompt);
    if (cleanPrompt.length < 3) return;

    try {
      const result = await generateMutation.mutateAsync({
        prompt: cleanPrompt,
        style: selectedStyle,
      });
      if (result?.data) {
        setGeneratedResult(result.data);
        setShowModal(false);
        setScreen('edit');
      }
    } catch {
      // Error handled by React Query
    }
  }, [prompt, selectedStyle, generateMutation]);

  const closeModal = () => {
    setShowModal(false);
    setPrompt('');
  };

  const avatarSrc = user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.displayName || 'U')}&background=1a1a2e&color=c9a84c&size=80`;

  // ============================================
  // SCREEN 1: HERO
  // ============================================
  if (screen === 'hero') {
    return (
      <div className="aic-page">
        <motion.div
          className="aic-hero"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          onDragEnd={(e, { offset, velocity }) => {
            if (offset.x < -50 || velocity.x < -300) {
              setScreen('dashboard');
            }
          }}
        >
          <div className="aic-hero__bg">
            <img
              src="https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&h=1200&fit=crop"
              alt="AI Art"
            />
            <div className="aic-hero__gradient" />
          </div>

          {/* Sparkle effects */}
          <span className="aic-hero__sparkle aic-hero__sparkle--1" />
          <span className="aic-hero__sparkle aic-hero__sparkle--2" />
          <span className="aic-hero__sparkle aic-hero__sparkle--3" />

          <div className="aic-hero__content">
            <motion.h1
              className="aic-hero__title"
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              Create<br />artwork<br />with AI
            </motion.h1>
            <motion.p
              className="aic-hero__subtitle"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              Create a SeniQu account to gain access to more creation tools, publish & curate your AI generated art!
            </motion.p>
            <motion.div
              className="aic-hero__swipe"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.7, duration: 0.4 }}
            >
              <motion.span
                animate={{ x: [0, -10, 0] }}
                transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                style={{ display: 'inline-block' }}
              >
                ←
              </motion.span>
              {' '}Swipe left to start
            </motion.div>
          </div>
        </motion.div>
      </div>
    );
  }

  // ============================================
  // SCREEN 3: EDIT ARTWORK
  // ============================================
  if (screen === 'edit') {
    return (
      <div className="aic-page">
        <motion.div
          className="aic-edit"
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35 }}
        >
          {/* Header */}
          <div className="aic-edit__header">
            <h2 className="aic-edit__title">Edit Artwork</h2>
            <button className="aic-edit__close" onClick={() => setScreen('dashboard')}>
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Generated Grid */}
          <div className="aic-edit__grid">
            {MOCK_RESULT_IMAGES.map((img, i) => (
              <motion.div
                key={i}
                className="aic-edit__grid-item"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1 }}
              >
                <img
                  src={generatedResult?.image_url || img}
                  alt={`Generated ${i + 1}`}
                  loading="lazy"
                />
                {i > 0 && (
                  <span className="aic-edit__grid-badge">
                    <Lock className="w-3 h-3" />
                    Premium
                  </span>
                )}
                <button className="aic-edit__grid-lock" aria-label="Download">
                  <Download className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="aic-edit__actions">
            <button
              className="aic-edit__action-btn"
              onClick={() => {
                setScreen('dashboard');
                setShowModal(true);
                setGeneratedResult(null);
              }}
            >
              <RefreshCw className="w-5 h-5" />
              Regenerate
            </button>
            <button className="aic-edit__action-btn">
              <Sparkles className="w-5 h-5" />
              Variations
            </button>
            <button className="aic-edit__action-btn">
              <Pencil className="w-5 h-5" />
              Edit
            </button>
          </div>

          {/* Share & Publish */}
          <div className="aic-edit__bottom">
            <button className="aic-edit__share-btn">
              Share
            </button>
            <button className="aic-edit__publish-btn">
              Publish
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ============================================
  // SCREEN 2: DASHBOARD
  // ============================================
  return (
    <div className="aic-page">
      <motion.div
        className="aic-dash"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {/* Header */}
        <div className="aic-dash__header">
          <div className="aic-dash__header-left">
            <img src={avatarSrc} alt="Avatar" className="aic-dash__avatar" />
            <span className="aic-dash__premium">
              <Sparkles className="w-3.5 h-3.5" />
              Premium
            </span>
          </div>
        </div>

        {/* Edge swipe back area (mobile native feel) */}
        <motion.div
          className="aic-edge-swipe"
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          onDragEnd={(e, { offset, velocity }) => {
            if (offset.x > 50 || velocity.x > 300) {
              setScreen('hero');
            }
          }}
        />

        {/* ===== FOR YOU ===== */}
        <div className="aic-section">
          <div className="aic-section__head">
            <h2 className="aic-section__title">For You</h2>
            <button className="aic-section__all">All</button>
          </div>
        </div>

        <div className="aic-foryou">
          {[
            {
              id: 'fy-1',
              title: 'Dark and Mysterious City',
              prompt: 'Create a dark and mysterious illustration of a city for rusia, the ttrpg created by Critical...',
              author: { name: 'HoltHamlet', isPremium: true, avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop' },
              imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&h=800&fit=crop',
            },
            {
              id: 'fy-2',
              title: 'Ethereal Forest Spirit',
              prompt: 'An ethereal forest spirit standing in a bioluminescent forest...',
              author: { name: 'LlamaDr', isPremium: false, avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop' },
              imageUrl: 'https://images.unsplash.com/photo-1606907568019-2db11718c3cb?w=600&h=800&fit=crop',
            },
            {
              id: 'fy-3',
              title: 'Celestial Dragon',
              prompt: 'A majestic celestial dragon soaring through a starlit nebula...',
              author: { name: 'ArtisanX', isPremium: true, avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop' },
              imageUrl: 'https://images.unsplash.com/photo-1578301978693-85fa9fd0c331?w=600&h=800&fit=crop',
            }
          ].map((item) => (
            <motion.div key={item.id} className="aic-foryou__card" whileTap={{ scale: 0.97 }}>
              <img src={item.imageUrl} alt={item.title} className="aic-foryou__img" loading="lazy" />
              <button className="aic-foryou__like" aria-label="Like">
                <Heart className="w-4 h-4" />
              </button>
              <div className="aic-foryou__body">
                <div className="aic-foryou__author">
                  <img src={item.author.avatarUrl} alt={item.author.name} className="aic-foryou__author-avatar" />
                  <span className="aic-foryou__author-name">{item.author.name}</span>
                  {item.author.isPremium && <Star className="aic-foryou__author-star" />}
                </div>
                <p className="aic-foryou__prompt">{item.prompt}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* ===== FEATURED STYLES ===== */}
        <div className="aic-section">
          <div className="aic-section__head">
            <h2 className="aic-section__title">Featured Styles</h2>
            <button className="aic-section__all">All</button>
          </div>
        </div>

        <div className="aic-styles">
          {[
            { id: 'style-fantasy', name: 'Fantasy World', imageUrl: 'https://images.unsplash.com/photo-1618336753174-8e100f91ce0a?w=400&h=200&fit=crop' },
            { id: 'style-anime', name: 'Anime Portrait', imageUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400&h=200&fit=crop' },
            { id: 'style-cyberpunk', name: 'Cyberpunk City', imageUrl: 'https://images.unsplash.com/photo-1515630278258-407f66498911?w=400&h=200&fit=crop' },
            { id: 'style-watercolor', name: 'Watercolor', imageUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=400&h=200&fit=crop' }
          ].map((style) => (
            <div key={style.id} className="aic-styles__card">
              <img src={style.imageUrl} alt={style.name} className="aic-styles__card-img" loading="lazy" />
              <div className="aic-styles__card-overlay">
                <span className="aic-styles__card-name">{style.name}</span>
              </div>
            </div>
          ))}
        </div>

        {/* ===== COMMUNITY FEED ===== */}
        <div className="aic-section">
          <div className="aic-section__head">
            <h2 className="aic-section__title">Community Feed</h2>
            <button className="aic-section__all">All</button>
          </div>
        </div>

        <div className="aic-community">
          {[
            { id: 'cf-1', author: { name: 'CaesarJ', avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop' }, imageUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=600&h=600&fit=crop' },
            { id: 'cf-2', author: { name: 'Polemic', isPremium: true, avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop' }, imageUrl: 'https://images.unsplash.com/photo-1547826039-bfc35e0f1ea8?w=600&h=600&fit=crop' },
            { id: 'cf-3', author: { name: 'PixelMage', avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop' }, imageUrl: 'https://images.unsplash.com/photo-1549490349-8643362247b5?w=600&h=600&fit=crop' }
          ].map((item) => (
            <div key={item.id} className="aic-community__card">
              <div className="aic-community__row">
                <img src={item.author.avatarUrl} alt={item.author.name} className="aic-community__avatar" />
                <span className="aic-community__name">{item.author.name}</span>
                {item.author.isPremium && <Star className="aic-community__star" />}
              </div>
              <img src={item.imageUrl} alt="AI Art" className="aic-community__img" loading="lazy" />
            </div>
          ))}
        </div>

        {/* ===== FAB ===== */}
        <motion.button
          className="aic-fab"
          onClick={() => setShowModal(true)}
          whileTap={{ scale: 0.9 }}
          aria-label="Create with AI"
        >
          <Plus className="w-7 h-7" />
        </motion.button>
      </motion.div>

      {/* ===== GENERATE MODAL ===== */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            className="aic-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
          >
            <motion.div
              className="aic-modal"
              initial={{ y: 300, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 300, opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            >
              <div className="aic-modal__header">
                <h3 className="aic-modal__title">Create with AI</h3>
                <button className="aic-modal__close" onClick={closeModal}>
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="aic-modal__label">Describe your artwork</p>
              <textarea
                className="aic-modal__textarea"
                placeholder="A mystical dragon soaring through a nebula of stars..."
                value={prompt}
                onChange={(e) => setPrompt(sanitize(e.target.value))}
                maxLength={500}
                spellCheck={false}
                autoComplete="off"
              />

              <p className="aic-modal__label">Choose a style</p>
              <div className="aic-modal__chips">
                {STYLE_OPTIONS.map((s) => (
                  <button
                    key={s.id}
                    className={`aic-modal__chip ${selectedStyle === s.id ? 'aic-modal__chip--active' : ''}`}
                    onClick={() => setSelectedStyle(s.id)}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              <button
                className="aic-modal__submit"
                onClick={handleGenerate}
                disabled={generateMutation.isPending || prompt.trim().length < 3}
              >
                {generateMutation.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-5 h-5" />
                    Generate Artwork
                  </>
                )}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
