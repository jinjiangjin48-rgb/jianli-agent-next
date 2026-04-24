// lib/extraction/derive.ts
import type { ExtractedResume } from '../validation';

type WorkItem = ExtractedResume['works'][number];
type EduItem  = ExtractedResume['educations'][number];

export interface FlatFields {
  name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  role: string | null;
  company: string | null;
  years: number | null;
  school: string | null;
  major: string | null;
  degree: string | null;
  gradYear: number | null;
  skills: string[];
  summary: string;
}

function parseDate(s: string | null): Date | null {
  if (!s) return null;
  const m = s.match(/^(\d{4})\.(\d{1,2})/);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  if (isNaN(y) || isNaN(mo)) return null;
  return new Date(y, mo - 1, 1);
}

function parseEndDate(s: string | null, now: Date): Date | null {
  if (s === '至今') return now;
  return parseDate(s);
}

function pickLatestEducation(list: EduItem[]): EduItem | null {
  if (list.length === 0) return null;
  return [...list].sort((a, b) => (b.endYear ?? -1) - (a.endYear ?? -1))[0];
}

function pickLatestWork(list: WorkItem[], now = new Date()): WorkItem | null {
  if (list.length === 0) return null;
  return [...list].sort((a, b) => {
    const ae = parseEndDate(a.endDate, now)?.getTime() ?? -Infinity;
    const be = parseEndDate(b.endDate, now)?.getTime() ?? -Infinity;
    return be - ae;
  })[0];
}

export function computeYears(works: WorkItem[], now = new Date()): number | null {
  if (works.length === 0) return null;
  let totalMs = 0;
  let any = false;
  for (const w of works) {
    const s = parseDate(w.startDate);
    const e = parseEndDate(w.endDate, now);
    if (s && e) {
      totalMs += e.getTime() - s.getTime();
      any = true;
    }
  }
  if (!any) return null;
  const years = totalMs / (365.25 * 24 * 3600 * 1000);
  return Math.round(years);
}

export function deriveFlat(data: ExtractedResume, now = new Date()): FlatFields {
  const edu = pickLatestEducation(data.educations);
  const work = pickLatestWork(data.works, now);
  return {
    name:  data.basic.name,
    email: data.basic.email,
    phone: data.basic.phone,
    city:  data.basic.city,
    role:    work?.role ?? null,
    company: work?.company ?? null,
    years:   computeYears(data.works, now),
    school:   edu?.school ?? null,
    major:    edu?.major ?? null,
    degree:   edu?.degree ?? null,
    gradYear: edu?.endYear ?? null,
    skills:  data.skills,
    summary: data.summary,
  };
}
