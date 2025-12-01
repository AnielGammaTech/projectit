import Dashboard from './pages/Dashboard';
import ProjectDetail from './pages/ProjectDetail';
import Team from './pages/Team';
import AllTasks from './pages/AllTasks';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "ProjectDetail": ProjectDetail,
    "Team": Team,
    "AllTasks": AllTasks,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};