import Dashboard from './pages/Dashboard';
import ProjectDetail from './pages/ProjectDetail';
import Team from './pages/Team';
import AllTasks from './pages/AllTasks';


export const PAGES = {
    "Dashboard": Dashboard,
    "ProjectDetail": ProjectDetail,
    "Team": Team,
    "AllTasks": AllTasks,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
};