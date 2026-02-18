import entityService from '../../services/entityService.js';
import emailService from '../../services/emailService.js';

export default async function handler(req, res) {
  try {
    const { trigger_type, trigger_data } = req.body;

    if (!trigger_type) {
      return res.status(400).json({ error: 'trigger_type is required' });
    }

    // Get all active workflows for this trigger
    const workflows = await entityService.filter('Workflow', {
      trigger_type: trigger_type,
      is_active: true,
    });

    if (workflows.length === 0) {
      return res.json({ success: true, message: 'No active workflows for this trigger', executed: 0 });
    }

    const results = [];

    for (const workflow of workflows) {
      const actionsExecuted = [];
      let workflowStatus = 'success';

      for (const action of workflow.actions || []) {
        try {
          const result = await executeAction(action, trigger_data);
          actionsExecuted.push({
            action_type: action.action_type,
            status: 'success',
            result,
          });
        } catch (error) {
          actionsExecuted.push({
            action_type: action.action_type,
            status: 'failed',
            error: error.message,
          });
          workflowStatus = 'partial';
        }
      }

      // Log the execution
      await entityService.create('WorkflowLog', {
        workflow_id: workflow.id,
        workflow_name: workflow.name,
        trigger_type: trigger_type,
        trigger_data: trigger_data,
        actions_executed: actionsExecuted,
        status: workflowStatus,
      });

      // Update workflow stats
      await entityService.update('Workflow', workflow.id, {
        last_triggered: new Date().toISOString(),
        trigger_count: (workflow.trigger_count || 0) + 1,
      });

      results.push({
        workflow_id: workflow.id,
        workflow_name: workflow.name,
        status: workflowStatus,
        actions_executed: actionsExecuted.length,
      });
    }

    return res.json({
      success: true,
      executed: results.length,
      results,
    });
  } catch (error) {
    console.error('Workflow execution error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

async function executeAction(action, triggerData) {
  const config = action.config || {};

  // Replace template variables
  const replaceVariables = (text) => {
    if (!text) return text;
    return text
      .replace(/\{\{project_name\}\}/g, triggerData.project_name || '')
      .replace(/\{\{customer_name\}\}/g, triggerData.customer_name || '')
      .replace(/\{\{customer_email\}\}/g, triggerData.customer_email || '')
      .replace(/\{\{proposal_title\}\}/g, triggerData.proposal_title || '')
      .replace(/\{\{task_title\}\}/g, triggerData.task_title || '')
      .replace(/\{\{date\}\}/g, new Date().toLocaleDateString());
  };

  switch (action.action_type) {
    case 'send_email': {
      const emailTo = replaceVariables(config.email_to);
      const subject = replaceVariables(config.email_subject);
      const body = replaceVariables(config.email_body);

      // Get email settings
      const settings = await entityService.filter('IntegrationSettings', { setting_key: 'main' });
      const emailConfig = settings[0];

      if (emailConfig?.emailit_enabled) {
        await emailService.send({
          to: emailTo,
          subject: subject,
          body: `<div style="font-family: sans-serif;">${body.replace(/\n/g, '<br>')}</div>`,
        });
      }
      return { sent_to: emailTo };
    }

    case 'send_notification': {
      const message = replaceVariables(config.notification_message);
      return { message, assignee: config.assignee_email };
    }

    case 'create_task': {
      const taskTitle = replaceVariables(config.task_title);
      const taskDesc = replaceVariables(config.task_description);

      const task = await entityService.create('Task', {
        title: taskTitle,
        description: taskDesc,
        project_id: triggerData.project_id,
        assigned_to: config.assignee_email,
        status: 'todo',
        priority: 'medium',
      });
      return { task_id: task.id };
    }

    case 'add_note': {
      const noteContent = replaceVariables(config.note_content);

      if (triggerData.project_id) {
        await entityService.create('ProjectNote', {
          project_id: triggerData.project_id,
          content: noteContent,
          author_email: 'system@workflow',
          author_name: 'Workflow',
          type: 'note',
        });
      }
      return { added: true };
    }

    case 'update_project_status': {
      if (triggerData.project_id && config.new_status) {
        await entityService.update('Project', triggerData.project_id, {
          status: config.new_status,
        });
      }
      return { new_status: config.new_status };
    }

    default:
      return { skipped: true, reason: 'Unknown action type' };
  }
}
