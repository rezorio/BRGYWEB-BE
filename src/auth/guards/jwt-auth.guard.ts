import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    // Add logging to debug auth issues
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    
    if (!authHeader) {
      console.error('JwtAuthGuard: No authorization header found');
    } else {
      console.log('JwtAuthGuard: Authorization header present');
    }
    
    return super.canActivate(context);
  }

  handleRequest(err, user, info) {
    if (err || !user) {
      console.error('JwtAuthGuard: Authentication failed', {
        error: err?.message,
        info: info?.message,
        hasUser: !!user
      });
      throw err || new UnauthorizedException('Authentication failed');
    }
    
    console.log('JwtAuthGuard: Authentication successful', {
      userId: user.userId,
      email: user.email,
      roles: user.roles
    });
    
    return user;
  }
}
