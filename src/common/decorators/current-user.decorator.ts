import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '@users/user.entity'; // Adjust path
import { Request } from 'express';

/**
 * Custom decorator to extract the user object attached to the request
 * by an authentication guard (e.g., JwtAuthGuard).
 * Assumes the guard attaches the validated User entity to `request.user`.
 */
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): User => {
    const request = ctx.switchToHttp().getRequest<Request & { user: User }>();
    // Assumes the user object is attached to request.user by the guard
    // If request.user is not populated, it means the guard likely failed or wasn't applied.
    // The guard itself should handle unauthorized access before this decorator is reached.
    return request.user;
  },
);
