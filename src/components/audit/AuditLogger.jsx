import { api } from '@/api/apiClient';

// Audit action types
export const AuditActions = {
  // Auth
  LOGIN: 'login',
  LOGOUT: 'logout',
  
  // Projects
  PROJECT_CREATED: 'project_created',
  PROJECT_UPDATED: 'project_updated',
  PROJECT_DELETED: 'project_deleted',
  PROJECT_ARCHIVED: 'project_archived',
  
  // Tasks
  TASK_CREATED: 'task_created',
  TASK_UPDATED: 'task_updated',
  TASK_COMPLETED: 'task_completed',
  TASK_DELETED: 'task_deleted',
  
  // Proposals
  PROPOSAL_CREATED: 'proposal_created',
  PROPOSAL_UPDATED: 'proposal_updated',
  PROPOSAL_SENT: 'proposal_sent',
  PROPOSAL_APPROVED: 'proposal_approved',
  PROPOSAL_REJECTED: 'proposal_rejected',
  PROPOSAL_DELETED: 'proposal_deleted',
  
  // Customers
  CUSTOMER_CREATED: 'customer_created',
  CUSTOMER_UPDATED: 'customer_updated',
  CUSTOMER_DELETED: 'customer_deleted',
  
  // Inventory
  INVENTORY_CREATED: 'inventory_created',
  INVENTORY_UPDATED: 'inventory_updated',
  INVENTORY_DELETED: 'inventory_deleted',
  INVENTORY_CHECKOUT: 'inventory_checkout',
  INVENTORY_RESTOCK: 'inventory_restock',
  
  // Settings
  SETTINGS_UPDATED: 'settings_updated',
  INTEGRATION_ENABLED: 'integration_enabled',
  INTEGRATION_DISABLED: 'integration_disabled',
  
  // Users
  USER_INVITED: 'user_invited',
  USER_ROLE_CHANGED: 'user_role_changed',
  PERMISSION_UPDATED: 'permission_updated',
  
  // Billing
  BILLING_STATUS_CHANGED: 'billing_status_changed',
};

// Category mapping
const actionCategories = {
  login: 'auth',
  logout: 'auth',
  project_created: 'project',
  project_updated: 'project',
  project_deleted: 'project',
  project_archived: 'project',
  task_created: 'task',
  task_updated: 'task',
  task_completed: 'task',
  task_deleted: 'task',
  proposal_created: 'proposal',
  proposal_updated: 'proposal',
  proposal_sent: 'proposal',
  proposal_approved: 'proposal',
  proposal_rejected: 'proposal',
  proposal_deleted: 'proposal',
  customer_created: 'customer',
  customer_updated: 'customer',
  customer_deleted: 'customer',
  inventory_created: 'inventory',
  inventory_updated: 'inventory',
  inventory_deleted: 'inventory',
  inventory_checkout: 'inventory',
  inventory_restock: 'inventory',
  settings_updated: 'settings',
  integration_enabled: 'settings',
  integration_disabled: 'settings',
  user_invited: 'user',
  user_role_changed: 'user',
  permission_updated: 'user',
  billing_status_changed: 'billing',
};

/**
 * Log an audit event
 * @param {string} action - The action performed
 * @param {object} options - Additional options
 * @param {string} options.entityType - Type of entity affected
 * @param {string} options.entityId - ID of affected entity
 * @param {string} options.entityName - Display name of entity
 * @param {string} options.details - Additional details
 * @param {object} options.changes - Before/after values
 * @param {object} options.user - User performing action (if not fetching current user)
 */
export async function logAudit(action, options = {}) {
  try {
    let user = options.user;
    if (!user) {
      user = await api.auth.me();
    }
    
    if (!user) return;

    const logEntry = {
      action,
      action_category: actionCategories[action] || 'other',
      entity_type: options.entityType || '',
      entity_id: options.entityId || '',
      entity_name: options.entityName || '',
      user_email: user.email,
      user_name: user.full_name || user.email,
      details: options.details || '',
      changes: options.changes || null,
    };

    await api.entities.AuditLog.create(logEntry);
  } catch (error) {
    console.error('Failed to log audit event:', error);
  }
}

// Convenience functions
export const auditProject = (action, project, details, changes) => 
  logAudit(action, { entityType: 'Project', entityId: project?.id, entityName: project?.name, details, changes });

export const auditTask = (action, task, details, changes) => 
  logAudit(action, { entityType: 'Task', entityId: task?.id, entityName: task?.title, details, changes });

export const auditProposal = (action, proposal, details, changes) => 
  logAudit(action, { entityType: 'Proposal', entityId: proposal?.id, entityName: proposal?.title || proposal?.proposal_number, details, changes });

export const auditCustomer = (action, customer, details, changes) => 
  logAudit(action, { entityType: 'Customer', entityId: customer?.id, entityName: customer?.name, details, changes });

export const auditInventory = (action, item, details, changes) => 
  logAudit(action, { entityType: 'InventoryItem', entityId: item?.id, entityName: item?.name, details, changes });

export const auditSettings = (action, details, changes) => 
  logAudit(action, { entityType: 'Settings', details, changes });

export const auditUser = (action, targetUser, details, changes) => 
  logAudit(action, { entityType: 'User', entityId: targetUser?.id, entityName: targetUser?.full_name || targetUser?.email, details, changes });