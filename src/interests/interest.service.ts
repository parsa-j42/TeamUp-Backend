import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, QueryFailedError } from 'typeorm';
import { Interest } from './interest.entity';
import { CreateInterestDto, UpdateInterestDto } from './dto/interest.dto';

// Define a type guard for PostgreSQL errors with code property
function isPgError(error: unknown): error is { code: string } {
  return (
    error !== null &&
    typeof error === 'object' &&
    'code' in error &&
    typeof (error as { code: unknown }).code === 'string'
  );
}

@Injectable()
export class InterestService {
  constructor(
    @InjectRepository(Interest)
    private readonly interestRepository: Repository<Interest>,
  ) {}

  async findAll(): Promise<Interest[]> {
    return this.interestRepository.find();
  }

  async findOne(id: string): Promise<Interest> {
    const interest = await this.interestRepository.findOne({ where: { id } });
    if (!interest) {
      throw new NotFoundException(`Interest with ID "${id}" not found`);
    }
    return interest;
  }

  async findByName(name: string): Promise<Interest | null> {
    // Consider case-insensitive find: .where('LOWER(interest.name) = LOWER(:name)', { name })
    return this.interestRepository.findOne({ where: { name } });
  }

  /**
   * Finds existing interests by name or creates new ones if they don't exist.
   * Returns the array of Interest entities corresponding to the names.
   * Handles potential race conditions during creation.
   */
  async findOrCreateByName(names: string[]): Promise<Interest[]> {
    if (!names || names.length === 0) {
      return [];
    }

    // Normalize names
    const uniqueNames = [
      ...new Set(names.map((name) => name.trim()).filter(Boolean)),
    ];
    if (uniqueNames.length === 0) {
      return [];
    }

    // Find existing interests matching normalized names
    // Consider case-insensitivity: .where('LOWER(interest.name) IN (:...names)', { names: uniqueNames.map(n => n.toLowerCase()) })
    const existingInterests = await this.interestRepository.find({
      where: { name: In(uniqueNames) },
    });

    const existingInterestNames = new Set(existingInterests.map((i) => i.name));
    // Determine which names are new (case-sensitive comparison for now)
    const newInterestNames = uniqueNames.filter(
      (name) => !existingInterestNames.has(name),
    );

    const newInterests: Interest[] = [];
    if (newInterestNames.length > 0) {
      const interestEntities = newInterestNames.map((name) =>
        this.interestRepository.create({ name }),
      );
      try {
        const savedNewInterests =
          await this.interestRepository.save(interestEntities);
        newInterests.push(...savedNewInterests);
      } catch (error) {
        if (
          error instanceof QueryFailedError &&
          isPgError(error) &&
          error.code === '23505'
        ) {
          console.warn(
            `Conflict saving new interests (names: ${newInterestNames.join(', ')}), likely race condition. Re-fetching.`,
          );
          // Re-fetch all required interests to ensure consistency
          return this.interestRepository.find({
            where: { name: In(uniqueNames) },
          });
        }
        console.error('Error saving new interests:', error);
        throw new InternalServerErrorException(
          'Failed to create new interests.',
        );
      }
    }

    return [...existingInterests, ...newInterests];
  }

  // --- Admin/Management Endpoints (Optional) ---

  async create(createInterestDto: CreateInterestDto): Promise<Interest> {
    const normalizedName = createInterestDto.name.trim();
    if (!normalizedName) {
      throw new ConflictException('Interest name cannot be empty.');
    }
    const existing = await this.findByName(normalizedName);
    if (existing) {
      throw new ConflictException(
        `Interest with name "${normalizedName}" already exists.`,
      );
    }
    const interest = this.interestRepository.create({
      ...createInterestDto,
      name: normalizedName,
    });
    try {
      return await this.interestRepository.save(interest);
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        isPgError(error) &&
        error.code === '23505'
      ) {
        throw new ConflictException(
          `Interest with name "${normalizedName}" already exists (concurrent creation).`,
        );
      }
      console.error('Error creating interest:', error);
      throw new InternalServerErrorException('Failed to create interest.');
    }
  }

  async update(
    id: string,
    updateInterestDto: UpdateInterestDto,
  ): Promise<Interest> {
    const interest = await this.findOne(id); // Ensure exists

    const normalizedNewName = updateInterestDto.name?.trim();

    // Check if name is being changed and if the new name already exists
    if (normalizedNewName && normalizedNewName !== interest.name) {
      const existing = await this.findByName(normalizedNewName);
      if (existing && existing.id !== id) {
        throw new ConflictException(
          `Interest with name "${normalizedNewName}" already exists.`,
        );
      }
      updateInterestDto.name = normalizedNewName; // Update DTO with normalized name
    } else if (updateInterestDto.name !== undefined && !normalizedNewName) {
      throw new ConflictException('Interest name cannot be empty.');
    }

    Object.assign(interest, updateInterestDto);
    try {
      return await this.interestRepository.save(interest);
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        isPgError(error) &&
        error.code === '23505'
      ) {
        throw new ConflictException(`Interest name conflict during update.`);
      }
      console.error(`Error updating interest ${id}:`, error);
      throw new InternalServerErrorException('Failed to update interest.');
    }
  }

  async remove(id: string): Promise<void> {
    const result = await this.interestRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Interest with ID "${id}" not found`);
    }
  }
}
