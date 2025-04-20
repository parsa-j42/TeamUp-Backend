import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InterestService } from './interest.service';
import { Interest } from './interest.entity';
import { InterestsController } from '@interests/interest.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Interest])],
  controllers: [InterestsController],
  providers: [InterestService],
  exports: [InterestService],
})
export class InterestModule {}
