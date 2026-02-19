import { api } from '@/api/apiClient';

export async function logActivity(projectId, action, description, currentUser, entityType = null, entityId = null) {
  try {
    await api.entities.ProjectActivity.create({
      project_id: projectId,
      action,
      description,
      actor_email: currentUser?.email || '',
      actor_name: currentUser?.full_name || currentUser?.email || 'Unknown',
      entity_type: entityType,
      entity_id: entityId
    });
  } catch (err) {
    console.error('Failed to log activity:', err);
  }
}

export const ActivityActions = {
  TASK_CREATED: 'task_created',
  TASK_COMPLETED: 'task_completed',
  TASK_UPDATED: 'task_updated',
  TASK_ASSIGNED: 'task_assigned',
  TASK_DELETED: 'task_deleted',
  PART_CREATED: 'part_created',
  PART_ORDERED: 'part_ordered',
  PART_RECEIVED: 'part_received',
  PART_INSTALLED: 'part_installed',
  PART_UPDATED: 'part_updated',
  PART_DELETED: 'part_deleted',
  NOTE_ADDED: 'note_added',
  FILE_UPLOADED: 'file_uploaded',
  PROGRESS_UPDATED: 'progress_updated',
  PROJECT_UPDATED: 'project_updated'
};