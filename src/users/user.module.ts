import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { User } from './user.entity';
import { AuthModule } from '@auth/auth.module';
import { ProfileModule } from '@profiles/profile.module'; // Import ProfileModule

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    forwardRef(() => AuthModule),
    forwardRef(() => ProfileModule), // Use forwardRef for circular dependency with ProfileService
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService], // Export service if needed by other modules
})
export class UserModule {}
