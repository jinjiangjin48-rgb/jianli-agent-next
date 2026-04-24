// lib/validation.ts
import { z } from 'zod';

export const ExtractedResume = z.object({
  basic: z.object({
    name:  z.string().nullable(),
    email: z.string().nullable(),
    phone: z.string().nullable(),
    city:  z.string().nullable(),
  }),
  educations: z.array(z.object({
    school:    z.string(),
    major:     z.string().nullable(),
    degree:    z.string().nullable(),
    startYear: z.number().int().nullable(),
    endYear:   z.number().int().nullable(),
  })),
  works: z.array(z.object({
    company:    z.string(),
    role:       z.string().nullable(),
    startDate:  z.string().nullable(),
    endDate:    z.string().nullable(),
    highlights: z.array(z.string()).default([]),
  })),
  skills:  z.array(z.string()).default([]),
  summary: z.string(),
});
export type ExtractedResume = z.infer<typeof ExtractedResume>;

// ---- API 请求体 schema ----
export const PatchCandidate = z.object({
  name:     z.string().nullable().optional(),
  email:    z.string().nullable().optional(),
  phone:    z.string().nullable().optional(),
  city:     z.string().nullable().optional(),
  role:     z.string().nullable().optional(),
  company:  z.string().nullable().optional(),
  years:    z.number().int().nullable().optional(),
  school:   z.string().nullable().optional(),
  major:    z.string().nullable().optional(),
  degree:   z.string().nullable().optional(),
  gradYear: z.number().int().nullable().optional(),
  skills:   z.array(z.string()).optional(),
  summary:  z.string().optional(),
  status:   z.enum(['待筛选', '初筛通过', '面试中', '已录用', '已淘汰']).optional(),
});
export type PatchCandidateBody = z.infer<typeof PatchCandidate>;
