import {
  ApiProperty,
  ApiPropertyOptional,
  PartialType,
  OmitType,
} from '@nestjs/swagger';
import {
  IsString,
  IsUUID,
  IsOptional,
  IsNotEmpty,
  IsEnum,
  MaxLength,
} from 'class-validator';
import { TaskStatus } from '@common/enums/task-status.enum';
import { UserDto } from '@users/dto/user.dto';
import { Type } from 'class-transformer';

// Base DTO for common fields
class BaseTaskDto {
  @ApiProperty({
    description: 'Name or title of the task',
    example: 'Implement Login Form UI',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({
    description: 'Detailed description of the task',
    example:
      'Create the React component for the login form based on Figma designs.',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({
    description: 'Status of the task',
    enum: TaskStatus,
    default: TaskStatus.TODO,
    example: TaskStatus.IN_PROGRESS,
  })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiPropertyOptional({
    description: 'User ID of the assignee (UUID or null to unassign)',
    type: 'string',
    format: 'uuid',
    nullable: true,
  })
  @IsOptional()
  @IsUUID()
  assigneeId?: string | null; // Allow null for unassigning
}

// DTO for creating a task
export class CreateTaskDto extends BaseTaskDto {}

// DTO for updating a task
export class UpdateTaskDto extends PartialType(BaseTaskDto) {}

// DTO for assigning/unassigning a task (used in PATCH /tasks/:taskId/assign)
export class AssignTaskDto {
  @ApiPropertyOptional({
    description: 'User ID of the assignee. Send null to unassign.',
    type: 'string',
    format: 'uuid',
    nullable: true,
  })
  @IsOptional()
  // Allow null by not adding IsNotEmpty. Validation happens in service.
  @IsUUID()
  assigneeId?: string | null;
}

// DTO for representing a task in responses
export class TaskDto extends BaseTaskDto {
  @ApiProperty({ description: 'Task ID (UUID)' })
  @IsUUID()
  id: string;

  @ApiProperty({ description: 'Associated Milestone ID (UUID)' })
  @IsUUID()
  milestoneId: string;

  // Include simplified assignee details
  @ApiPropertyOptional({
    description: 'Assignee Details',
    type: () => OmitType(UserDto, ['cognitoSub', 'profile'] as const),
    nullable: true,
  })
  @Type(() => OmitType(UserDto, ['cognitoSub', 'profile'] as const))
  assignee?: Omit<UserDto, 'cognitoSub' | 'profile'> | null;

  @ApiProperty({ description: 'Creation Timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last Update Timestamp' })
  updatedAt: Date;
}
