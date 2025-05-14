import jwtDecode from "jwt-decode";
import React, { useEffect, useState } from "react";
import { Route, Routes, Navigate } from "react-router-dom";
import Resetpw from "./pages/Authentication/Resetpw";
import SignIn from "./pages/Authentication/SignIn";
import SignUp from "./pages/Authentication/SignUp";
import Calendar from "./pages/Calendar";
import AdvancedChart from "./pages/Chart/AdvancedChart";
import BasicChart from "./pages/Chart/BasicChart";
import Analytics from "./pages/Dashboard/Analytics";
import Kanban from "./pages/Kanban";

import ErrorPage from "./pages/Pages/ErrorPage";

import PricingTables from "./pages/Pages/PricingTables";
import Settings from "./pages/Pages/Settings";
import Profile from "./pages/Profile";
import ProjectList from "./pages/Projects/ProjectList";
import TaskList from "./pages/Projects/TaskList";
import Roles from "./pages/Roles";
import Tables from "./pages/Tables";

import Users from "./pages/Users";
import { setUser } from "./redux/reducers/auth";
import { store } from "./redux/store";

import axios from "axios";
import { useDispatch, useSelector } from "react-redux";
import io from "socket.io-client";
import { setAuthToken } from "./lib/setAuthToken";
import Reset from "./pages/Authentication/Reset";
import Unauthorized from "./pages/Unauthorized";
import { Logout } from "./redux/actions/auth";
import { notificationSlice } from "./redux/reducers/notifications";
import TeamsAdmin from "./pages/Teams/teamAdmin";
import UserTeamsOverview from "./pages/Teams/teamsOverview";
import TeamLayout from "./pages/Teams/teamlayout";

import ChatBot from './components/ChatBot/ChatBot';
import GameHub from "./components/Games";
import Chat from "./pages/Chat/Chatindex";

import AdminDashboard from "./pages/ChatAdmin/AdminDashboard";
import AdminChatManagement from "./pages/ChatAdmin/AdminChatManagement";
import RoomDetails from "./pages/ChatAdmin/RoomDetails";
import chatSocketService, { socketClient } from "./services/chatSocketService";

// Check for token and set auth state
if (localStorage.token) {
  const decoded = jwtDecode(localStorage.token);
  store.dispatch(setUser(decoded));
  setAuthToken(localStorage.token);
  const current_date = Date.now() / 1000;
  if (current_date > decoded.exp) {
    store.dispatch(Logout());
  }
}

const App = () => {
  const [loading, setLoading] = useState(true);
  const { isConnected, user } = useSelector((e) => e.auth);

  const preloader = document.getElementById("preloader");
  const dispatch = useDispatch();

  if (preloader) {
    setTimeout(() => {
      preloader.style.display = "none";
      setLoading(false);
    }, 2000);
  }

  useEffect(() => {
    setTimeout(() => setLoading(false), 1000);
  }, []);

  useEffect(() => {
    if (isConnected) {
      axios
        .get("/api/notifications")
        .then((n) => {
          dispatch(notificationSlice.actions.addNotifications(n.data));
        })
        .catch((e) => console.log(e));
      
      // If connected, connect this user to socket server
      socketClient.auth = { token: localStorage.getItem('token') };
      socketClient.connect();
      
      socketClient.on("connect", () => {
        socketClient.emit("connected_client", user.id);
      });
      
      socketClient.on("notification", (n) => {
        dispatch(notificationSlice.actions.addNotifications(n));
      });
    } else {
      // Disconnect if not authenticated
      if (socketClient.connected) socketClient.disconnect();
      
      // Check if we're not already on an auth page and redirect if needed
      const currentPath = window.location.pathname;
      const authPaths = ['/auth/signin', '/auth/signup', '/auth/resetpw', '/reset', '/unauthorized'];
      
      if (!authPaths.includes(currentPath.toLowerCase())) {
        // Redirect to signin page when not authenticated
        window.location.href = "/auth/SignIn";
      }
    }
    
    // Clean up event listeners
    return () => {
      socketClient.off("connect");
      socketClient.off("notification");
    };
  }, [isConnected, user]);

  // Protected route wrapper
  const RequireAuth = ({ children }) => {
    return isConnected ? children : <Navigate to="/auth/signin" />;
  };

  return (
    !loading && (
      <>
        <Routes>
          {/* Public routes (accessible without authentication) */}
          <Route path="/auth/signin" element={<SignIn />} />
          <Route path="/auth/signup" element={<SignUp />} />
          <Route path="/auth/resetpw" element={<Resetpw />} />
          <Route path="/reset" element={<Reset />} />
          <Route path="/unauthorized" element={<Unauthorized />} />
          
          {/* Protected routes (require authentication) */}
          <Route path="/" element={
            <RequireAuth>
              <Profile />
            </RequireAuth>
          } />
          
          <Route path="/admin" element={
            <RequireAuth>
              <Analytics />
            </RequireAuth>
          } />
          
          <Route path="/calendar" element={
            <RequireAuth>
              <Calendar />
            </RequireAuth>
          } />
          
          <Route path="/kanban" element={
            <RequireAuth>
              <Kanban />
            </RequireAuth>
          } />
          
          <Route path="/tables" element={
            <RequireAuth>
              <Tables />
            </RequireAuth>
          } />
          
          <Route path="/settings" element={
            <RequireAuth>
              <Settings />
            </RequireAuth>
          } />
          
          <Route path="/pages/pricing-tables" element={
            <RequireAuth>
              <PricingTables />
            </RequireAuth>
          } />
          
          <Route path="/projects/task-list" element={
            <RequireAuth>
              <TaskList />
            </RequireAuth>
          } />
          
          <Route path="/TeamsManagment" element={
            <RequireAuth>
              <TeamsAdmin />
            </RequireAuth>
          } />

          <Route path="/teams" element={
            <RequireAuth>
              <UserTeamsOverview />
            </RequireAuth>
          } />

        

         <Route path="/teams/:teamId/*" element={
            <RequireAuth>
              <TeamLayout />
            </RequireAuth>
          } />

          
          <Route path="/projects/project-list" element={
            <RequireAuth>
              <ProjectList />
            </RequireAuth>
          } />
          
          <Route path="/users" element={
            <RequireAuth>
              <Users />
            </RequireAuth>
          } />
          
          <Route path="/roles" element={
            <RequireAuth>
              <Roles />
            </RequireAuth>
          } />
          
          <Route path="/chart/basic-chart" element={
            <RequireAuth>
              <BasicChart />
            </RequireAuth>
          } />
          
          <Route path="/chart/advanced-chart" element={
            <RequireAuth>
              <AdvancedChart />
            </RequireAuth>
          } />
          
          <Route path="/profile" element={
            <RequireAuth>
              <Profile />
            </RequireAuth>
          } />
          
          <Route path="/games" element={
            <RequireAuth>
              <GameHub />
            </RequireAuth>
          } />
          
          <Route path="/chat/*" element={
            <RequireAuth>
              <Chat />
            </RequireAuth>
          } />
          
          <Route path="/chatadmin" element={
            <RequireAuth>
              <AdminDashboard />
            </RequireAuth>
          } />
          
          <Route path="/chatadmin/manage" element={
            <RequireAuth>
              <AdminChatManagement />
            </RequireAuth>
          } />
          
          <Route path="/chatadmin/rooms/:roomId" element={
            <RequireAuth>
              <RoomDetails />
            </RequireAuth>
          } />
          
          {/* 404 route */}
          <Route path="/*" element={<ErrorPage />} />
        </Routes>
        <ChatBot />
      </>
    )
  );
};

export default App;