import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

/**
 * AI Service
 * Provides mock data for the AI Dashboard and handles
 * simulated artwork generation with database persistence.
 */
@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Returns structured mockup feed data for the AI Dashboard UI.
   * Mirrors the design: "For You", "Featured Styles", "Community Feed".
   */
  async getAiFeed() {
    const forYou = [
      {
        id: 'fy-1',
        title: 'Dark and Mysterious City',
        prompt: 'Create a dark and mysterious illustration of a city for rusia, the ttrpg created by Critical...',
        author: {
          name: 'HoltHamlet',
          isPremium: true,
          avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop',
        },
        imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&h=800&fit=crop',
        likes: 120,
      },
      {
        id: 'fy-2',
        title: 'Ethereal Forest Spirit',
        prompt: 'An ethereal forest spirit standing in a bioluminescent forest...',
        author: {
          name: 'LlamaDr',
          isPremium: false,
          avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop',
        },
        imageUrl: 'https://images.unsplash.com/photo-1606907568019-2db11718c3cb?w=600&h=800&fit=crop',
        likes: 85,
      },
      {
        id: 'fy-3',
        title: 'Celestial Dragon',
        prompt: 'A majestic celestial dragon soaring through a starlit nebula...',
        author: {
          name: 'ArtisanX',
          isPremium: true,
          avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop',
        },
        imageUrl: 'https://images.unsplash.com/photo-1578301978693-85fa9fd0c331?w=600&h=800&fit=crop',
        likes: 312,
      },
    ];

    const featuredStyles = [
      {
        id: 'style-fantasy',
        name: 'Fantasy World',
        imageUrl: 'https://images.unsplash.com/photo-1618336753174-8e100f91ce0a?w=400&h=200&fit=crop',
      },
      {
        id: 'style-anime',
        name: 'Anime Portrait',
        imageUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400&h=200&fit=crop',
      },
      {
        id: 'style-cyberpunk',
        name: 'Cyberpunk City',
        imageUrl: 'https://images.unsplash.com/photo-1515630278258-407f66498911?w=400&h=200&fit=crop',
      },
      {
        id: 'style-watercolor',
        name: 'Watercolor',
        imageUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=400&h=200&fit=crop',
      },
    ];

    const communityFeed = [
      {
        id: 'cf-1',
        author: {
          name: 'CaesarJ',
          avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
        },
        imageUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=600&h=600&fit=crop',
      },
      {
        id: 'cf-2',
        author: {
          name: 'Polemic',
          isPremium: true,
          avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop',
        },
        imageUrl: 'https://images.unsplash.com/photo-1547826039-bfc35e0f1ea8?w=600&h=600&fit=crop',
      },
      {
        id: 'cf-3',
        author: {
          name: 'PixelMage',
          avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop',
        },
        imageUrl: 'https://images.unsplash.com/photo-1549490349-8643362247b5?w=600&h=600&fit=crop',
      },
    ];

    return { forYou, featuredStyles, communityFeed };
  }

  /**
   * Simulates AI generation and persists result to the database.
   * In production, this would call a real AI model API.
   */
  async generateArtwork(userId: string, prompt: string, style: string) {
    try {
      const supabase = this.databaseService.getClient();

      // Simulate AI processing delay (2-4 seconds)
      const delay = 2000 + Math.random() * 2000;
      await new Promise((resolve) => setTimeout(resolve, delay));

      // Mockup generated images based on style
      const mockImages: Record<string, string> = {
        'fantasy': 'https://images.unsplash.com/photo-1618336753174-8e100f91ce0a?w=800&h=1000&fit=crop',
        'anime': 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&h=1000&fit=crop',
        'cyberpunk': 'https://images.unsplash.com/photo-1515630278258-407f66498911?w=800&h=1000&fit=crop',
        'watercolor': 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=800&h=1000&fit=crop',
        'default': 'https://images.unsplash.com/photo-1620121692029-d088224ddc74?w=800&h=1000&fit=crop',
      };

      const imageUrl = mockImages[style] || mockImages['default'];

      const { data, error } = await supabase
        .from('ai_artworks')
        .insert({
          user_id: userId,
          prompt,
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

      return { success: true, data };
    } catch (error: any) {
      if (error instanceof InternalServerErrorException) throw error;
      this.logger.error(`Generation failed: ${error.message}`, error.stack);
      throw new InternalServerErrorException('An error occurred during generation.');
    }
  }

  /**
   * Get user's AI generation history, newest first.
   */
  async getUserHistory(userId: string) {
    try {
      const supabase = this.databaseService.getClient();

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

      return { success: true, data: data || [] };
    } catch (error: any) {
      if (error instanceof InternalServerErrorException) throw error;
      this.logger.error(`History error: ${error.message}`, error.stack);
      throw new InternalServerErrorException('An error occurred fetching history.');
    }
  }
}
