// lib/extraction/prompt.ts
import type { ExtractedResume } from '../validation';

export const SYSTEM_PROMPT = `你是一个严格的简历信息抽取器。从下面简历原文中抽取结构化字段，严格按 JSON 返回。

## 必选字段（五类核心信息，尽力提取）

| 类别       | 必须提取的字段                                 |
|------------|------------------------------------------------|
| 基本信息   | 姓名、电话、邮箱、所在城市                     |
| 教育背景   | 学校、专业、学历、毕业时间（至少一条）         |
| 工作经历   | 公司名称、职位、时间段、工作内容摘要（至少一条）|
| 项目经历   | 项目名称、技术栈、个人职责、项目亮点           |
| 技能标签   | 技术栈、工具、编程语言（关键词列表）           |

## 学历规范（educations[].degree）

degree 字段必须填写以下六个值之一，不得使用其他写法：
**初中 / 高中 / 大专 / 本科 / 硕士 / 博士**

- 原文明确写出学历类型时直接映射（"学士"→本科，"研究生"→硕士，"专科"→大专，等）
- 原文未写但学校名称可判断时据此推断：
  - 校名含"大学""学院"（非职业类）→ 本科
  - 校名含"职业技术学院""职业学院""高职""专科"→ 大专
  - 校名含"高中""高级中学"→ 高中
  - 校名含"初中""初级中学"→ 初中
- 确实无法判断时填 null

## 通用规则

- 所有无法从原文确认的字段填 null，严禁编造
- 日期保留原样（"2019.06" / "2019/06" / "至今" / "2021.07 - 至今"）
- endDate: null 仅表示原文未提供结束时间；"至今" 才代表当前在职，两者语义不同，不得混用
- educations / works 按结束时间倒序排，"至今" 视为最新；endDate 为 null 的条目排末位
- summary 字段必须填写（不得为 null），若信息不足则写一句客观描述候选人方向的短语；不吹嘘，不使用感叹号，不用 emoji

## 工作经历（works）

- company：必填，直接取公司名称原文
- role：职位名称；原文未提供则 null
- description：对该段工作职责的一句话摘要；原文信息不足则 null
- highlights：工作内容要点，每条一个字符串，保留原写法；原文无 bullet 则留空数组 []
- 工作经历段里的内容不得同时写入 projects

## 项目经历（projects）

- 仅当原简历有独立"项目经历"段时才填充；工作经历段中嵌套的项目不重复抽入
- name：项目名称，原文有则填，无独立项目段则 projects 留空数组 []
- role：个人职责角色（如"负责人"/"独立开发"/"前端主导"）；无则 null
- techStack：从"技术栈"行拆分成有序数组；分隔符为 / + ，（中文逗号）、（顿号），空格仅在前后均无字母数字相连时才视为分隔符，避免拆断"React 18"等带版本号的技术名；版本号保持整体
- description：取"产品与业务"段压成一句，不合并技术细节；无则 null
- highlights：合并"核心技术"与"工程化"两列的 bullet，每条一个字符串，保留原写法；无则 []
- url：从"地址/仓库"行提取完整 http(s) 链接；无则 null

## 技能（skills）

- 从原文直接抽取，不总结、不分类，保留原写法（如 React / TypeScript）
- 编程语言、框架、库、工具、平台均可纳入

## 其他字段

- targetRole：从"求职意向"行提取原字符串；无则 null
- basic.age：从原文提取数字（"28 岁" → 28）；无则 null

返回的 JSON 严格符合以下 schema（字段名、类型、嵌套层级不得改变）：

{
  "basic":      { "name": string|null, "email": string|null, "phone": string|null, "city": string|null, "age": number|null },
  "targetRole": string|null,
  "educations": [{ "school": string, "major": string|null, "degree": "初中"|"高中"|"大专"|"本科"|"硕士"|"博士"|null, "startDate": string|null, "endDate": string|null }],
  "works":      [{ "company": string, "role": string|null, "startDate": string|null, "endDate": string|null, "description": string|null, "highlights": string[] }],
  "projects":   [{ "name": string, "url": string|null, "role": string|null, "techStack": string[], "startDate": string|null, "endDate": string|null, "description": string|null, "highlights": string[] }],
  "skills":     string[],
  "summary":    string
}

只返回 JSON 对象，不要任何说明文字、markdown 代码块围栏。`;

export const STUB_RESULT: ExtractedResume = {
  basic: { name: '张远哲', email: 'zhang.yz@mail.cn', phone: '138-0000-0012', city: '杭州', age: 29 },
  targetRole: '前端开发工程师 / TypeScript 全栈开发',
  educations: [
    { school: '浙江大学', major: '计算机科学与技术', degree: '本科', startDate: '2015.09', endDate: '2019.07' },
  ],
  works: [
    {
      company: '阿里巴巴', role: '高级前端工程师', startDate: '2021.07', endDate: '至今',
      description: '主导 B 端中台前端架构升级，推动 Monorepo 改造与性能优化体系建设。',
      highlights: ['主导 B 端中台前端架构升级，引入 Monorepo 降低跨团队依赖', '建立前端性能监控体系，核心页面 LCP 降低 40%'],
    },
    {
      company: '字节跳动', role: '前端工程师', startDate: '2019.08', endDate: '2021.06',
      description: null,
      highlights: [],
    },
  ],
  projects: [
    {
      name: '中台前端脚手架',
      url: 'https://github.com/example/scaffold',
      role: '负责人',
      techStack: ['React', 'TypeScript', 'Vite', 'Monorepo'],
      startDate: '2022.03',
      endDate: '至今',
      description: '团队内统一的中台应用脚手架，覆盖 20+ 业务中台前端。',
      highlights: [
        '基于 Vite + pnpm workspace 的 monorepo 架构，首启动 <2s',
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
      description: '首屏性能与交互指标的实时可视化与告警平台。',
      highlights: [
        'Web Vitals + Resource Timing 双端上报，采样率动态调节',
        '按页面 / 地域 / 设备多维切片，P75 延迟可追溯到单次会话',
      ],
    },
  ],
  skills: ['React', 'TypeScript', 'Next.js', 'Node.js', 'GraphQL'],
  summary: '在前端性能优化与大型 SPA 架构方面有深入积累，具备中台体系从 0 到 1 的工程化交付经验。',
};

export const STUB_STREAM_CHUNKS: string[] = (() => {
  const json = JSON.stringify(STUB_RESULT);
  const size = 60;
  const out: string[] = [];
  for (let i = 0; i < json.length; i += size) out.push(json.slice(i, i + size));
  return out;
})();
