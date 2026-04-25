// lib/extraction/prompt.ts
import type { ExtractedResume } from '../validation';

export const SYSTEM_PROMPT = `你是一个严格的简历信息抽取器。从下面简历原文中抽取结构化字段,严格按 JSON 返回。

规则:
- 所有不确定的字段填 null,严禁编造
- 日期保留原样("2019.06" / "2019/06" / "至今" / "2021.07 - 至今")
- 严格按原简历区段拆分 works 与 projects:
  · 若原简历有独立的"项目经历"段,其中每个有明确名字的项目抽入 projects
  · 原简历"工作经历"段里的条目抽入 works;若该段未写 bullet,works[].highlights 留空数组
  · 同一段内容不要同时写入 works 和 projects
- projects[].techStack 从"技术栈"一行拆成数组,按原书写顺序保留;分隔符可以是 / 、 + 、 ，(中文逗号) 或 、(顿号)(例:"Vue3 / Nuxt.js + Element UI" → ["Vue3","Nuxt.js","Element UI"]);版本号如 "React 18" 保持整体
- projects[].description 取"产品与业务"一段压成一句,不要合并核心技术
- projects[].highlights 合并"核心技术"和"工程化"两列的 bullet,每条一个字符串,保留原写法
- projects[].url 从"地址/仓库"行提取 http(s) 链接;无则 null
- targetRole 从"求职意向"一行提取原字符串;无则 null
- basic.age 从简历中提取数字("28 岁" → 28);无则 null
- educations / works 按结束时间倒序排,"至今" 视作最新;endDate 为 null 的条目排在末位
- 技能从文本直接抽取,不总结、不分类、保留原写法(React / TypeScript 等)
- summary 用一到两句客观描述候选人画像,不吹嘘,不使用感叹号,不用 emoji

返回的 JSON 严格符合以下 schema:
{
  "basic":      { "name": string|null, "email": string|null, "phone": string|null, "city": string|null, "age": number|null },
  "targetRole": string|null,
  "educations": [{ "school": string, "major": string|null, "degree": string|null, "startDate": string|null, "endDate": string|null }],
  "works":      [{ "company": string, "role": string|null, "startDate": string|null, "endDate": string|null, "highlights": string[] }],
  "projects":   [{ "name": string, "url": string|null, "role": string|null, "techStack": string[], "startDate": string|null, "endDate": string|null, "description": string|null, "highlights": string[] }],
  "skills":     string[],
  "summary":    string
}

只返回 JSON 对象,不要任何说明文字、markdown 代码块围栏。`;

export const STUB_RESULT: ExtractedResume = {
  basic: { name: '张远哲', email: 'zhang.yz@mail.cn', phone: '138-0000-0012', city: '杭州', age: 29 },
  targetRole: '前端开发工程师 / TypeScript 全栈开发',
  educations: [
    { school: '浙江大学', major: '计算机科学与技术', degree: '本科', startDate: '2015.09', endDate: '2019.07' },
  ],
  works: [
    { company: '阿里巴巴', role: '高级前端工程师', startDate: '2021.07', endDate: '至今', highlights: ['主导 B 端中台前端架构升级'] },
    { company: '字节跳动', role: '前端工程师', startDate: '2019.08', endDate: '2021.06', highlights: [] },
  ],
  projects: [
    {
      name: '中台前端脚手架',
      url: 'https://github.com/example/scaffold',
      role: '负责人',
      techStack: ['React', 'TypeScript', 'Vite', 'Monorepo'],
      startDate: '2022.03',
      endDate: '至今',
      description: '团队内统一的中台应用脚手架,覆盖 20+ 业务中台前端',
      highlights: [
        '基于 Vite + pnpm workspace 的 monorepo 架构,首启动 <2s',
        '统一权限中间件、埋点 SDK、错误上报、主题切换',
        'CI 集成类型检查 / 单测 / 构建产物体积门禁',
      ],
    },
    {
      name: '性能可观测平台',
      url: null,
      role: '独立交付',
      techStack: ['Next.js', 'ClickHouse', 'Web Vitals'],
      startDate: '2023.02',
      endDate: '2023.11',
      description: '首屏性能与交互指标的实时可视化与告警',
      highlights: [
        'Web Vitals + Resource Timing 双端上报,采样率动态调节',
        '按页面 / 地域 / 设备多维切片,P75 延迟可追溯到单次会话',
      ],
    },
  ],
  skills: ['React', 'TypeScript', 'Next.js', 'Node.js', 'GraphQL'],
  summary: '在前端性能优化与大型 SPA 架构方面有深入积累。',
};

export const STUB_STREAM_CHUNKS: string[] = (() => {
  const json = JSON.stringify(STUB_RESULT);
  const size = 60;
  const out: string[] = [];
  for (let i = 0; i < json.length; i += size) out.push(json.slice(i, i + size));
  return out;
})();
