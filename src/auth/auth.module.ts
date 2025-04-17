import { Module, Global, forwardRef } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';
import { UserModule } from '@users/user.module';
import { ConfigModule } from '@nestjs/config';

// Make AuthModule global so JwtAuthGuard can be used anywhere without importing AuthModule explicitly
@Global()
@Module({
  imports: [
    ConfigModule, // Ensure ConfigService is available
    PassportModule.register({ defaultStrategy: 'jwt' }),
    forwardRef(() => UserModule), // Use forwardRef here to break circular dependency
  ],
  providers: [JwtStrategy], // Register the strategy
  exports: [PassportModule, JwtStrategy], // Export PassportModule and Strategy if needed elsewhere
})
export class AuthModule {}
