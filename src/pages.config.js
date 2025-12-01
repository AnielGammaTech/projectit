import Dashboard from './pages/Dashboard';
import ProjectDetail from './pages/ProjectDetail';
import Team from './pages/Team';
import AllTasks from './pages/AllTasks';
import Templates from './pages/Templates';
import UserGroups from './pages/UserGroups';
import ProjectTasks from './pages/ProjectTasks';
import ProjectParts from './pages/ProjectParts';
import ProjectNotes from './pages/ProjectNotes';
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
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};