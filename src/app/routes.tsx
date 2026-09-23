import { Navigate, type RouteObject } from "react-router";
import { InboxView, TodayView, UpcomingView } from "../views/Lists";
import { FocusView, HabitsView, InsightsView, NotFound, SettingsView } from "../views/Other";
import { ProjectView } from "../views/Project";
import { Shell } from "./Shell";

export const routes: RouteObject[] = [
  {
    element: <Shell />,
    children: [
      { index: true, element: <Navigate to="/today" replace /> },
      { path: "today", element: <TodayView /> },
      { path: "upcoming", element: <UpcomingView /> },
      { path: "inbox", element: <InboxView /> },
      { path: "projects/:id", element: <ProjectView /> },
      { path: "focus", element: <FocusView /> },
      { path: "habits", element: <HabitsView /> },
      { path: "insights", element: <InsightsView /> },
      { path: "settings", element: <SettingsView /> },
      { path: "*", element: <NotFound /> },
    ],
  },
];
