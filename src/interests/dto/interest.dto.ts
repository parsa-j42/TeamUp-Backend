import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsString, IsUUID, IsOptional, IsNotEmpty } from 'class-validator';

export class InterestDto {
  @ApiProperty({ description: 'Interest ID (UUID)' })
  @IsUUID()
  id: string;

  @ApiProperty({ description: 'Name of the interest', example: 'Economics' })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'Optional description of the interest',
    example: 'Studying market trends and financial systems.',
  })
  @IsOptional()
  @IsString()
  description?: string;
}

// DTO for creating an interest
export class CreateInterestDto {
  @ApiProperty({ description: 'Name of the interest', example: 'Photography' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Optional description of the interest' })
  @IsOptional()
  @IsString()
  description?: string;
}

// DTO for updating an interest
export class UpdateInterestDto extends PartialType(CreateInterestDto) {}
