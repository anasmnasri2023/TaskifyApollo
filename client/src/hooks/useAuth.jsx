/*import { useSelector } from "react-redux";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export const UseAuth = (Component, inRole) => {
  const AuthComponent = (props) => {
    const navigate = useNavigate();
    const { isConnected, user } = useSelector((state) => state.auth);
    useEffect(() => {
      if (!isConnected) {
        return navigate("/auth/SignIn");
      } else {
        if (
          !inRole ||
          (inRole && !inRole.some((role) => user.roles.includes(role)))
        ) {
          return navigate("/unauthorized");
        }
      }
    }, [navigate]);
    return <Component {...props} />;
  };
  return AuthComponent;
};*/
// src/hooks/useAuth.js
/*import { useSelector } from "react-redux";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export const UseAuth = (Component, inRole) => {
  const AuthComponent = (props) => {
    const navigate = useNavigate();
    const { isConnected, user } = useSelector((state) => state.auth);

    useEffect(() => {
      // If user is not connected, redirect to login
      if (!isConnected) {
        return navigate("/auth/SignIn");
      } 
      
      // If user is an ADMIN, always grant access regardless of specific roles
      if (user && user.roles && user.roles.includes("ADMIN")) {
        // Admin has access to everything, no redirect needed
        return;
      }
      
      // For non-admin users, check if they have any of the required roles
      if (inRole && inRole.length > 0) {
        // Check if user has at least one of the required roles
        const hasRequiredRole = inRole.some((role) => 
          user && user.roles && user.roles.includes(role)
        );
        
        if (!hasRequiredRole) {
          return navigate("/unauthorized");
        }
      }
    }, [navigate, isConnected, user, inRole]);

    return <Component {...props} />;
  };

  return AuthComponent;
};*/
// src/hooks/useAuth.js
import { useSelector } from "react-redux";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

// Helper to normalize role names for comparison
const normalizeRole = (role) => role.toUpperCase();

export const UseAuth = (Component, inRole) => {
  const AuthComponent = (props) => {
    const navigate = useNavigate();
    const { isConnected, user } = useSelector((state) => state.auth);

    useEffect(() => {
      // If user is not connected, redirect to login
      if (!isConnected) {
        return navigate("/auth/SignIn");
      } 
      
      // If no roles are required, allow access
      if (!inRole || inRole.length === 0) {
        return;
      }
      
      // Ensure user has roles property
      if (!user || !user.roles || !Array.isArray(user.roles)) {
        return navigate("/unauthorized");
      }
      
      // Normalize user roles
      const normalizedUserRoles = user.roles.map(normalizeRole);
      
      // Check if user has ADMIN role (allow access to everything)
      if (normalizedUserRoles.includes('ADMIN')) {
        return; // Admin has access to everything
      }
      
      // Normalize required roles
      const normalizedRequiredRoles = inRole.map(normalizeRole);
      
      // Check if user has any of the required roles
      const hasRequiredRole = normalizedRequiredRoles.some(requiredRole => 
        normalizedUserRoles.includes(requiredRole)
      );
      
      if (!hasRequiredRole) {
        return navigate("/unauthorized");
      }
    }, [navigate, isConnected, user, inRole]);

    return <Component {...props} />;
  };

  return AuthComponent;
};
/*import { useSelector } from "react-redux";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

// Helper to normalize role names for comparison
const normalizeRole = (role) => role.toUpperCase();

export const UseAuth = (Component, inRole) => {
  const AuthComponent = (props) => {
    const navigate = useNavigate();
    const { isConnected, user } = useSelector((state) => state.auth);

    useEffect(() => {
      // If user is not connected, redirect to login
      if (!isConnected) {
        return navigate("/auth/SignIn");
      } 
      
      // If no roles are required, allow access
      if (!inRole || inRole.length === 0) {
        return;
      }
      
      // Ensure user has roles property
      if (!user || !user.roles || !Array.isArray(user.roles)) {
        return navigate("/unauthorized");
      }
      
      // Normalize user roles
      const normalizedUserRoles = user.roles.map(normalizeRole);
      
      // Check if user has ADMIN role (allow access to everything)
      if (normalizedUserRoles.includes('ADMIN')) {
        return; // Admin has access to everything
      }
      
      // Normalize required roles
      const normalizedRequiredRoles = inRole.map(normalizeRole);
      
      // Check if user has any of the required roles
      const hasRequiredRole = normalizedRequiredRoles.some(requiredRole => 
        normalizedUserRoles.includes(requiredRole)
      );
      
      if (!hasRequiredRole) {
        return navigate("/unauthorized");
      }
    }, [navigate, isConnected, user, inRole]);

    // Return the actual component if all checks pass
    return <Component {...props} />;
  };

  return AuthComponent;
};*/