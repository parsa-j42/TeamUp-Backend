import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  // Optional: Customize error handling or logic before/after authentication
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    // Add custom authentication logic here if needed
    // for example, call super.logIn(request) to establish a session.
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any): any {
    // You can throw an exception based on either "info" or "err" arguments
    if (err || !user) {
      // Log the error/info for debugging
      // console.error('JWT Auth Error:', err);
      // console.error('JWT Auth Info:', info);

      // Provide a more specific message if available from passport-jwt or jwks-rsa
      let message = 'Unauthorized';
      if (info instanceof Error) {
        message = info.message; // e.g., "No auth token", "jwt expired"
      } else if (typeof info === 'string') {
        message = info;
      }

      throw err || new UnauthorizedException(message);
    }
    // If authentication is successful, Passport attaches the users object to the request.
    return user;
  }
}
