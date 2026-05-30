import { Injectable, Logger, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserService } from '@users/user.service';
import { ProfileService } from '@profiles/profile.service';
import { ProjectService } from '@projects/project.service';
import { User } from '@users/user.entity';
import { Project } from '@projects/project.entity';
import { RecommendedProjectDto } from './dto/recommendations.dto';
import { ProjectDto } from '@projects/dto/project.dto';

// Expected structure for a single recommendation from the LLM.
interface LlmRecommendation {
  projectId: string;
  reasons: string[]; // Short keywords
}

type LlmProvider = 'groq' | 'gemini';

// Per-provider connection defaults. Both expose an OpenAI-compatible
// /chat/completions endpoint, so a single request path serves either one.
// Models are tried in order, falling through to the next on any failure
// (rate limits, outages, bad output).
const PROVIDER_DEFAULTS: Record<LlmProvider, { baseUrl: string; models: string[]; apiKeyEnv: string }> = {
  groq: {
    baseUrl: 'https://api.groq.com/openai/v1',
    // Fast non-reasoning primary, then qwen (higher TPM), then a production
    // reasoning model as a safety net under the preview qwen model.
    models: ['llama-3.3-70b-versatile', 'qwen/qwen3-32b', 'openai/gpt-oss-20b'],
    apiKeyEnv: 'GROQ_API_KEY',
  },
  gemini: {
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    models: ['gemini-2.5-flash'],
    apiKeyEnv: 'GEMINI_API_KEY',
  },
};

// Reasoning models need reasoning_format set when JSON mode is on, and the
// param is invalid for non-reasoning models, so we only send it for these.
const REASONING_MODEL_PATTERN = /gpt-oss|qwen3|deepseek-r1/i;

@Injectable()
export class RecommendationsService {
  private readonly logger = new Logger(RecommendationsService.name);
  private readonly provider: LlmProvider;
  private readonly baseUrl: string;
  private readonly models: string[];
  private readonly apiKey: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly userService: UserService,
    private readonly profileService: ProfileService,
    private readonly projectService: ProjectService,
  ) {
    const configured = (this.configService.get<string>('LLM_PROVIDER') ?? 'groq').toLowerCase();
    this.provider = configured in PROVIDER_DEFAULTS ? (configured as LlmProvider) : 'groq';
    const defaults = PROVIDER_DEFAULTS[this.provider];

    this.baseUrl = defaults.baseUrl;
    const override = this.configService.get<string>('LLM_MODEL');
    this.models = override
      ? override.split(',').map(m => m.trim()).filter(Boolean)
      : defaults.models;
    this.apiKey = this.configService.get<string>(defaults.apiKeyEnv) ?? '';

    if (!this.apiKey) {
      this.logger.error(`${defaults.apiKeyEnv} is not configured. Recommendations will not work.`);
    }
    this.logger.log(`Recommendations LLM: provider=${this.provider} models=[${this.models.join(', ')}]`);
  }

  async getProjectRecommendations(user: User): Promise<RecommendedProjectDto[]> {
    if (!this.apiKey) {
      this.logger.warn('LLM API key not configured, returning empty recommendations.');
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

    // 3. Prepare data for the prompt
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

    // 4. Construct the prompt
    const prompt = `
            Based on the following user profile:
            ${userContext}

            Recommend the top 5 most relevant projects from the list below. Prioritize matches based on skills, then interests, then description similarity.

            Available Projects:
            ${JSON.stringify(projectContext, null, 2)}

            Respond with a JSON object of the form:
            { "recommendations": [ { "projectId": "PROJECT_ID_STRING", "reasons": ["KEYWORD_1", "KEYWORD_2"] } ] }
            Include at most 5 recommendations (fewer if fewer projects are suitable). The "reasons" array should contain 1 or 2 short keywords (1-2 words max each, e.g., "React Skill", "Design Interest", "Web Dev") explaining the primary reason(s). Do not include projects that are a poor match. If none are suitable, return { "recommendations": [] }.
        `;

    // 5. Call the LLM. Recommendations are a non-critical enhancement, so any
    // failure (quota, malformed response, outage) degrades to an empty list
    // rather than failing the Discover page with a 500.
    let recommendations: LlmRecommendation[];
    try {
      this.logger.log(`Requesting recommendations from ${this.provider} for user ${user.id}...`);
      recommendations = await this.requestRecommendations(prompt);
      this.logger.log(`Received ${recommendations.length} recommendations for user ${user.id}.`);
    } catch (error) {
      this.logger.error(`LLM call failed for user ${user.id}: ${error.message}`, error.stack);
      return [];
    }

    if (recommendations.length === 0) {
      return [];
    }

    // 6. Fetch full project details for the recommended projects
    const projectDetailsMap = new Map<string, ProjectDto>();
    const fetchedProjects = await Promise.all(
      recommendations.map(rec =>
        this.projectService.findOne(rec.projectId)
          .then(project => ({ id: rec.projectId, project }))
          .catch(err => {
            this.logger.warn(`Could not fetch details for recommended project ID ${rec.projectId}: ${err.message}`);
            return { id: rec.projectId, project: null };
          }),
      ),
    );
    fetchedProjects.forEach(({ id, project }) => {
      if (project) {
        projectDetailsMap.set(id, this.projectService.mapProjectToDto(project));
      }
    });

    // 7. Combine details with reasons
    return recommendations
      .map(rec => {
        const projectDto = projectDetailsMap.get(rec.projectId);
        const reasons = Array.isArray(rec.reasons) ? rec.reasons.slice(0, 2) : []; // Max 2 reasons
        return projectDto ? { project: projectDto, reasons } : null;
      })
      .filter((rec): rec is RecommendedProjectDto => rec !== null);
  }

  // Tries each configured model in order, falling through to the next on any
  // failure (rate limit, outage, bad output). Throws only if all of them fail.
  private async requestRecommendations(prompt: string): Promise<LlmRecommendation[]> {
    const failures: string[] = [];
    for (const [index, model] of this.models.entries()) {
      try {
        const recs = await this.callModel(model, prompt);
        if (index > 0) {
          this.logger.warn(`Recommendations served by fallback model ${model}.`);
        }
        return recs;
      } catch (error) {
        this.logger.warn(`Model ${model} failed: ${error.message}`);
        failures.push(`${model}: ${error.message}`);
      }
    }
    throw new Error(`All recommendation models failed (${failures.join('; ')}).`);
  }

  // Calls the provider's OpenAI-compatible chat completions endpoint for a
  // single model with JSON output enforced, returning the parsed list.
  private async callModel(model: string, prompt: string): Promise<LlmRecommendation[]> {
    const body: Record<string, unknown> = {
      model,
      temperature: 0.3,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    };
    // Reasoning models require reasoning_format to be parsed or hidden in JSON
    // mode; we don't need the reasoning, so hide it. Non-reasoning models reject
    // the param, so only send it for reasoning models on Groq.
    if (this.provider === 'groq' && REASONING_MODEL_PATTERN.test(model)) {
      body.reasoning_format = 'hidden';
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`request failed (${response.status}): ${detail}`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('response contained no content.');
    }

    const parsed = JSON.parse(content);
    const recs = Array.isArray(parsed) ? parsed : parsed?.recommendations;
    if (!Array.isArray(recs)) {
      throw new Error('response did not contain a recommendations array.');
    }
    return recs;
  }
}
