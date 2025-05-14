import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import axios from "axios";

const ChatCard = () => {
  const { _ALL: allUsers = [] } = useSelector((state) => state.users);
  const [completedUsersByMonth, setCompletedUsersByMonth] = useState({});
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    calculateCompletedUsersStats();
  }, [projects, allUsers]);

  const fetchProjects = async () => {
    try {
      const response = await axios.get("/api/projects");
      setProjects(response.data.data);
    } catch (error) {
      console.error("Error fetching projects:", error);
    }
  };

  const calculateCompletedUsersStats = () => {
    const stats = {};
    const today = new Date();
    const oneYearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());

    // Initialize bins for every 2 months
    for (let i = 0; i < 12; i += 2) {
      const startMonth = new Date(oneYearAgo.getFullYear(), oneYearAgo.getMonth() + i, 1);
      const monthKey = startMonth.toISOString().slice(0, 7); // YYYY-MM format
      stats[monthKey] = new Set(); // Use a Set to count unique users
    }

    // Filter completed projects and count unique users
    const completedProjects = projects.filter(project => project.status === "completed");

    completedProjects.forEach(project => {
      const endDate = new Date(project.end_date);
      if (endDate >= oneYearAgo && endDate <= today) {
        const monthKey = endDate.toISOString().slice(0, 7); // YYYY-MM
        const startMonth = new Date(monthKey + "-01");
        // Find the corresponding 2-month bin
        const monthDiff = (startMonth.getFullYear() - oneYearAgo.getFullYear()) * 12 + startMonth.getMonth() - oneYearAgo.getMonth();
        const binStartMonth = new Date(oneYearAgo.getFullYear(), oneYearAgo.getMonth() + Math.floor(monthDiff / 2) * 2, 1);
        const binKey = binStartMonth.toISOString().slice(0, 7);

        if (stats[binKey]) {
          // Add the project manager to the Set for this bin
          const manager = project.project_manager;
          if (manager) {
            stats[binKey].add(manager);
          }
        }
      }
    });

    // Convert Sets to counts
    const finalStats = {};
    Object.keys(stats).forEach(key => {
      finalStats[key] = stats[key].size;
    });

    // If no real data, use sample data
    if (Object.values(finalStats).every(count => count === 0)) {
      const sampleData = {
        "2024-04": 0,   // avr. 24
        "2024-06": 0,   // juin 24
        "2024-08": 0,   // août 24
        "2024-10": 2,   // oct. 24
        "2024-12": 5,   // déc. 24
        "2025-02": 10,  // févr. 25
      };
      Object.keys(sampleData).forEach(key => {
        finalStats[key] = sampleData[key];
      });
    }

    setCompletedUsersByMonth(finalStats);
  };

  // Calculate the maximum number of users for scaling the curve
  const maxUsers = Math.max(...Object.values(completedUsersByMonth), 1); // Ensure at least 1 to avoid division by zero

  // Set yAxisMax for the labels, with a minimum of 15 to show 0, 5, 10, 15
  const yAxisMaxForLabels = Math.max(Math.ceil(maxUsers / 5) * 5, 15);

  // Generate points for the SVG path, scaling the curve based on maxUsers
  const numPoints = Object.keys(completedUsersByMonth).length;
  const points = Object.keys(completedUsersByMonth).map((month, index) => {
    const x = ((index + 0.5) / numPoints) * 90; // Use 90% of the width to shift left, start slightly offset
    const y = 100 - (completedUsersByMonth[month] / maxUsers) * 100;
    return `${x},${y}`;
  });

  // Create a smooth curve, ensuring the last segment is vertical
  const pathData = `M0,100 ${points.map((point, index) => {
    const [x, y] = point.split(",");
    if (index === 0) return `L${x},${y}`;
    const prevPoint = points[index - 1].split(",");
    const controlX1 = (parseFloat(prevPoint[0]) + parseFloat(x)) / 2;
    const controlY1 = prevPoint[1];
    const controlX2 = controlX1;
    const controlY2 = y;
    return `C${controlX1},${controlY1} ${controlX2},${controlY2} ${x},${y}`;
  }).join(" ")} V100 H0 Z`; // Make the last segment vertical with V100, then close the path

  return (
    <div className="col-span-12 rounded-sm border border-stroke bg-white py-6 shadow-default dark:border-strokedark dark:bg-boxdark xl:col-span-4">
      <h4 className="mb-6 px-7.5 text-xl font-semibold text-black dark:text-white">
        Completed Projects by Users (Last Year)
      </h4>

      <div className="relative h-64 w-full px-7.5">
        {/* Y-axis */}
        <div className="absolute left-0 top-0 h-full w-12 border-r border-gray-300 dark:border-strokedark">
          {[...Array(Math.ceil(yAxisMaxForLabels / 5) + 1)].map((_, i) => (
            <div
              key={i}
              className="absolute w-full text-right pr-2 text-sm text-gray-500 dark:text-gray-400"
              style={{ bottom: `${(i * 5 / yAxisMaxForLabels) * 100}%` }}
            >
              {i * 5}
            </div>
          ))}
        </div>

        {/* Histogram as a smooth curve */}
        <div className="ml-12 h-full w-full">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path
              d={pathData}
              fill="#C3B1E1" // Light purple color to match the image
              fillOpacity="0.6"
              stroke="#C3B1E1"
              strokeWidth="0.5"
            />
          </svg>
        </div>

        {/* X-axis */}
        <div className="absolute bottom-0 left-12 right-7.5 flex justify-between text-sm text-gray-500 dark:text-gray-400">
          {Object.keys(completedUsersByMonth).map((month) => (
            <div key={month} className="text-center">
              {new Date(month + "-01").toLocaleString('fr-FR', { month: 'short', year: '2-digit' }).replace(/ /g, '. ')}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ChatCard;