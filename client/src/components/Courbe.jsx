import React, { useState, useEffect } from "react";
import axios from "axios";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const Courbe = () => {
  const [monthlyData, setMonthlyData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/api/projects");
      const projects = response.data.data || [];
      
      // Process data by month
      const monthlyStats = processProjectsByMonth(projects);
      setMonthlyData(monthlyStats);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching projects for statistics:", error);
      setLoading(false);
    }
  };

  // Process projects into monthly data
  const processProjectsByMonth = (projects) => {
    // Get date range from Jan 2024 to Dec 2025
    const months = [];
    for (let year = 2024; year <= 2025; year++) {
      for (let month = 0; month < 12; month++) {
        months.push({
          date: new Date(year, month, 1),
          name: new Date(year, month, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          completed: 0,
          inProgress: 0,
          onHold: 0
        });
      }
    }

    // Count projects by start_date and status
    projects.forEach(project => {
      if (!project.start_date) return;

      const startDate = new Date(project.start_date);
      // Ensure the date is valid
      if (isNaN(startDate.getTime())) return;

      const monthIndex = months.findIndex(m => 
        m.date.getMonth() === startDate.getMonth() && 
        m.date.getFullYear() === startDate.getFullYear()
      );

      if (monthIndex !== -1) {
        if (project.status === "completed") {
          months[monthIndex].completed += 1;
        } else if (project.status === "in progress") {
          months[monthIndex].inProgress += 1;
        } else if (project.status === "on hold") {
          months[monthIndex].onHold += 1;
        }
      }
    });

    // Filter out months with no data, but ensure at least 12 months are shown
    let firstDataMonth = -1;
    let lastDataMonth = -1;
    
    // Find first and last months with data
    for (let i = 0; i < months.length; i++) {
      const month = months[i];
      if (month.completed > 0 || month.inProgress > 0 || month.onHold > 0) {
        if (firstDataMonth === -1) firstDataMonth = i;
        lastDataMonth = i;
      }
    }
    
    // If no data, return first 12 months
    if (firstDataMonth === -1) return months.slice(0, 12);
    
    // Return months between first and last data points, with at least 12 months
    const startSlice = Math.max(0, firstDataMonth - 1);
    const endSlice = Math.min(months.length, Math.max(startSlice + 12, lastDataMonth + 2));
    
    return months.slice(startSlice, endSlice);
  };

  return (
    <div className="rounded-sm border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
      <h2 className="mb-6 text-xl font-semibold text-black dark:text-white">
        Project Statistics
      </h2>
      
      <div className="flex flex-wrap gap-8 mb-8">
        {/* Completed Circle */}
        <div className="flex items-center gap-3">
          <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-blue-900 bg-white">
            <div className="h-3 w-3 rounded-full bg-blue-900"></div>
          </div>
          <div>
            <p className="font-medium text-black dark:text-white">Completed</p>
          </div>
        </div>
        
        {/* In Progress Circle */}
        <div className="flex items-center gap-3">
          <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-blue-300 bg-white">
            <div className="h-3 w-3 rounded-full bg-blue-300"></div>
          </div>
          <div>
            <p className="font-medium text-black dark:text-white">In Progress</p>
          </div>
        </div>
        
        {/* On Hold Circle */}
        <div className="flex items-center gap-3">
          <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-gray-400 bg-white">
            <div className="h-3 w-3 rounded-full bg-gray-400"></div>
          </div>
          <div>
            <p className="font-medium text-black dark:text-white">On Hold</p>
          </div>
        </div>
      </div>
      
      {/* Bar Chart */}
      <div className="h-80 w-full">
        {loading ? (
          <div className="flex h-full w-full items-center justify-center">
            <p>Loading data...</p>
          </div>
        ) : monthlyData.length === 0 ? (
          <div className="flex h-full w-full items-center justify-center">
            <p>No data available</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={monthlyData}
              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                angle={-45} 
                textAnchor="end"
                height={70}
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                label={{ 
                  value: 'Number of Projects', 
                  angle: -90, 
                  position: 'insideLeft',
                  style: { textAnchor: 'middle' }
                }} 
              />
              <Tooltip />
              <Legend />
              <Bar dataKey="completed" name="Completed" fill="#1e3a8a" /> {/* bleu marine */}
              <Bar dataKey="inProgress" name="In Progress" fill="#93c5fd" /> {/* bleu ciel */}
              <Bar dataKey="onHold" name="On Hold" fill="#9ca3af" /> {/* gris */}
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default Courbe;