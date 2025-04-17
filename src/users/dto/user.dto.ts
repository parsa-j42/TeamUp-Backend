import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsString, IsUUID, IsNotEmpty } from 'class-validator';
import { UserProfileDto } from '@profiles/dto/profile.dto'; // Adjust path

export class UserDto {
  @ApiProperty({ description: 'Internal User ID (UUID)' })
  @IsUUID()
  id: string;

  @ApiProperty({ description: 'Cognito User Identifier (sub)' })
  @IsString()
  cognitoSub: string;

  @ApiProperty({ description: 'User Email' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'First Name' })
  @IsString()
  firstName: string;

  @ApiProperty({ description: 'Last Name' })
  @IsString()
  lastName: string;

  @ApiProperty({ description: 'Preferred Name' })
  @IsString()
  preferredUsername: string;

  @ApiPropertyOptional({
    type: () => UserProfileDto,
    description: 'User Profile Data',
  })
  profile?: UserProfileDto; // Embed profile DTO if needed

  @ApiProperty({ description: 'Creation Timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last Update Timestamp' })
  updatedAt: Date;
}

// DTO used potentially by a sync process (e.g., Cognito Trigger)
export class CreateOrUpdateUserDto {
  @ApiProperty({ description: 'Cognito User Identifier (sub)' })
  @IsString()
  @IsNotEmpty()
  cognitoSub: string;

  @ApiProperty({ description: 'User Email' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'First Name' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ description: 'Last Name' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ description: 'Preferred Name' })
  @IsString()
  @IsNotEmpty()
  preferredUsername: string;
}

// Simple DTO for listing all users
export class SimpleUserDto {
  @ApiProperty({ description: 'User ID' })
  @IsUUID()
  id: string;

  @ApiProperty({ description: 'User Name (Preferred Name + Last Name)' })
  @IsString()
  name: string;
}
