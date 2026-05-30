import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { INestApplicationContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

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

// ===========================================================================
// Curated demo dataset for TeamUp - a SAIT student collaboration platform.
// Everything here is hand-written so the live demo reads as a real community:
// coherent people, believable projects, sensible milestones/tasks, and a
// demo user wired into the network (owns projects, is a member, has sent and
// received applications, has bookmarks, and gets real recommendations).
// ===========================================================================

const DEMO = 'DEMO'; // sentinel for "the live demo user" in owner/team fields

const avatar = (n: number) => `https://i.pravatar.cc/300?img=${n}`;
const banner = (slug: string) => `https://picsum.photos/seed/${slug}-bn/1200/300`;
const cover = (slug: string) => `https://picsum.photos/seed/${slug}/600/400`;
const monthsFromNow = (n: number) => {
  const d = new Date();
  d.setMonth(d.getMonth() + n);
  return d;
};

interface PersonaWork {
  dateRange: string;
  workName: string;
  description: string;
}
interface PersonaPortfolio {
  title: string;
  description: string;
  tags: string[];
  slug: string;
}
interface Persona {
  username: string;
  firstName: string;
  lastName: string;
  userType: string;
  program: string;
  status: string;
  bio: string;
  avatar: number;
  skills: string[];
  interests: string[];
  work: PersonaWork[];
  portfolio: PersonaPortfolio[];
}

// --- The demo user's profile (identity/email/cognitoSub stay from signup) ---
// Full-stack web developer so recommendations land on real, matching projects.
const DEMO_PROFILE = {
  userType: 'Undergraduate',
  program: 'Software Development',
  status: 'Full-Stack Developer · open to collaborating',
  institution: 'SAIT',
  bio: "Third-year Software Development student who loves turning rough ideas into shipped products. Most at home in a React + NestJS codebase, but I'll happily jump into Figma to keep the UX honest. Looking for ambitious teammates to build something worth showing off.",
  signupExperience:
    "I've built a handful of full-stack side projects and interned on a small product team. Comfortable owning a feature end to end - schema, API, UI, and the polish in between.",
  avatar: 12,
  skills: ['React', 'TypeScript', 'Node.js', 'NestJS', 'PostgreSQL', 'UI Design', 'Figma', 'Docker'],
  interests: ['Web Development', 'UI/UX Design', 'Entrepreneurship', 'Cloud Computing'],
  work: [
    {
      dateRange: 'May 2024 - Aug 2024',
      workName: 'Product Engineering Intern · Northstar Labs',
      description:
        'Shipped a customer-facing dashboard in React and TypeScript, and built the supporting REST endpoints. Cut initial load time roughly in half by paginating the heaviest queries.',
    },
    {
      dateRange: 'Sep 2023 - Present',
      workName: 'Freelance Web Developer',
      description:
        'Design and build small business websites and internal tools end to end, from Figma mockups through deployment.',
    },
  ],
  portfolio: [
    {
      title: 'Ledgerly - Personal Finance Tracker',
      description:
        'A budgeting app with envelope-style categories, recurring transactions, and a clean monthly overview. Built with React, NestJS, and PostgreSQL.',
      tags: ['React', 'NestJS', 'PostgreSQL'],
      slug: 'ledgerly',
    },
    {
      title: 'Studyloop - Spaced-Repetition Flashcards',
      description:
        'A flashcard app with an SM-2 review scheduler and shareable decks. Focused on a fast, keyboard-driven study flow.',
      tags: ['TypeScript', 'React', 'UI Design'],
      slug: 'studyloop',
    },
  ],
};

// --- Synthetic community members ---
const PERSONAS: Persona[] = [
  {
    username: 'maya.chen',
    firstName: 'Maya',
    lastName: 'Chen',
    userType: 'Undergraduate',
    program: 'Graphic Design',
    status: 'Product Designer · UI/UX',
    bio: 'Designer who cares about the small interactions most people never notice. I prototype fast in Figma and love pairing with developers to make sure the handoff actually survives contact with code.',
    avatar: 5,
    skills: ['Figma', 'UI Design', 'UX Research', 'Adobe XD', 'Illustration'],
    interests: ['UI/UX Design', 'Graphic Design', 'Health Tech'],
    work: [
      {
        dateRange: 'Jan 2024 - Present',
        workName: 'UX Designer · SAIT Student Innovation Lab',
        description: 'Run usability sessions and turn findings into design systems the student dev teams can build on.',
      },
    ],
    portfolio: [
      {
        title: 'Rooted - Plant Care Companion',
        description: 'An app concept that reminds you when to water, repot, and fertilize, with a calm illustrated visual language.',
        tags: ['Figma', 'UI Design', 'Illustration'],
        slug: 'rooted',
      },
    ],
  },
  {
    username: 'daniel.okafor',
    firstName: 'Daniel',
    lastName: 'Okafor',
    userType: 'Graduate',
    program: 'Data Science',
    status: 'ML Engineer · Data Science grad',
    bio: 'I like the messy middle of data work - cleaning, framing the problem, and figuring out whether a model is actually helping anyone. Python by day, occasionally Go when things need to be fast.',
    avatar: 33,
    skills: ['Python', 'Machine Learning', 'Data Analysis', 'Go', 'AWS'],
    interests: ['Machine Learning', 'Data Science', 'Artificial Intelligence', 'Sustainability'],
    work: [
      {
        dateRange: 'Jun 2023 - Present',
        workName: 'Data Science Researcher · Calgary Climate Initiative',
        description: 'Built forecasting models for municipal energy usage and packaged them behind a small Python API.',
      },
    ],
    portfolio: [
      {
        title: 'GridSense - Energy Demand Forecasting',
        description: 'A time-series model that predicts neighbourhood electricity demand to help plan load balancing.',
        tags: ['Python', 'Machine Learning', 'Data Analysis'],
        slug: 'gridsense',
      },
    ],
  },
  {
    username: 'sofia.ramirez',
    firstName: 'Sofia',
    lastName: 'Ramirez',
    userType: 'Undergraduate',
    program: 'Marketing',
    status: 'Growth & Content Marketer',
    bio: 'I help good products find the people who need them. Equal parts copywriting, SEO, and obsessing over the analytics dashboard. Always looking for a technical team that wants a marketer in the room early.',
    avatar: 9,
    skills: ['Marketing', 'SEO', 'Content Writing', 'Social Media Marketing', 'Copywriting'],
    interests: ['Digital Marketing', 'Entrepreneurship', 'Creative Writing'],
    work: [
      {
        dateRange: 'Mar 2023 - Present',
        workName: 'Marketing Lead · Bow River Coffee Co.',
        description: 'Grew the local roaster’s online orders through a content + email strategy and a rebuilt SEO foundation.',
      },
    ],
    portfolio: [
      {
        title: 'Launchpad - Student Startup Newsletter',
        description: 'Founded and grew a weekly newsletter covering Calgary student startups to 2,000+ subscribers.',
        tags: ['Content Writing', 'SEO', 'Marketing'],
        slug: 'launchpad',
      },
    ],
  },
  {
    username: 'liam.walsh',
    firstName: 'Liam',
    lastName: 'Walsh',
    userType: 'Undergraduate',
    program: 'Software Development',
    status: 'Mobile Developer · iOS & Android',
    bio: 'Mobile-first developer. I care about apps that feel native and fast, and I’ve shipped on both the App Store and Play Store. Currently going deep on Swift concurrency.',
    avatar: 52,
    skills: ['Swift', 'Kotlin', 'iOS Development', 'Android Development', 'JavaScript'],
    interests: ['Mobile Development', 'Health Tech', 'Game Development'],
    work: [
      {
        dateRange: 'Sep 2023 - Present',
        workName: 'iOS Developer · Trailhead Fitness',
        description: 'Built the workout-tracking module and offline sync for a fitness app with 10k+ downloads.',
      },
    ],
    portfolio: [
      {
        title: 'Summit - Hiking Trail Tracker',
        description: 'An iOS app that logs hikes with offline maps and elevation profiles for the Canadian Rockies.',
        tags: ['Swift', 'iOS Development'],
        slug: 'summit',
      },
    ],
  },
  {
    username: 'aisha.khan',
    firstName: 'Aisha',
    lastName: 'Khan',
    userType: 'Graduate',
    program: 'Information Technology',
    status: 'Cloud & DevOps Engineer',
    bio: 'I keep things running. Infrastructure as code, CI/CD pipelines, and making deploys boring (in the best way). Happiest with a terminal open and a flaky pipeline to fix.',
    avatar: 44,
    skills: ['AWS', 'Docker', 'Azure', 'Python', 'PostgreSQL', 'Go'],
    interests: ['Cloud Computing', 'Cybersecurity', 'Web Development'],
    work: [
      {
        dateRange: 'Jan 2022 - Present',
        workName: 'DevOps Engineer · Prairie Cloud Solutions',
        description: 'Migrated client workloads to containerized AWS infrastructure and set up zero-downtime deploys.',
      },
    ],
    portfolio: [
      {
        title: 'DeployKit - One-Command Infra Templates',
        description: 'Reusable Terraform + Docker templates that spin up a production-ready web stack in minutes.',
        tags: ['AWS', 'Docker'],
        slug: 'deploykit',
      },
    ],
  },
  {
    username: 'noah.fischer',
    firstName: 'Noah',
    lastName: 'Fischer',
    userType: 'Undergraduate',
    program: 'New Media Production',
    status: 'Video & Motion Designer',
    bio: 'Storyteller with a camera and an After Effects timeline. I make the launch videos, the explainer animations, and the social cuts that make a project look alive.',
    avatar: 60,
    skills: ['Video Editing', 'Photography', 'Graphic Design', 'Illustration'],
    interests: ['Film Making', 'Creative Writing', 'Music Production'],
    work: [
      {
        dateRange: 'May 2023 - Present',
        workName: 'Freelance Videographer',
        description: 'Produce brand and event videos for local startups, from storyboard to final colour grade.',
      },
    ],
    portfolio: [
      {
        title: 'Reel Stories - Startup Launch Films',
        description: 'A collection of 60-second launch films made for early-stage Calgary founders.',
        tags: ['Video Editing', 'Photography'],
        slug: 'reelstories',
      },
    ],
  },
  {
    username: 'priya.nair',
    firstName: 'Priya',
    lastName: 'Nair',
    userType: 'Undergraduate',
    program: 'Software Development',
    status: 'Backend Developer · APIs & Data',
    bio: 'Backend developer who enjoys a well-designed schema more than is probably healthy. Node and Python mostly, with a soft spot for clean, well-documented APIs.',
    avatar: 16,
    skills: ['Node.js', 'TypeScript', 'PostgreSQL', 'Python', 'MongoDB', 'NestJS'],
    interests: ['Web Development', 'Cloud Computing', 'Data Science'],
    work: [
      {
        dateRange: 'Jun 2024 - Present',
        workName: 'Backend Intern · FinTech Foundry',
        description: 'Built transaction-processing endpoints and added integration tests across the payments service.',
      },
    ],
    portfolio: [
      {
        title: 'OpenMenu - Restaurant API',
        description: 'A public API and admin panel for restaurants to manage menus, hours, and online orders.',
        tags: ['Node.js', 'PostgreSQL', 'NestJS'],
        slug: 'openmenu',
      },
    ],
  },
  {
    username: 'ethan.brooks',
    firstName: 'Ethan',
    lastName: 'Brooks',
    userType: 'Alumni',
    program: 'Business Administration',
    status: 'Founder · Business Strategy',
    bio: 'SAIT alum and second-time founder. I spend my time on strategy, fundraising, and making sure the team is building the right thing. Mentor when I can - I got a lot of help early on.',
    avatar: 68,
    skills: ['Business Strategy', 'Financial Modeling', 'Market Research', 'Public Speaking', 'Project Management'],
    interests: ['Entrepreneurship', 'Finance', 'Sustainability'],
    work: [
      {
        dateRange: 'Jan 2021 - Present',
        workName: 'Co-Founder & CEO · Verde Logistics',
        description: 'Bootstrapped a last-mile delivery startup focused on low-emission routes to a small profitable team.',
      },
    ],
    portfolio: [
      {
        title: 'Verde - Green Last-Mile Delivery',
        description: 'Business case and go-to-market plan for an electric-bike delivery network in dense urban cores.',
        tags: ['Business Strategy', 'Market Research'],
        slug: 'verde',
      },
    ],
  },
  {
    username: 'grace.thompson',
    firstName: 'Grace',
    lastName: 'Thompson',
    userType: 'Undergraduate',
    program: 'Web Developer Fast-Track',
    status: 'Frontend Developer · React',
    bio: 'Career-changer turned frontend developer. I came from teaching, so I think a lot about clarity and accessibility. React, TypeScript, and a growing love for design systems.',
    avatar: 24,
    skills: ['React', 'TypeScript', 'CSS', 'HTML', 'JavaScript', 'Vue.js'],
    interests: ['Web Development', 'UI/UX Design', 'Education Technology'],
    work: [
      {
        dateRange: 'Feb 2024 - Present',
        workName: 'Frontend Developer · BrightPath EdTech',
        description: 'Build accessible, responsive learning interfaces and maintain the shared component library.',
      },
    ],
    portfolio: [
      {
        title: 'ClassKit - Accessible Quiz Builder',
        description: 'A tool that lets teachers build keyboard- and screen-reader-friendly quizzes in minutes.',
        tags: ['React', 'TypeScript', 'CSS'],
        slug: 'classkit',
      },
    ],
  },
  {
    username: 'marcus.lee',
    firstName: 'Marcus',
    lastName: 'Lee',
    userType: 'Undergraduate',
    program: 'Software Development',
    status: 'Game Developer · Unity',
    bio: 'Game dev who started by modding games as a kid and never stopped. Unity and C# mostly. I love game jams and the chaos of building something playable in 48 hours.',
    avatar: 11,
    skills: ['Unity', 'C#', 'C++', 'Unreal Engine', 'JavaScript'],
    interests: ['Game Development', 'Virtual Reality', 'Artificial Intelligence'],
    work: [
      {
        dateRange: 'Sep 2023 - Present',
        workName: 'Gameplay Programmer · Indie Collective',
        description: 'Prototype gameplay mechanics and build tools that speed up the team’s level design workflow.',
      },
    ],
    portfolio: [
      {
        title: 'Lumen - Puzzle Platformer',
        description: 'A light-bending puzzle platformer built in Unity for a 72-hour game jam (top 5 finish).',
        tags: ['Unity', 'C#'],
        slug: 'lumen',
      },
    ],
  },
  {
    username: 'hannah.muller',
    firstName: 'Hannah',
    lastName: 'Müller',
    userType: 'Graduate',
    program: 'Data Science',
    status: 'Data Analyst · Viz & Insights',
    bio: 'I turn spreadsheets nobody wants to open into dashboards people actually use. SQL, Python, and a strong opinion that most charts should be simpler than they are.',
    avatar: 47,
    skills: ['Data Analysis', 'Python', 'PostgreSQL', 'Machine Learning'],
    interests: ['Data Science', 'Health Tech', 'Sustainability'],
    work: [
      {
        dateRange: 'Jan 2023 - Present',
        workName: 'Data Analyst · Foothills Health Network',
        description: 'Built reporting dashboards that reduced manual report prep from days to minutes for clinic staff.',
      },
    ],
    portfolio: [
      {
        title: 'PulseBoard - Clinic Analytics',
        description: 'A dashboard that surfaces wait-time and capacity trends across a network of clinics.',
        tags: ['Data Analysis', 'Python'],
        slug: 'pulseboard',
      },
    ],
  },
  {
    username: 'omar.hassan',
    firstName: 'Omar',
    lastName: 'Hassan',
    userType: 'Instructor',
    program: 'Software Development',
    status: 'Instructor · Full-Stack & Mentorship',
    bio: 'I teach full-stack development at SAIT and mentor student teams on the side. Twelve years in industry before this. My whole job is helping people get unstuck, so don’t hesitate to reach out.',
    avatar: 13,
    skills: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'Java', 'Spring Boot', 'PostgreSQL'],
    interests: ['Web Development', 'Education Technology', 'Cloud Computing'],
    work: [
      {
        dateRange: 'Aug 2019 - Present',
        workName: 'Software Development Instructor · SAIT',
        description: 'Teach web and backend development and run the capstone mentorship program.',
      },
      {
        dateRange: 'Jun 2007 - Jul 2019',
        workName: 'Senior Engineer · Various',
        description: 'Built and led teams across fintech and logistics products before moving into teaching.',
      },
    ],
    portfolio: [
      {
        title: 'Capstone Mentor Handbook',
        description: 'An open guide for student teams covering scoping, git workflow, and shipping a real MVP.',
        tags: ['Project Management', 'Content Writing'],
        slug: 'mentorhandbook',
      },
    ],
  },
  {
    username: 'ava.rossi',
    firstName: 'Ava',
    lastName: 'Rossi',
    userType: 'Undergraduate',
    program: 'New Media Production',
    status: 'Content Creator · Social & Brand',
    bio: 'Social-first content creator. I script, shoot, and edit short-form video, and I think in hooks and retention curves. Looking for product teams who want their launch to actually get seen.',
    avatar: 20,
    skills: ['Social Media Marketing', 'Video Editing', 'Copywriting', 'Photography', 'Content Writing'],
    interests: ['Digital Marketing', 'Film Making', 'Creative Writing'],
    work: [
      {
        dateRange: 'Apr 2023 - Present',
        workName: 'Content Creator · Freelance',
        description: 'Produce short-form video campaigns for local brands, several with 100k+ organic views.',
      },
    ],
    portfolio: [
      {
        title: 'Hook - Short-Form Playbook',
        description: 'A library of short-form video templates and hooks tuned for product launches.',
        tags: ['Social Media Marketing', 'Video Editing'],
        slug: 'hook',
      },
    ],
  },
  {
    username: 'jacob.smith',
    firstName: 'Jacob',
    lastName: 'Smith',
    userType: 'Undergraduate',
    program: 'Information Technology',
    status: 'Security & Backend Enthusiast',
    bio: 'IT student leaning hard into security. I run a home lab, break my own apps for fun, and try to write code that doesn’t make tomorrow-me cry. Python and a bit of Rust on weekends.',
    avatar: 50,
    skills: ['Python', 'Docker', 'PostgreSQL', 'Node.js', 'AWS'],
    interests: ['Cybersecurity', 'Cloud Computing', 'Blockchain'],
    work: [
      {
        dateRange: 'May 2024 - Present',
        workName: 'IT Security Intern · SecureNorth',
        description: 'Help run vulnerability scans and document remediation steps for small-business clients.',
      },
    ],
    portfolio: [
      {
        title: 'SafeKeys - Password Health Checker',
        description: 'A self-hosted tool that audits password strength and flags reused credentials across a vault.',
        tags: ['Python', 'Docker'],
        slug: 'safekeys',
      },
    ],
  },
  {
    username: 'isabella.santos',
    firstName: 'Isabella',
    lastName: 'Santos',
    userType: 'Undergraduate',
    program: 'Graphic Design',
    status: 'Brand & Visual Designer',
    bio: 'Brand designer who loves the moment a logo, palette, and voice finally click. I work mostly in Figma and Illustrator and care a lot about consistency across a product.',
    avatar: 31,
    skills: ['Figma', 'Illustration', 'Graphic Design', 'Adobe XD', 'UI Design'],
    interests: ['Graphic Design', 'UI/UX Design', 'Entrepreneurship'],
    work: [
      {
        dateRange: 'Jan 2024 - Present',
        workName: 'Brand Designer · Freelance',
        description: 'Develop brand identities and design systems for early-stage startups and student ventures.',
      },
    ],
    portfolio: [
      {
        title: 'Identity Kit - Startup Branding',
        description: 'A set of complete brand identities, each with logo, type, palette, and usage guidelines.',
        tags: ['Figma', 'Graphic Design', 'Illustration'],
        slug: 'identitykit',
      },
    ],
  },
];

interface SeedProject {
  owner: string; // username or DEMO
  title: string;
  description: string;
  numOfMembers: string;
  projectType: string;
  mentorRequest: string;
  preferredMentor: string;
  requiredSkills: string[];
  tags: string[];
  requiredRoles: string;
  slug: string;
  startMonthsAgo: number;
  endMonthsAhead: number | null;
  team: string[]; // additional members (usernames or DEMO), excluding owner
  milestones: { title: string; active: boolean; tasks: { name: string; status: TaskStatus }[] }[];
}

const PROJECTS: SeedProject[] = [
  {
    owner: 'maya.chen',
    title: 'MindEase - Student Wellness App',
    description:
      'A mobile-first wellness app for students: mood check-ins, guided breathing, and a private journal. We want it to feel calm and genuinely helpful, not like another productivity tracker. Design direction is set - now we need to build it and validate it with real students on campus.',
    numOfMembers: '5-10',
    projectType: 'hybrid',
    mentorRequest: 'looking',
    preferredMentor: 'Health tech or clinical psychology background',
    requiredSkills: ['React', 'TypeScript', 'Node.js', 'UI Design', 'Figma'],
    tags: ['Mobile App', 'Health Tech', 'Design', 'Development', 'Social Good'],
    requiredRoles:
      'Looking for two frontend developers comfortable with React, one backend developer for the API and data layer, and a researcher to help run on-campus usability testing.',
    slug: 'mindease',
    startMonthsAgo: 2,
    endMonthsAhead: 4,
    team: [DEMO, 'priya.nair', 'hannah.muller'],
    milestones: [
      {
        title: 'Milestone 1: Research & Design Foundation',
        active: false,
        tasks: [
          { name: 'Run student interviews on stress and wellbeing', status: TaskStatus.DONE },
          { name: 'Define core mood check-in flow', status: TaskStatus.DONE },
          { name: 'Build high-fidelity Figma prototype', status: TaskStatus.DONE },
        ],
      },
      {
        title: 'Milestone 2: MVP Build',
        active: true,
        tasks: [
          { name: 'Set up React project and design tokens', status: TaskStatus.DONE },
          { name: 'Implement mood check-in screen', status: TaskStatus.IN_PROGRESS },
          { name: 'Build journaling API and storage', status: TaskStatus.IN_PROGRESS },
          { name: 'Add guided breathing animation', status: TaskStatus.TODO },
        ],
      },
      {
        title: 'Milestone 3: Campus Pilot',
        active: false,
        tasks: [
          { name: 'Recruit 20 students for pilot', status: TaskStatus.TODO },
          { name: 'Instrument analytics for retention', status: TaskStatus.TODO },
        ],
      },
    ],
  },
  {
    owner: 'daniel.okafor',
    title: 'EcoRoute - Carbon-Aware Trip Planner',
    description:
      'A web app that plans trips around Calgary and shows the carbon cost of each option - transit, bike, carpool, or drive. The model is working in a notebook; we need to wrap it in a real API and a frontend people would actually use. Great fit if you care about climate and clean data pipelines.',
    numOfMembers: '2-4',
    projectType: 'remote',
    mentorRequest: 'open',
    preferredMentor: 'Someone with sustainability or transportation data experience',
    requiredSkills: ['Python', 'React', 'Node.js', 'Data Analysis', 'PostgreSQL'],
    tags: ['Web App', 'AI/ML', 'Science', 'Social Good', 'Development'],
    requiredRoles:
      'Need a frontend developer to build the trip-planning UI and a backend developer to productionize the Python model behind a clean API.',
    slug: 'ecoroute',
    startMonthsAgo: 1,
    endMonthsAhead: 5,
    team: ['aisha.khan', DEMO],
    milestones: [
      {
        title: 'Milestone 1: Model to API',
        active: true,
        tasks: [
          { name: 'Wrap forecasting model in a Python service', status: TaskStatus.IN_PROGRESS },
          { name: 'Define trip and emissions data schema', status: TaskStatus.DONE },
          { name: 'Containerize the service with Docker', status: TaskStatus.TODO },
        ],
      },
      {
        title: 'Milestone 2: Frontend & Maps',
        active: false,
        tasks: [
          { name: 'Build route input and results UI', status: TaskStatus.TODO },
          { name: 'Integrate map and route rendering', status: TaskStatus.TODO },
        ],
      },
    ],
  },
  {
    owner: 'ethan.brooks',
    title: 'Pitchdeck - AI Pitch Practice Tool',
    description:
      'A tool that lets founders rehearse their pitch and get instant feedback on pacing, filler words, and clarity. I’ve validated demand with a dozen founders and have the business side covered - I need a technical team to build the MVP. Equity-style collaboration for the right people.',
    numOfMembers: '2-4',
    projectType: 'hybrid',
    mentorRequest: 'none',
    preferredMentor: '',
    requiredSkills: ['React', 'TypeScript', 'Node.js', 'Machine Learning', 'Python'],
    tags: ['Startup Idea', 'AI/ML', 'Web App', 'Business', 'Development'],
    requiredRoles:
      'Looking for a full-stack developer to lead the build and someone comfortable with speech/ML APIs for the feedback engine.',
    slug: 'pitchdeck',
    startMonthsAgo: 1,
    endMonthsAhead: 6,
    team: ['priya.nair'],
    milestones: [
      {
        title: 'Milestone 1: MVP Scope & Build',
        active: true,
        tasks: [
          { name: 'Finalize MVP feature list with founders', status: TaskStatus.DONE },
          { name: 'Build recording and transcript flow', status: TaskStatus.IN_PROGRESS },
          { name: 'Prototype filler-word detection', status: TaskStatus.TODO },
        ],
      },
    ],
  },
  {
    owner: 'liam.walsh',
    title: 'TrailMate - Offline Hiking Companion',
    description:
      'A cross-platform mobile app for hikers in the Rockies: offline trail maps, elevation, and a safety check-in that texts a contact if you don’t return on time. iOS prototype exists; we want to bring it to Android and harden the offline sync.',
    numOfMembers: '2-4',
    projectType: 'remote',
    mentorRequest: 'one-time',
    preferredMentor: 'Mobile dev who has shipped offline-first apps',
    requiredSkills: ['Swift', 'Kotlin', 'iOS Development', 'Android Development'],
    tags: ['Mobile App', 'Development', 'Social Good'],
    requiredRoles: 'Need an Android developer (Kotlin) and a designer to refine the map and check-in screens.',
    slug: 'trailmate',
    startMonthsAgo: 3,
    endMonthsAhead: 3,
    team: ['marcus.lee', 'isabella.santos'],
    milestones: [
      {
        title: 'Milestone 1: Android Port',
        active: true,
        tasks: [
          { name: 'Set up Kotlin project and shared models', status: TaskStatus.DONE },
          { name: 'Implement offline map caching', status: TaskStatus.IN_PROGRESS },
          { name: 'Port safety check-in feature', status: TaskStatus.TODO },
        ],
      },
      {
        title: 'Milestone 2: Polish & Launch',
        active: false,
        tasks: [
          { name: 'Refine map UI with designer', status: TaskStatus.TODO },
          { name: 'Beta test with hiking club', status: TaskStatus.TODO },
        ],
      },
    ],
  },
  {
    owner: 'grace.thompson',
    title: 'ClassConnect - Peer Tutoring Platform',
    description:
      'A web platform that matches students who need help with peers who can teach it, scheduled around real timetables. Accessibility is a first-class requirement, not an afterthought. Looking for developers and a designer who care about inclusive products.',
    numOfMembers: '5-10',
    projectType: 'hybrid',
    mentorRequest: 'looking',
    preferredMentor: 'EdTech or accessibility expertise welcome',
    requiredSkills: ['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'UI Design'],
    tags: ['Web App', 'Education Technology', 'Social Good', 'Development', 'Design'],
    requiredRoles:
      'Need two frontend devs, a backend dev for matching and scheduling, and a UX designer focused on accessibility.',
    slug: 'classconnect',
    startMonthsAgo: 2,
    endMonthsAhead: 5,
    team: ['omar.hassan', 'maya.chen'],
    milestones: [
      {
        title: 'Milestone 1: Matching Engine',
        active: true,
        tasks: [
          { name: 'Design subject and availability schema', status: TaskStatus.DONE },
          { name: 'Build peer-matching algorithm', status: TaskStatus.IN_PROGRESS },
          { name: 'Create scheduling API', status: TaskStatus.TODO },
        ],
      },
      {
        title: 'Milestone 2: Accessible UI',
        active: false,
        tasks: [
          { name: 'Build booking flow with keyboard support', status: TaskStatus.TODO },
          { name: 'Run screen-reader audit', status: TaskStatus.TODO },
        ],
      },
    ],
  },
  {
    owner: 'marcus.lee',
    title: 'Pixelforge - Co-op Roguelike',
    description:
      'A two-player co-op roguelike built in Unity. Procedurally generated dungeons, drop-in co-op, and a pixel-art style. We have a playable vertical slice from a game jam and want to grow it into a real release. Artists and a sound designer especially welcome.',
    numOfMembers: '5-10',
    projectType: 'remote',
    mentorRequest: 'open',
    preferredMentor: 'Shipped game developer for production guidance',
    requiredSkills: ['Unity', 'C#', 'Illustration', 'Graphic Design'],
    tags: ['Development', 'Content & Media', 'Personal Idea'],
    requiredRoles: 'Looking for a gameplay programmer, a pixel artist, and a sound designer.',
    slug: 'pixelforge',
    startMonthsAgo: 4,
    endMonthsAhead: 8,
    team: ['noah.fischer'],
    milestones: [
      {
        title: 'Milestone 1: Core Loop',
        active: true,
        tasks: [
          { name: 'Refactor dungeon generation', status: TaskStatus.IN_PROGRESS },
          { name: 'Implement drop-in co-op netcode', status: TaskStatus.TODO },
          { name: 'Design starter enemy roster', status: TaskStatus.TODO },
        ],
      },
    ],
  },
  {
    owner: 'aisha.khan',
    title: 'Deployly - Student Project Hosting',
    description:
      'A simple platform that lets students deploy their class projects with one command and a free subdomain - no DevOps knowledge required. Think Heroku, but tuned for student budgets and demos. Backend and infra heavy.',
    numOfMembers: '2-4',
    projectType: 'remote',
    mentorRequest: 'none',
    preferredMentor: '',
    requiredSkills: ['Docker', 'AWS', 'Node.js', 'Go', 'PostgreSQL'],
    tags: ['Web App', 'Development', 'Startup Idea'],
    requiredRoles: 'Need a backend/infra developer comfortable with containers and a frontend dev for the dashboard.',
    slug: 'deployly',
    startMonthsAgo: 1,
    endMonthsAhead: 6,
    team: ['jacob.smith', 'priya.nair'],
    milestones: [
      {
        title: 'Milestone 1: Build Pipeline',
        active: true,
        tasks: [
          { name: 'Design container build pipeline', status: TaskStatus.IN_PROGRESS },
          { name: 'Implement subdomain routing', status: TaskStatus.TODO },
        ],
      },
    ],
  },
  {
    owner: 'sofia.ramirez',
    title: 'Local Lens - Small Business Marketing Kit',
    description:
      'An all-in-one toolkit that helps local businesses run their own marketing: templated social posts, a simple SEO checklist, and an email starter pack. The strategy and content are designed - we need developers to turn it into a real web app.',
    numOfMembers: '2-4',
    projectType: 'hybrid',
    mentorRequest: 'open',
    preferredMentor: 'Marketing or small-business mentor',
    requiredSkills: ['React', 'TypeScript', 'Node.js', 'SEO', 'Content Writing'],
    tags: ['Web App', 'Business', 'Content & Media', 'Development'],
    requiredRoles: 'Looking for a full-stack developer and a designer to build the template editor.',
    slug: 'locallens',
    startMonthsAgo: 2,
    endMonthsAhead: 4,
    team: ['ava.rossi', 'isabella.santos'],
    milestones: [
      {
        title: 'Milestone 1: Template Editor',
        active: true,
        tasks: [
          { name: 'Build social post template editor', status: TaskStatus.IN_PROGRESS },
          { name: 'Create SEO checklist module', status: TaskStatus.TODO },
        ],
      },
    ],
  },
  {
    owner: 'hannah.muller',
    title: 'CampusPulse - Event Discovery & Analytics',
    description:
      'A platform where student clubs post events and see real analytics on turnout and engagement. Built to replace the mess of group chats and posters. Data-heavy with a clean dashboard side.',
    numOfMembers: '5-10',
    projectType: 'hybrid',
    mentorRequest: 'looking',
    preferredMentor: 'Product analytics experience appreciated',
    requiredSkills: ['React', 'Node.js', 'Data Analysis', 'PostgreSQL', 'TypeScript'],
    tags: ['Web App', 'Community', 'Development', 'Science'],
    requiredRoles: 'Need a frontend dev for the dashboard, a backend dev, and a data analyst for the metrics layer.',
    slug: 'campuspulse',
    startMonthsAgo: 3,
    endMonthsAhead: 4,
    team: ['grace.thompson', 'daniel.okafor'],
    milestones: [
      {
        title: 'Milestone 1: Event Core',
        active: true,
        tasks: [
          { name: 'Build event creation and RSVP flow', status: TaskStatus.DONE },
          { name: 'Design analytics data model', status: TaskStatus.IN_PROGRESS },
          { name: 'Build turnout dashboard', status: TaskStatus.TODO },
        ],
      },
    ],
  },
  {
    owner: 'omar.hassan',
    title: 'DevQuest - Gamified Learning for Beginners',
    description:
      'An open-source platform that teaches web development through small, gamified quests. I’m building it partly as a teaching tool and partly to give students real open-source experience. Beginner-friendly contributors very welcome - that’s the whole point.',
    numOfMembers: '10+',
    projectType: 'remote',
    mentorRequest: 'none',
    preferredMentor: '',
    requiredSkills: ['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'UI Design'],
    tags: ['Web App', 'Education Technology', 'Social Good', 'Development', 'Community'],
    requiredRoles:
      'Open to contributors at all levels - frontend, backend, content writers for the quests, and designers.',
    slug: 'devquest',
    startMonthsAgo: 5,
    endMonthsAhead: 7,
    team: ['grace.thompson', 'jacob.smith', 'maya.chen'],
    milestones: [
      {
        title: 'Milestone 1: Quest Engine',
        active: false,
        tasks: [
          { name: 'Build quest progression system', status: TaskStatus.DONE },
          { name: 'Create code-challenge runner', status: TaskStatus.DONE },
        ],
      },
      {
        title: 'Milestone 2: Content & Community',
        active: true,
        tasks: [
          { name: 'Write beginner HTML/CSS quest track', status: TaskStatus.IN_PROGRESS },
          { name: 'Add contributor onboarding docs', status: TaskStatus.IN_PROGRESS },
          { name: 'Build leaderboard', status: TaskStatus.TODO },
        ],
      },
    ],
  },
  {
    owner: 'isabella.santos',
    title: 'Folio - Portfolio Builder for Creatives',
    description:
      'A portfolio builder made specifically for designers and other creatives - beautiful templates, easy image handling, and a custom domain. Design system is ready; we need developers to make it real.',
    numOfMembers: '2-4',
    projectType: 'remote',
    mentorRequest: 'open',
    preferredMentor: 'Design-minded engineer',
    requiredSkills: ['React', 'TypeScript', 'CSS', 'UI Design', 'Figma'],
    tags: ['Web App', 'Design', 'Development', 'Startup Idea'],
    requiredRoles: 'Looking for two frontend developers who care about pixel-perfect, performant UI.',
    slug: 'folio',
    startMonthsAgo: 1,
    endMonthsAhead: 4,
    team: ['grace.thompson'],
    milestones: [
      {
        title: 'Milestone 1: Template System',
        active: true,
        tasks: [
          { name: 'Build template rendering engine', status: TaskStatus.IN_PROGRESS },
          { name: 'Implement image upload and optimization', status: TaskStatus.TODO },
        ],
      },
    ],
  },
  {
    owner: DEMO,
    title: 'TeamUp - Student Collaboration Platform',
    description:
      'The platform you’re looking at right now. A place for students to find projects, build teams, and actually ship together. Built with React, NestJS, and PostgreSQL. I’m looking for a couple of teammates to help push new features - recommendations, real-time chat, and richer profiles.',
    numOfMembers: '2-4',
    projectType: 'hybrid',
    mentorRequest: 'looking',
    preferredMentor: 'Full-stack engineer who has scaled a product',
    requiredSkills: ['React', 'TypeScript', 'NestJS', 'PostgreSQL', 'UI Design'],
    tags: ['Web App', 'Development', 'Design', 'Personal Idea'],
    requiredRoles:
      'Looking for a frontend developer to help build out the messaging UI and a backend developer interested in the recommendation engine.',
    slug: 'teamup',
    startMonthsAgo: 4,
    endMonthsAhead: 6,
    team: ['priya.nair', 'maya.chen'],
    milestones: [
      {
        title: 'Milestone 1: Core Platform',
        active: false,
        tasks: [
          { name: 'Build auth and profile system', status: TaskStatus.DONE },
          { name: 'Implement project discovery feed', status: TaskStatus.DONE },
          { name: 'Add applications and memberships', status: TaskStatus.DONE },
        ],
      },
      {
        title: 'Milestone 2: Recommendations & Chat',
        active: true,
        tasks: [
          { name: 'Integrate AI recommendation engine', status: TaskStatus.IN_PROGRESS },
          { name: 'Design real-time messaging UI', status: TaskStatus.TODO },
          { name: 'Add notification system', status: TaskStatus.TODO },
        ],
      },
    ],
  },
  {
    owner: DEMO,
    title: 'SnackMap - Campus Food Finder',
    description:
      'A small but genuinely useful web app: find what’s open on campus right now, see menus, and check how busy each spot is. Started as a weekend project and people keep asking for it, so I want to take it further. Easy, fun project to jump into.',
    numOfMembers: '2-4',
    projectType: 'remote',
    mentorRequest: 'none',
    preferredMentor: '',
    requiredSkills: ['React', 'TypeScript', 'Node.js', 'CSS'],
    tags: ['Web App', 'Community', 'Development', 'Personal Idea'],
    requiredRoles: 'Looking for a frontend dev to help with the map view and a designer to give it some personality.',
    slug: 'snackmap',
    startMonthsAgo: 2,
    endMonthsAhead: 2,
    team: ['grace.thompson'],
    milestones: [
      {
        title: 'Milestone 1: Map & Hours',
        active: true,
        tasks: [
          { name: 'Build campus map with vendor pins', status: TaskStatus.IN_PROGRESS },
          { name: 'Add open/closed hours logic', status: TaskStatus.DONE },
          { name: 'Design vendor detail card', status: TaskStatus.TODO },
        ],
      },
    ],
  },
];

// Applications the demo user has SENT (shows up in "My Applications").
const DEMO_SENT_APPLICATIONS: { project: string; status: ApplicationStatus; role: string }[] = [
  { project: 'classconnect', status: ApplicationStatus.PENDING, role: 'Frontend Developer' },
  { project: 'pitchdeck', status: ApplicationStatus.PENDING, role: 'Full-Stack Developer' },
  { project: 'folio', status: ApplicationStatus.INVITED, role: ProjectRole.MEMBER },
];

// Applications OTHERS have sent to the demo user's projects (shows up as
// "received applications" on the demo user's owned projects).
const DEMO_RECEIVED_APPLICATIONS: { applicant: string; project: string; status: ApplicationStatus; role: string }[] = [
  { applicant: 'grace.thompson', project: 'teamup', status: ApplicationStatus.PENDING, role: 'Frontend Developer' },
  { applicant: 'jacob.smith', project: 'teamup', status: ApplicationStatus.PENDING, role: 'Backend Developer' },
  { applicant: 'liam.walsh', project: 'snackmap', status: ApplicationStatus.PENDING, role: 'Frontend Developer' },
];

// Projects the demo user has bookmarked.
const DEMO_BOOKMARKS = ['mindease', 'ecoroute', 'devquest', 'deployly', 'campuspulse'];

async function bootstrap() {
  let app: INestApplicationContext | null = null;
  try {
    app = await NestFactory.createApplicationContext(AppModule);
    await app.init();
    console.log('NestJS context initialized.');

    const configService = app.get(ConfigService);
    const demoUserEmail = configService.get<string>('DEMO_USER_EMAIL');
    if (!demoUserEmail) {
      throw new Error('DEMO_USER_EMAIL is not set. Add it to your .env file.');
    }

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

    // --- Clear all generated data (keep the demo user's identity row) -------
    console.log('Clearing generated data...');
    const deleteAll = (repo: Repository<any>) => repo.createQueryBuilder().delete().execute();
    await deleteAll(bookmarkRepository);
    await deleteAll(applicationRepository);
    await deleteAll(taskRepository);
    await deleteAll(milestoneRepository);
    await deleteAll(membershipRepository);
    await deleteAll(projectRepository);
    await deleteAll(workExperienceRepository);
    await deleteAll(portfolioProjectRepository);
    await skillRepository.query('DELETE FROM "user_profile_skills"');
    await interestRepository.query('DELETE FROM "user_profile_interests"');
    await deleteAll(skillRepository);
    await deleteAll(interestRepository);
    console.log('Cleared.');

    // --- Seed Skills & Interests, build name -> entity lookups -------------
    const allSkillNames = Array.from(
      new Set([
        ...PERSONAS.flatMap(p => p.skills),
        ...PROJECTS.flatMap(p => p.requiredSkills),
        ...DEMO_PROFILE.skills,
      ]),
    );
    const allInterestNames = Array.from(
      new Set([...PERSONAS.flatMap(p => p.interests), ...DEMO_PROFILE.interests]),
    );

    const skillByName = new Map<string, Skill>();
    for (const name of allSkillNames) {
      const skill = await skillRepository.save(skillRepository.create({ name }));
      skillByName.set(name, skill);
    }
    const interestByName = new Map<string, Interest>();
    for (const name of allInterestNames) {
      const interest = await interestRepository.save(interestRepository.create({ name }));
      interestByName.set(name, interest);
    }
    console.log(`Seeded ${skillByName.size} skills and ${interestByName.size} interests.`);

    const skillsFor = (names: string[]) => names.map(n => skillByName.get(n)).filter((s): s is Skill => !!s);
    const interestsFor = (names: string[]) =>
      names.map(n => interestByName.get(n)).filter((i): i is Interest => !!i);

    // username -> User (resolved as we create them); DEMO resolved below
    const userByName = new Map<string, User>();

    // --- The demo user: keep identity, enrich the profile -----------------
    const demoUser = await userRepository.findOne({
      where: { email: demoUserEmail },
      relations: ['profile'],
    });
    if (!demoUser) {
      throw new Error(
        `CRITICAL: Demo user "${demoUserEmail}" not found. Sign in once on the site to create the account, then re-run the seed.`,
      );
    }
    if (!demoUser.profile) {
      demoUser.profile = await profileRepository.save(profileRepository.create({ userId: demoUser.id }));
    }
    const dp = demoUser.profile;
    dp.userType = DEMO_PROFILE.userType;
    dp.program = DEMO_PROFILE.program;
    dp.status = DEMO_PROFILE.status;
    dp.institution = DEMO_PROFILE.institution;
    dp.bio = DEMO_PROFILE.bio;
    dp.signupExperience = DEMO_PROFILE.signupExperience;
    dp.avatarUrl = avatar(DEMO_PROFILE.avatar);
    dp.bannerUrl = banner('demo');
    dp.skills = skillsFor(DEMO_PROFILE.skills);
    dp.interests = interestsFor(DEMO_PROFILE.interests);
    await profileRepository.save(dp);
    await workExperienceRepository.save(
      DEMO_PROFILE.work.map(w => workExperienceRepository.create({ ...w, profileId: dp.id })),
    );
    await portfolioProjectRepository.save(
      DEMO_PROFILE.portfolio.map(pp =>
        portfolioProjectRepository.create({
          profileId: dp.id,
          title: pp.title,
          description: pp.description,
          tags: pp.tags,
          imageUrl: cover(pp.slug),
        }),
      ),
    );
    userByName.set(DEMO, demoUser);
    console.log(`Enriched demo user profile for ${demoUser.email}.`);

    // --- Synthetic community members (find-or-create, then enrich) --------
    console.log('Seeding community members...');
    for (const persona of PERSONAS) {
      const email = `${persona.username}@students.teamup.dev`;
      let user = await userRepository.findOne({ where: { email }, relations: ['profile'] });
      if (!user) {
        user = userRepository.create({
          cognitoSub: `seed-${persona.username}`,
          email,
          firstName: persona.firstName,
          lastName: persona.lastName,
          profile: profileRepository.create({}),
        });
        user = await userRepository.save(user);
        user = (await userRepository.findOne({ where: { id: user.id }, relations: ['profile'] }))!;
      }
      if (!user.profile) {
        user.profile = await profileRepository.save(profileRepository.create({ userId: user.id }));
      }

      const p = user.profile;
      p.userType = persona.userType;
      p.program = persona.program;
      p.status = persona.status;
      p.institution = 'SAIT';
      p.bio = persona.bio;
      p.signupExperience = persona.bio;
      p.avatarUrl = avatar(persona.avatar);
      p.bannerUrl = banner(persona.username);
      p.skills = skillsFor(persona.skills);
      p.interests = interestsFor(persona.interests);
      await profileRepository.save(p);

      await workExperienceRepository.save(
        persona.work.map(w => workExperienceRepository.create({ ...w, profileId: p.id })),
      );
      await portfolioProjectRepository.save(
        persona.portfolio.map(pp =>
          portfolioProjectRepository.create({
            profileId: p.id,
            title: pp.title,
            description: pp.description,
            tags: pp.tags,
            imageUrl: cover(pp.slug),
          }),
        ),
      );
      userByName.set(persona.username, user);
    }
    console.log(`Seeded ${PERSONAS.length} community members.`);

    const resolveUser = (name: string): User => {
      const u = userByName.get(name);
      if (!u) throw new Error(`Unknown user reference in seed data: ${name}`);
      return u;
    };

    // --- Projects, milestones, tasks, memberships -------------------------
    console.log('Seeding projects...');
    const projectBySlug = new Map<string, Project>();
    for (const sp of PROJECTS) {
      const owner = resolveUser(sp.owner);
      const startDate = monthsFromNow(-sp.startMonthsAgo);
      const endDate = sp.endMonthsAhead === null ? undefined : monthsFromNow(sp.endMonthsAhead);

      const project = await projectRepository.save(
        projectRepository.create({
          ownerId: owner.id,
          title: sp.title,
          description: sp.description,
          numOfMembers: sp.numOfMembers,
          projectType: sp.projectType,
          mentorRequest: sp.mentorRequest,
          preferredMentor: sp.preferredMentor,
          requiredSkills: sp.requiredSkills,
          tags: sp.tags,
          requiredRoles: sp.requiredRoles,
          imageUrl: cover(sp.slug),
          startDate,
          endDate,
        }),
      );
      projectBySlug.set(sp.slug, project);

      // Owner membership
      await membershipRepository.save(
        membershipRepository.create({ projectId: project.id, userId: owner.id, role: ProjectRole.OWNER }),
      );
      // Team memberships
      const teamUsers = sp.team.map(resolveUser);
      for (const member of teamUsers) {
        await membershipRepository.save(
          membershipRepository.create({ projectId: project.id, userId: member.id, role: ProjectRole.MEMBER }),
        );
      }

      // Milestones + tasks; round-robin assign in-progress/done tasks to the team
      const assignees = [owner, ...teamUsers];
      let assignIdx = 0;
      for (const m of sp.milestones) {
        const milestone = await milestoneRepository.save(
          milestoneRepository.create({
            projectId: project.id,
            title: m.title,
            date: monthsFromNow(Math.floor(Math.random() * 3) + 1),
            active: m.active,
          }),
        );
        for (const t of m.tasks) {
          const assignee =
            t.status === TaskStatus.TODO ? undefined : assignees[assignIdx++ % assignees.length];
          await taskRepository.save(
            taskRepository.create({
              milestoneId: milestone.id,
              name: t.name,
              description: '',
              status: t.status,
              assigneeId: assignee?.id,
            }),
          );
        }
      }
    }
    console.log(`Seeded ${PROJECTS.length} projects with milestones, tasks, and teams.`);

    // --- Applications -----------------------------------------------------
    console.log('Seeding applications...');
    let appCount = 0;
    const saveApplication = async (applicant: User, project: Project, status: ApplicationStatus, role: string) => {
      await applicationRepository.save(
        applicationRepository.create({
          applicantId: applicant.id,
          projectId: project.id,
          status,
          roleAppliedFor: role,
        }),
      );
      appCount++;
    };

    for (const a of DEMO_SENT_APPLICATIONS) {
      await saveApplication(demoUser, projectBySlug.get(a.project)!, a.status, a.role);
    }
    for (const a of DEMO_RECEIVED_APPLICATIONS) {
      await saveApplication(resolveUser(a.applicant), projectBySlug.get(a.project)!, a.status, a.role);
    }
    // A few pending applications between community members so non-demo projects
    // also show inbound interest.
    const extraApps: { applicant: string; slug: string; role: string }[] = [
      { applicant: 'jacob.smith', slug: 'ecoroute', role: 'Backend Developer' },
      { applicant: 'grace.thompson', slug: 'mindease', role: 'Frontend Developer' },
      { applicant: 'noah.fischer', slug: 'locallens', role: 'Video Editor' },
      { applicant: 'isabella.santos', slug: 'classconnect', role: 'UX Designer' },
      { applicant: 'liam.walsh', slug: 'pixelforge', role: 'Gameplay Programmer' },
    ];
    for (const e of extraApps) {
      const applicant = resolveUser(e.applicant);
      const project = projectBySlug.get(e.slug)!;
      if (project.ownerId === applicant.id) continue;
      await saveApplication(applicant, project, ApplicationStatus.PENDING, e.role);
    }
    console.log(`Seeded ${appCount} applications.`);

    // --- Bookmarks --------------------------------------------------------
    console.log('Seeding bookmarks...');
    let bookmarkCount = 0;
    for (const slug of DEMO_BOOKMARKS) {
      const project = projectBySlug.get(slug);
      if (!project) continue;
      await bookmarkRepository.save(bookmarkRepository.create({ userId: demoUser.id, projectId: project.id }));
      bookmarkCount++;
    }
    console.log(`Seeded ${bookmarkCount} bookmarks.`);

    console.log('Database seeding completed successfully!');
  } catch (error) {
    console.error('Database seeding failed:', error);
    process.exit(1);
  } finally {
    if (app) {
      await app.close();
      console.log('NestJS context closed.');
    }
  }
}

bootstrap();
