import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./components/context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Signup from "./pages/Register";
import Home from "./pages/Home";
import { Builder } from "./pages/Builder";
import { Planning } from "./pages/Planning";
import { ProjectTypeSelection } from "./pages/ProjectTypeSelection";
import { AgentBuilder } from "./pages/AgentBuilder";
import { ProjectHistory } from "./pages/ProjectHistory";
import { ProjectUpload } from "./pages/ProjectUpload";
import { WebContainerConnect } from "./pages/WebContainerConnect";
import { WebContainerProvider } from "./hooks/useWebContainer.tsx";

const App = () => {
  return (
    <WebContainerProvider>
      <Router>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            {/* WebContainer connect handler for new tab redirects */}
            <Route path="/webcontainer/connect/:sessionId" element={<WebContainerConnect />} />

            <Route path="/dashboard" element={<ProtectedRoute />}>
              <Route index element={<ProjectTypeSelection />} />
            </Route>

            <Route element={<ProtectedRoute />}>
              <Route path="/select" element={<ProjectTypeSelection />} />
              <Route path="/planning" element={<Planning />} />
              <Route path="/builder" element={<Builder />} />
              <Route path="/agent" element={<AgentBuilder />} />
              <Route path="/projects" element={<ProjectHistory />} />
              <Route path="/upload" element={<ProjectUpload />} />
            </Route>

            <Route path="*" element={
              <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a0a] text-white">
                <h1 className="text-3xl font-bold mb-4">404 Not Found</h1>
                <p className="mb-4 text-gray-400">The page you're looking for doesn't exist.</p>
                <button
                  onClick={() => window.location.href = "/"}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                >
                  Go Home
                </button>
              </div>
            } />
          </Routes>
        </AuthProvider>
      </Router>
    </WebContainerProvider>
  );
};

export default App;

