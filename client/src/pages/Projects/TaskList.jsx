// TaskList.jsx - Updated version with search and filter functionality
import React, { useEffect, useState } from "react";
import DefaultLayout from "../../layout/DefaultLayout";
import Breadcrumb from "../../components/Breadcrumb";
import TaskHeader from "../../components/TaskHeader";
import ToDoList from "../../components/ToDoList";
import { UseAuth } from "../../hooks/useAuth";
import { ROLES } from "../../data/roles";
import { useDispatch } from "react-redux";

const TaskList = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    priority: "",
    type: "",
    status: "",
    project: ""
  });

  // Function to handle search term updates
  const handleSearch = (term) => {
    setSearchTerm(term);
  };

  // Function to handle filter changes
  const handleFilterChange = (filterType, value) => {
    setFilters({
      ...filters,
      [filterType]: value
    });
  };

  return (
    <DefaultLayout>
      <div className="mx-auto max-w-5xl">
        <Breadcrumb pageName="TaskList" />

        {/* <!-- Task Header with Search and Filters --> */}
        <TaskHeader 
          searchTerm={searchTerm}
          onSearchChange={handleSearch}
          filters={filters}
          onFilterChange={handleFilterChange}
        />
        <br></br>
        
        {/* <!-- Task List with Filtering Applied --> */}
        <ToDoList 
          searchTerm={searchTerm}
          filters={filters}
        />
        <br></br>
      </div>
    </DefaultLayout>
  );
};

export default UseAuth(
  TaskList,
  ROLES.filter((r) => r.title != "ENGINEER").map((i) => i.title)
);