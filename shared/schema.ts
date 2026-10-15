import { z } from 'zod'

export const statuses = ['Applied', 'Interviewing', 'Offer', 'Accepted', 'Rejected', 'Withdrawn'] as const
export const stages = ['Not started', 'Recruiter screen', 'Technical interview', 'Research presentation', 'Hiring manager', 'Final round', 'Other'] as const
export const outcomes = ['Scheduled', 'Completed', 'Passed', 'Not selected', 'Cancelled'] as const
export const salaryPeriods = ['year', 'month', 'hour'] as const
export const currencies = ['USD', 'GBP', 'EUR'] as const

const date = z.iso.date()
const optionalDate = z.union([date, z.literal('')]).default('')
const text = (limit = 500) => z.string().trim().max(limit).default('')

export const applicationSchema = z.object({
  company: z.string().trim().min(1, 'Company is required').max(200),
  role: z.string().trim().min(1, 'Role is required').max(200),
  appliedOn: date,
  status: z.enum(statuses).default('Applied'),
  stage: z.enum(stages).default('Not started'),
  salary: z.number().finite().nonnegative().max(1_000_000_000).nullable().default(null),
  currency: z.enum(currencies).default('USD'),
  salaryPeriod: z.enum(salaryPeriods).default('year'),
  location: text(200),
  jobUrl: z.union([z.url({ protocol: /^https?$/ }).max(2000), z.literal('')]).default(''),
  contactName: text(200),
  contactEmail: z.union([z.email().max(320), z.literal('')]).default(''),
  followUpOn: optionalDate,
  notes: text(20000),
  jobListingText: text(50000),
  jobListingScreenshot: z.union([z.string().regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/, 'Upload a PNG, JPEG, or WebP screenshot').max(7_000_000), z.literal('')]).default(''),
}).strict().refine(value => value.jobListingText.length > 0 || value.jobListingScreenshot.length > 0, {
  message: 'Save the job listing by pasting its text or uploading a screenshot',
  path: ['jobListingText'],
})

export const interviewSchema = z.object({
  stage: z.enum(stages).refine(value => value !== 'Not started', 'Choose an interview stage'),
  date,
  time: z.union([z.iso.time({ precision: -1 }), z.literal('')]).default(''),
  interviewer: text(200),
  outcome: z.enum(outcomes).default('Scheduled'),
  questions: text(20000),
  notes: text(20000),
}).strict()

export type ApplicationInput = z.infer<typeof applicationSchema>
export type Application = ApplicationInput & { id: number; createdAt: string; updatedAt: string }
export type InterviewInput = z.infer<typeof interviewSchema>
export type Interview = InterviewInput & { id: number; applicationId: number; createdAt: string }
export type ApplicationDetail = Application & { interviews: Interview[] }