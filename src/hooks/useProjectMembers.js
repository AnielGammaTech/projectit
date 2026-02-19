import { useMemo } from 'react';

/**
 * Filter teamMembers to only those who are members of the given project.
 * Returns all teamMembers if user is admin (for admin override).
 */
export function useProjectMembers(teamMembers, project) {
  return useMemo(() => {
    if (!teamMembers || !project) return [];
    if (!project.team_members || project.team_members.length === 0) return [];
    return teamMembers.filter(tm => project.team_members.includes(tm.email));
  }, [teamMembers, project]);
}
