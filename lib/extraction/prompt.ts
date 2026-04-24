// lib/extraction/prompt.ts
import type { ExtractedResume } from '../validation';

export const SYSTEM_PROMPT = `你是一个严格的简历信息抽取器。从下面简历原文中抽取结构化字段,严格按 JSON 返回。

规则:
- 所有不确定的字段填 null,严禁编造
- 日期保留原样("2019.06" / "至今" / "2021.07 - 至今")
- 教育按毕业时间倒序排,最新排第 0 位
- 工作按结束时间倒序排,"至今" 视作最新
- 技能从文本直接抽取,不总结、不分类、保留原写法(React / TypeScript 等)
- summary 用一到两句客观描述候选人画像,不吹嘘,不使用感叹号,不用 emoji

返回的 JSON 严格符合以下 schema:
{
  "basic":      { "name": string|null, "email": string|null, "phone": string|null, "city": string|null },
  "educations": [{ "school": string, "major": string|null, "degree": string|null, "startYear": number|null, "endYear": number|null }],
  "works":      [{ "company": string, "role": string|null, "startDate": string|null, "endDate": string|null, "highlights": string[] }],
  "skills":     string[],
  "summary":    string
}

只返回 JSON 对象,不要任何说明文字、markdown 代码块围栏。`;

export const STUB_RESULT: ExtractedResume = {
  basic: { name: '张远哲', email: 'zhang.yz@mail.cn', phone: '138-0000-0012', city: '杭州' },
  educations: [
    { school: '浙江大学', major: '计算机科学与技术', degree: '本科', startYear: 2015, endYear: 2019 },
  ],
  works: [
    { company: '阿里巴巴', role: '高级前端工程师', startDate: '2021.07', endDate: '至今', highlights: ['主导 B 端中台前端架构升级'] },
  ],
  skills: ['React', 'TypeScript', 'Next.js', 'Node.js', 'GraphQL'],
  summary: '在前端性能优化与大型 SPA 架构方面有深入积累。',
};
