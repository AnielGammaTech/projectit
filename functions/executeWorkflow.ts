import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const body = await req.json();
    const { trigger_type, trigger_data } = body;

    if (!trigger_type) {
      return Response.json({ error: 'trigger_type is required' }, { status: 400 });
    }

    // Get all active workflows for this trigger
    const workflows = await base44.asServiceRole.entities.Workflow.filter({ 
      trigger_type: trigger_type,
      is_active: true 
    });

    if (workflows.length === 0) {
      return Response.json({ success: true, message: 'No active workflows for this trigger', executed: 0 });
    }

    const results = [];

    for (const workflow of workflows) {
      const actionsExecuted = [];
      let workflowStatus = 'success';

      for (const action of workflow.actions || []) {
        try {
          const result = await executeAction(base44, action, trigger_data);
          actionsExecuted.push({
            action_type: action.action_type,
            status: 'success',
            result
          });
        } catch (error) {
          actionsExecuted.push({
            action_type: action.action_type,
            status: 'failed',
            error: error.message
          });
          workflowStatus = 'partial';
        }
      }

      // Log the execution
      await base44.asServiceRole.entities.WorkflowLog.create({
        workflow_id: workflow.id,
        workflow_name: workflow.name,
        trigger_type: trigger_type,
        trigger_data: trigger_data,
        actions_executed: actionsExecuted,
        status: workflowStatus
      });

      // Update workflow stats
      await base44.asServiceRole.entities.Workflow.update(workflow.id, {
        last_triggered: new Date().toISOString(),
        trigger_count: (workflow.trigger_count || 0) + 1
      });

      results.push({
        workflow_id: workflow.id,
        workflow_name: workflow.name,
        status: workflowStatus,
        actions_executed: actionsExecuted.length
      });
    }

    return Response.json({ 
      success: true, 
      executed: results.length,
      results 
    });

  } catch (error) {
    console.error('Workflow execution error:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});

async function executeAction(base44, action, triggerData) {
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
      const settings = await base44.asServiceRole.entities.IntegrationSettings.filter({ setting_key: 'main' });
      const emailConfig = settings[0];
      
      if (emailConfig?.emailit_enabled) {
        // Send via our email function
        await base44.asServiceRole.functions.invoke('sendEmailit', {
          to: emailTo,
          subject: subject,
          html: `<div style="font-family: sans-serif;">${body.replace(/\n/g, '<br>')}</div>`
        });
      }
      return { sent_to: emailTo };
    }

    case 'send_notification': {
      // For now, notifications would be stored or sent via email
      // Could integrate with push notifications later
      const message = replaceVariables(config.notification_message);
      return { message, assignee: config.assignee_email };
    }

    case 'create_task': {
      const taskTitle = replaceVariables(config.task_title);
      const taskDesc = replaceVariables(config.task_description);
      
      const task = await base44.asServiceRole.entities.Task.create({
        title: taskTitle,
        description: taskDesc,
        project_id: triggerData.project_id,
        assigned_to: config.assignee_email,
        status: 'todo',
        priority: 'medium'
      });
      return { task_id: task.id };
    }

    case 'add_note': {
      const noteContent = replaceVariables(config.note_content);
      
      if (triggerData.project_id) {
        await base44.asServiceRole.entities.ProjectNote.create({
          project_id: triggerData.project_id,
          content: noteContent,
          author_email: 'system@workflow',
          author_name: 'Workflow',
          type: 'note'
        });
      }
      return { added: true };
    }

    case 'update_project_status': {
      if (triggerData.project_id && config.new_status) {
        await base44.asServiceRole.entities.Project.update(triggerData.project_id, {
          status: config.new_status
        });
      }
      return { new_status: config.new_status };
    }

    default:
      return { skipped: true, reason: 'Unknown action type' };
  }
}