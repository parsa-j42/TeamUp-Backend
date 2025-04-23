import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm'; // Import In operator
import { faker } from '@faker-js/faker';
import { INestApplicationContext } from '@nestjs/common';

// Import ALL your entities here
import { User } from '@users/user.entity';
import { UserProfile } from '@profiles/profile.entity';
import { Skill } from '@skills/skill.entity';
import { Interest } from '@interests/interest.entity';
import { WorkExperience } from '@work-experiences/work-experience.entity';
import { PortfolioProject } from '@portfolio-projects/portfolio-project.entity';
import { Project } from '@projects/project.entity';
import { ProjectMembership } from '@projects/project-membership.entity';
import { Milestone } from '@milestones/milestone.entity';
import { Task } from '@tasks/task.entity';
import { Application } from '@applications/application.entity';
import { Bookmark } from '@bookmarks/bookmark.entity';
import { ApplicationStatus } from '@common/enums/application-status.enum';
import { ProjectRole } from '@common/enums/project-role.enum';
import { TaskStatus } from '@common/enums/task-status.enum';

// --- Configuration ---
// Emails of the users you MANUALLY signed up via the frontend AND CONFIRMED
const DEMO_USER_EMAILS = [
  "parsajfri42@gmail.com", // Replace with your actual confirmed demo emails
  "parsajfri42.spam@gmail.com",
  "parsajfri421@gmail.com",
  "minekhorteam@gmail.com",
  "yyctehrantv@gmail.com",
  "besixot628@f5url.com",
  "getabib149@cxnlab.com",
  "yafob44799@cxnlab.com",
  "niwimol307@f5url.com",
  // Add more if you created more
];

const NUM_PROJECTS_TO_CREATE = 40; // Create projects owned by the demo users
const MAX_MEMBERS_PER_PROJECT = 6;
const MAX_TASKS_PER_MILESTONE = 5;
const MAX_MILESTONES_PER_PROJECT = 4;
const MAX_APPLICATIONS_PER_USER = 6; // Max apps *sent* by each demo user
const MAX_BOOKMARKS_PER_USER = 10;  // Max bookmarks *created* by each demo user

// Predefined skills and interests
const PREDEFINED_SKILLS = [
  'React', 'Node.js', 'TypeScript', 'JavaScript', 'HTML', 'CSS', 'Python', 'Django',
  'Flask', 'Java', 'Spring Boot', 'PostgreSQL', 'MongoDB', 'Docker', 'AWS', 'Azure',
  'Figma', 'Adobe XD', 'UI Design', 'UX Research', 'Project Management', 'Agile',
  'Scrum', 'Marketing', 'Content Writing', 'SEO', 'Data Analysis', 'Machine Learning',
  'Graphic Design', 'Video Editing', 'NestJS', 'TypeORM', 'Mantine', 'Vite',
  'Swift', 'Kotlin', 'iOS Development', 'Android Development', 'Unity', 'Unreal Engine',
  'C#', 'C++', 'Go', 'Ruby on Rails', 'PHP', 'Laravel', 'Vue.js', 'Angular',
  'Market Research', 'Business Strategy', 'Financial Modeling', 'Public Speaking',
  'Copywriting', 'Social Media Marketing', 'Illustration', 'Photography',
];
const PREDEFINED_INTERESTS = [
  'Web Development', 'Mobile Development', 'Game Development', 'Artificial Intelligence',
  'Machine Learning', 'Data Science', 'Cybersecurity', 'Cloud Computing', 'Blockchain',
  'UI/UX Design', 'Graphic Design', 'Digital Marketing', 'Entrepreneurship', 'Finance',
  'Sustainability', 'Education Technology', 'Health Tech', 'Music Production', 'Film Making',
  'Creative Writing', 'Photography', 'Virtual Reality', 'Augmented Reality', 'Robotics',
];
const PREDEFINED_TAGS = ['Design', 'Development', 'Business', 'Community', 'Content & Media', 'Science', 'Personal Idea', 'Startup Idea', 'Mobile App', 'Web App', 'AI/ML', 'Hardware', 'Social Good']; // Added more tags
const USER_TYPES = ['Undergraduate', 'Graduate', 'Instructor', 'Alumni'];
const PROGRAMS = ['Software Development', 'Data Science', 'Graphic Design', 'Business Administration', 'Marketing', 'New Media Production', 'Information Technology', 'Web Developer Fast-Track'];
const MENTOR_REQUESTS = ['looking', 'open', 'one-time', 'none']; // 'none' represents null/undefined
const PROJECT_TYPES = ['remote', 'in-person', 'hybrid'];
const NUM_MEMBERS_OPTIONS = ['1', '2-4', '5-10', '10+'];

// Skill Categories for Interdisciplinary Logic
const SKILL_CATEGORIES = {
  TECH: ['React', 'Node.js', 'TypeScript', 'JavaScript', 'HTML', 'CSS', 'Python', 'Django', 'Flask', 'Java', 'Spring Boot', 'PostgreSQL', 'MongoDB', 'Docker', 'AWS', 'Azure', 'NestJS', 'TypeORM', 'Vite', 'Swift', 'Kotlin', 'iOS Development', 'Android Development', 'Unity', 'Unreal Engine', 'C#', 'C++', 'Go', 'Ruby on Rails', 'PHP', 'Laravel', 'Vue.js', 'Angular', 'Mobile Development', 'Game Development', 'Cybersecurity', 'Cloud Computing', 'Blockchain', 'Robotics'],
  DESIGN: ['Figma', 'Adobe XD', 'UI Design', 'UX Research', 'Graphic Design', 'Illustration'],
  BUSINESS: ['Project Management', 'Agile', 'Scrum', 'Marketing', 'Content Writing', 'SEO', 'Market Research', 'Business Strategy', 'Financial Modeling', 'Public Speaking', 'Copywriting', 'Social Media Marketing', 'Entrepreneurship', 'Business Administration'],
  MEDIA_SCIENCE: ['Data Analysis', 'Machine Learning', 'Artificial Intelligence', 'Data Science', 'Video Editing', 'Photography', 'Music Production', 'Film Making', 'Creative Writing', 'Virtual Reality', 'Augmented Reality', 'Education Technology', 'Health Tech', 'Sustainability'],
};

// Helper function to get skills from specific categories
function getSkillsFromCategories(categories: string[], maxTotalSkills: number): string[] {
  let selectedSkills: string[] = [];
  const availableSkills = categories.flatMap(cat => SKILL_CATEGORIES[cat as keyof typeof SKILL_CATEGORIES] || []);
  if (availableSkills.length === 0) return [];

  const shuffled = availableSkills.slice().sort(() => 0.5 - Math.random());
  // Ensure at least 1 skill is selected if possible, up to maxTotalSkills
  const count = Math.max(1, Math.floor(Math.random() * (Math.min(maxTotalSkills, availableSkills.length) + 1)));
  return shuffled.slice(0, count);
}

// Helper function to get random subset
function getRandomSubset<T>(arr: T[], maxSize: number): T[] {
  const shuffled = arr.slice().sort(() => 0.5 - Math.random());
  const size = Math.floor(Math.random() * (Math.min(maxSize, arr.length) + 1));
  return shuffled.slice(0, size);
}

// Helper function to get a random element
function getRandomElement<T>(arr: T[]): T {
  if (arr.length === 0) {
    // Return a default or handle appropriately if necessary, e.g., for optional fields
    // For now, throwing error as it indicates a logic issue in seeding setup
    throw new Error("Cannot get random element from an empty array.");
  }
  return arr[Math.floor(Math.random() * arr.length)];
}
// --- End Configuration & Helpers ---

async function bootstrap() {
  let app: INestApplicationContext | null = null;
  try {
    app = await NestFactory.createApplicationContext(AppModule);
    await app.init();
    console.log('NestJS context initialized.');

    // Get repositories
    const userRepository = app.get<Repository<User>>(getRepositoryToken(User));
    const profileRepository = app.get<Repository<UserProfile>>(getRepositoryToken(UserProfile));
    const skillRepository = app.get<Repository<Skill>>(getRepositoryToken(Skill));
    const interestRepository = app.get<Repository<Interest>>(getRepositoryToken(Interest));
    const projectRepository = app.get<Repository<Project>>(getRepositoryToken(Project));
    const membershipRepository = app.get<Repository<ProjectMembership>>(getRepositoryToken(ProjectMembership));
    const milestoneRepository = app.get<Repository<Milestone>>(getRepositoryToken(Milestone));
    const taskRepository = app.get<Repository<Task>>(getRepositoryToken(Task));
    const applicationRepository = app.get<Repository<Application>>(getRepositoryToken(Application));
    const bookmarkRepository = app.get<Repository<Bookmark>>(getRepositoryToken(Bookmark));
    const workExperienceRepository = app.get<Repository<WorkExperience>>(getRepositoryToken(WorkExperience));
    const portfolioProjectRepository = app.get<Repository<PortfolioProject>>(getRepositoryToken(PortfolioProject));

    // --- IMPORTANT: Decide whether to clear data ---
    // Clears related data but KEEPS Users and UserProfiles
    console.log('Clearing non-user/profile data (bookmarks, applications, tasks, milestones, memberships, projects, skills, interests, work_exp, portfolio)...');
    await bookmarkRepository.delete({});
    await applicationRepository.delete({});
    await taskRepository.delete({});
    await milestoneRepository.delete({});
    await membershipRepository.delete({});
    await projectRepository.delete({});
    await workExperienceRepository.delete({}); // Clear related profile data too
    await portfolioProjectRepository.delete({}); // Clear related profile data too
    await skillRepository.delete({});
    await interestRepository.delete({});
    console.log('Non-user data cleared.');
    // --- End Clearing Data ---

    // --- Seed Skills & Interests ---
    console.log('Seeding Skills & Interests...');
    let skillEntities: Skill[] = [];
    for (const name of PREDEFINED_SKILLS) {
      try {
        const skill = skillRepository.create({ name, description: faker.lorem.sentence() });
        skillEntities.push(await skillRepository.save(skill));
      } catch (e: any) { if (e.code !== '23505') console.error(`Error saving skill ${name}:`, e); else console.warn(`Skipping duplicate skill: ${name}`) }
    }
    console.log(`Seeded ${skillEntities.length} skills.`);

    let interestEntities: Interest[] = [];
    for (const name of PREDEFINED_INTERESTS) {
      try {
        const interest = interestRepository.create({ name, description: faker.lorem.sentence() });
        interestEntities.push(await interestRepository.save(interest));
      } catch (e: any) { if (e.code !== '23505') console.error(`Error saving interest ${name}:`, e); else console.warn(`Skipping duplicate interest: ${name}`) }
    }
    console.log(`Seeded ${interestEntities.length} interests.`);
    // --- End Seed Skills & Interests ---

    // --- Fetch Existing Demo Users ---
    console.log('Fetching existing demo users by email...');
    const demoUsers = await userRepository.find({
      where: { email: In(DEMO_USER_EMAILS) },
      relations: ['profile'], // Load profile relation
    });

    if (demoUsers.length !== DEMO_USER_EMAILS.length) {
      const foundEmails = demoUsers.map(u => u.email);
      const missingEmails = DEMO_USER_EMAILS.filter(e => !foundEmails.includes(e));
      console.warn(`WARNING: Expected ${DEMO_USER_EMAILS.length} demo users, but found ${demoUsers.length}.`);
      console.warn(`Missing or unconfirmed users: ${missingEmails.join(', ')}`);
      if (demoUsers.length === 0) {
        throw new Error("CRITICAL: No demo users found in the database. Please sign them up and confirm their emails first.");
      }
    } else {
      console.log(`Found ${demoUsers.length} demo users.`);
    }
    // --- End Fetch Users ---

    // --- Populate Profiles for Demo Users ---
    console.log('Populating profiles for demo users...');
    for (const user of demoUsers) {
      if (!user.profile) {
        console.warn(`User ${user.email} is missing a profile. Creating one.`);
        // If somehow profile is missing, create it
        user.profile = profileRepository.create({ userId: user.id });
        await profileRepository.save(user.profile);
        // Re-fetch user with profile to ensure consistency
        const reloadedUser = await userRepository.findOne({ where: { id: user.id }, relations: ['profile'] });
        if (!reloadedUser || !reloadedUser.profile) {
          console.error(`Failed to create or reload profile for user ${user.email}. Skipping population.`);
          continue;
        }
        user.profile = reloadedUser.profile; // Assign the newly created profile
      }

      // Update existing profile with fake data
      user.profile.userType = user.profile.userType || getRandomElement(USER_TYPES);
      user.profile.program = user.profile.program || getRandomElement(PROGRAMS);
      user.profile.signupExperience = user.profile.signupExperience || faker.lorem.paragraph(2);
      user.profile.status = faker.person.jobTitle();
      user.profile.institution = 'SAIT';
      user.profile.bio = faker.lorem.paragraph(faker.number.int({ min: 2, max: 4 }));
      user.profile.avatarUrl = faker.image.avatarGitHub();
      user.profile.bannerUrl = faker.image.urlPicsumPhotos({ width: 1000, height: 200 });
      user.profile.skills = getRandomSubset(skillEntities, faker.number.int({ min: 3, max: 10 }));
      user.profile.interests = getRandomSubset(interestEntities, faker.number.int({ min: 2, max: 6 }));

      // Add Work Experiences
      const workExperiences = Array.from({ length: faker.number.int({ min: 1, max: 3 }) }).map(exp =>
        workExperienceRepository.create({
          profileId: user.profile.id, // Set ID explicitly
          dateRange: `${faker.date.past({ years: 5 }).getFullYear()} - ${faker.date.recent().getFullYear()}`,
          workName: faker.company.name() + ' - ' + faker.person.jobTitle(),
          description: faker.lorem.sentence(),
        })
      );
      await workExperienceRepository.save(workExperiences);

      // Add Portfolio Projects
      const portfolioProjects = Array.from({ length: faker.number.int({ min: 1, max: 4 }) }).map(pp =>
        portfolioProjectRepository.create({
          profileId: user.profile.id, // Set ID explicitly
          title: faker.commerce.productName() + ' Showcase',
          description: faker.lorem.paragraph(faker.number.int({ min: 1, max: 3 })),
          tags: getRandomSubset(PREDEFINED_SKILLS, 3),
          imageUrl: faker.image.urlLoremFlickr({ category: 'technology,abstract,business' }),
        })
      );
      await portfolioProjectRepository.save(portfolioProjects);

      // Save the updated profile (this should update relations like skills/interests)
      await profileRepository.save(user.profile);
      console.log(`... populated profile for ${user.email}`);
    }
    console.log('Finished populating demo user profiles.');
    // --- End Populate Profiles ---

    // --- Seed Projects ---
    console.log(`Seeding ${NUM_PROJECTS_TO_CREATE} Projects...`);
    const projectEntities: Project[] = [];
    if (demoUsers.length === 0) {
      console.error("Cannot seed projects without users.");
    } else {
      for (let i = 0; i < NUM_PROJECTS_TO_CREATE; i++) {
        const owner = getRandomElement(demoUsers);
        const numMilestones = faker.number.int({ min: 1, max: MAX_MILESTONES_PER_PROJECT });

        // --- Interdisciplinary Skill & Tag Logic ---
        let requiredSkills: string[] = [];
        let tags: string[] = [];
        const isInterdisciplinary = Math.random() < 0.7;
        const isPersonalIdea = Math.random() < 0.4;

        if (isInterdisciplinary) {
          const numCategories = faker.number.int({ min: 2, max: 3 });
          const selectedCategories = getRandomSubset(Object.keys(SKILL_CATEGORIES), numCategories);
          requiredSkills = getSkillsFromCategories(selectedCategories, faker.number.int({ min: 3, max: 7 }));
          selectedCategories.forEach(cat => {
            if (cat === 'TECH' && !tags.includes('Development')) tags.push('Development');
            if (cat === 'DESIGN' && !tags.includes('Design')) tags.push('Design');
            if (cat === 'BUSINESS' && !tags.includes('Business')) tags.push('Business');
            if (cat === 'MEDIA_SCIENCE' && !tags.includes('Science') && !tags.includes('Content & Media')) {
              tags.push(Math.random() < 0.5 ? 'Science' : 'Content & Media');
            }
          });
        } else {
          let primaryCategory = 'TECH';
          if (owner.profile?.program?.includes('Design')) primaryCategory = 'DESIGN';
          else if (owner.profile?.program?.includes('Business') || owner.profile?.program?.includes('Marketing')) primaryCategory = 'BUSINESS';
          else if (owner.profile?.program?.includes('Media')) primaryCategory = 'MEDIA_SCIENCE';
          requiredSkills = getSkillsFromCategories([primaryCategory], faker.number.int({ min: 3, max: 7 }));
          if (primaryCategory === 'TECH' && !tags.includes('Development')) tags.push('Development');
          if (primaryCategory === 'DESIGN' && !tags.includes('Design')) tags.push('Design');
          if (primaryCategory === 'BUSINESS' && !tags.includes('Business')) tags.push('Business');
          if (primaryCategory === 'MEDIA_SCIENCE' && !tags.includes('Science') && !tags.includes('Content & Media')) {
            tags.push(Math.random() < 0.5 ? 'Science' : 'Content & Media');
          }
        }
        tags = [...new Set([...tags, ...getRandomSubset(PREDEFINED_TAGS.filter(t => !tags.includes(t) && t !== 'Personal Idea' && t !== 'Startup Idea'), 2)])];
        if (isPersonalIdea) {
          tags.push(getRandomElement(['Personal Idea', 'Startup Idea']));
        }
        // --- END Interdisciplinary Logic ---

        // 1. Create Project entity data
        const projectData = {
          ownerId: owner.id, // Set owner ID
          title: faker.company.catchPhrase() + (isPersonalIdea ? ' App' : ' Platform'),
          description: faker.lorem.paragraphs(faker.number.int({ min: 2, max: 4 })),
          numOfMembers: getRandomElement(NUM_MEMBERS_OPTIONS),
          projectType: getRandomElement(PROJECT_TYPES),
          mentorRequest: getRandomElement(MENTOR_REQUESTS.filter(r => r !== 'none')),
          preferredMentor: faker.lorem.words(3),
          requiredSkills: requiredSkills,
          tags: tags,
          requiredRoles: faker.lorem.sentence(faker.number.int({ min: 5, max: 15 })),
          imageUrl: faker.image.urlPicsumPhotos({ width: 600, height: 400 }),
          startDate: faker.date.past({ years: 1 }),
          endDate: faker.datatype.boolean(0.7) ? faker.date.future({ years: 1 }) : undefined,
        };

        try {
          // 2. Save the Project FIRST to get its ID
          const savedProject = await projectRepository.save(projectRepository.create(projectData));
          // console.log(`... Saved project ${i + 1} (ID: ${savedProject.id})`);

          // 3. Add Owner Membership
          const ownerMembership = membershipRepository.create({
            projectId: savedProject.id, // Explicitly set ID
            userId: owner.id, // Explicitly set ID
            role: ProjectRole.OWNER,
          });
          await membershipRepository.save(ownerMembership);

          // 4. Create and Save Milestones and Tasks
          const createdMilestones: Milestone[] = [];
          for (let j = 0; j < numMilestones; j++) {
            const milestoneData = milestoneRepository.create({
              projectId: savedProject.id, // **Set the projectId explicitly**
              title: `Milestone ${j + 1}: ${faker.lorem.words(faker.number.int({ min: 2, max: 5 }))}`,
              date: faker.date.between({ from: savedProject.startDate!, to: savedProject.endDate || faker.date.future({ years: 1 }) }),
              active: j === 0,
            });
            const savedMilestone = await milestoneRepository.save(milestoneData);

            const numTasks = faker.number.int({ min: 1, max: MAX_TASKS_PER_MILESTONE });
            const createdTasks: Task[] = [];
            for (let k = 0; k < numTasks; k++) {
              const taskData = taskRepository.create({
                milestoneId: savedMilestone.id, // **Set the milestoneId explicitly**
                name: `Task ${k + 1}: ${faker.hacker.verb()} ${faker.hacker.noun()}`,
                description: faker.lorem.sentence(),
                status: getRandomElement(Object.values(TaskStatus)),
              });
              const savedTask = await taskRepository.save(taskData);
              createdTasks.push(savedTask);
            }
            savedMilestone.tasks = createdTasks; // Add saved tasks to milestone object
            createdMilestones.push(savedMilestone); // Add saved milestone
          }

          // Reload the project with all relations needed for subsequent steps
          const fullyLoadedProject = await projectRepository.findOne({
            where: { id: savedProject.id },
            relations: ['owner', 'memberships', 'milestones', 'milestones.tasks'], // Load necessary relations
          });

          if (fullyLoadedProject) {
            projectEntities.push(fullyLoadedProject);
          } else {
            console.warn(`Could not fully reload project ${savedProject.id}`);
            // Fallback: manually add milestones/memberships to the savedProject object if needed
            savedProject.milestones = createdMilestones;
            savedProject.memberships = [ownerMembership];
            projectEntities.push(savedProject);
          }


          if ((i + 1) % 5 === 0) console.log(`... seeded ${i + 1} projects fully`);

        } catch (error) {
          console.error(`Failed during seeding process for project ${i+1}:`, error);
        }
      }
    }
    console.log(`Seeded ${projectEntities.length} projects.`);
    // --- End Seed Projects ---


    // --- Seed Memberships ---
    console.log('Seeding Memberships...');
    let membershipCount = 0;
    for (const project of projectEntities) {
      const potentialMembers = demoUsers.filter(u => u.id !== project.ownerId);
      const membersToAdd = getRandomSubset(potentialMembers, MAX_MEMBERS_PER_PROJECT - 1);

      for (const memberUser of membersToAdd) {
        try {
          // Check if membership already exists (paranoid check)
          const exists = await membershipRepository.exist({ where: { projectId: project.id, userId: memberUser.id } });
          if (exists) continue;

          const membership = membershipRepository.create({
            projectId: project.id,
            userId: memberUser.id,
            role: ProjectRole.MEMBER,
          });
          await membershipRepository.save(membership);
          membershipCount++;

          // Assign some tasks within this project to this new member
          const tasksToAssign = (project.milestones || [])
            .flatMap(m => m.tasks || [])
            .filter(t => !t.assigneeId && Math.random() < 0.2);

          for(const task of tasksToAssign) {
            // Fetch the task again to ensure it's managed by TypeORM before updating
            const taskToUpdate = await taskRepository.findOneBy({ id: task.id });
            if (taskToUpdate) {
              taskToUpdate.assigneeId = memberUser.id; // Set only the ID
              await taskRepository.save(taskToUpdate);
            } else {
              console.warn(`Task ${task.id} not found for assignment.`);
            }
          }

        } catch (error: any) {
          if (error.code === '23505') {
            // console.warn(`Skipping duplicate membership: User ${memberUser.id} in Project ${project.id}`);
          } else {
            console.error(`Failed to save membership for User ${memberUser.id} in Project ${project.id}:`, error);
          }
        }
      }
    }
    console.log(`Seeded ${membershipCount} additional memberships.`);
    // --- End Seed Memberships ---


    // --- Seed Applications ---
    console.log('Seeding Applications...');
    let applicationCount = 0;
    if (demoUsers.length > 0 && projectEntities.length > 0) {
      for (const applicant of demoUsers) {
        const projectsToApply = getRandomSubset(projectEntities, MAX_APPLICATIONS_PER_USER);
        for (const project of projectsToApply) {
          const isOwner = project.ownerId === applicant.id;
          const isMember = await membershipRepository.exist({ where: { projectId: project.id, userId: applicant.id } });
          const hasApplied = await applicationRepository.exist({ where: { projectId: project.id, applicantId: applicant.id } });

          if (!isOwner && !isMember && !hasApplied) {
            const status = Math.random() < 0.3 ? ApplicationStatus.INVITED : ApplicationStatus.PENDING;
            const application = applicationRepository.create({
              applicantId: applicant.id,
              projectId: project.id,
              status: status,
              roleAppliedFor: status === ApplicationStatus.PENDING ? faker.person.jobTitle() : ProjectRole.MEMBER,
            });
            try {
              await applicationRepository.save(application);
              applicationCount++;
            } catch (error: any) {
              if (error.code === '23505') {
                // console.warn(`Skipping duplicate application: User ${applicant.id} for Project ${project.id}`);
              } else {
                console.error(`Failed to save application for User ${applicant.id} in Project ${project.id}:`, error);
              }
            }
          }
        }
      }
    }
    console.log(`Seeded ${applicationCount} applications.`);
    // --- End Seed Applications ---


    // --- Seed Bookmarks ---
    console.log('Seeding Bookmarks...');
    let bookmarkCount = 0;
    if (demoUsers.length > 0 && projectEntities.length > 0) {
      for (const user of demoUsers) {
        const projectsToBookmark = getRandomSubset(projectEntities, MAX_BOOKMARKS_PER_USER);
        for (const project of projectsToBookmark) {
          const hasBookmarked = await bookmarkRepository.exist({ where: { projectId: project.id, userId: user.id } });
          if(hasBookmarked) continue;

          const bookmark = bookmarkRepository.create({
            userId: user.id,
            projectId: project.id,
          });
          try {
            await bookmarkRepository.save(bookmark);
            bookmarkCount++;
          } catch (error: any) {
            if (error.code === '23505') {
              // console.warn(`Skipping duplicate bookmark: User ${user.id} for Project ${project.id}`);
            } else {
              console.error(`Failed to save bookmark for User ${user.id} in Project ${project.id}:`, error);
            }
          }
        }
      }
    }
    console.log(`Seeded ${bookmarkCount} bookmarks.`);
    // --- End Seed Bookmarks ---

    console.log('Database seeding completed successfully!');

  } catch (error) {
    console.error('Database seeding failed:', error);
    process.exit(1); // Exit with error code if seeding fails critically
  } finally {
    if (app) {
      await app.close();
      console.log('NestJS context closed.');
    }
  }
}

// Run the seeding function
bootstrap();