import type {
  Difficulty,
  InterviewConfig,
  InterviewQuestion,
  InterviewType,
  QuestionCategory,
} from './types';
import { hashString, seededRandom } from './id';
import { buildCriteria } from './rubrics';

/**
 * Deterministic starter question bank.
 *
 * Used in two places:
 *  1. Fallback when the AI provider is unavailable or not configured.
 *  2. The practice library (clearly labelled as curated bank questions).
 *
 * These are curated, documented questions - not AI output.
 */

export interface BankEntry {
  text: string;
  category: QuestionCategory;
  difficulty: Difficulty;
  skill: string;
  criteria: string[];
  structure: string[];
  types: InterviewType[];
}

export type BucketKey =
  | 'software'
  | 'data'
  | 'product'
  | 'design'
  | 'marketing'
  | 'support'
  | 'generic';

const SOFTWARE: BankEntry[] = [
  {
    text: 'Walk me through how you would design a rate limiter for a public API.',
    category: 'system-design',
    difficulty: 'medium',
    skill: 'System design',
    criteria: ['States throughput and fairness goals', 'Chooses a concrete algorithm', 'Covers distribution and failure modes'],
    structure: ['Clarify goals, limits and constraints', 'Pick an algorithm (token bucket / sliding window)', 'Explain storage and how it works across instances', 'Discuss failure modes, monitoring and trade-offs'],
    types: ['technical', 'mixed', 'role'],
  },
  {
    text: 'Explain the difference between a database index and a full table scan, and when each is appropriate.',
    category: 'technical',
    difficulty: 'medium',
    skill: 'Databases',
    criteria: ['Accurate description of both mechanisms', 'Gives concrete use cases', 'Mentions cost of maintaining an index'],
    structure: ['Define what an index stores', 'Contrast with a full scan cost', 'When each is the right choice', 'Trade-offs: write cost, selectivity'],
    types: ['technical', 'mixed'],
  },
  {
    text: 'Your service started returning 20% 500 errors right after a deploy. How do you debug it?',
    category: 'problem-solving',
    difficulty: 'hard',
    skill: 'Incident debugging',
    criteria: ['Starts with mitigation or rollback', 'Uses logs, metrics and traces as evidence', 'Explains how the root cause is confirmed'],
    structure: ['Immediate impact control (roll back / feature flag)', 'Gather evidence: logs, metrics, traces', 'Form and test a hypothesis', 'Fix, verify, and prevent recurrence'],
    types: ['technical', 'mixed'],
  },
  {
    text: 'What happens when you type a URL into a browser and press Enter?',
    category: 'technical',
    difficulty: 'easy',
    skill: 'Web fundamentals',
    criteria: ['Covers DNS, TCP/TLS and HTTP', 'Mentions rendering basics', 'Order of steps is correct'],
    structure: ['DNS resolution', 'TCP handshake and TLS', 'HTTP request and server response', 'Parsing, rendering, sub-resource loads'],
    types: ['technical', 'mixed'],
  },
  {
    text: 'Describe a project you are proud of. What was your specific contribution and which trade-offs did you make?',
    category: 'project',
    difficulty: 'medium',
    skill: 'Project ownership',
    criteria: ['Clearly separates personal contribution from team work', 'Names real trade-offs', 'States a measurable outcome'],
    structure: ['Context: problem and constraints', 'Your role and decisions', 'Trade-offs you accepted and why', 'Result with a measurable outcome'],
    types: ['project', 'mixed', 'role'],
  },
  {
    text: 'Tell me about a time you disagreed with a technical decision your team made.',
    category: 'behavioral',
    difficulty: 'medium',
    skill: 'Conflict resolution',
    criteria: ['Uses a situation-action-result structure', 'Shows respect for the team decision', 'Ends with a concrete outcome or learning'],
    structure: ['Situation and the decision you disagreed with', 'What you did to raise concerns', 'How the disagreement was resolved', 'Result and what you learned'],
    types: ['behavioral', 'mixed'],
  },
  {
    text: 'Describe a situation where you had to learn a new technology quickly.',
    category: 'behavioral',
    difficulty: 'easy',
    skill: 'Learning agility',
    criteria: ['Explains the learning approach', 'Gives a concrete example of applying it', 'States the outcome'],
    structure: ['Why the skill was needed and the deadline', 'How you learned (projects, docs, mentors)', 'How you applied it', 'Outcome and what you would do differently'],
    types: ['behavioral', 'mixed', 'hr'],
  },
  {
    text: 'A production incident happens at 4pm on a Friday and you own the service. Walk me through your first 30 minutes.',
    category: 'situational',
    difficulty: 'medium',
    skill: 'Incident response',
    criteria: ['Prioritises user impact over curiosity', 'Mentions communication and ownership', 'Has a clear ordered plan'],
    structure: ['Assess severity and user impact', 'Mitigate first (rollback, failover, flag)', 'Communicate status to stakeholders', 'Start root-cause investigation'],
    types: ['situational', 'technical', 'mixed'],
  },
  {
    text: 'Tell me about yourself and what draws you to this role.',
    category: 'introduction',
    difficulty: 'easy',
    skill: 'Self-presentation',
    criteria: ['Keeps a present-past-future shape', 'Connects experience to the role', 'Does not repeat the resume line by line'],
    structure: ['Present: what you do now', 'Past: two relevant experiences', 'Future: why this role fits', 'One line of personal motivation'],
    types: ['hr', 'mixed'],
  },
  {
    text: 'Why are you interested in this position?',
    category: 'hr',
    difficulty: 'easy',
    skill: 'Motivation',
    criteria: ['References something specific about the role', 'Connects to the candidate own goals', 'Avoids generic praise'],
    structure: ['What specifically attracts you', 'How your experience maps to it', 'What you hope to contribute and learn'],
    types: ['hr', 'mixed'],
  },
  {
    text: 'Design a job application tracking system that supports search and notifications.',
    category: 'system-design',
    difficulty: 'hard',
    skill: 'System design',
    criteria: ['Identifies core entities and workflows', 'Addresses search and indexing', 'Covers scale, reliability and notification delivery'],
    structure: ['Requirements and entity model', 'API and data storage choices', 'Search and notification pipelines', 'Scale, failure handling and evolution'],
    types: ['technical', 'mixed'],
  },
  {
    text: 'A key API endpoint became 10x slower after a traffic spike. How do you investigate?',
    category: 'problem-solving',
    difficulty: 'medium',
    skill: 'Performance analysis',
    criteria: ['Uses measurements before theories', 'Considers cache, database and queue factors', 'Explains how a fix is verified'],
    structure: ['Reproduce and quantify with metrics', 'Isolate: application, database, cache, network', 'Form hypotheses and test them', 'Fix, verify with benchmarks, add guardrails'],
    types: ['technical', 'mixed'],
  },
  {
    text: 'Explain eventual consistency with a concrete example, including what can go wrong.',
    category: 'technical',
    difficulty: 'hard',
    skill: 'Distributed systems',
    criteria: ['Definition is accurate', 'Example is concrete and realistic', 'Describes failure scenarios honestly'],
    structure: ['Define eventual consistency precisely', 'Concrete example (replicated store / DNS)', 'What can go wrong for users', 'When it is a good trade-off'],
    types: ['technical', 'mixed'],
  },
  {
    text: 'Explain a complex technical concept to a non-technical stakeholder.',
    category: 'communication',
    difficulty: 'medium',
    skill: 'Communication',
    criteria: ['Avoids unexplained jargon', 'Uses an analogy tied to their goal', 'Ends with the decision or impact'],
    structure: ['Start from their goal or concern', 'Use a plain-language analogy', 'State the trade-off or impact', 'Confirm understanding'],
    types: ['hr', 'mixed', 'role'],
  },
  {
    text: 'You realise a feature you shipped last week silently corrupted data for some users. What do you do next?',
    category: 'situational',
    difficulty: 'hard',
    skill: 'Ownership',
    criteria: ['Prioritises stopping ongoing damage', 'Plans communication and repair', 'Includes prevention, not just fixes'],
    structure: ['Contain: stop the bleeding', 'Assess scope: how many users, which data', 'Communicate internally and to affected users', 'Repair data and add detection to prevent repeats'],
    types: ['situational', 'technical', 'mixed'],
  },
];

const DATA: BankEntry[] = [
  {
    text: 'How would you explain the difference between correlation and causation to a product manager?',
    category: 'technical',
    difficulty: 'medium',
    skill: 'Statistics',
    criteria: ['Accurate distinction', 'Uses a realistic product example', 'Mentions how to approach causal claims'],
    structure: ['Define both terms plainly', 'Give a product example where they diverge', 'How to test a causal claim (experiment / design)', 'What to tell the stakeholder'],
    types: ['technical', 'mixed'],
  },
  {
    text: 'Walk me through how you would validate a metric that dropped 15% overnight.',
    category: 'problem-solving',
    difficulty: 'medium',
    skill: 'Metrics analysis',
    criteria: ['Checks instrumentation first', 'Segments the data before concluding', 'Considers external factors'],
    structure: ['Rule out tracking and pipeline issues', 'Segment by platform, region, cohort', 'Look for launches, incidents, seasonality', 'State confidence and next steps'],
    types: ['technical', 'mixed', 'role'],
  },
  {
    text: 'What is the difference between an INNER JOIN and a LEFT JOIN?',
    category: 'technical',
    difficulty: 'easy',
    skill: 'SQL',
    criteria: ['Correct semantics for both', 'Explains NULL behaviour', 'Gives a practical example'],
    structure: ['INNER JOIN: matching rows only', 'LEFT JOIN: all left rows plus matches', 'What NULLs mean', 'When you choose each'],
    types: ['technical', 'mixed'],
  },
  {
    text: 'How do you handle missing data in a dataset, and how do you decide which method to use?',
    category: 'technical',
    difficulty: 'hard',
    skill: 'Data quality',
    criteria: ['Distinguishes missingness mechanisms', 'Compares imputation options honestly', 'Explains impact on conclusions'],
    structure: ['Diagnose why data is missing', 'Options: drop, impute, model, flag', 'How the choice affects results', 'Document assumptions'],
    types: ['technical', 'mixed'],
  },
  {
    text: 'Describe an analysis you delivered that changed a decision. What was your process?',
    category: 'project',
    difficulty: 'medium',
    skill: 'Analytical impact',
    criteria: ['States the decision that changed', 'Describes method and constraints', 'Quantifies the outcome where possible'],
    structure: ['Business question and decision at stake', 'Data sources and method', 'Findings and how they were communicated', 'Decision made and measured impact'],
    types: ['project', 'mixed', 'role'],
  },
  {
    text: 'Tell me about a time your analysis was challenged by a stakeholder.',
    category: 'behavioral',
    difficulty: 'medium',
    skill: 'Influence',
    criteria: ['STAR structure', 'Shows how assumptions were examined', 'Ends with an outcome or learning'],
    structure: ['Situation and the challenge raised', 'How you re-examined the analysis', 'How you responded to the stakeholder', 'Result and what changed'],
    types: ['behavioral', 'mixed'],
  },
  {
    text: 'Two dashboards disagree on the same number. How do you resolve it?',
    category: 'situational',
    difficulty: 'medium',
    skill: 'Data hygiene',
    criteria: ['Starts from definitions and filters', 'Checks joins, timezones and refresh times', 'Communicates a single source of truth'],
    structure: ['Compare metric definitions and filters', 'Check grain, joins, timezones, freshness', 'Reproduce both queries', 'Agree one owner and document it'],
    types: ['situational', 'technical', 'mixed'],
  },
  {
    text: 'Design an experiment to test whether a new onboarding flow improves activation.',
    category: 'technical',
    difficulty: 'hard',
    skill: 'Experimentation',
    criteria: ['Defines hypothesis and metric', 'Covers randomisation and sample size', 'Discusses guardrails and validity threats'],
    structure: ['Hypothesis and primary metric', 'Randomisation unit and assignment', 'Sample size and duration', 'Guardrails, analysis plan, decision rule'],
    types: ['technical', 'mixed'],
  },
  {
    text: 'How do you present uncertain findings to a leadership audience?',
    category: 'communication',
    difficulty: 'medium',
    skill: 'Communication',
    criteria: ['Leads with the recommendation', 'States uncertainty explicitly', 'Avoids false precision'],
    structure: ['Bottom line first', 'Evidence and confidence level', 'What would change your mind', 'Recommended next step'],
    types: ['hr', 'mixed', 'role'],
  },
  {
    text: 'Tell me about yourself and the data role you are targeting.',
    category: 'introduction',
    difficulty: 'easy',
    skill: 'Self-presentation',
    criteria: ['Present-past-future shape', 'Connects projects to the target role', 'Concise'],
    structure: ['Current focus', 'Relevant past work', 'Why this data role', 'What you want to grow into'],
    types: ['hr', 'mixed'],
  },
];

const PRODUCT: BankEntry[] = [
  {
    text: 'Tell me about yourself and why product management.',
    category: 'introduction',
    difficulty: 'easy',
    skill: 'Self-presentation',
    criteria: ['Clear narrative arc', 'Links past roles to PM work', 'Specific about motivation'],
    structure: ['Present role and scope', 'Experiences that pulled you toward product', 'Why this product and company', 'What you want to contribute'],
    types: ['hr', 'mixed'],
  },
  {
    text: 'Tell me about a product decision you made with incomplete data.',
    category: 'behavioral',
    difficulty: 'medium',
    skill: 'Decision-making',
    criteria: ['States what was unknown', 'Explains how risk was bounded', 'Result and learning'],
    structure: ['Decision and information gap', 'How you reduced uncertainty', 'What you chose and why', 'Outcome and retrospective'],
    types: ['behavioral', 'mixed'],
  },
  {
    text: 'Engineering says a feature will take six weeks instead of two. What do you do?',
    category: 'situational',
    difficulty: 'medium',
    skill: 'Stakeholder management',
    criteria: ['Seeks to understand the cost driver', 'Trades scope rather than cutting quality', 'Communicates a clear plan'],
    structure: ['Understand where the time goes', 'Options: scope, sequencing, phasing', 'Align with engineering and stakeholders', 'Communicate the revised plan'],
    types: ['situational', 'mixed'],
  },
  {
    text: 'How would you measure the success of a search feature?',
    category: 'technical',
    difficulty: 'medium',
    skill: 'Product metrics',
    criteria: ['Defines user and business metrics', 'Includes counter-metrics', 'Explains how to read them together'],
    structure: ['Primary success metric', 'Engagement and quality metrics', 'Guardrail / counter-metrics', 'How you would slice and read them'],
    types: ['technical', 'mixed'],
  },
  {
    text: 'Walk me through a prioritisation framework you use and its limits.',
    category: 'technical',
    difficulty: 'hard',
    skill: 'Prioritisation',
    criteria: ['Names a concrete framework', 'Applies it to a real example', 'Admits where the framework fails'],
    structure: ['Name the framework and inputs', 'Worked example with numbers', 'Limitations and failure modes', 'How you adapt it'],
    types: ['technical', 'mixed'],
  },
  {
    text: 'Describe a product you launched end to end and what you would do differently.',
    category: 'project',
    difficulty: 'medium',
    skill: 'Delivery',
    criteria: ['Covers discovery through launch', 'Specific about personal role', 'Honest retrospective'],
    structure: ['Problem and users', 'Your role and key decisions', 'Launch and results', 'What you would change'],
    types: ['project', 'mixed', 'role'],
  },
  {
    text: 'A key customer asks for a one-off feature that conflicts with your roadmap.',
    category: 'situational',
    difficulty: 'easy',
    skill: 'Prioritisation',
    criteria: ['Explores the underlying need', 'Balances revenue against focus', 'Offers a clear path forward'],
    structure: ['Understand the real need behind the ask', 'Assess strategic fit and cost', 'Alternatives you can offer', 'Decision and communication'],
    types: ['situational', 'mixed'],
  },
  {
    text: 'Describe a time you had to say no to a senior stakeholder.',
    category: 'behavioral',
    difficulty: 'hard',
    skill: 'Influence',
    criteria: ['STAR structure', 'Backed the refusal with evidence', 'Preserved the relationship'],
    structure: ['Situation and the request', 'Your reasoning and evidence', 'How you delivered the no', 'Outcome and relationship afterwards'],
    types: ['behavioral', 'mixed'],
  },
  {
    text: 'How would you write a problem statement for improving checkout completion?',
    category: 'role-specific',
    difficulty: 'medium',
    skill: 'Problem framing',
    criteria: ['Focuses on users and evidence', 'Avoids jumping to solutions', 'Includes a measurable definition'],
    structure: ['Who is affected and how much', 'Evidence and current numbers', 'Constraints and non-goals', 'Success measures'],
    types: ['role', 'mixed', 'technical'],
  },
  {
    text: 'Sign-ups fell 8% this month. Walk me through how you would diagnose it.',
    category: 'problem-solving',
    difficulty: 'medium',
    skill: 'Diagnosis',
    criteria: ['Segments before concluding', 'Checks instrumentation and external factors', 'Ends with prioritised hypotheses'],
    structure: ['Validate data quality first', 'Segment by channel, platform, geography', 'Correlate with launches and changes', 'Rank hypotheses and test'],
    types: ['role', 'mixed', 'technical'],
  },
];

const DESIGN: BankEntry[] = [
  {
    text: 'Tell me about yourself and your design practice.',
    category: 'introduction',
    difficulty: 'easy',
    skill: 'Self-presentation',
    criteria: ['States your design focus', 'Connects work to the role', 'Concise narrative'],
    structure: ['Current practice and specialties', 'Notable work and impact', 'Why this team and product', 'What you want to do next'],
    types: ['hr', 'mixed'],
  },
  {
    text: 'Walk me through a redesign project from research to launch.',
    category: 'project',
    difficulty: 'medium',
    skill: 'Design process',
    criteria: ['Shows research informing decisions', 'Names constraints and iterations', 'States outcome with evidence'],
    structure: ['Problem and research insights', 'Options explored and why', 'Design decisions and trade-offs', 'Launch results and learnings'],
    types: ['project', 'mixed', 'role'],
  },
  {
    text: 'Tell me about a time you received strong criticism of your design.',
    category: 'behavioral',
    difficulty: 'medium',
    skill: 'Receiving feedback',
    criteria: ['STAR structure', 'Separates ego from the work', 'Shows what changed as a result'],
    structure: ['Situation and the criticism', 'Your first reaction and how you responded', 'What you changed', 'Outcome and lesson'],
    types: ['behavioral', 'mixed'],
  },
  {
    text: 'How do you decide between usability testing, A/B testing and interviews?',
    category: 'technical',
    difficulty: 'medium',
    skill: 'Research methods',
    criteria: ['Matches method to question type', 'Mentions strengths and limits of each', 'Gives a decision example'],
    structure: ['What question are you trying to answer', 'Interviews: attitudinal, early stage', 'Usability tests: observed behaviour', 'A/B tests: measurable validation at scale'],
    types: ['technical', 'mixed'],
  },
  {
    text: 'Stakeholders want a design you believe harms users. What do you do?',
    category: 'situational',
    difficulty: 'medium',
    skill: 'Advocacy',
    criteria: ['Uses evidence rather than opinion', 'Proposes alternatives', 'Explains escalation and follow-up'],
    structure: ['Clarify the concern with evidence', 'Present user impact and data', 'Offer alternative designs', 'Agree how the decision is recorded'],
    types: ['situational', 'mixed'],
  },
  {
    text: 'How do you design for accessibility from the start?',
    category: 'role-specific',
    difficulty: 'medium',
    skill: 'Accessibility',
    criteria: ['Mentions concrete standards and practices', 'Covers more than colour contrast', 'Explains how it is validated'],
    structure: ['Standards and semantics (WCAG, ARIA)', 'Keyboard and focus behaviour', 'Contrast, motion, content clarity', 'Testing with real assistive technology'],
    types: ['role', 'mixed', 'technical'],
  },
  {
    text: 'Users abandon a multi-step form at step 3. How do you investigate and fix it?',
    category: 'problem-solving',
    difficulty: 'hard',
    skill: 'Conversion design',
    criteria: ['Combines quantitative and qualitative evidence', 'Tests specific hypotheses', 'Considers non-design causes too'],
    structure: ['Quantify where the drop happens', 'Watch users / read session recordings', 'Check technical errors and field validation', 'Prototype fixes and measure'],
    types: ['role', 'mixed', 'technical'],
  },
  {
    text: 'Explain your design rationale to a developer who disagrees.',
    category: 'communication',
    difficulty: 'easy',
    skill: 'Communication',
    criteria: ['Listens before arguing', 'Uses shared goals and constraints', 'Leaves a concrete next step'],
    structure: ['Restate their concern to confirm it', 'Ground the rationale in user evidence', 'Discuss feasibility constraints together', 'Agree a path forward'],
    types: ['hr', 'mixed', 'role'],
  },
];

const MARKETING: BankEntry[] = [
  {
    text: 'Tell me about yourself and the marketing role you want.',
    category: 'introduction',
    difficulty: 'easy',
    skill: 'Self-presentation',
    criteria: ['Clear summary of channels you own', 'Links past results to the role', 'Specific motivation'],
    structure: ['Current focus and channels', 'Proof of past results', 'Why this role and company', 'What you want to achieve'],
    types: ['hr', 'mixed'],
  },
  {
    text: 'How do you measure the success of a campaign?',
    category: 'technical',
    difficulty: 'medium',
    skill: 'Campaign measurement',
    criteria: ['Ties metrics to campaign goals', 'Includes cost efficiency metrics', 'Mentions attribution limits'],
    structure: ['Objective and primary KPI', 'Funnel metrics behind it', 'Cost efficiency (CAC, ROAS)', 'Attribution caveats and tests'],
    types: ['technical', 'mixed'],
  },
  {
    text: 'Tell me about a campaign that underperformed and what you learned.',
    category: 'behavioral',
    difficulty: 'medium',
    skill: 'Learning from failure',
    criteria: ['Owns the result honestly', 'Explains the diagnosis', 'Names what changed afterwards'],
    structure: ['Goal and what actually happened', 'How you diagnosed the gap', 'Actions you took', 'Lasting change to your process'],
    types: ['behavioral', 'mixed'],
  },
  {
    text: 'A campaign is live and cost per acquisition is 40% above target. Walk me through your next steps.',
    category: 'situational',
    difficulty: 'medium',
    skill: 'Optimisation',
    criteria: ['Checks tracking before cutting spend', 'Separates creative, audience and channel effects', 'Explains the decision cadence'],
    structure: ['Verify tracking and conversion path', 'Segment: creative, audience, placement', 'Kill or fix underperformers', 'Re-forecast and communicate the plan'],
    types: ['situational', 'mixed'],
  },
  {
    text: 'Describe a launch you owned end to end.',
    category: 'project',
    difficulty: 'medium',
    skill: 'Go-to-market',
    criteria: ['Covers positioning through measurement', 'Clear personal ownership', 'States results'],
    structure: ['Audience and positioning', 'Channels and assets', 'Coordination with product and sales', 'Results and retrospective'],
    types: ['project', 'mixed', 'role'],
  },
  {
    text: 'Organic traffic dropped 20% after a site migration. How do you diagnose it?',
    category: 'problem-solving',
    difficulty: 'hard',
    skill: 'SEO diagnostics',
    criteria: ['Checks indexing and redirects first', 'Segments by template and query type', 'Has a prioritised remediation plan'],
    structure: ['Confirm the drop is real and where', 'Index coverage, robots, sitemaps', 'Redirects, canonicals, on-page changes', 'Prioritised fixes and monitoring'],
    types: ['role', 'mixed', 'technical'],
  },
  {
    text: 'Explain attribution models and when last-click misleads.',
    category: 'technical',
    difficulty: 'hard',
    skill: 'Attribution',
    criteria: ['Accurate model comparison', 'Concrete example of last-click bias', 'Practical recommendation'],
    structure: ['Common models and their assumptions', 'Where last-click over-credits', 'Example from a real funnel', 'How you would set expectations'],
    types: ['technical', 'mixed'],
  },
  {
    text: 'How would you brief a designer on landing page requirements?',
    category: 'role-specific',
    difficulty: 'medium',
    skill: 'Briefing',
    criteria: ['Starts from audience and goal', 'States constraints and success measures', 'Leaves design room'],
    structure: ['Audience and the action we want', 'Message hierarchy and proof points', 'Constraints: brand, technical, legal', 'Success measures and timeline'],
    types: ['role', 'mixed'],
  },
];

const SUPPORT: BankEntry[] = [
  {
    text: 'Tell me about yourself and why customer support.',
    category: 'introduction',
    difficulty: 'easy',
    skill: 'Self-presentation',
    criteria: ['Shows empathy motivation', 'Links experience to support work', 'Concise'],
    structure: ['Current or relevant experience', 'Why support appeals to you', 'Strengths you bring', 'What you want to grow in'],
    types: ['hr', 'mixed'],
  },
  {
    text: 'A customer is angry about a duplicate charge. How do you handle the first reply?',
    category: 'situational',
    difficulty: 'easy',
    skill: 'De-escalation',
    criteria: ['Acknowledges the emotion first', 'Gives concrete next steps and timing', 'Takes ownership'],
    structure: ['Acknowledge and apologise for the experience', 'Confirm what you will check and by when', 'Set expectations on the refund timeline', 'Follow up personally'],
    types: ['situational', 'mixed'],
  },
  {
    text: 'Tell me about a time you turned an unhappy customer around.',
    category: 'behavioral',
    difficulty: 'medium',
    skill: 'Service recovery',
    criteria: ['STAR structure', 'Shows discretion within policy', 'Ends with measurable result'],
    structure: ['Situation and customer state', 'What you did beyond the script', 'Resolution and any policy calls', 'Result: retention, rating or referral'],
    types: ['behavioral', 'mixed'],
  },
  {
    text: 'You cannot resolve an issue and engineering is unavailable. What do you do?',
    category: 'situational',
    difficulty: 'medium',
    skill: 'Escalation',
    criteria: ['Keeps the customer informed', 'Escalates with full context', 'Manages the wait honestly'],
    structure: ['Explain status and next update time', 'Gather logs and reproduction steps', 'Escalate through the right channel', 'Update the customer until resolved'],
    types: ['situational', 'mixed'],
  },
  {
    text: 'How would you explain a bug workaround to a non-technical customer?',
    category: 'communication',
    difficulty: 'medium',
    skill: 'Plain-language explanation',
    criteria: ['No unexplained jargon', 'Steps are copy-pasteable', 'Explains when the real fix arrives'],
    structure: ['Reassure and state the impact briefly', 'Numbered steps in plain language', 'Why it works in one sentence', 'Timeline for the permanent fix'],
    types: ['hr', 'mixed', 'role'],
  },
  {
    text: 'How do you decide when to escalate a ticket?',
    category: 'role-specific',
    difficulty: 'medium',
    skill: 'Judgement',
    criteria: ['Uses clear criteria', 'Balances speed and ownership', 'Mentions what makes an escalation useful'],
    structure: ['Criteria: severity, blast radius, policy', 'What you try before escalating', 'What context to attach', 'How you stay accountable after'],
    types: ['role', 'mixed'],
  },
];

const GENERIC: BankEntry[] = [
  {
    text: 'Tell me about yourself.',
    category: 'introduction',
    difficulty: 'easy',
    skill: 'Self-presentation',
    criteria: ['Present-past-future structure', 'Relevant to the target role', 'Around 60-90 seconds long'],
    structure: ['Present: what you do now', 'Past: two relevant highlights', 'Future: why this role', 'Closing line of motivation'],
    types: ['hr', 'mixed'],
  },
  {
    text: 'Why are you looking for a new role?',
    category: 'hr',
    difficulty: 'easy',
    skill: 'Motivation',
    criteria: ['Positive framing without badmouting', 'Forward-looking', 'Honest and concise'],
    structure: ['What you are seeking next', 'Why your current situation cannot provide it', 'Why this role is the right step'],
    types: ['hr', 'mixed'],
  },
  {
    text: 'Where do you see yourself in three years?',
    category: 'hr',
    difficulty: 'medium',
    skill: 'Career planning',
    criteria: ['Realistic and grounded', 'Connects growth to the role', 'Avoids generic answers'],
    structure: ['Skills you want to deepen', 'Scope you want to take on', 'How this role fits that path'],
    types: ['hr', 'mixed'],
  },
  {
    text: 'What questions would you ask us at the end of this interview?',
    category: 'hr',
    difficulty: 'medium',
    skill: 'Preparation',
    criteria: ['Questions show real research', 'About team and outcomes, not perks only', 'Shows curiosity about success in role'],
    structure: ['About team challenges and priorities', 'About how success is measured', 'About growth and next steps'],
    types: ['hr', 'mixed'],
  },
  {
    text: 'Tell me about a time you delivered under a tight deadline.',
    category: 'behavioral',
    difficulty: 'easy',
    skill: 'Execution',
    criteria: ['STAR structure', 'Explains how you prioritised', 'States the delivered outcome'],
    structure: ['Situation and deadline pressure', 'How you scoped and prioritised', 'Actions you took', 'Result and any trade-offs'],
    types: ['behavioral', 'mixed'],
  },
  {
    text: 'Describe a conflict with a teammate and how you resolved it.',
    category: 'behavioral',
    difficulty: 'medium',
    skill: 'Collaboration',
    criteria: ['STAR structure', 'Does not blame the other person', 'Shows a constructive resolution'],
    structure: ['Situation and both perspectives', 'How you opened the conversation', 'Agreement you reached', 'Result and relationship afterwards'],
    types: ['behavioral', 'mixed'],
  },
  {
    text: 'Tell me about a mistake you made and what you changed afterwards.',
    category: 'behavioral',
    difficulty: 'medium',
    skill: 'Accountability',
    criteria: ['Owns the mistake clearly', 'Describes the concrete change', 'Shows lasting impact'],
    structure: ['What happened and your part in it', 'How you noticed and owned it', 'The fix and the process change', 'What you do differently now'],
    types: ['behavioral', 'mixed'],
  },
  {
    text: 'Describe a time you failed to meet a commitment. What did you do?',
    category: 'behavioral',
    difficulty: 'hard',
    skill: 'Accountability',
    criteria: ['Honest about the failure', 'Explains communication to others', 'Shows what was put in place'],
    structure: ['The commitment and what went wrong', 'When and how you raised it', 'How you mitigated the impact', 'The safeguard you added'],
    types: ['behavioral', 'mixed'],
  },
  {
    text: 'Your manager gives you two priorities due the same day. How do you proceed?',
    category: 'situational',
    difficulty: 'easy',
    skill: 'Prioritisation',
    criteria: ['Seeks clarity rather than guessing', 'Communicates trade-offs early', 'Has a concrete plan'],
    structure: ['Clarify scope, deadline and importance', 'Assess effort and dependencies', 'Propose a sequence or split', 'Confirm and keep stakeholders updated'],
    types: ['situational', 'mixed'],
  },
  {
    text: 'You realise mid-project that the deadline is at risk. What do you tell your manager?',
    category: 'situational',
    difficulty: 'medium',
    skill: 'Communication',
    criteria: ['Raises it early with evidence', 'Brings options, not just bad news', 'Commits to a plan'],
    structure: ['State the risk early with data', 'Explain causes and impact', 'Offer options: scope, help, timeline', 'Agree and track the plan'],
    types: ['situational', 'mixed'],
  },
  {
    text: 'A cross-team dependency slips two weeks before launch. Walk me through your response.',
    category: 'situational',
    difficulty: 'hard',
    skill: 'Coordination',
    criteria: ['Assesses real impact first', 'Coordinates across teams with a plan', 'Protects the launch decision quality'],
    structure: ['Confirm scope of the slip and impact', 'Get commitment and a new date', 'Adjust plan: scope, resources, date', 'Communicate to stakeholders and re-plan'],
    types: ['situational', 'mixed'],
  },
  {
    text: 'Walk me through the most complex project you have worked on.',
    category: 'project',
    difficulty: 'medium',
    skill: 'Project framing',
    criteria: ['Explains why it was complex', 'Clear personal contribution', 'Ends with outcomes and learning'],
    structure: ['Context and sources of complexity', 'Your role and key decisions', 'How you managed the risk', 'Outcome and lessons'],
    types: ['project', 'mixed'],
  },
  {
    text: 'How do you keep stakeholders updated when there is no news?',
    category: 'communication',
    difficulty: 'easy',
    skill: 'Stakeholder communication',
    criteria: ['Advocates a regular cadence', 'Explains what to include when idle', 'Shows reliability'],
    structure: ['Fixed cadence and channels', 'What to share when nothing changed', 'How you flag risks early', 'Keeping it skimmable'],
    types: ['hr', 'mixed', 'role'],
  },
  {
    text: 'What part of this role matches your strongest skill, and what part is a stretch?',
    category: 'role-specific',
    difficulty: 'medium',
    skill: 'Self-awareness',
    criteria: ['Honest about the stretch area', 'Shows a plan for closing the gap', 'Grounded claims only'],
    structure: ['Strongest skill with evidence', 'The stretch area stated honestly', 'What you are doing to close it', 'How quickly you learn it'],
    types: ['role', 'mixed'],
  },
];

export const QUESTION_BANK: Record<BucketKey, BankEntry[]> = {
  software: SOFTWARE,
  data: DATA,
  product: PRODUCT,
  design: DESIGN,
  marketing: MARKETING,
  support: SUPPORT,
  generic: GENERIC,
};

const BUCKET_LABELS: Record<BucketKey, string> = {
  software: 'Software Engineering',
  data: 'Data & Analytics',
  product: 'Product Management',
  design: 'Design',
  marketing: 'Marketing & Growth',
  support: 'Customer Support',
  generic: 'General',
};

export function bucketLabel(key: BucketKey): string {
  return BUCKET_LABELS[key];
}

const ROLE_KEYWORDS: [BucketKey, RegExp][] = [
  ['software', /\b(engineer|developer|software|backend|frontend|full[\s-]?stack|devops|sre|mobile|platform|architect|qa|test engineer|data engineer)\b/i],
  ['data', /\b(data|analytics|analyst|scientist|machine learning|ml|bi|business intelligence|etl|research)\b/i],
  ['product', /\b(product|pm|program manager|product manager|product owner)\b/i],
  ['design', /\b(design|ux|ui|designer|researcher|graphic|visual|interaction)\b/i],
  ['marketing', /\b(marketing|growth|seo|content|brand|campaign|demand generation|copywriter|social)\b/i],
  ['support', /\b(support|customer success|customer service|helpdesk|service desk|account manager)\b/i],
];

export function roleBucket(role: string): BucketKey {
  for (const [key, re] of ROLE_KEYWORDS) {
    if (re.test(role)) return key;
  }
  return 'generic';
}

const DIFFICULTY_ORDER: Record<Difficulty, number> = { easy: 0, medium: 1, hard: 2 };

function clampDifficulty(d: Difficulty): Difficulty {
  return d;
}

interface SelectOptions {
  excludeIds?: string[];
}

/**
 * Build a deterministic question set for a configuration.
 * Selection is stable for identical inputs and skips previously used questions.
 */
export function buildFallbackQuestions(config: InterviewConfig, options: SelectOptions = {}): InterviewQuestion[] {
  const bucket = roleBucket(config.role);
  const exclude = new Set(options.excludeIds ?? []);
  const seed = hashString(
    [config.role, config.experience, config.type, config.difficulty, config.questionCount, config.industry].join('|'),
  );
  const rand = seededRandom(seed);
  const targetRank = DIFFICULTY_ORDER[clampDifficulty(config.difficulty)];

  const bucketEntries = QUESTION_BANK[bucket];
  const genericEntries = QUESTION_BANK.generic;
  const all = [...bucketEntries, ...genericEntries.filter((e) => !(bucket === 'generic' && bucketEntries.includes(e)))];

  const typeMatches = (e: BankEntry) => config.type === 'mixed' || e.types.includes(config.type);

  const distance = (e: BankEntry) => Math.abs(DIFFICULTY_ORDER[e.difficulty] - targetRank);

  // Pass 1: right type, within one difficulty step of the target.
  // Pass 2: right type, any difficulty.
  // Pass 3: any type (still avoids repetition).
  const passes: BankEntry[][] = [
    all.filter((e) => typeMatches(e) && distance(e) <= 1),
    all.filter((e) => typeMatches(e)),
    all,
  ];

  let picked: BankEntry[] = [];
  for (const pass of passes) {
    const withIndex = pass.map((e, i) => ({ e, i, key: rand() }));
    withIndex.sort((a, b) => distance(a.e) - distance(b.e) || a.key - b.key);
    picked = [];
    const seen = new Set<string>();
    for (const { e } of withIndex) {
      if (seen.has(e.text)) continue;
      seen.add(e.text);
      if (exclude.has(bankQuestionId(e))) continue;
      picked.push(e);
      if (picked.length >= config.questionCount) break;
    }
    if (picked.length >= config.questionCount) break;
  }

  return picked.map((entry, index) => toQuestion(entry, index, config));
}

function bankQuestionId(entry: BankEntry): string {
  return `fb_${hashString(entry.text)}`;
}

function toQuestion(entry: BankEntry, _index: number, config: InterviewConfig): InterviewQuestion {
  const id = bankQuestionId(entry);
  const base = entry.category === 'behavioral' ? 180 : entry.category === 'system-design' ? 300 : 150;
  const adjusted = config.experience === 'lead' || config.experience === 'senior' ? base + 60 : base;
  return {
    id,
    text: entry.text,
    category: entry.category,
    difficulty: entry.difficulty,
    skill: entry.skill,
    criteria: buildCriteria(entry.criteria),
    answerStructure: entry.structure,
    source: 'fallback',
    timeLimitSeconds: Math.min(600, adjusted),
  };
}

/** Flatten the whole bank into library-style questions (for the practice library). */
export function allBankQuestions(): InterviewQuestion[] {
  const out: InterviewQuestion[] = [];
  const seen = new Set<string>();
  for (const key of Object.keys(QUESTION_BANK) as BucketKey[]) {
    for (const [i, entry] of QUESTION_BANK[key].entries()) {
      if (seen.has(entry.text)) continue;
      seen.add(entry.text);
      out.push(toQuestion(entry, i, { role: key, experience: 'mid', industry: '', type: 'mixed', difficulty: entry.difficulty, questionCount: 1, durationMinutes: 30, mode: 'typed', jobDescription: '', resumeText: '', followUps: false }));
    }
  }
  return out;
}
