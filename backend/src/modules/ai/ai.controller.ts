import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Param,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Throttle } from '@nestjs/throttler';

/**
 * AI Controller
 * All endpoints require JWT authentication.
 * Generation endpoint has stricter rate limiting (anti-abuse).
 */
@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  /**
   * GET /ai/feed — Curated public creations feed
   */
  @Get('feed')
  async getFeed(@Req() req: any) {
    return this.aiService.getAiFeed(req.user.id);
  }

  /**
   * POST /ai/generate — Submit a prompt to generate artwork
   * Rate limited to 3 requests per 60s to prevent abuse.
   */
  @Post('generate')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  async generateArtwork(
    @Req() req: any,
    @Body() body: { prompt: string; style: string },
  ) {
    const prompt = (body.prompt || '').trim();
    const style = (body.style || 'default').trim();

    if (!prompt || prompt.length < 3 || prompt.length > 500) {
      return {
        success: false,
        message: 'Prompt must be between 3 and 500 characters.',
      };
    }

    return this.aiService.generateArtwork(req.user.id, prompt, style);
  }

  /**
   * GET /ai/history — User's past AI generations
   */
  @Get('history')
  async getHistory(@Req() req: any) {
    return this.aiService.getUserHistory(req.user.id);
  }

  /**
   * DELETE /ai/:id — Delete an AI artwork
   */
  @Delete(':id')
  async deleteArtwork(@Req() req: any, @Param('id') id: string) {
    return this.aiService.deleteArtwork(req.user.id, id);
  }

  // ============================================
  // HERITAGE SCAN ENDPOINTS
  // ============================================

  /**
   * GET /ai/heritage-scan/quota — Get user's remaining daily scan quota
   */
  @Get('heritage-scan/quota')
  async getScanQuota(@Req() req: any) {
    return this.aiService.getUserScanQuota(req.user.id);
  }

  /**
   * GET /ai/heritage-scan/history — Get user's scan history
   */
  @Get('heritage-scan/history')
  async getScanHistory(@Req() req: any) {
    return this.aiService.getUserScanHistory(req.user.id);
  }

  /**
   * POST /ai/heritage-scan — Scan and identify a heritage artifact image via Gemini AI
   */
  @Post('heritage-scan')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async scanHeritageImage(@Req() req: any) {
    const data = await req.file();
    if (!data) {
      throw new BadRequestException('No file provided.');
    }

    const allowedImages = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedImages.includes(data.mimetype)) {
      throw new BadRequestException('Only JPEG, PNG, and WebP images are allowed.');
    }

    const buffer = await data.toBuffer();
    return this.aiService.scanHeritage(req.user.id, buffer, data.mimetype);
  }

  /**
   * PATCH /ai/:id/visibility — Update visibility of an AI artwork
   */
  @Patch(':id/visibility')
  async updateVisibility(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { visibility: 'public' | 'private' },
  ) {
    return this.aiService.updateVisibility(req.user.id, id, body.visibility);
  }

  /**
   * POST /ai/:id/like — Toggle like on an AI artwork
   */
  @Post(':id/like')
  async toggleLike(@Req() req: any, @Param('id') id: string) {
    return this.aiService.toggleLike(req.user.id, id);
  }

  /**
   * GET /ai/:id/comments — Get comments on an AI artwork
   */
  @Get(':id/comments')
  async getComments(@Param('id') id: string) {
    return this.aiService.getComments(id);
  }

  /**
   * POST /ai/:id/comments — Add a comment to an AI artwork
   */
  @Post(':id/comments')
  async addComment(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { content: string },
  ) {
    return this.aiService.addComment(req.user.id, id, body.content);
  }

  /**
   * POST /ai/upload — Upload user's custom artwork with Gemini moderation
   */
  @Post('upload')
  async uploadArtwork(@Req() req: any) {
    const data = await req.file();
    if (!data) {
      throw new BadRequestException('No file provided.');
    }

    const allowedImages = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedImages.includes(data.mimetype)) {
      throw new BadRequestException('Only JPEG, PNG, and WebP images are allowed.');
    }

    const buffer = await data.toBuffer();
    const fields = data.fields as Record<string, any>;
    const prompt = (fields?.prompt?.value || '').trim();
    const style = (fields?.style?.value || 'Default').trim();

    return this.aiService.uploadUserArtwork(
      req.user.id,
      buffer,
      data.filename,
      data.mimetype,
      prompt,
      style
    );
  }

  /**
   * GET /ai/heritage-curation/quota — Get user's remaining daily curation quota
   */
  @Get('heritage-curation/quota')
  async getCurationQuota(@Req() req: any) {
    return this.aiService.getUserCurationQuota(req.user.id);
  }

  /**
   * GET /ai/heritage-curation/history — Get user's curation history
   */
  @Get('heritage-curation/history')
  async getCurationHistory(@Req() req: any) {
    return this.aiService.getUserCurationHistory(req.user.id);
  }

  /**
   * GET /ai/heritage-curation/public — Get public/community heritage curations (masterpieces feed)
   */
  @Get('heritage-curation/public')
  async getPublicCurations() {
    return this.aiService.getPublicHeritageCurations();
  }

  /**
   * POST /ai/heritage-curation — Perform AI curation and restoration
   */
  @Post('heritage-curation')
  async curateHeritageImage(@Req() req: any) {
    const data = await req.file();
    if (!data) {
      throw new BadRequestException('No file provided.');
    }

    const allowedImages = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedImages.includes(data.mimetype)) {
      throw new BadRequestException('Only JPEG, PNG, and WebP images are allowed.');
    }

    const buffer = await data.toBuffer();
    return this.aiService.curateHeritage(req.user.id, buffer, data.mimetype);
  }

  /**
   * PATCH /ai/heritage-curation/:id/publish — Publish a heritage curation
   */
  @Patch('heritage-curation/:id/publish')
  async publishCuration(@Req() req: any, @Param('id') id: string) {
    return this.aiService.publishHeritageCuration(req.user.id, id);
  }
}
