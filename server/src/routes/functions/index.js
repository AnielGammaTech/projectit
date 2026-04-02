import { Router } from 'express';
import authMiddleware from '../../middleware/auth.js';
import { optionalAuth } from '../../middleware/auth.js';
import { webhookLimiter } from '../../middleware/rateLimiter.js';

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
import syncJumpCloudEmployees from './syncJumpCloudEmployees.js';

const router = Router();

// --- Public functions (webhooks/receivers that validate their own secrets) ---
const publicHandlers = {
  incomingWebhook,
  gammaStackReceiver,
  haloPSAWebhook,
  proposalWebhook,
  receiveProposal,
  logProposalView,
};

// --- Authenticated functions (require a valid user session) ---
const authHandlers = {
  executeWorkflow,
  sendEmail,
  sendNotificationEmail,
  sendDueReminders,
  haloPSASync,
  haloPSATicket,
  syncHaloPSACustomers,
  syncHaloPSATickets,
  pullQuoteITQuotes,
  syncQuoteIT,
  linkQuoteToProject,
  quickbooksSync,
  syncHuduCustomers,
  getProjectITData,
  halopsa,
  sendEmailit,
  updateQuoteITStatus,
  haloPSACustomerList,
  resendEmail,
  claudeAI,
  agentBridge,
  giphy,
  sendMfaReminders,
  syncJumpCloudEmployees,
};

// POST /api/functions/:name
router.post('/:name', (req, res, next) => {
  const { name } = req.params;

  const runHandler = (handler) => async () => {
    try {
      await handler(req, res);
    } catch (error) {
      console.error(`Function "${name}" error:`, error);
      if (!res.headersSent) {
        res.status(500).json({ error: error.message });
      }
    }
  };

  if (publicHandlers[name]) {
    // Public handlers validate their own auth (API keys, webhook secrets)
    return webhookLimiter(req, res, () => {
      optionalAuth(req, res, runHandler(publicHandlers[name]));
    });
  }

  if (authHandlers[name]) {
    // Authenticated handlers require a valid user session
    return authMiddleware(req, res, runHandler(authHandlers[name]));
  }

  return res.status(404).json({ error: `Function "${name}" not found` });
});

export default router;
