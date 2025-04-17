import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import type { Request } from 'express';
import { passportJwtSecret } from 'jwks-rsa'; // Use this for Cognito JWKS verification
import { ConfigService } from '@nestjs/config';
import { UserService } from '@users/user.service';
import { User } from '@users/user.entity';

// Create a type-safe JwtFromRequest function
type JwtFromRequestFn = (req: Request) => string | null;

// Define type for passport-jwt strategy options
interface JwtStrategyOptions {
  jwtFromRequest: JwtFromRequestFn;
  ignoreExpiration: boolean;
  secretOrKeyProvider: ReturnType<typeof passportJwtSecret>;
  audience: string;
  issuer: string;
  algorithms: string[];
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly userService: UserService,
  ) {
    // Construct the JWKS URI from environment variables
    const region = configService.get<string>('AWS_REGION');
    const userPoolId = configService.get<string>('COGNITO_USER_POOL_ID');
    const audience = configService.get<string>('COGNITO_CLIENT_ID'); // Get audience (App Client ID)

    if (!region || !userPoolId || !audience) {
      throw new Error(
        'Missing Cognito configuration in environment variables (AWS_REGION, COGNITO_USER_POOL_ID, COGNITO_CLIENT_ID)',
      );
    }

    const jwksUri = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/jwks.json`;
    const issuer = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`;

    // Create a properly typed options object for PassportStrategy
    const jwtFromRequest: JwtFromRequestFn = (req: Request): string | null => {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.substring(7);
      }
      return null;
    };

    const options: JwtStrategyOptions = {
      jwtFromRequest,
      ignoreExpiration: false, // Ensure tokens are not expired

      // --- Configuration for Cognito JWKS Validation ---
      secretOrKeyProvider: passportJwtSecret({
        cache: true, // Cache the signing key
        rateLimit: true, // Rate limit requests to JWKS endpoint
        jwksRequestsPerMinute: 5, // Adjust as needed
        jwksUri, // The dynamically constructed JWKS URI
      }),
      // -----------------------------------------------

      // --- Validate Audience and Issuer ---
      audience, // The App Client ID
      issuer, // The User Pool URL
      algorithms: ['RS256'], // Cognito uses RS256
      // ----------------------------------
    };

    // We need to use type assertions and disable ESLint for the super call
    // because of the impedance mismatch between PassportStrategy's types and the actual expected structure
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    super(options as any);

    this.logger.log(
      `JwtStrategy initialized. Issuer: ${issuer}, Audience: ${audience}, JWKS URI: ${jwksUri}`,
    );
  }

  /**
   * Validates the JWT payload after signature verification.
   * Extracts users identifier (sub) and finds the corresponding users in the database.
   */
  async validate(payload: {
    sub?: string;
    [key: string]: unknown;
  }): Promise<User> {
    this.logger.verbose(`Validating JWT payload for sub: ${payload.sub}`);

    // Ensure the 'sub' claim exists (Cognito standard unique identifier)
    const cognitoSub = payload.sub;
    if (!cognitoSub) {
      this.logger.warn('JWT payload missing "sub" claim.');
      throw new UnauthorizedException('Invalid token payload (missing sub).');
    }

    // Optional: Check token_use claim if needed (e.g., ensure it's an 'id' token or 'access' token)
    // const tokenUse = payload.token_use as string | undefined;
    // if (tokenUse !== 'id' && tokenUse !== 'access') { // Adjust based on which token frontend sends
    //     this.logger.warn(`Invalid token_use claim: ${tokenUse}`);
    //     throw new UnauthorizedException('Invalid token use.');
    // }

    // Find the users in your database using the cognitoSub
    const user = await this.userService.findByCognitoSub(cognitoSub);

    if (!user) {
      // If users not found in DB, but token is valid, it might indicate a sync issue
      // or the users was deleted after the token was issued.
      this.logger.warn(
        `User with cognitoSub ${cognitoSub} not found in DB, denying access.`,
      );
      throw new UnauthorizedException('User associated with token not found.');
    }

    this.logger.verbose(`JWT validation successful for user ID: ${user.id}`);
    // Return the users object. Passport attaches this to request.users
    return user;
  }
}
