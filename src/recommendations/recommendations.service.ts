import { Injectable, Logger, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, GenerationConfig, SafetySetting } from '@google/generative-ai';
import { UserService } from '@users/user.service';
import { ProfileService } from '@profiles/profile.service';
import { ProjectService } from '@projects/project.service';
import { User } from '@users/user.entity';
import { Project } from '@projects/project.entity';
import { RecommendedProjectDto } from './dto/recommendations.dto';
import { ProjectDto } from '@projects/dto/project.dto';

// Define the expected structure from Gemini
interface GeminiRecommendation {
  projectId: string;
  reasons: string[]; // Expecting short keywords
}

@Injectable()
export class RecommendationsService {
  private readonly logger = new Logger(RecommendationsService.name);
  private genAI: GoogleGenerativeAI | null = null;
  private generationConfig: GenerationConfig; // Define type
  private safetySettings: SafetySetting[]; // Define type

  constructor(
    private readonly configService: ConfigService,
    private readonly userService: UserService,
    private readonly profileService: ProfileService,
    private readonly projectService: ProjectService,
  ) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.logger.log('Gemini AI Client Initialized.');
    } else {
      this.logger.error('GEMINI_API_KEY is not configured. Recommendations will not work.');
    }

    // Define generation config and safety settings here
    this.generationConfig = {
      temperature: 0.3,
      topK: 1,
      topP: 1,
      maxOutputTokens: 2048,
      responseMimeType: "application/json",
    };
    this.safetySettings = [
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    ];
  }

  async getProjectRecommendations(user: User): Promise<RecommendedProjectDto[]> {
    if (!this.genAI) {
      this.logger.warn('Gemini API Key not configured, returning empty recommendations.');
      return [];
    }

    // 1. Fetch User Profile Data
    let userProfileData: { skills: string[]; interests: string[]; experience: string };
    try {
      const profile = await this.profileService.findByUserId(user.id, ['skills', 'interests']);
      userProfileData = {
        skills: profile.skills?.map(s => s.name) || [],
        interests: profile.interests?.map(i => i.name) || [],
        experience: profile.bio || profile.signupExperience || 'No experience description provided.',
      };
      this.logger.verbose(`User Profile Data for ${user.id}: Skills=${userProfileData.skills.length}, Interests=${userProfileData.interests.length}`);
    } catch (error) {
      if (error instanceof NotFoundException) {
        this.logger.warn(`Profile not found for user ${user.id}. Cannot generate recommendations.`);
        return [];
      }
      this.logger.error(`Failed to fetch profile for user ${user.id}: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to retrieve user profile for recommendations.');
    }

    // 2. Fetch Candidate Projects
    let candidateProjects: Project[] = [];
    try {
      const { projects } = await this.projectService.findAll({ take: 50, skip: 0 });
      const userProjectIds = new Set(user.projectMemberships?.map(m => m.projectId) || []);
      candidateProjects = projects.filter(p => p.ownerId !== user.id && !userProjectIds.has(p.id));
      this.logger.verbose(`Fetched ${candidateProjects.length} candidate projects for user ${user.id}.`);

      if (candidateProjects.length === 0) {
        this.logger.log(`No candidate projects found for user ${user.id} after filtering.`);
        return [];
      }
    } catch (error) {
      this.logger.error(`Failed to fetch candidate projects: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to retrieve projects for recommendations.');
    }

    // 3. Prepare Data for Gemini Prompt
    const userContext = `
            User Skills: ${userProfileData.skills.join(', ') || 'None'}
            User Interests: ${userProfileData.interests.join(', ') || 'None'}
            User Experience/Bio: ${userProfileData.experience}
        `;

    const projectContext = candidateProjects.map(p => ({
      id: p.id,
      title: p.title,
      description: p.description.substring(0, 200) + (p.description.length > 200 ? '...' : ''),
      requiredSkills: p.requiredSkills || [],
      tags: p.tags || [],
    }));

    // 4. Construct Gemini Prompt
    const prompt = `
            Based on the following user profile:
            ${userContext}

            Recommend the top 5 most relevant projects from the list below. Prioritize matches based on skills, then interests, then description similarity.

            Available Projects:
            ${JSON.stringify(projectContext, null, 2)}

            Your response MUST be a valid JSON array containing exactly 5 objects (or fewer if fewer than 5 projects are suitable). Each object must have the following structure:
            {
              "projectId": "PROJECT_ID_STRING",
              "reasons": ["KEYWORD_1", "KEYWORD_2"]
            }
            The "reasons" array should contain 1 or 2 short keywords (1-2 words max each, e.g., "React Skill", "Design Interest", "Web Dev") explaining the primary reason(s) for the recommendation. Do not include projects that are a poor match. If no projects are suitable, return an empty array [].
        `;

    // 5. Call Gemini API
    try {
      this.logger.log(`Sending request to Gemini for user ${user.id}...`);
      // Pass config and safety settings during model initialization
      const model = this.genAI.getGenerativeModel({
        model: "gemini-1.5-flash-latest",
        generationConfig: this.generationConfig,
        safetySettings: this.safetySettings,
      });

      // generateContent now only needs the prompt
      const result = await model.generateContent(prompt);
      const response = result.response;
      const responseText = response.text();
      this.logger.verbose(`Gemini raw response for user ${user.id}: ${responseText}`);

      // 6. Parse Gemini Response
      let geminiRecs: GeminiRecommendation[] = [];
      try {
        geminiRecs = JSON.parse(responseText);
        if (!Array.isArray(geminiRecs)) {
          throw new Error("Gemini response is not a JSON array.");
        }
        // Optional: Add more validation for the structure of each object
      } catch (parseError) {
        this.logger.error(`Failed to parse Gemini JSON response for user ${user.id}: ${parseError.message}. Raw response: ${responseText}`);
        throw new InternalServerErrorException('Failed to process recommendations from AI.');
      }

      this.logger.log(`Received ${geminiRecs.length} recommendations from Gemini for user ${user.id}.`);

      if (geminiRecs.length === 0) {
        return [];
      }

      // 7. Fetch Full Project Details for Recommended Projects
      const recommendedProjectIds = geminiRecs.map(rec => rec.projectId);
      const projectDetailsMap = new Map<string, ProjectDto>();

      const projectPromises = recommendedProjectIds.map(id =>
        this.projectService.findOne(id)
          .then(project => ({ id, project }))
          .catch(err => {
            this.logger.warn(`Could not fetch details for recommended project ID ${id}: ${err.message}`);
            return { id, project: null };
          })
      );
      const fetchedProjects = await Promise.all(projectPromises);

      fetchedProjects.forEach(({ id, project }) => {
        if (project) {
          projectDetailsMap.set(id, this.projectService.mapProjectToDto(project));
        }
      });

      // 8. Combine Details with Reasons and Return
      const finalRecommendations: RecommendedProjectDto[] = geminiRecs
        .map(rec => {
          const projectDto = projectDetailsMap.get(rec.projectId);
          // Ensure reasons is always an array, even if Gemini messes up
          const reasons = Array.isArray(rec.reasons) ? rec.reasons.slice(0, 2) : []; // Take max 2 reasons
          return projectDto ? { project: projectDto, reasons: reasons } : null;
        })
        .filter((rec): rec is RecommendedProjectDto => rec !== null);

      return finalRecommendations;

    } catch (error) {
      this.logger.error(`Gemini API call failed for user ${user.id}: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to get recommendations from AI service.');
    }
  }
}