import React, { useEffect, useState } from "react";
import Breadcrumb from "../components/Breadcrumb";
import DefaultLayout from "../layout/DefaultLayout";
import DataTableOne from "../components/DataTableOne";
import UserHeader from "../components/UserHeader";
import { useDispatch, useSelector } from "react-redux";
import { FindUsers } from "../redux/actions/users";
import { UseAuth } from "../hooks/useAuth";
import { checkAuthHeaders } from "../lib/setAuthToken"; // Import the auth check utility

const Users = () => {
  const [popupOpen, setPopupOpen] = useState(false);
  const { _ALL } = useSelector((state) => state.users);
  const { user, isConnected } = useSelector((state) => state.auth);
  const dispatch = useDispatch();

  // Check authentication state before making API calls
  useEffect(() => {
    const fetchData = async () => {
      // Ensure auth headers are set correctly before API calls
      checkAuthHeaders();
      
      // Log auth state for debugging
      console.log("[Users Page] Auth state:", { 
        isConnected, 
        userExists: !!user,
        userId: user?.id
      });
      
      if (isConnected && user) {
        console.log("[Users Page] Fetching users data");
        dispatch(FindUsers());
      } else {
        console.warn("[Users Page] Not connected or missing user data");
      }
    };
    
    fetchData();
  }, [dispatch, isConnected, user]);

  return (
    <DefaultLayout>
      <Breadcrumb pageName="Users" />

      {/* <!-- User Header Start --> */}
      <UserHeader
        status={true}
        popupOpen={popupOpen}
        setPopupOpen={setPopupOpen}
      />
      {/* <!-- User Header End --> */}
      <br />
      <div className="flex flex-col gap-5 md:gap-7 2xl:gap-10">
        <DataTableOne
          data={Array.isArray(_ALL) ? _ALL : []}
          popupOpen={popupOpen}
          setPopupOpen={setPopupOpen}
        />
      </div>
    </DefaultLayout>
  );
};

export default UseAuth(Users, ["ADMIN"]);