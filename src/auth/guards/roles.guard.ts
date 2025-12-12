import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    
    // Debug logging
    if (!user) {
      console.error('RolesGuard: No user found in request');
      return false;
    }
    
    if (!user.roles || !Array.isArray(user.roles)) {
      console.error('RolesGuard: User has no roles or roles is not an array', { 
        userId: user.userId, 
        email: user.email,
        roles: user.roles 
      });
      return false;
    }
    
    const hasRole = requiredRoles.some((role) => user.roles.includes(role));
    
    if (!hasRole) {
      console.warn('RolesGuard: User does not have required roles', {
        userId: user.userId,
        email: user.email,
        userRoles: user.roles,
        requiredRoles: requiredRoles
      });
    }
    
    return hasRole;
  }
}
