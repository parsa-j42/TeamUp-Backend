import { ApiProperty, OmitType } from '@nestjs/swagger';
import { IsUUID, IsEnum, IsNotEmpty } from 'class-validator';
import { ProjectRole } from '@common/enums/project-role.enum';
import { UserDto } from '@users/dto/user.dto';
import { Type } from 'class-transformer';

// DTO for adding a member to a project
export class AddMemberDto {
  @ApiProperty({ description: 'User ID of the member to add' })
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({
    description: 'Role of the member in the project',
    enum: ProjectRole,
    example: ProjectRole.MEMBER,
  })
  @IsEnum(ProjectRole)
  @IsNotEmpty()
  role: ProjectRole;
}

// DTO for updating a member's role
export class UpdateMemberRoleDto {
  @ApiProperty({
    description: 'New role for the member',
    enum: ProjectRole,
    example: ProjectRole.MENTOR,
  })
  @IsEnum(ProjectRole)
  @IsNotEmpty()
  role: ProjectRole;
}

// DTO for representing a project member in responses (used within ProjectDto)
export class ProjectMemberDto {
  @ApiProperty({ description: 'Membership ID (UUID)' })
  @IsUUID()
  id: string; // Membership ID

  @ApiProperty({ description: 'Project ID (UUID)' })
  @IsUUID()
  projectId: string;

  @ApiProperty({ description: 'User ID (UUID)' })
  @IsUUID()
  userId: string;

  @ApiProperty({ description: 'Role of the member', enum: ProjectRole })
  @IsEnum(ProjectRole)
  role: ProjectRole;

  @ApiProperty({
    description: 'Member Details',
    type: () => OmitType(UserDto, ['cognitoSub', 'profile'] as const),
  })
  @Type(() => OmitType(UserDto, ['cognitoSub', 'profile'] as const))
  user: Omit<UserDto, 'cognitoSub' | 'profile'>; // Embed simplified UserDto

  @ApiProperty({ description: 'Timestamp when member joined' })
  joinedAt: Date;
}
