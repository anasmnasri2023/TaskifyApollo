/*export const ROLES = [
  {
    title: "ADMIN",
    avatar: "AD",
    description:
      "The Administrator acquires all the privileges and permissions and has access on all the application compartments as well as user management, Data journalization and record plus chart infographic for BI.   ",
  },
  {
    title: "PROJECT MANAGER",
    avatar: "CM",
    description:
      "The Community Manager is in charge of the external relations for the App, they convert the client needs and orders into tasks and subtask to be created the provide deadlines, descriptions and are able to communicate with other members and confirm Tasks. They are also in charge of assigning tasks to qualified engineers ",
  },

  {
    title: "ENGINEER",
    avatar: "DS",
    description:
      "The Engineer is in charge of the production process for Taskify, They can manage task status, communicate with other members as well. ",
  },
];*/
// src/data/roles.js
export const ROLES = [
  {
    title: "Admin",
    description: "Full system access with ability to manage users, roles, and all system settings.",
    avatar: "A",
    permissions: ["Create Task", "View Tasks", "Edit Tasks", "Delete Tasks", "Manage Users", "View Reports", "Manage Projects"]
  },
  {
    title: "Project Manager",
    description: "Manages projects, tasks, and team members. Can create and assign tasks, view reports, and manage project settings.",
    avatar: "P",
    permissions: ["Create Task", "View Tasks", "Edit Tasks", "View Reports", "Manage Projects"]
  },
  {
    title: "Developer",
    description: "Works on assigned tasks and can update task progress. Limited access to project settings.",
    avatar: "D",
    permissions: ["View Tasks", "Edit Tasks"]
  },
  {
    title: "Viewer",
    description: "Can only view tasks and reports. No ability to make changes to the system.",
    avatar: "V",
    permissions: ["View Tasks", "View Reports"]
  }
];
