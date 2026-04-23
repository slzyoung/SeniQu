import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
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
   * GET /ai/feed — Curated mockup feed for the AI Dashboard
   */
  @Get('feed')
  async getFeed() {
    return this.aiService.getAiFeed();
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
    // Basic server-side validation
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
}
