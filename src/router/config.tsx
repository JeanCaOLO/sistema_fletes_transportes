import type { RouteObject } from "react-router-dom";
import NotFound from "../pages/NotFound";
import Dashboard from "../pages/dashboard/page";
import Login from "../pages/auth/login/page";

const routes: RouteObject[] = [
  {
    path: "/",
    element: <Login />,
  },
  {
    path: "/dashboard",
    element: <Dashboard />,
  },
  {
    path: "*",
    element: <NotFound />,
  },
];

export default routes;