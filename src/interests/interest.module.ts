import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InterestService } from './interest.service';
// import { InterestController } from './interest.controller'; // Optional: Add if admin endpoints needed
import { Interest } from './interest.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Interest])],
  // controllers: [InterestController], // Uncomment if controller is added
  providers: [InterestService],
  exports: [InterestService], // Export service for ProfileModule
})
export class InterestModule {}
