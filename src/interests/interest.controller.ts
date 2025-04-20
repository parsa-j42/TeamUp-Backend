import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { InterestService } from './interest.service';
import { InterestDto } from './dto/interest.dto';
import { Interest } from './interest.entity';

@ApiTags('interests')
@Controller('interests')
export class InterestsController {
  constructor(private readonly interestService: InterestService) {}

  @Get()
  @ApiOperation({ summary: 'Get all available interests' })
  @ApiResponse({
    status: 200,
    description: 'List of all interests',
    type: [InterestDto],
  })
  async findAll(): Promise<InterestDto[]> {
    const interests = await this.interestService.findAll();
    // Map entities to DTOs
    return interests.map(this.mapInterestToDto);
  }

  // --- DTO Mapping Helper ---
  private mapInterestToDto(interest: Interest): InterestDto {
    return {
      id: interest.id,
      name: interest.name,
      description: interest.description,
    };
  }

  // Add POST, PATCH, DELETE later if admin management is needed
}