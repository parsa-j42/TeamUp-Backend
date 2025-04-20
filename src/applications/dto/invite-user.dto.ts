import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class InviteUserDto {
  @ApiProperty({ description: 'User ID of the user to invite' })
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @ApiPropertyOptional({
    description: 'Optional role the user is being invited for',
    example: 'Member',
  })
  @IsOptional()
  @IsString()
  role?: string; // e.g., Member, Mentor
}