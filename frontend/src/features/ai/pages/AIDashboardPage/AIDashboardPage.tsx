/**
 * AIDashboardPage — Create Artwork with AI
 * 3-screen flow matching the ART.AI design reference:
 *
 * Screen 1 (Hero):  Full-screen "Create artwork with AI" landing
 * Screen 2 (Dash):  Feed with For You, Featured Styles, Community Feed
 * Screen 3 (Edit):  Generated result details with comments/likes
 */

import { useState, useCallback } from 'react';
import {
  Sparkles,
  Plus,
  X,
  Loader2,
  RefreshCw,
  Wand2,
  Download,
  Trash2,
  MessageSquare,
  Heart,
  Send,
  Globe,
  Lock,
  Upload,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../../../stores/useAuthStore';
import {
  useAIFeed,
  useGenerateAIArtwork,
  useAIHistory,
  useDeleteAIArtwork,
  useUpdateAIVisibility,
  useToggleAILike,
  useAIComments,
  useAddAIComment,
  useUploadAIArtwork,
} from '../../../../hooks/useAIGeneration';
import './AIDashboardPage.css';

// ============================================
// SECURITY: Input sanitization
// ============================================

/**
 * Sanitize user input:
 * - Strip HTML tags to prevent XSS
 * - Strip dangerous chars (<, >, ", ')
 * - Strip markdown bold labels like **Prompt (≤500 chars):**
 * - Preserve normal spaces for readability
 * - Enforce max length
 */
function sanitize(input: string, maxLen = 500): string {
  return input
    .replace(/<[^>]*>/g, '')             // Strip HTML tags
    .replace(/\*\*[^*]*\*\*:?/g, '')     // Strip **bold labels**
    .replace(/[<>"']/g, '')              // Strip dangerous chars
    .slice(0, maxLen);
}

/** Clean a stored prompt for display (strip leftover markdown artifacts) */
function cleanPromptDisplay(raw: string): string {
  return (raw || '')
    .replace(/\*\*[^*]*\*\*:?/g, '')
    .replace(/^"|"$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ============================================
// STYLE OPTIONS
// ============================================

const STYLE_OPTIONS = [
  { id: 'fantasy', label: '🏰 Fantasy' },
  { id: 'anime', label: '🎌 Anime' },
  { id: 'cyberpunk', label: '🌃 Cyberpunk' },
  { id: 'watercolor', label: '🎨 Watercolor' },
  { id: 'oil-painting', label: '🖼️ Oil Painting' },
  { id: 'digital-art', label: '💎 Digital Art' },
  { id: 'batik', label: '🪭 Batik Heritage' },
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
  const { data: userArtworksData, isLoading: historyLoading } = useAIHistory();
  
  const generateMutation = useGenerateAIArtwork();
  const uploadMutation = useUploadAIArtwork();
  const deleteMutation = useDeleteAIArtwork();
  const visibilityMutation = useUpdateAIVisibility();
  const toggleLikeMutation = useToggleAILike();
  const addCommentMutation = useAddAIComment();

  const [screen, setScreen] = useState<Screen>('hero');
  const [showModal, setShowModal] = useState(false);
  const [modalTab, setModalTab] = useState<'generate' | 'upload'>('generate');
  const [prompt, setPrompt] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('fantasy');
  
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [selectedArtwork, setSelectedArtwork] = useState<any | null>(null);
  const [detailMode, setDetailMode] = useState<'owner' | 'community'>('owner');
  const [commentContent, setCommentContent] = useState('');
  const [activeTab, setActiveTab] = useState<'my-artworks' | 'community'>('my-artworks');

  const { data: commentsData, isLoading: commentsLoading } = useAIComments(
    selectedArtwork?.id || '',
    screen === 'edit'
  );
  const comments = commentsData || [];

  const handleGenerate = useCallback(async () => {
    const cleanPrompt = sanitize(prompt).trim();
    if (cleanPrompt.length < 3) return;

    try {
      const result = await generateMutation.mutateAsync({
        prompt: cleanPrompt,
        style: selectedStyle,
      });
      if (result?.data) {
        setSelectedArtwork(result.data);
        setDetailMode('owner');
        setShowModal(false);
        setScreen('edit');
      }
    } catch {
      // Error handled by React Query
    }
  }, [prompt, selectedStyle, generateMutation]);

  const handleUpload = useCallback(async () => {
    if (!uploadedFile) return;
    const cleanTitle = sanitize(uploadTitle || 'Uploaded Artwork').trim();
    try {
      const result = await uploadMutation.mutateAsync({
        file: uploadedFile,
        prompt: cleanTitle,
        style: selectedStyle,
      });
      if (result?.data) {
        setSelectedArtwork(result.data);
        setDetailMode('owner');
        setShowModal(false);
        setScreen('edit');
        setUploadedFile(null);
        setUploadTitle('');
      }
    } catch {
      // Error handled by React Query
    }
  }, [uploadedFile, uploadTitle, selectedStyle, uploadMutation]);

  const closeModal = () => {
    setShowModal(false);
    setPrompt('');
    setUploadedFile(null);
    setUploadTitle('');
    setModalTab('generate');
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
          onDragEnd={(_, { offset, velocity }) => {
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
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              Express yourself with our state-of-the-art neural generator. Completely free to start, rate-limited for security.
            </motion.p>

            <motion.div
              className="aic-hero__swipe"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ repeat: Infinity, duration: 2.5 }}
            >
              <motion.span
                animate={{ x: [-5, 5, -5] }}
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
  // SCREEN 3: DETAIL VIEW / ARTWORK STUDIO
  // ============================================
  if (screen === 'edit' && selectedArtwork) {
    const isOwner = detailMode === 'owner';
    const imageUrl = selectedArtwork.image_url || selectedArtwork.imageUrl;
    const promptText = selectedArtwork.prompt;
    const styleName = selectedArtwork.style;
    const artworkId = selectedArtwork.id;

    // Resolve likes & liked status reactively from the query feeds
    const communityItemInFeed = feed?.communityFeed?.find((x) => x.id === artworkId);
    const likesCount = isOwner
      ? (selectedArtwork.likes_count || 0)
      : (communityItemInFeed?.likes ?? selectedArtwork.likes ?? 0);
    const isLiked = isOwner
      ? false
      : (communityItemInFeed?.isLiked ?? selectedArtwork.isLiked ?? false);

    const handleDownload = async () => {
      try {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `seniqu-ai-${artworkId}.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } catch (err) {
        console.error('Download failed', err);
      }
    };

    const handleDelete = async () => {
      if (!confirm('Are you sure you want to delete this artwork?')) return;
      try {
        await deleteMutation.mutateAsync(artworkId);
        setScreen('dashboard');
        setSelectedArtwork(null);
      } catch (err) {
        console.error('Delete failed', err);
      }
    };

    const handleTogglePublish = async () => {
      const newVisibility = selectedArtwork.visibility === 'public' ? 'private' : 'public';
      try {
        const res = await visibilityMutation.mutateAsync({
          id: artworkId,
          visibility: newVisibility,
        });
        if (res?.data) {
          setSelectedArtwork(res.data);
        }
      } catch (err) {
        console.error('Update visibility failed', err);
      }
    };

    const handleLike = async () => {
      try {
        await toggleLikeMutation.mutateAsync(artworkId);
      } catch (err) {
        console.error('Like toggle failed', err);
      }
    };

    const handleAddComment = async (e: React.FormEvent) => {
      e.preventDefault();
      const text = commentContent.trim();
      if (!text) return;
      try {
        await addCommentMutation.mutateAsync({
          artworkId,
          content: text,
        });
        setCommentContent('');
      } catch (err) {
        console.error('Add comment failed', err);
      }
    };

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
            <h2 className="aic-edit__title">
              {isOwner ? 'Artwork Studio' : 'Community Creation'}
            </h2>
            <button className="aic-edit__close" onClick={() => {
              setScreen('dashboard');
              setSelectedArtwork(null);
            }}>
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Featured Image Frame */}
          <div className="aic-detail__featured">
            <img
              src={imageUrl}
              alt={promptText}
              className="aic-detail__featured-img"
              loading="lazy"
            />
            
            <div className="aic-detail__meta">
              <span className="aic-detail__style-badge">{styleName}</span>
              {isOwner ? (
                <span className={`aic-detail__visibility-badge aic-detail__visibility-badge--${selectedArtwork.visibility}`}>
                  {selectedArtwork.visibility === 'public' ? 'Public' : 'Private'}
                </span>
              ) : (
                <span className="aic-detail__author-badge">
                  By {selectedArtwork.author?.name || 'Artist'}
                </span>
              )}
            </div>
          </div>

          {/* Likes & Basic info row */}
          <div className="aic-detail__social-bar">
            {!isOwner && (
              <button
                className={`aic-detail__like-btn ${isLiked ? 'aic-detail__like-btn--active' : ''}`}
                onClick={handleLike}
                disabled={toggleLikeMutation.isPending}
              >
                <Heart className={`w-5 h-5 ${isLiked ? 'fill-red text-red' : ''}`} />
                <span>{likesCount} {likesCount === 1 ? 'Like' : 'Likes'}</span>
              </button>
            )}
            {isOwner && (
              <div className="aic-detail__visibility-info">
                {selectedArtwork.visibility === 'public' ? (
                  <><Globe className="w-4 h-4 text-emerald mr-1.5" /> <span>Published to Gallery</span></>
                ) : (
                  <><Lock className="w-4 h-4 text-amber mr-1.5" /> <span>Private Draft</span></>
                )}
              </div>
            )}
          </div>

          {/* Prompt details */}
          <div className="aic-detail__info">
            <h3 className="aic-detail__prompt-label">Prompt</h3>
            <p className="aic-detail__prompt-text">"{cleanPromptDisplay(promptText)}"</p>
            {selectedArtwork.created_at && (
              <p className="aic-detail__date">Created: {new Date(selectedArtwork.created_at).toLocaleDateString()}</p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="aic-edit__actions">
            <button
              className="aic-edit__action-btn"
              onClick={handleDownload}
            >
              <Download className="w-5 h-5" />
              Download
            </button>
            <button
              className="aic-edit__action-btn"
              onClick={() => {
                setPrompt(promptText);
                setSelectedStyle(styleName);
                setScreen('dashboard');
                setShowModal(true);
                setSelectedArtwork(null);
              }}
            >
              <RefreshCw className="w-5 h-5" />
              Reuse Prompt
            </button>
            {isOwner && (
              <button
                className="aic-edit__action-btn aic-edit__action-btn--danger"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Trash2 className="w-5 h-5" />
                )}
                Delete
              </button>
            )}
          </div>

          {/* Publish / Privacy toggles for owner */}
          {isOwner && (
            <div className="aic-edit__bottom">
              <button
                className="aic-edit__publish-btn"
                onClick={handleTogglePublish}
                disabled={visibilityMutation.isPending}
              >
                {visibilityMutation.isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : selectedArtwork.visibility === 'public' ? (
                  'Make Private'
                ) : (
                  'Publish to Public Feed'
                )}
              </button>
            </div>
          )}

          {/* Comments Section */}
          {(!isOwner || selectedArtwork.visibility === 'public') && (
            <div className="aic-comments">
              <h3 className="aic-comments__title">
                <MessageSquare className="w-4 h-4 mr-1.5" />
                Comments ({comments.length})
              </h3>

              <div className="aic-comments__list">
                {commentsLoading ? (
                  <div className="aic-comments__loading">
                    <Loader2 className="w-5 h-5 animate-spin text-gold" />
                  </div>
                ) : comments.length === 0 ? (
                  <p className="aic-comments__empty">No comments yet. Be the first to share your thoughts!</p>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className="aic-comment-card">
                      <img
                        src={comment.user?.avatar_url || 'https://ui-avatars.com/api/?name=U'}
                        alt={comment.user?.display_name}
                        className="aic-comment-card__avatar"
                      />
                      <div className="aic-comment-card__body">
                        <div className="aic-comment-card__head">
                          <span className="aic-comment-card__username">
                            {comment.user?.display_name}
                          </span>
                          <span className="aic-comment-card__date">
                            {new Date(comment.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="aic-comment-card__text">{comment.content}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <form className="aic-comments__form" onSubmit={handleAddComment}>
                <input
                  type="text"
                  placeholder="Add a comment..."
                  className="aic-comments__input"
                  value={commentContent}
                  onChange={(e) => setCommentContent(e.target.value)}
                  maxLength={500}
                />
                <button
                  type="submit"
                  className="aic-comments__send-btn"
                  disabled={addCommentMutation.isPending || !commentContent.trim()}
                >
                  {addCommentMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </form>
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  // ============================================
  // SCREEN 2: DASHBOARD
  // ============================================
  if (feedLoading || historyLoading) {
    return (
      <div className="aic-page">
        <div className="aic-loading">
          <Loader2 className="w-8 h-8 animate-spin text-gold" />
          <p>Loading AI Gallery...</p>
        </div>
      </div>
    );
  }

  const userArtworks = userArtworksData || [];
  const featuredStyles = feed?.featuredStyles || [];

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
          onDragEnd={(_, { offset, velocity }) => {
            if (offset.x > 50 || velocity.x > 300) {
              setScreen('hero');
            }
          }}
        />

        {/* Tab Selection */}
        <div className="aic-tabs">
          <button
            className={`aic-tabs__btn ${activeTab === 'my-artworks' ? 'aic-tabs__btn--active' : ''}`}
            onClick={() => setActiveTab('my-artworks')}
          >
            My Artworks
          </button>
          <button
            className={`aic-tabs__btn ${activeTab === 'community' ? 'aic-tabs__btn--active' : ''}`}
            onClick={() => setActiveTab('community')}
          >
            Community Feed
          </button>
        </div>

        {/* Content based on selected tab */}
        {activeTab === 'my-artworks' ? (
          <>
            <div className="aic-section">
              <div className="aic-section__head">
                <h2 className="aic-section__title">My Artworks</h2>
                <span className="aic-section__count">{userArtworks.length}</span>
              </div>
            </div>

            {userArtworks.length === 0 ? (
              <div className="aic-empty-state">
                <Sparkles className="w-10 h-10 text-muted mb-2 opacity-50" />
                <p className="aic-empty-state__title">No Artworks Yet</p>
                <p className="aic-empty-state__subtitle">
                  Tap the green '+' button below to generate your first AI artwork!
                </p>
              </div>
            ) : (
              <div className="aic-grid">
                {userArtworks.map((item, index) => (
                  <motion.div
                    key={item.id}
                    className="aic-grid__card"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ scale: 1.03, y: -4, boxShadow: '0 12px 20px rgba(0,0,0,0.15)' }}
                    whileTap={{ scale: 0.97 }}
                    transition={{ duration: 0.25, delay: Math.min(index * 0.05, 0.3) }}
                    onClick={() => {
                      setSelectedArtwork(item);
                      setDetailMode('owner');
                      setScreen('edit');
                    }}
                  >
                    <img
                      src={item.image_url}
                      alt={item.prompt}
                      className="aic-grid__img"
                      loading="lazy"
                    />
                    <div className="aic-grid__overlay">
                      <span className="aic-grid__style">{item.style}</span>
                      <p className="aic-grid__prompt">{cleanPromptDisplay(item.prompt)}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="aic-section">
              <div className="aic-section__head">
                <h2 className="aic-section__title">Community Feed</h2>
              </div>
            </div>

            {feed?.communityFeed && feed.communityFeed.length === 0 ? (
              <div className="aic-empty-state">
                <Sparkles className="w-10 h-10 text-muted mb-2 opacity-50" />
                <p className="aic-empty-state__title">Community Feed Empty</p>
                <p className="aic-empty-state__subtitle">
                  Be the first to publish an AI creation to the community!
                </p>
              </div>
            ) : (
              <div className="aic-community-feed">
                {feed?.communityFeed?.map((item, index) => (
                  <motion.div
                    key={item.id}
                    className="aic-community-card"
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ y: -4, boxShadow: '0 12px 24px rgba(0, 0, 0, 0.12)' }}
                    whileTap={{ scale: 0.99 }}
                    transition={{ type: 'spring', damping: 20, stiffness: 150, delay: Math.min(index * 0.06, 0.3) }}
                    onClick={() => {
                      setSelectedArtwork(item);
                      setDetailMode('community');
                      setScreen('edit');
                    }}
                  >
                    <div className="aic-community-card__header">
                      <img
                        src={item.author.avatarUrl}
                        alt={item.author.name}
                        className="aic-community-card__avatar"
                      />
                      <div className="aic-community-card__user-info">
                        <span className="aic-community-card__username">{item.author.name}</span>
                        <span className="aic-community-card__style-tag">{item.style}</span>
                      </div>
                    </div>

                    <div className="aic-community-card__img-container">
                      <img
                        src={item.imageUrl}
                        alt={item.prompt}
                        className="aic-community-card__img"
                        loading="lazy"
                      />
                    </div>

                    <div className="aic-community-card__footer">
                      <p className="aic-community-card__prompt">"{cleanPromptDisplay(item.prompt)}"</p>
                      <div className="aic-community-card__actions">
                        <button
                          className={`aic-community-card__like-btn ${item.isLiked ? 'aic-community-card__like-btn--active' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleLikeMutation.mutate(item.id);
                          }}
                        >
                          <Heart className={`w-4 h-4 ${item.isLiked ? 'fill-red text-red' : ''}`} />
                          <span>{item.likes}</span>
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ===== FEATURED STYLES ===== */}
        <div className="aic-section">
          <div className="aic-section__head">
            <h2 className="aic-section__title">Featured Styles</h2>
          </div>
        </div>

        <div className="aic-styles-marquee-container">
          <div className="aic-styles-marquee">
            <div className="aic-styles-marquee__track">
              {/* Double the list for seamless infinite loop */}
              {[...featuredStyles, ...featuredStyles].map((style, index) => (
                <motion.div
                  key={`${style.id}-${index}`}
                  className="aic-styles__card"
                  whileHover={{
                    scale: 1.05,
                    y: -4,
                    boxShadow: '0 8px 20px rgba(201, 168, 76, 0.3)'
                  }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => {
                    setSelectedStyle(style.id.replace('style-', ''));
                    setShowModal(true);
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <img src={style.imageUrl} alt={style.name} className="aic-styles__card-img" loading="lazy" />
                  <div className="aic-styles__card-overlay">
                    <span className="aic-styles__card-name">{style.name}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
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
                <h3 className="aic-modal__title">Create & Publish</h3>
                <button className="aic-modal__close" onClick={closeModal}>
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Tab Selector */}
              <div className="aic-modal__tabs">
                <button
                  type="button"
                  className={`aic-modal__tab ${modalTab === 'generate' ? 'aic-modal__tab--active' : ''}`}
                  onClick={() => setModalTab('generate')}
                >
                  <Sparkles className="w-4 h-4" />
                  <span>AI Generator</span>
                </button>
                <button
                  type="button"
                  className={`aic-modal__tab ${modalTab === 'upload' ? 'aic-modal__tab--active' : ''}`}
                  onClick={() => setModalTab('upload')}
                >
                  <Upload className="w-4 h-4" />
                  <span>Upload Original</span>
                </button>
              </div>

              {modalTab === 'generate' ? (
                <>
                  <div className="aic-modal__label-row">
                    <p className="aic-modal__label">Describe your artwork</p>
                    <span className={`aic-modal__char-count ${prompt.length >= 450 ? 'aic-modal__char-count--warning' : ''}`}>
                      {prompt.length} / 500
                    </span>
                  </div>
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
                      <motion.button
                        key={s.id}
                        type="button"
                        className={`aic-modal__chip ${selectedStyle === s.id ? 'aic-modal__chip--active' : ''}`}
                        onClick={() => setSelectedStyle(s.id)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {s.label}
                      </motion.button>
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

                  {generateMutation.isError && (
                    <p className="aic-modal__error">
                      {(generateMutation.error as any)?.response?.data?.message || (generateMutation.error as any)?.message || 'Generation failed. Please try again.'}
                    </p>
                  )}
                </>
              ) : (
                <>
                  <p className="aic-modal__label">Select Artwork File</p>
                  <div className="aic-modal__upload-zone">
                    {uploadedFile ? (
                      <div className="aic-modal__preview-container">
                        <img
                          src={URL.createObjectURL(uploadedFile)}
                          alt="Upload Preview"
                          className="aic-modal__upload-preview"
                        />
                        <button
                          type="button"
                          className="aic-modal__remove-file"
                          onClick={() => setUploadedFile(null)}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="aic-modal__upload-label">
                        <Upload className="w-8 h-8 opacity-60 mb-2" />
                        <span className="text-sm opacity-80">Tap to select image</span>
                        <span className="text-xs opacity-50 mt-1">JPEG, PNG, or WebP (max 5MB)</span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) setUploadedFile(file);
                          }}
                        />
                      </label>
                    )}
                  </div>

                  <div className="aic-modal__label-row">
                    <p className="aic-modal__label">Title / Description</p>
                    <span className={`aic-modal__char-count ${uploadTitle.length >= 90 ? 'aic-modal__char-count--warning' : ''}`}>
                      {uploadTitle.length} / 100
                    </span>
                  </div>
                  <input
                    type="text"
                    className="aic-modal__input"
                    placeholder="Enter artwork title or description..."
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(sanitize(e.target.value, 100))}
                    maxLength={100}
                    autoComplete="off"
                  />

                  <p className="aic-modal__label">Artwork Category / Style</p>
                  <div className="aic-modal__chips">
                    {STYLE_OPTIONS.map((s) => (
                      <motion.button
                        key={s.id}
                        type="button"
                        className={`aic-modal__chip ${selectedStyle === s.id ? 'aic-modal__chip--active' : ''}`}
                        onClick={() => setSelectedStyle(s.id)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {s.label}
                      </motion.button>
                    ))}
                  </div>

                  <button
                    className="aic-modal__submit"
                    onClick={handleUpload}
                    disabled={uploadMutation.isPending || !uploadedFile}
                  >
                    {uploadMutation.isPending ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Analyzing & Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="w-5 h-5" />
                        Upload Artwork
                      </>
                    )}
                  </button>

                  {uploadMutation.isError && (
                    <p className="aic-modal__error">
                      {(uploadMutation.error as any)?.response?.data?.message || (uploadMutation.error as any)?.message || 'Upload failed. Please try again.'}
                    </p>
                  )}
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
