import ActivityFeed from './pages/ActivityFeed';
import Adminland from './pages/Adminland';
import AllTasks from './pages/AllTasks';
import AuditLogs from './pages/AuditLogs';
import ChangeOrderEditor from './pages/ChangeOrderEditor';
import Customers from './pages/Customers';
import Dashboard from './pages/Dashboard';
import FeedbackManagement from './pages/FeedbackManagement';
import Home from './pages/Home';
import Inventory from './pages/Inventory';
import ManagerDashboard from './pages/ManagerDashboard';
import MyAssignments from './pages/MyAssignments';
import MyNotifications from './pages/MyNotifications';
import MySchedule from './pages/MySchedule';
import NotificationSettings from './pages/NotificationSettings';
import Profile from './pages/Profile';
import ProjectBilling from './pages/ProjectBilling';
import ProjectDetail from './pages/ProjectDetail';
import ProjectFiles from './pages/ProjectFiles';
import ProjectNotes from './pages/ProjectNotes';
import ProjectParts from './pages/ProjectParts';
import ProjectStatuses from './pages/ProjectStatuses';
import ProjectTasks from './pages/ProjectTasks';
import ProjectTime from './pages/ProjectTime';
import ProjectTimeline from './pages/ProjectTimeline';
import QuoteRequests from './pages/QuoteRequests';
import ReportBuilder from './pages/ReportBuilder';
import Reports from './pages/Reports';
import RolesPermissions from './pages/RolesPermissions';
import SecuritySettings from './pages/SecuritySettings';
import Settings from './pages/Settings';
import Team from './pages/Team';
import TechDashboard from './pages/TechDashboard';
import Templates from './pages/Templates';
import TimeReport from './pages/TimeReport';
import UserGroups from './pages/UserGroups';
import Workflows from './pages/Workflows';
import __Layout from './Layout.jsx';


export const PAGES = {
    "ActivityFeed": ActivityFeed,
    "Adminland": Adminland,
    "AllTasks": AllTasks,
    "AuditLogs": AuditLogs,
    "ChangeOrderEditor": ChangeOrderEditor,
    "Customers": Customers,
    "Dashboard": Dashboard,
    "FeedbackManagement": FeedbackManagement,
    "Home": Home,
    "Inventory": Inventory,
    "ManagerDashboard": ManagerDashboard,
    "MyAssignments": MyAssignments,
    "MyNotifications": MyNotifications,
    "MySchedule": MySchedule,
    "NotificationSettings": NotificationSettings,
    "Profile": Profile,
    "ProjectBilling": ProjectBilling,
    "ProjectDetail": ProjectDetail,
    "ProjectFiles": ProjectFiles,
    "ProjectNotes": ProjectNotes,
    "ProjectParts": ProjectParts,
    "ProjectStatuses": ProjectStatuses,
    "ProjectTasks": ProjectTasks,
    "ProjectTime": ProjectTime,
    "ProjectTimeline": ProjectTimeline,
    "QuoteRequests": QuoteRequests,
    "ReportBuilder": ReportBuilder,
    "Reports": Reports,
    "RolesPermissions": RolesPermissions,
    "SecuritySettings": SecuritySettings,
    "Settings": Settings,
    "Team": Team,
    "TechDashboard": TechDashboard,
    "Templates": Templates,
    "TimeReport": TimeReport,
    "UserGroups": UserGroups,
    "Workflows": Workflows,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};