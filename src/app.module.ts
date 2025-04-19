import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config'; // Import ConfigModule/Service
import { AppController } from './app.controller';
import { AppService } from './app.service';

// --- Import ALL Entities ---
import { User } from '@users/user.entity';
import { UserProfile } from '@profiles/profile.entity';
import { Skill } from '@skills/skill.entity';
import { Interest } from '@interests/interest.entity';
import { WorkExperience } from '@work-experiences/work-experience.entity';
import { Project } from '@projects/project.entity';
import { ProjectMembership } from '@projects/project-membership.entity';
import { Milestone } from '@milestones/milestone.entity';
import { Task } from '@tasks/task.entity';
import { Application } from '@applications/application.entity';
import { Bookmark } from '@bookmarks/bookmark.entity';

// --- Import ALL Feature Modules ---
import { AuthModule } from '@auth/auth.module';
import { UserModule } from '@users/user.module';
import { ProfileModule } from '@profiles/profile.module';
import { SkillModule } from '@skills/skill.module';
import { InterestModule } from '@interests/interest.module';
import { WorkExperienceModule } from '@work-experiences/work-experience.module';
import { ProjectModule } from '@projects/project.module';
import { MilestoneModule } from '@milestones/milestone.module';
import { TaskModule } from '@tasks/task.module';
import { ApplicationModule } from '@applications/application.module';
import { BookmarkModule } from '@bookmarks/bookmark.module';
import { PortfolioProject } from '@portfolio-projects/portfolio-project.entity';
import { PortfolioProjectModule } from '@portfolio-projects/portfolio-project.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Make ConfigModule global
      envFilePath: '.env', // Specify your env file
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule], // Import ConfigModule here as well
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST', 'localhost'), // Use env var or default
        port: configService.get<number>('DB_PORT', 5432),
        username: configService.get<string>('DB_USERNAME', 'postgres'),
        password: configService.get<string>('DB_PASSWORD', 'postgres'),
        database: configService.get<string>('DB_DATABASE', 'my_database'),
        ssl: configService.get<boolean>('DB_SSL') ? {
          rejectUnauthorized: false
        } : false,
        entities: [
          // --- List ALL Entities Here ---
          User,
          UserProfile,
          Skill,
          Interest,
          WorkExperience,
          Project,
          ProjectMembership,
          Milestone,
          Task,
          Application,
          Bookmark,
          PortfolioProject,
        ],
        // synchronize: configService.get<string>('NODE_ENV') !== 'production', // synchronize: true only for dev
        synchronize: true, // True for capcon
        logging: configService.get<string>('NODE_ENV') !== 'production', // enable logging in dev
      }),
      inject: [ConfigService], // Inject ConfigService into the factory
    }),
    // --- Import ALL Feature Modules ---
    AuthModule,
    UserModule,
    ProfileModule,
    SkillModule,
    InterestModule,
    WorkExperienceModule,
    ProjectModule,
    MilestoneModule,
    TaskModule,
    ApplicationModule,
    BookmarkModule,
    PortfolioProjectModule,
  ],
  controllers: [AppController], // Keep default AppController if needed
  providers: [AppService], // Keep default AppService if needed
})
export class AppModule {}
