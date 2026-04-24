// lib/db/schema.ts
import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import type { ExtractedResume } from '../validation';

export const CANDIDATE_STATUS = [
  '待筛选', '初筛通过', '面试中', '已录用', '已淘汰',
] as const;
export type CandidateStatus = typeof CANDIDATE_STATUS[number];

export const EXTRACTION_STATUS = [
  'uploaded', 'extracting', 'parsed', 'error',
] as const;
export type ExtractionStatus = typeof EXTRACTION_STATUS[number];

export const candidates = sqliteTable('candidates', {
  id: text('id').primaryKey(),

  name:      text('name'),
  email:     text('email'),
  phone:     text('phone'),
  city:       text('city'),
  age:        integer('age'),
  targetRole: text('target_role'),
  role:       text('role'),
  company:    text('company'),
  years:      integer('years'),
  school:     text('school'),
  major:      text('major'),
  degree:     text('degree'),
  gradDate:   text('grad_date'),
  skills:     text('skills', { mode: 'json' }).$type<string[]>(),
  summary:   text('summary'),

  extractedJson: text('extracted_json', { mode: 'json' }).$type<ExtractedResume>(),

  status: text('status').$type<CandidateStatus>()
    .notNull().default('待筛选'),
  extractionStatus: text('extraction_status').$type<ExtractionStatus>()
    .notNull().default('uploaded'),
  extractionError:    text('extraction_error'),
  extractionAttempts: integer('extraction_attempts').notNull().default(0),

  pdfPath:  text('pdf_path').notNull(),
  pdfSize:  integer('pdf_size').notNull(),
  pdfPages: integer('pdf_pages'),

  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
}, (t) => ({
  extractionStatusIdx: index('idx_candidates_extraction_status').on(t.extractionStatus),
  statusIdx:           index('idx_candidates_status').on(t.status),
  createdAtIdx:        index('idx_candidates_created_at').on(t.createdAt),
}));

export type Candidate = typeof candidates.$inferSelect;
export type NewCandidate = typeof candidates.$inferInsert;
