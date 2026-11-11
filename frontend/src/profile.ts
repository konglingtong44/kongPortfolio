export type SkillGroup = { title: string; items: string[]; description?: string | null };
export type Profile = {
  name: string; role: string; introduction: string;
  focus: { title: string; description: string }[];
  projects: { kind: 'personal' | 'work'; title: string; period: string; role: string; description: string; outcome: string; tags: string[]; team?: string | null; responsibilities?: string[] | null; environment?: SkillGroup[] | null }[];
  timeline: { period: string; title: string; description: string }[];
  skills: SkillGroup[];
  qualifications: { date: string; name: string }[];
  note: { date: string; title: string; summary: string; paragraphs: string[] };
};

function textFields(value: unknown, fields: string[]): boolean {
  return !!value && typeof value === 'object' && fields.every(key => typeof (value as Record<string, unknown>)[key] === 'string');
}
function strings(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string');
}
function skillGroup(value: unknown): value is SkillGroup {
  if (!textFields(value, ['title'])) return false;
  const group = value as SkillGroup;
  return strings(group.items) && (group.description == null || typeof group.description === 'string');
}
export function isProfile(value: unknown): value is Profile {
  if (!textFields(value, ['name', 'role', 'introduction'])) return false;
  const p = value as Profile;
  return Array.isArray(p.focus) && p.focus.every(f => textFields(f, ['title', 'description']))
    && Array.isArray(p.projects) && p.projects.every(f => textFields(f, ['kind', 'title', 'period', 'role', 'description', 'outcome']) && ['personal', 'work'].includes(f.kind) && strings(f.tags)
      && (f.team == null || typeof f.team === 'string') && (f.responsibilities == null || strings(f.responsibilities))
      && (f.environment == null || Array.isArray(f.environment) && f.environment.every(skillGroup)))
    && Array.isArray(p.timeline) && p.timeline.every(f => textFields(f, ['period', 'title', 'description']))
    && Array.isArray(p.skills) && p.skills.every(skillGroup)
    && Array.isArray(p.qualifications) && p.qualifications.every(f => textFields(f, ['date', 'name']))
    && textFields(p.note, ['date', 'title', 'summary']) && strings(p.note.paragraphs);
}
