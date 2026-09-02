import { Routes, Route, Navigate } from "react-router-dom";

import Landing from "../pages/Landing";
import Login from "../pages/Login/Login";
import Register from "../pages/Register/Register";
import Dashboard from "../pages/Dashboard/Dashboard";
import CreatePipeline from "../pages/CreatePipeline";
import Upload from "../pages/Upload/Upload";
import Processing from "../pages/Processing";
import Pipelines from "../pages/Pipelines";
import PipelineDetails from "../pages/PipelineDetails";
import Settings from "../pages/Settings";
import ProtectedRoute from "../components/ProtectedRoute";

function AppRoutes() {
  return (
    <Routes>
      {/* Public Landing & Auth Routes */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Protected SaaS Application Routes */}
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/create-pipeline" element={<CreatePipeline />} />
        <Route path="/upload" element={<Upload />} />
        <Route path="/processing/:jobId" element={<Processing />} />
        <Route path="/pipelines" element={<Pipelines />} />
        <Route path="/pipelines/:id" element={<PipelineDetails />} />
        <Route path="/settings" element={<Settings />} />
      </Route>

      {/* Fallback 404 Route */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default AppRoutes;