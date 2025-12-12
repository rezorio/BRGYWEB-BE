import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class IpThrottlerGuard extends ThrottlerGuard {
  /**
   * Override the default tracker to use IP address instead of global tracking
   * This ensures rate limiting is applied per IP address for all endpoints
   */
  protected async getTracker(req: Record<string, any>): Promise<string> {
    // Get IP address from various possible sources
    const ip = 
      req.ip || 
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.headers['x-real-ip'] ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      'unknown';
    
    return ip;
  }

  /**
   * Generate a unique key for rate limiting storage
   * Format: throttler:{ip}:{context}:{ttl}
   */
  protected generateKey(
    context: ExecutionContext,
    tracker: string,
    throttlerName: string,
  ): string {
    const request = context.switchToHttp().getRequest();
    const route = request.route?.path || request.url;
    
    // Create a unique key combining IP, route, and throttler name
    return `throttler:${tracker}:${route}:${throttlerName}`;
  }
}
