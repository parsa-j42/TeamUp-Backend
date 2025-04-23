import { Module, forwardRef } from '@nestjs/common';
import { RecommendationsController } from './recommendations.controller';
import { RecommendationsService } from './recommendations.service';
import { AuthModule } from '@auth/auth.module';
import { UserModule } from '@users/user.module';
import { ProfileModule } from '@profiles/profile.module';
import { ProjectModule } from '@projects/project.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule,
    forwardRef(() => AuthModule),
    forwardRef(() => UserModule),
    forwardRef(() => ProfileModule),
    forwardRef(() => ProjectModule),
  ],
  controllers: [RecommendationsController],
  providers: [RecommendationsService],
  exports: [RecommendationsService],
})
export class RecommendationsModule {}