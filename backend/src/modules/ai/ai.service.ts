import { Injectable, InternalServerErrorException, BadRequestException, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { StorageService } from '../../storage/storage.service';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';

/**
 * CDN-hosted curated artwork images per style for Imagen/Pollinations fallback.
 * These are served from our Cloudflare R2 CDN for reliability.
 */
const CDN_BASE = 'https://cdn.seniqu.art/ai/themes';

const CURATED_ARTWORKS: Record<string, string[]> = {
  fantasy: [
    `${CDN_BASE}/fantasy_world.jpg`,
  ],
  anime: [
    `${CDN_BASE}/anime_portrait.jpg`,
  ],
  cyberpunk: [
    `${CDN_BASE}/cyberpunk.jpg`,
  ],
  watercolor: [
    `${CDN_BASE}/watercolor.jpg`,
  ],
  'oil-painting': [
    `${CDN_BASE}/oil_painting.jpg`,
  ],
  'digital-art': [
    `${CDN_BASE}/digital_art.jpg`,
  ],
  batik: [
    `${CDN_BASE}/batik_heritage.jpg`,
  ],
  default: [
    `${CDN_BASE}/fantasy_world.jpg`,
    `${CDN_BASE}/watercolor.jpg`,
    `${CDN_BASE}/digital_art.jpg`,
  ],
};

function getRandomCuratedArt(style: string): { url: string; mimeType: string } {
  const normStyle = (style || 'default').toLowerCase().trim();
  let pool = CURATED_ARTWORKS[normStyle];
  if (!pool || pool.length === 0) {
    const foundKey = Object.keys(CURATED_ARTWORKS).find(k => normStyle.includes(k));
    pool = foundKey ? CURATED_ARTWORKS[foundKey] : CURATED_ARTWORKS.default;
  }
  const url = pool[Math.floor(Math.random() * pool.length)];
  const mimeType = url.endsWith('.png') ? 'image/png' : 'image/jpeg';
  return { url, mimeType };
}

/**
 * Sanitize user prompt before storage:
 * - Strip markdown bold syntax (**text**)
 * - Strip formatting labels like "Prompt (≤500 chars):"
 * - Strip HTML tags
 * - Normalize whitespace
 */
function sanitizePromptForStorage(raw: string): string {
  return raw
    .replace(/\*\*[^*]*\*\*:?/g, '')      // Strip **bold labels**
    .replace(/<[^>]*>/g, '')               // Strip HTML tags
    .replace(/[\u201C\u201D]/g, '"')       // Normalize smart quotes
    .replace(/\s+/g, ' ')                  // Collapse whitespace
    .trim();
}

/**
 * AI Service
 * Provides mock data for the AI Dashboard and handles
 * simulated artwork generation with database persistence.
 */
@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly storageService: StorageService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Returns structured feed data for the AI Dashboard UI.
   * Fetches public creations from the database and returns them for "For You" and "Community Feed".
   */
  async getAiFeed(userId?: string) {
    const supabase = this.databaseService.getAdminClient();

    // Fetch public artworks
    const { data: dbArtworks, error } = await supabase
      .from('ai_artworks')
      .select(`
        id,
        prompt,
        image_url,
        style,
        likes_count,
        created_at,
        user_id
      `)
      .eq('visibility', 'public')
      .order('created_at', { ascending: false })
      .limit(30);

    if (error) {
      this.logger.error(`Failed to fetch public AI artworks: ${error.message}`);
    }

    const artworks = dbArtworks || [];

    // Fetch author info for these user IDs
    const userIds = Array.from(new Set(artworks.map((a: any) => a.user_id)));
    let userProfiles: Record<string, any> = {};

    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('users')
        .select('id, display_name, avatar_url')
        .in('id', userIds);
      if (profiles) {
        profiles.forEach((p: any) => {
          userProfiles[p.id] = p;
        });
      }
    }

    // Fetch liked artwork IDs by this user to mark them
    let likedArtworkIds = new Set<string>();
    if (userId) {
      const { data: likes } = await supabase
        .from('ai_artwork_likes')
        .select('artwork_id')
        .eq('user_id', userId);
      if (likes) {
        likedArtworkIds = new Set(likes.map((l: any) => l.artwork_id));
      }
    }

    // Map to feed item structure
    const feedItems = artworks.map((item: any) => {
      const author = userProfiles[item.user_id];
      return {
        id: item.id,
        imageUrl: item.image_url,
        prompt: item.prompt,
        likes: item.likes_count || 0,
        isLiked: likedArtworkIds.has(item.id),
        style: item.style || 'default',
        author: {
          name: author?.display_name || 'Anonymous',
          avatarUrl: author?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop',
        }
      };
    });

    const featuredStyles = [
      {
        id: 'style-fantasy',
        name: 'Fantasy World',
        imageUrl: `${CDN_BASE}/fantasy_world.jpg`,
      },
      {
        id: 'style-anime',
        name: 'Anime Portrait',
        imageUrl: `${CDN_BASE}/anime_portrait.jpg`,
      },
      {
        id: 'style-cyberpunk',
        name: 'Cyberpunk City',
        imageUrl: `${CDN_BASE}/cyberpunk.jpg`,
      },
      {
        id: 'style-watercolor',
        name: 'Watercolor',
        imageUrl: `${CDN_BASE}/watercolor.jpg`,
      },
      {
        id: 'style-oil-painting',
        name: 'Oil Painting',
        imageUrl: `${CDN_BASE}/oil_painting.jpg`,
      },
      {
        id: 'style-digital-art',
        name: 'Digital Art',
        imageUrl: `${CDN_BASE}/digital_art.jpg`,
      },
      {
        id: 'style-batik',
        name: 'Batik Heritage',
        imageUrl: `${CDN_BASE}/batik_heritage.jpg`,
      },
    ];

    return {
      forYou: feedItems,
      featuredStyles,
      communityFeed: feedItems,
    };
  }

  async generateArtwork(userId: string, prompt: string, style: string) {
    try {
      const supabase = this.databaseService.getAdminClient();

      // 1. Enforce strict MVP limit of 3 total AI generation prompts per user
      const { count, error: countError } = await supabase
        .from('ai_artworks')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (countError) {
        this.logger.error(`Failed to query user artwork count: ${countError.message}`);
      } else if (count !== null && count >= 3) {
        throw new BadRequestException(
          'Limit Promosi MVP Tercapai: Setiap user dibatasi maksimal 3x generate artwork.'
        );
      }

      // 2. Perform actual AI image generation
      // Priority: Cloudflare Workers AI Flux → Pollinations AI → Curated CDN Art
      let imageBuffer: Buffer | null = null;
      let directImageUrl: string | null = null;
      let contentType = 'image/png';
      const cfApiToken = this.configService.get<string>('ai.cfApiToken');
      const cfAccountId = this.configService.get<string>('ai.cfAccountId');
      const cleanPrompt = sanitizePromptForStorage(prompt);
      const fullPrompt = `${cleanPrompt}, ${style} style, digital art, high quality, masterpiece`;

      // === Tier 1: Cloudflare Workers AI — FLUX.1-schnell (free 10k neurons/day) ===
      if (cfApiToken && cfAccountId) {
        this.logger.log(`Generating artwork using Cloudflare Workers AI Flux for user ${userId}...`);
        try {
          const cfUrl = `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/ai/run/@cf/black-forest-labs/flux-1-schnell`;
          const cfResponse = await fetch(cfUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${cfApiToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              prompt: fullPrompt,
              num_steps: 8,
            }),
          });

          if (!cfResponse.ok) {
            const errText = await cfResponse.text();
            this.logger.error(`Cloudflare Workers AI error (status ${cfResponse.status}): ${errText}`);
            throw new Error(`Cloudflare Workers AI responded with status ${cfResponse.status}`);
          }

          const cfContentType = cfResponse.headers.get('content-type') || '';

          if (cfContentType.includes('image/')) {
            // Response is raw binary image
            const arrayBuffer = await cfResponse.arrayBuffer();
            imageBuffer = Buffer.from(arrayBuffer);
            contentType = cfContentType.split(';')[0] || 'image/png';
            this.logger.log(`Cloudflare Workers AI Flux returned raw image (${contentType}, ${imageBuffer.length} bytes)`);
          } else {
            // Response is JSON with base64 image
            const cfData = await cfResponse.json();
            if (!cfData?.success || !cfData?.result?.image) {
              const errMsg = cfData?.errors?.map((e: any) => e.message).join(', ') || 'Unknown error';
              throw new Error(`Cloudflare Workers AI returned error: ${errMsg}`);
            }
            imageBuffer = Buffer.from(cfData.result.image, 'base64');
            contentType = 'image/png';
            this.logger.log(`Cloudflare Workers AI Flux returned base64 image (${imageBuffer.length} bytes)`);
          }
        } catch (cfErr: any) {
          this.logger.warn(`Cloudflare Workers AI Flux failed: ${cfErr.message}. Falling back to Pollinations AI...`);
          const fallbackResult = await this.fallbackImageGenerationWithUrl(prompt, style);
          imageBuffer = fallbackResult.buffer;
          directImageUrl = fallbackResult.directUrl;
        }
      } else {
        // No Cloudflare token configured — use fallback chain
        this.logger.log(`No Cloudflare Workers AI token configured. Using fallback generators for user ${userId}...`);
        const fallbackResult = await this.fallbackImageGenerationWithUrl(prompt, style);
        imageBuffer = fallbackResult.buffer;
        directImageUrl = fallbackResult.directUrl;
      }

      // 3. Upload generated buffer to Cloudflare R2 CDN (with retry + graceful fallback)
      let imageUrl: string;

      if (imageBuffer) {
        const filename = `${uuidv4()}.png`;
        const fakeFile: Express.Multer.File = {
          fieldname: 'file',
          originalname: filename,
          encoding: '7bit',
          mimetype: contentType,
          size: imageBuffer.length,
          buffer: imageBuffer,
          stream: null as any,
          destination: '',
          filename: filename,
          path: '',
        };

        imageUrl = await this.uploadToR2WithRetry(fakeFile, userId, directImageUrl);
      } else if (directImageUrl) {
        // No buffer available, use the direct URL
        imageUrl = directImageUrl;
      } else {
        throw new InternalServerErrorException('AI image generation failed: no image data produced.');
      }

      // 4. Save metadata in Supabase (with sanitized prompt)
      const cleanedPrompt = sanitizePromptForStorage(prompt);
      const { data, error } = await supabase
        .from('ai_artworks')
        .insert({
          user_id: userId,
          prompt: cleanedPrompt,
          style,
          image_url: imageUrl,
          status: 'completed',
          visibility: 'private',
        })
        .select()
        .single();

      if (error) {
        this.logger.error(`DB insert failed: ${error.message}`, error);
        throw new InternalServerErrorException('Failed to save generated artwork.');
      }

      return data;
    } catch (error: any) {
      if (error instanceof BadRequestException || error instanceof InternalServerErrorException) {
        throw error;
      }
      this.logger.error(`Generation failed: ${error.message}`, error.stack);
      throw new InternalServerErrorException('An error occurred during generation.');
    }
  }

  /**
   * Upload image to R2 with retry (1 retry with exponential backoff).
   * If R2 upload completely fails (e.g., signature mismatch, credentials rotated),
   * gracefully fall back to the direct image URL so the user still gets a result.
   */
  private async uploadToR2WithRetry(
    fakeFile: Express.Multer.File,
    userId: string,
    fallbackUrl: string | null,
    maxRetries = 1,
  ): Promise<string> {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        this.logger.log(`Uploading AI generated image to R2 CDN (attempt ${attempt + 1})...`);
        const uploadResult = await this.storageService.uploadFile(
          fakeFile,
          'ai-outputs',
          userId,
        );

        // Check if the upload returned a data URI (dev fallback) — that's fine
        if (uploadResult.url.startsWith('data:')) {
          this.logger.warn('R2 upload fell back to Base64 data URI (dev mode).');
        }

        return uploadResult.url;
      } catch (uploadErr: any) {
        const isSignatureError = uploadErr.message?.includes('signature') ||
          uploadErr.message?.includes('SignatureDoesNotMatch') ||
          uploadErr.message?.includes('AccessDenied');

        this.logger.error(
          `R2 upload attempt ${attempt + 1} failed: ${uploadErr.message}` +
          (isSignatureError ? ' [CREDENTIAL ISSUE — check R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY]' : ''),
        );

        if (attempt < maxRetries) {
          const backoffMs = 1000 * Math.pow(2, attempt);
          this.logger.log(`Retrying R2 upload in ${backoffMs}ms...`);
          await new Promise(resolve => setTimeout(resolve, backoffMs));
          continue;
        }

        // All retries exhausted — use fallback URL if available
        if (fallbackUrl) {
          this.logger.warn(
            `R2 upload failed after ${maxRetries + 1} attempts. ` +
            `Using direct image URL as fallback: ${fallbackUrl}`,
          );
          return fallbackUrl;
        }

        // No fallback URL available — throw with clear message
        throw new InternalServerErrorException(
          'Storage upload failed. Please check your R2 credentials (R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY) in your environment configuration.',
        );
      }
    }

    // Should never reach here, but TypeScript needs it
    throw new InternalServerErrorException('Unexpected upload state.');
  }

  /**
   * Fallback image generation chain: Pollinations AI → Curated CDN Art
   * Returns both the image buffer and the direct source URL.
   * The directUrl serves as a fallback if R2 upload fails.
   */
  private async fallbackImageGenerationWithUrl(
    prompt: string,
    style: string,
  ): Promise<{ buffer: Buffer; directUrl: string }> {
    // Try Pollinations AI
    try {
      this.logger.log('Attempting Pollinations AI fallback (with URL)...');
      const pollUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(`${prompt}, ${style} style`)}?width=800&height=1000&nologo=true&seed=${Math.floor(Math.random() * 1000000)}`;
      const pollResponse = await fetch(pollUrl);
      if (!pollResponse.ok) {
        throw new Error(`Pollinations API responded with status ${pollResponse.status}`);
      }
      const arrayBuffer = await pollResponse.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      if (buffer.length < 1000) {
        throw new Error('Pollinations returned suspiciously small response');
      }
      this.logger.log(`Pollinations AI generated image (${buffer.length} bytes)`);
      // Use the final redirect URL (Pollinations may redirect)
      return { buffer, directUrl: pollUrl };
    } catch (pollErr: any) {
      this.logger.warn(`Pollinations AI failed: ${pollErr.message}. Falling back to curated artwork...`);
    }

    // Final fallback: Curated CDN artwork
    try {
      const fallbackInfo = getRandomCuratedArt(style);
      const fallbackResponse = await fetch(fallbackInfo.url);
      if (!fallbackResponse.ok) {
        throw new Error('Failed to fetch curated artwork.');
      }
      const arrayBuffer = await fallbackResponse.arrayBuffer();
      this.logger.log(`Using curated artwork fallback: ${fallbackInfo.url}`);
      return { buffer: Buffer.from(arrayBuffer), directUrl: fallbackInfo.url };
    } catch (fallbackErr: any) {
      this.logger.error(`All image generation fallbacks failed: ${fallbackErr.message}`);
      throw new InternalServerErrorException('AI image generation service and all fallbacks are currently unavailable.');
    }
  }

  /**
   * @deprecated Use fallbackImageGenerationWithUrl instead
   * Kept for backwards compatibility
   */
  private async fallbackImageGeneration(prompt: string, style: string): Promise<Buffer> {
    const result = await this.fallbackImageGenerationWithUrl(prompt, style);
    return result.buffer;
  }

  /**
   * Get user's AI generation history, newest first.
   */
  async getUserHistory(userId: string) {
    try {
      const supabase = this.databaseService.getAdminClient();

      const { data, error } = await supabase
        .from('ai_artworks')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        this.logger.error(`History fetch failed: ${error.message}`, error);
        throw new InternalServerErrorException('Failed to fetch AI history.');
      }

      return data || [];
    } catch (error: any) {
      if (error instanceof InternalServerErrorException) throw error;
      this.logger.error(`History error: ${error.message}`, error.stack);
      throw new InternalServerErrorException('An error occurred fetching history.');
    }
  }

  /**
   * Delete an AI artwork.
   */
  async deleteArtwork(userId: string, artworkId: string) {
    try {
      const supabase = this.databaseService.getAdminClient();

      const { data: artwork, error: fetchError } = await supabase
        .from('ai_artworks')
        .select('image_url')
        .eq('id', artworkId)
        .eq('user_id', userId)
        .single();

      if (fetchError || !artwork) {
        throw new BadRequestException('Artwork not found or access denied.');
      }

      const { error } = await supabase
        .from('ai_artworks')
        .delete()
        .eq('id', artworkId)
        .eq('user_id', userId);

      if (error) {
        this.logger.error(`Failed to delete artwork: ${error.message}`);
        throw new InternalServerErrorException('Failed to delete artwork from database.');
      }

      return { success: true };
    } catch (error: any) {
      if (error instanceof BadRequestException || error instanceof InternalServerErrorException) {
        throw error;
      }
      throw new InternalServerErrorException('An error occurred during deletion.');
    }
  }

  /**
   * Update visibility of an AI artwork (Publish/Unpublish).
   */
  async updateVisibility(userId: string, artworkId: string, visibility: 'public' | 'private') {
    try {
      const supabase = this.databaseService.getAdminClient();

      const { data, error } = await supabase
        .from('ai_artworks')
        .update({ visibility })
        .eq('id', artworkId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        this.logger.error(`Failed to update visibility: ${error.message}`);
        throw new InternalServerErrorException('Failed to update visibility.');
      }

      return data;
    } catch (error: any) {
      if (error instanceof InternalServerErrorException) throw error;
      throw new InternalServerErrorException('An error occurred updating visibility.');
    }
  }

  /**
   * Toggle like on an AI artwork.
   */
  async toggleLike(userId: string, artworkId: string) {
    try {
      const supabase = this.databaseService.getAdminClient();

      // Check if user already liked it
      const { data: existingLike, error: checkError } = await supabase
        .from('ai_artwork_likes')
        .select('id')
        .eq('artwork_id', artworkId)
        .eq('user_id', userId)
        .maybeSingle();

      if (checkError) throw checkError;

      let isLiked = false;

      if (existingLike) {
        // Unlike: delete from likes table
        const { error: deleteError } = await supabase
          .from('ai_artwork_likes')
          .delete()
          .eq('id', existingLike.id);
        if (deleteError) throw deleteError;

        isLiked = false;

        // Decrement likes_count
        const { data: current } = await supabase.from('ai_artworks').select('likes_count').eq('id', artworkId).single();
        const count = Math.max(0, (current?.likes_count || 1) - 1);
        await supabase.from('ai_artworks').update({ likes_count: count }).eq('id', artworkId);
      } else {
        // Like: insert into likes table
        const { error: insertError } = await supabase
          .from('ai_artwork_likes')
          .insert({ artwork_id: artworkId, user_id: userId });
        if (insertError) throw insertError;

        isLiked = true;

        // Increment likes_count
        const { data: current } = await supabase.from('ai_artworks').select('likes_count').eq('id', artworkId).single();
        const count = (current?.likes_count || 0) + 1;
        await supabase.from('ai_artworks').update({ likes_count: count }).eq('id', artworkId);
      }

      // Fetch new likes count
      const { data: updated } = await supabase
        .from('ai_artworks')
        .select('likes_count')
        .eq('id', artworkId)
        .single();

      return { likesCount: updated?.likes_count || 0, isLiked };
    } catch (error: any) {
      this.logger.error(`Toggle like failed: ${error.message}`, error.stack);
      throw new InternalServerErrorException('An error occurred toggling like.');
    }
  }

  /**
   * Get comments on an AI artwork.
   */
  async getComments(artworkId: string) {
    try {
      const supabase = this.databaseService.getAdminClient();

      const { data, error } = await supabase
        .from('ai_artwork_comments')
        .select(`
          id,
          content,
          created_at,
          user_id
        `)
        .eq('artwork_id', artworkId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const comments = data || [];
      const userIds = Array.from(new Set(comments.map((c: any) => c.user_id)));
      let userProfiles: Record<string, any> = {};

      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('users')
          .select('id, display_name, avatar_url')
          .in('id', userIds);
        if (profiles) {
          profiles.forEach((p: any) => {
            userProfiles[p.id] = p;
          });
        }
      }

      const result = comments.map((c: any) => {
        const user = userProfiles[c.user_id];
        return {
          id: c.id,
          content: c.content,
          created_at: c.created_at,
          user: {
            id: c.user_id,
            display_name: user?.display_name || 'Anonymous',
            avatar_url: user?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop',
          }
        };
      });

      return result;
    } catch (error: any) {
      this.logger.error(`Fetch comments failed: ${error.message}`, error.stack);
      throw new InternalServerErrorException('An error occurred fetching comments.');
    }
  }

  /**
   * Add a comment on an AI artwork.
   */
  async addComment(userId: string, artworkId: string, content: string) {
    try {
      const supabase = this.databaseService.getAdminClient();

      const trimmedContent = (content || '').trim();
      if (!trimmedContent || trimmedContent.length > 500) {
        throw new BadRequestException('Comment must be between 1 and 500 characters.');
      }

      const { data: commentData, error } = await supabase
        .from('ai_artwork_comments')
        .insert({
          artwork_id: artworkId,
          user_id: userId,
          content: trimmedContent
        })
        .select()
        .single();

      if (error) throw error;

      const { data: userProfile } = await supabase
        .from('users')
        .select('display_name, avatar_url')
        .eq('id', userId)
        .single();

      const result = {
        id: commentData.id,
        content: commentData.content,
        created_at: commentData.created_at,
        user: {
          id: userId,
          display_name: userProfile?.display_name || 'Anonymous',
          avatar_url: userProfile?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop',
        }
      };

      return result;
    } catch (error: any) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error(`Add comment failed: ${error.message}`, error.stack);
      throw new InternalServerErrorException('An error occurred adding comment.');
    }
  }

  /**
   * Moderate and validate an uploaded image using Gemini Vision API.
   * Checks if the image contains actual artwork and is appropriate.
   */
  async moderateImage(buffer: Buffer, mimeType: string): Promise<{ isArtwork: boolean; isAppropriate: boolean; reason: string }> {
    try {
      const geminiApiKey = this.configService.get<string>('ai.geminiApiKey');
      if (!geminiApiKey) {
        return { isArtwork: true, isAppropriate: true, reason: 'Gemini API Key not set, skipped moderation.' };
      }

      const base64Data = buffer.toString('base64');
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: 'Analyze the provided image. Determine if the image is a genuine piece of artwork (e.g., a painting, drawing, sculpture, digital design, traditional craft, or photography of physical art) and is appropriate for a public gallery (no NSFW, no hate speech, not a random personal selfie/meme, not a screenshot of text/unrelated app). Respond ONLY with a JSON object containing keys: isArtwork (boolean), isAppropriate (boolean), and reason (string describing the analysis).'
                  },
                  {
                    inlineData: {
                      mimeType: mimeType,
                      data: base64Data,
                    }
                  }
                ]
              }
            ],
            generationConfig: {
              responseMimeType: 'application/json'
            }
          })
        }
      );

      if (!response.ok) {
        const errText = await response.text();
        this.logger.error(`Gemini Moderation API error (status ${response.status}): ${errText}`);
        return { isArtwork: true, isAppropriate: true, reason: 'API call failed, bypassing moderation.' };
      }

      const result = await response.json();
      const textResponse = result?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!textResponse) {
        throw new Error('Empty response from Gemini Moderation API.');
      }

      const parsed = JSON.parse(textResponse.trim());
      return {
        isArtwork: !!parsed.isArtwork,
        isAppropriate: !!parsed.isAppropriate,
        reason: parsed.reason || '',
      };
    } catch (err: any) {
      this.logger.error(`Image moderation failed: ${err.message}`, err.stack);
      return { isArtwork: true, isAppropriate: true, reason: 'Error in moderation processing.' };
    }
  }

  /**
   * Upload user's custom artwork, run Gemini content moderation,
   * save to R2 CDN, and index in the database.
   */
  async uploadUserArtwork(userId: string, buffer: Buffer, originalname: string, mimeType: string, prompt: string, style: string) {
    try {
      const supabase = this.databaseService.getAdminClient();

      // 1. Enforce strict MVP limit of 3 total AI/custom artwork creations per user
      const { count, error: countError } = await supabase
        .from('ai_artworks')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (countError) {
        this.logger.error(`Failed to query user artwork count: ${countError.message}`);
      } else if (count !== null && count >= 3) {
        throw new BadRequestException(
          'Limit Promosi MVP Tercapai: Setiap user dibatasi maksimal 3x generate/upload artwork.'
        );
      }

      // 2. Perform content moderation with Gemini API
      this.logger.log(`Performing content moderation on uploaded file ${originalname} for user ${userId}...`);
      const moderation = await this.moderateImage(buffer, mimeType);

      if (!moderation.isAppropriate) {
        throw new BadRequestException(
          `Moderasi gagal: Gambar dinilai tidak pantas/tidak layak dipublikasikan. Alasan: ${moderation.reason}`
        );
      }

      if (!moderation.isArtwork) {
        throw new BadRequestException(
          `Moderasi gagal: Gambar dideteksi bukan merupakan karya seni (lukisan, patung, grafis, dll.). Alasan: ${moderation.reason}`
        );
      }

      // 3. Upload file to R2
      const filename = `${uuidv4()}_${originalname}`;
      const fakeFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: filename,
        encoding: '7bit',
        mimetype: mimeType,
        size: buffer.length,
        buffer,
        stream: null as any,
        destination: '',
        filename,
        path: '',
      };

      this.logger.log(`Uploading user artwork to R2...`);
      const uploadResult = await this.storageService.uploadFile(
        fakeFile,
        'ai-outputs',
        userId
      );

      const imageUrl = uploadResult.url;

      // 4. Save metadata
      const { data, error } = await supabase
        .from('ai_artworks')
        .insert({
          user_id: userId,
          prompt: prompt || 'User Uploaded Artwork',
          image_url: imageUrl,
          style: style || 'Default',
          status: 'completed',
          visibility: 'public',
          likes_count: 0
        })
        .select()
        .single();

      if (error) {
        this.logger.error(`Failed to save uploaded artwork: ${error.message}`);
        throw new InternalServerErrorException('Failed to save artwork metadata.');
      }

      return data;
    } catch (error: any) {
      if (error instanceof BadRequestException || error instanceof InternalServerErrorException) throw error;
      this.logger.error(`Upload artwork failed: ${error.message}`, error.stack);
      throw new InternalServerErrorException('An error occurred during artwork upload.');
    }
  }
}
