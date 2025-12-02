import Dashboard from './pages/Dashboard';
import ProjectDetail from './pages/ProjectDetail';
import Team from './pages/Team';
import AllTasks from './pages/AllTasks';
import Templates from './pages/Templates';
import UserGroups from './pages/UserGroups';
import ProjectTasks from './pages/ProjectTasks';
import ProjectParts from './pages/ProjectParts';
import ProjectNotes from './pages/ProjectNotes';
import ProjectFiles from './pages/ProjectFiles';
import Settings from './pages/Settings';
import Reports from './pages/Reports';
import NotificationSettings from './pages/NotificationSettings';
import QuoteRequests from './pages/QuoteRequests';
import Inventory from './pages/Inventory';
import Adminland from './pages/Adminland';
import TimeReport from './pages/TimeReport';
import Profile from './pages/Profile';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "ProjectDetail": ProjectDetail,
    "Team": Team,
    "AllTasks": AllTasks,
    "Templates": Templates,
    "UserGroups": UserGroups,
    "ProjectTasks": ProjectTasks,
    "ProjectParts": ProjectParts,
    "ProjectNotes": ProjectNotes,
    "ProjectFiles": ProjectFiles,
    "Settings": Settings,
    "Reports": Reports,
    "NotificationSettings": NotificationSettings,
    "QuoteRequests": QuoteRequests,
    "Inventory": Inventory,
    "Adminland": Adminland,
    "TimeReport": TimeReport,
    "Profile": Profile,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};