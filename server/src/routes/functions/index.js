import { Router } from 'express';

// Import all function handlers
import executeWorkflow from './executeWorkflow.js';
import sendEmail from './sendEmail.js';
import sendNotificationEmail from './sendNotificationEmail.js';
import sendDueReminders from './sendDueReminders.js';
import haloPSASync from './haloPSASync.js';
import haloPSATicket from './haloPSATicket.js';
import haloPSAWebhook from './haloPSAWebhook.js';
import syncHaloPSACustomers from './syncHaloPSACustomers.js';
import syncHaloPSATickets from './syncHaloPSATickets.js';
import pullQuoteITQuotes from './pullQuoteITQuotes.js';
import syncQuoteIT from './syncQuoteIT.js';
import linkQuoteToProject from './linkQuoteToProject.js';
import quickbooksSync from './quickbooksSync.js';
import syncHuduCustomers from './syncHuduCustomers.js';
import incomingWebhook from './incomingWebhook.js';
import gammaStackReceiver from './gammaStackReceiver.js';
import getProjectITData from './getProjectITData.js';
import halopsa from './halopsa.js';
import sendEmailit from './sendEmailit.js';
import logProposalView from './logProposalView.js';
import proposalWebhook from './proposalWebhook.js';
import receiveProposal from './receiveProposal.js';
import updateQuoteITStatus from './updateQuoteITStatus.js';
import haloPSACustomerList from './haloPSACustomerList.js';
import resendEmail from './resendEmail.js';
import claudeAI from './claudeAI.js';
import agentBridge from './agentBridge.js';
import giphy from './giphy.js';
import sendMfaReminders from './sendMfaReminders.js';

const router = Router();

// Map function names to handlers
const handlers = {
  executeWorkflow,
  sendEmail,
  sendNotificationEmail,
  sendDueReminders,
  haloPSASync,
  haloPSATicket,
  haloPSAWebhook,
  syncHaloPSACustomers,
  syncHaloPSATickets,
  pullQuoteITQuotes,
  syncQuoteIT,
  linkQuoteToProject,
  quickbooksSync,
  syncHuduCustomers,
  incomingWebhook,
  gammaStackReceiver,
  getProjectITData,
  halopsa,
  sendEmailit,
  logProposalView,
  proposalWebhook,
  receiveProposal,
  updateQuoteITStatus,
  haloPSACustomerList,
  resendEmail,
  claudeAI,
  agentBridge,
  giphy,
  sendMfaReminders,
};

// POST /api/functions/:name
router.post('/:name', async (req, res) => {
  const { name } = req.params;
  const handler = handlers[name];

  if (!handler) {
    return res.status(404).json({ error: `Function "${name}" not found` });
  }

  try {
    await handler(req, res);
  } catch (error) {
    console.error(`Function "${name}" error:`, error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    }
  }
});

export default router;
