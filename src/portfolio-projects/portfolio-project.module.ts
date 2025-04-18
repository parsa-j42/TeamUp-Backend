import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PortfolioProjectService } from './portfolio-project.service';
import { PortfolioProject } from './portfolio-project.entity';
import { AuthModule } from '@auth/auth.module';
import { ProfileModule } from '@profiles/profile.module';
import { PortfolioProjectController } from '@portfolio-projects/portfolio-project.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([PortfolioProject]),
    AuthModule,
    ProfileModule,
  ],
  controllers: [PortfolioProjectController],
  providers: [PortfolioProjectService],
  exports: [PortfolioProjectService],
})
export class PortfolioProjectModule {}
