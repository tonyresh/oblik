import { Visitor, Group } from '../types';

export const isSpecialGroup = (g: any): boolean => {
  if (!g) return false;
  const name = String(g.name || '').trim().toLowerCase();
  return name === 'особливий' || name.includes('особлив');
};

/**
 * Checks if a visitor has "Особливий" (Special) status.
 * Handles:
 * - isSpecial: true (boolean, string "true", or number 1)
 * - category / rank equals "Особливий"
 * - group name equals "Особливий"
 * - status equals "Особливий"
 */
export const isSpecialVisitor = (v: any, groups?: Group[]): boolean => {
  if (!v) return false;
  if (v.isSpecial === true || v.isSpecial === 'true' || v.isSpecial === 1 || v.isSpecial === '1') return true;
  
  const normCat = String(v.category || '').trim().toLowerCase();
  if (normCat === 'особливий' || normCat.includes('особлив')) return true;

  const normRank = String(v.rank || '').trim().toLowerCase();
  if (normRank === 'особливий' || normRank.includes('особлив')) return true;

  const normGroup = String(v.group || '').trim().toLowerCase();
  if (normGroup === 'особливий' || normGroup.includes('особлив')) return true;

  if (v.groupId && groups) {
    const grp = groups.find(g => g.id === v.groupId);
    if (grp && isSpecialGroup(grp)) return true;
  }

  const normStatus = String(v.status || '').trim().toLowerCase();
  if (normStatus === 'особливий' || normStatus.includes('особлив')) return true;

  return false;
};

/**
 * Comparator to sort visitors so that:
 * 1. Users with "Особливий" status ALWAYS appear at the very beginning of the list.
 * 2. Secondary order: either on-location first or alphabetical.
 */
export const compareVisitorsSpecialFirst = (
  a: any,
  b: any,
  options?: { prioritizeInStatus?: boolean; groups?: Group[] }
): number => {
  const specialA = isSpecialVisitor(a, options?.groups) ? 1 : 0;
  const specialB = isSpecialVisitor(b, options?.groups) ? 1 : 0;

  if (specialA !== specialB) {
    return specialB - specialA; // Special users (1) come before non-special (0)
  }

  if (options?.prioritizeInStatus) {
    if (a.status === 'in' && b.status !== 'in') return -1;
    if (a.status !== 'in' && b.status === 'in') return 1;
  }

  return (a.name || '').localeCompare(b.name || '');
};
