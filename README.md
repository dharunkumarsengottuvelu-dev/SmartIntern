# Smart Internship System

An intelligent, AI-driven internship management platform designed to connect students with the right opportunities through automated skill assessments, dynamic resume parsing, and personalized recommendations.

---

## Project Overview

**Purpose**: To bridge the gap between student skills and internship requirements by leveraging artificial intelligence to automate resume screening, skill assessments, and matching.

**Problem Statement**: Manual internship matching is time-consuming, prone to bias, and often fails to accurately map a student's actual competencies to the right opportunity.

**Objective**: To streamline internship management and provide fair, data-driven recommendations.

**Target Users**: 
- Students seeking internships.
- Administrators managing internship programs.

**Benefits**:
- Unbiased, automated skill extraction from resumes.
- Transparent, dynamically generated assessments.
- Real-time AI support via chat.

---

## Features

### Implemented Features
- **Serverless AI Resume Parsing**: Robust PDF and Word document extraction built for Vercel Edge/Serverless environments.
- **Anti-Cheat Assessment System**: Server-side enforced looping and strict answer validation to prevent test manipulation.
- **Persistent Offline-Safe Exam Timers**: MCQ assessments save local state and gracefully recover from page refreshes.
- **Dynamic AI Question Generation**: Automated multi-difficulty MCQ generation with intelligent fallback logic.
- **Smart Recommendations**: AI-driven internship matching algorithm weighted by resume skills and assessment scores.
- **Integrated Chat**: Real-time AI support via chat.

### Admin Features
- Dedicated administrator dashboard.
- Internship management and posting capabilities.

### User Features
- Student dashboard for tracking progress.
- Resume upload and skill extraction viewer.
- Assessment interface for taking MCQs.

### Security Features
- Secure session-based authentication using NextAuth.
- Password hashing using `bcryptjs`.
- Route protection for role-based views.

### Future Scope
- This feature appears to be under development: Expansion of recommendation algorithms and advanced employer dashboards.

---

## Tech Stack

| Layer | Technology |
|--------|------------|
| Frontend | Next.js 16 (App Router), React 19, Tailwind CSS, Framer Motion |
| Backend | Next.js API Routes (Serverless) |
| Database | Supabase (PostgreSQL) |
| Authentication | NextAuth.js (Auth.js beta), bcryptjs |
| Build Tool | Next.js / Webpack |
| Deployment | Vercel |
| Version Control | Git |
| IDE | VS Code / JetBrains |

---

## Project Architecture

**Frontend**: Server and Client Components built with React 19 and Next.js App Router, styled with Tailwind CSS.

**Backend**: Next.js Serverless API routes handling business logic, AI integration, and database operations.

**Database**: Centralized data storage utilizing Supabase (PostgreSQL) for structured data and file storage. 

**Request Flow**: Client interacts with the UI -> Next.js API Routes receive the request -> Server authenticates via NextAuth -> Server interacts with Supabase/OpenAI -> Server responds.

**Response Flow**: API processes logic -> Returns JSON/Data to Frontend -> React Client Components update state and render UI changes.

**Overall Architecture**: A monolithic serverless architecture hosted via Next.js leveraging external AI and Database-as-a-Service platforms.

---

## Folder Structure

```text
smart-internship-system/
├── app/
│   ├── admin/              # Admin dashboard views
│   ├── api/                # Next.js API Routes (auth, chat, assessment, etc.)
│   ├── assessment/         # MCQ Assessment interface
│   ├── login/              # Login page
│   ├── register/           # Registration page
│   ├── student/            # Student dashboard and profile
│   ├── globals.css         # Global styles
│   ├── layout.tsx          # Root layout
│   └── page.tsx            # Landing page
├── components/             # Reusable React components (e.g., ChatWidget)
├── lib/                    # Core business logic, DB methods, and AI clients
│   ├── db/                 # Database interaction functions
│   ├── ats.ts              # Resume parsing logic
│   ├── auth.ts             # Authentication setup
│   └── grok.ts / openai.ts # AI integration clients
├── public/                 # Static assets (images, icons)
├── scripts/                # Utility and database seeding scripts
├── utils/                  # Helper utilities (e.g., Supabase SSR clients)
├── middleware.ts           # Next.js middleware for route protection
├── next.config.ts          # Next.js build configuration
├── tailwind.config.ts      # Tailwind CSS configuration
└── package.json            # Project dependencies and scripts
```

---

## Installation

```bash
# Clone the repository
git clone <repository_url>
cd smart-internship-system

# Install dependencies
npm install

# Setup environment variables (see below)

# Run project
npm run dev
```

---

## Configuration

- `.env.local`: Required for storing database connection strings, NextAuth secrets, and AI API keys.
- `tailwind.config.ts`: Configuration for Tailwind CSS utility classes.
- `next.config.js` (if exists): Next.js specific build and routing configurations.
- `tsconfig.json`: TypeScript compiler options.

---

## Environment Variables

| Variable | Purpose | Required | Default Value |
|----------|---------|----------|---------------|
| `NEXTAUTH_URL` | Base URL for NextAuth | Yes | `http://localhost:3000` |
| `NEXTAUTH_SECRET` | Secret for encrypting JWTs | Yes | None |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase instance URL | Yes | None |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous access key | Yes | None |
| `OPENAI_API_KEY` | Key for AI parsing and chat | Yes | None |

---

## Database

Tables observed via API structure:
- Users (Students, Admins)
- Internships
- Assessments / MCQs
- Recommendations / Resumes

Relationships: Students have Resumes and Assessment Scores. Internships are recommended based on Student profiles.

Purpose: To persistently store user state, internship postings, and AI-generated evaluations using Supabase (PostgreSQL).

---

## API Documentation

| Method | Endpoint | Purpose | Authentication |
|--------|----------|---------|----------------|
| `POST` | `/api/auth/[...nextauth]` | Login, Logout, Session management | No |
| `POST` | `/api/resume/upload` | Upload and parse resumes via AI | Yes |
| `GET` | `/api/student` | Fetch student data and progress | Yes |
| `GET` | `/api/mcq` | Retrieve available assessments | Yes |
| `POST` | `/api/mcq/submit` | Submit answers for evaluation | Yes |
| `GET` | `/api/internships` | List internships | Yes |
| `GET` | `/api/recommendation` | Trigger AI internship recommendation | Yes |
| `POST` | `/api/chat` | AI chat interactions | Yes |

*(Note: Additional endpoints exist under `/api/admin`)*

---

## Authentication

Authentication is securely managed using **NextAuth.js** (Auth.js beta) coupled with `bcryptjs` for password hashing. Sessions are managed internally via NextAuth strategy.

---

## User Roles

- **Student**: Can upload resumes, take assessments, view recommendations, and use AI chat.
- **Admin**: Can manage the platform and view administrative dashboards.

---

## Application Workflow

1. User registers or logs into the platform.
2. Based on role, user is redirected to `/student` or `/admin` dashboard.
3. Student uploads their resume (PDF/Word).
4. System parses the resume using OpenAI to extract skills.
5. Student completes an MCQ skill assessment.
6. The AI recommendation engine evaluates the parsed resume and assessment score.
7. Student receives personalized internship matches.
8. Student can interact with the AI Chat widget for support.

---

## Validation

**Frontend validation**: Implemented within React forms.
**Backend validation**: Input validation within Next.js API routes before database mutations.
**Database validation**: Enforced by Supabase PostgreSQL Row Level Security (RLS) and constraints.

---

## Security

- **Password hashing**: Implemented via `bcryptjs`.
- **JWT**: Managed internally by NextAuth.js.
- **Input validation**: Handled in API routes.
- **CSRF**: Automatically mitigated by NextAuth.js.
- **XSS prevention**: Automatically handled by React DOM escaping.
- Rate limiting: Not implemented.

---

## Error Handling

Standard HTTP status codes are returned from Next.js API routes. Frontend errors are caught and rendered using standard conditional UI rendering.

---

## Logging

Not implemented beyond standard Next.js development console logging.

---

## Performance

- Serverless API execution minimizes idle compute time.
- Next.js architecture optimizes client bundle sizes.

---

## Testing

Not available in the current project.

---

## Deployment

The project is structured for seamless deployment on **Vercel**, leveraging Next.js optimizations.

---

## Screenshots

*(Placeholder for application screenshots)*
- `[Screenshot: Student Dashboard Placeholder]`
- `[Screenshot: AI Resume Parser Placeholder]`
- `[Screenshot: MCQ Assessment Placeholder]`

---

## Known Limitations

- Real-time employer portals: This feature appears to be under development.
- Logging and automated testing: Not available in the current project.

---

## Future Improvements

- **Recommendations**: Implement comprehensive E2E testing (e.g., Cypress/Playwright).
- **Recommendations**: Add rate limiting to AI endpoints to prevent API abuse.
- **Recommendations**: Introduce an employer role for direct internship posting.

---

## Contributing

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## License

No license file found.

---

## Author

**Name**: Dharunkumar S  
**GitHub**: [dharunkumarsengottuvelu-dev](https://github.com/dharunkumarsengottuvelu-dev)  
**Email**: dharunkumarsengottuvelu@gmail.com

---

## Acknowledgements

- [Next.js](https://nextjs.org/)
- [React](https://reactjs.org/)
- [NextAuth.js](https://next-auth.js.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [OpenAI API](https://openai.com/)
- [Supabase](https://supabase.com/)

---

## FAQ

**Q: Can I use this without OpenAI?**
A: No, OpenAI is heavily integrated for resume parsing, chat, and recommendations.

**Q: Are there automated tests?**
A: Testing is not available in the current project.

---

## Conclusion

The Smart Internship System is a modern, AI-enhanced platform that streamlines the internship placement process. By combining robust authentication, seamless resume parsing, and intelligent recommendations, it provides a highly efficient ecosystem for students and administrators alike.
