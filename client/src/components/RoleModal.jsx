// RoleModal.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const PERMISSIONS = [
  { id: "view_reports", label: "View Reports" },
  { id: "manage_users", label: "Manage Users" },
  { id: "manage_tasks", label: "Manage Tasks" },
  { id: "manage_projects", label: "Manage Projects" },
  // Chat Room Permissions
  { id: "manage_chat_room", label: "Manage Chat Rooms" },
  { id: "manage_messages", label: "Manage Messages" },
  { id: "manage_chat_members", label: "Manage Chat Members" },
  // Video Call Permissions
  { id: "manage_video_calls", label: "Manage Video Calls" },
  // Analytics & Dashboard Permissions
  { id: "access_charts", label: "Access Charts" },
  { id: "access_analytics", label: "Access Analytics" },
  { id: "access_activity_tables", label: "Access Activity Tables" },
  // Profile Permissions
  { id: "manage_profile", label: "Manage Profiles" },
  // chatbot
  {id: "access_chatbot", label: "Access ChatBot"}
];

// Enhanced role description generator
// This uses a more sophisticated approach to generate contextual descriptions
const roleKnowledgeBase = {
  // Common role categories
  roles: {
    project: {
      keywords: ["project", "program", "portfolio"],
      responsibilities: [
        "planning and executing projects",
        "tracking project progress",
        "managing project resources",
        "coordinating team efforts",
        "ensuring deliverables meet requirements",
        "managing project timelines and budgets"
      ]
    },
    development: {
      keywords: ["develop", "code", "program", "engineer", "frontend", "backend", "fullstack", "software"],
      responsibilities: [
        "writing and testing code",
        "building software features",
        "fixing bugs and technical issues",
        "implementing technical specifications",
        "participating in code reviews",
        "maintaining software quality"
      ]
    },
    design: {
      keywords: ["design", "ux", "ui", "user", "experience", "interface"],
      responsibilities: [
        "creating user interfaces",
        "designing user experiences",
        "producing visual assets",
        "prototyping solutions",
        "ensuring design consistency",
        "conducting usability tests"
      ]
    },
    qa: {
      keywords: ["qa", "test", "quality", "assurance", "tester"],
      responsibilities: [
        "testing software functionality",
        "identifying and reporting bugs",
        "verifying bug fixes",
        "creating and executing test cases",
        "ensuring quality standards are met",
        "performing regression testing"
      ]
    },
    admin: {
      keywords: ["admin", "administrator", "system", "superuser"],
      responsibilities: [
        "managing system configurations",
        "administering user accounts",
        "maintaining system security",
        "monitoring system performance",
        "implementing system policies",
        "controlling system access"
      ]
    },
    management: {
      keywords: ["manager", "management", "director", "lead", "chief", "head", "hr"],
      responsibilities: [
        "supervising team members",
        "allocating resources effectively",
        "setting team objectives",
        "conducting performance reviews",
        "developing team capabilities",
        "making strategic decisions"
      ]
    },
    product: {
      keywords: ["product", "owner", "manager"],
      responsibilities: [
        "defining product vision",
        "prioritizing features",
        "managing product backlog",
        "gathering user requirements",
        "collaborating with stakeholders",
        "analyzing market trends"
      ]
    },
    viewer: {
      keywords: ["viewer", "read", "guest", "limited"],
      responsibilities: [
        "viewing system data",
        "accessing read-only information",
        "consuming reports and dashboards"
      ],
      limitations: [
        "Cannot modify system data",
        "Has restricted access to sensitive information",
        "Cannot perform administrative functions"
      ]
    },
    marketing: {
      keywords: ["market", "marketing", "brand", "social", "media", "content", "seo", "advertising", "promotion"],
      responsibilities: [
        "developing marketing strategies",
        "creating promotional materials",
        "managing social media presence",
        "analyzing market trends",
        "measuring campaign effectiveness",
        "building brand awareness",
        "coordinating marketing initiatives"
      ]
    },
    support: {
      keywords: ["support", "help", "service", "customer", "client", "care", "ticket", "assistance"],
      responsibilities: [
        "responding to customer inquiries",
        "resolving customer issues",
        "documenting support interactions",
        "escalating complex problems",
        "providing technical assistance",
        "maintaining customer satisfaction",
        "following up on support tickets"
      ]
    },
    sales: {
      keywords: ["sales", "sell", "account", "business", "client", "revenue", "deal", "lead"],
      responsibilities: [
        "generating sales leads",
        "meeting sales targets",
        "maintaining client relationships",
        "negotiating contracts",
        "presenting product solutions",
        "identifying new business opportunities",
        "closing sales deals"
      ]
    },
    finance: {
      keywords: ["finance", "financial", "account", "budget", "audit", "tax", "treasury", "fiscal"],
      responsibilities: [
        "managing financial records",
        "preparing budget reports",
        "analyzing financial data",
        "ensuring regulatory compliance",
        "processing financial transactions",
        "conducting financial forecasting",
        "handling tax matters"
      ]
    },
    hr: {
      keywords: ["hr", "human", "resource", "recruit", "talent", "personnel", "staff", "employee"],
      responsibilities: [
        "recruiting and hiring talent",
        "maintaining employee records",
        "handling benefit administration",
        "conducting performance reviews",
        "addressing employee concerns",
        "ensuring policy compliance",
        "coordinating training programs"
      ]
    }
  },
  
  // Common specific role descriptions
  specificRoles: {
    "project manager": "Responsible for planning, executing, and closing projects. Oversees team members, manages schedules, and ensures projects are completed on time and within budget.",
    "product manager": "Responsible for the product throughout its lifecycle. Defines the product vision, gathers requirements, and works with development teams to deliver user value.",
    "software developer": "Responsible for writing, testing, and maintaining code. Implements features, fixes bugs, and collaborates with team members to deliver quality software.",
    "ui designer": "Creates visual elements and user interfaces for applications. Focuses on aesthetics, layout, and overall user interaction design.",
    "ux designer": "Researches and optimizes user experiences. Creates wireframes, conducts usability tests, and ensures products are intuitive and user-friendly.",
    "admin": "Has full system access and manages system settings, user accounts, and overall platform configuration.",
    "system administrator": "Manages and maintains computer systems and networks. Handles configurations, security, and ensures system availability.",
    "developer": "Responsible for writing, testing, and maintaining code. Works on software features and fixes bugs.",
    "qa tester": "Tests software to identify bugs and ensure quality standards are met. Creates test cases, performs tests, and verifies fixes.",
    "team lead": "Manages a team of developers or other staff members. Provides technical guidance and ensures team productivity.",
    "product owner": "Represents stakeholders and is responsible for maximizing the value of the product by creating and managing the product backlog.",
    "scrum master": "Facilitates Scrum processes and removes impediments for the development team.",
    "viewer": "Has read-only access to content. Cannot make changes to the system.",
    "engineer": "Responsible for designing, developing, and implementing technical solutions. Works on technical problems and contributes to product development.",
    "frontend developer": "Specializes in building user interfaces and client-side functionality. Works with HTML, CSS, JavaScript and related frameworks.",
    "backend developer": "Focuses on server-side logic, databases, and application integration. Develops APIs and system architecture."
  }
};

const RoleModal = ({ isOpen, onClose, onSave }) => {
  const [roleName, setRoleName] = useState('');
  const [roleDescription, setRoleDescription] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [permissionCategories, setPermissionCategories] = useState([
    { name: "General", expanded: true },
    { name: "Chat & Messages", expanded: false },
    { name: "Video Calls", expanded: false },
    { name: "Analytics", expanded: false },
    { name: "Profiles", expanded: false }
  ]);

  // Generate description based on role name
  useEffect(() => {
    if (roleName.trim().length > 2) {
      generateDescription(roleName);
    } else {
      setRoleDescription('');
    }
  }, [roleName]);

  const generateDescription = async (name) => {
    setIsLoading(true);
    console.log("Starting description generation for:", name);
    
    // Convert to lowercase for matching
    const lowercaseName = name.toLowerCase().trim();
    
    // STEP 1: Try local generation first (frontend)
    // =============================================
    
    console.log("Trying local generation first");
    
    // Check if we have an exact match in our specific roles
    if (roleKnowledgeBase.specificRoles[lowercaseName]) {
      console.log("EXACT MATCH found in specificRoles:", lowercaseName);
      setRoleDescription(roleKnowledgeBase.specificRoles[lowercaseName]);
      setIsLoading(false);
      return;
    }
    
    // Check for partial matches in specificRoles
    const partialMatches = [];
    Object.keys(roleKnowledgeBase.specificRoles).forEach(key => {
      if (lowercaseName.includes(key) || key.includes(lowercaseName)) {
        partialMatches.push(key);
      }
    });
    
    if (partialMatches.length > 0) {
      // Sort by length (prefer longer matches)
      partialMatches.sort((a, b) => b.length - a.length);
      const bestMatch = partialMatches[0];
      console.log("PARTIAL MATCH found:", bestMatch);
      setRoleDescription(roleKnowledgeBase.specificRoles[bestMatch]);
      setIsLoading(false);
      return;
    }
    
    // No exact or partial matches, try keyword matching
    console.log("No exact/partial matches, trying keyword matching");
    
    // Split into words for better matching
    const roleWords = lowercaseName.split(/\s+/);
    console.log("Role words:", roleWords);
    
    const matchingCategories = [];
    
    // Manual debug - check each role category and its keywords
    console.log("Available categories for matching:");
    Object.entries(roleKnowledgeBase.roles).forEach(([category, data]) => {
      console.log(`- ${category}: ${data.keywords.join(", ")}`);
    });
    
    // Analyze the role name to find relevant categories
    Object.entries(roleKnowledgeBase.roles).forEach(([category, data]) => {
      // Simple matching logic - check if any keyword is found
      let score = 0;
      const matchedKeywords = [];
      
      // Check full name against each keyword
      data.keywords.forEach(keyword => {
        if (lowercaseName.includes(keyword)) {
          console.log(`Found keyword "${keyword}" in full name "${lowercaseName}" for category "${category}"`);
          score += 2;
          matchedKeywords.push(keyword);
        }
      });
      
      // Check each word against the keywords
      roleWords.forEach(word => {
        if (word.length < 3) return; // Skip very short words
        
        data.keywords.forEach(keyword => {
          if (keyword.length < 3) return; // Skip very short keywords
          
          // Exact match
          if (word === keyword) {
            console.log(`Exact word match: "${word}" = "${keyword}" for category "${category}"`);
            score += 3;
            matchedKeywords.push(keyword);
          } 
          // Word contains keyword
          else if (word.includes(keyword)) {
            console.log(`Word "${word}" contains keyword "${keyword}" for category "${category}"`);
            score += 1;
            matchedKeywords.push(keyword);
          }
          // Keyword contains word
          else if (keyword.includes(word)) {
            console.log(`Keyword "${keyword}" contains word "${word}" for category "${category}"`);
            score += 1;
            matchedKeywords.push(keyword);
          }
        });
      });
      
      if (score > 0) {
        matchingCategories.push({
          category,
          score,
          matchedKeywords: [...new Set(matchedKeywords)] // Remove duplicates
        });
      }
    });
    
    console.log("Matching categories found:", matchingCategories);
    
    // Generate description based on matching categories
    if (matchingCategories.length > 0) {
      // Sort by score in descending order
      matchingCategories.sort((a, b) => b.score - a.score);
      
      // Get primary category
      const primaryCategory = matchingCategories[0].category;
      console.log("Using primary category:", primaryCategory);
      
      // Get responsibilities
      const responsibilities = roleKnowledgeBase.roles[primaryCategory].responsibilities;
      
      // Take 3 random responsibilities
      const selected = [...responsibilities]
        .sort(() => 0.5 - Math.random())
        .slice(0, Math.min(3, responsibilities.length));
      
      console.log("Selected responsibilities:", selected);
      
      // Create description
      const roleTitle = name.charAt(0).toUpperCase() + name.slice(1);
      let description = `${roleTitle} is responsible for `;
      
      if (selected.length === 1) {
        description += selected[0] + '.';
      } else if (selected.length === 2) {
        description += `${selected[0]} and ${selected[1]}.`;
      } else {
        const last = selected.pop();
        description += selected.join(', ') + ', and ' + last + '.';
      }
      
      console.log("Generated description:", description);
      setRoleDescription(description);
      setIsLoading(false);
      return;
    }
    
    // STEP 2: If no local matches, try the backend API
    // ================================================
    
    console.log("No local matches found, trying backend API");
    try {
      const response = await axios.post('/api/roles/generate-description', { roleName: name });
      
      if (response.data && response.data.description) {
        console.log("Using description from API:", response.data.description);
        setRoleDescription(response.data.description);
        setIsLoading(false);
        return;
      } else {
        console.log("API response didn't contain a description:", response.data);
      }
    } catch (error) {
      console.log('API error:', error.message);
    }
    
    // STEP 3: Fallback - if both local and API generation fail
    // ========================================================
    
    console.log("Both local and API generation failed, using fallback");
    
    // Extract domain from role name if possible for better fallback
    const domainWords = roleWords.filter(word => word.length > 3);
    if (domainWords.length > 0) {
      const domain = domainWords[0].charAt(0).toUpperCase() + domainWords[0].slice(1);
      const fallbackDesc = `Responsible for ${domain.toLowerCase()} activities, including planning, managing, and executing tasks related to ${name}.`;
      console.log("Using domain fallback:", fallbackDesc);
      setRoleDescription(fallbackDesc);
    } else {
      // Generic fallback
      const fallbackDesc = `Responsible for ${lowercaseName} related activities in the system.`;
      console.log("Using generic fallback:", fallbackDesc);
      setRoleDescription(fallbackDesc);
    }
    
    setIsLoading(false);
  };

  const handlePermissionChange = (permissionId) => {
    if (selectedPermissions.includes(permissionId)) {
      setSelectedPermissions(selectedPermissions.filter(id => id !== permissionId));
    } else {
      setSelectedPermissions([...selectedPermissions, permissionId]);
    }
  };

  const toggleCategory = (categoryIndex) => {
    setPermissionCategories(prevCategories => 
      prevCategories.map((category, index) => 
        index === categoryIndex 
          ? { ...category, expanded: !category.expanded } 
          : category
      )
    );
  };

  // Helper function to get permissions for a specific category
  const getCategoryPermissions = (categoryName) => {
    switch(categoryName) {
      case "General":
        return PERMISSIONS.filter(p => 
          ["view_reports", "manage_users", "manage_tasks", "manage_projects"].includes(p.id)
        );
      case "Chat & Messages":
        return PERMISSIONS.filter(p => 
          ["manage_chat_room", "manage_messages", "manage_chat_members", "access_chatbot"].includes(p.id)
        );
      case "Video Calls":
        return PERMISSIONS.filter(p => 
          ["manage_video_calls"].includes(p.id)
        );
      case "Analytics":
        return PERMISSIONS.filter(p => 
          ["access_charts", "access_analytics", "access_activity_tables"].includes(p.id)
        );
      case "Profiles":
        return PERMISSIONS.filter(p => 
          ["manage_profile"].includes(p.id)
        );
      default:
        return [];
    }
  };

  const handleSubmit = () => {
    if (!roleName.trim()) return;
    
    // Create the role object in the format your backend expects
    const newRole = {
      name: roleName,
      description: roleDescription || `Role for ${roleName}`, // Ensure description is never empty
      permissions: {}
    };
    
    // Dynamically add all permissions from PERMISSIONS array to the role object
    PERMISSIONS.forEach(permission => {
      // Convert permission.id (e.g., "manage_users") to camelCase (e.g., "manageUsers")
      const permKey = permission.id.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
      newRole.permissions[permKey] = selectedPermissions.includes(permission.id);
    });
    
    onSave(newRole);
    resetForm();
  };

  const resetForm = () => {
    setRoleName('');
    setRoleDescription('');
    setSelectedPermissions([]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black bg-opacity-60">
      <div className="w-full max-w-2xl bg-white dark:bg-boxdark rounded-lg shadow-2xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3 border-b border-stroke dark:border-strokedark bg-gray-50 dark:bg-boxdark-2 rounded-t-lg">
          <h3 className="font-semibold text-black dark:text-white text-lg">
            Create New Role
          </h3>
        </div>
        
        {/* Form content with scrollable area */}
        <div className="p-5 overflow-y-auto flex-1">
          {/* Role name field */}
          <div className="mb-4">
            <label className="mb-1.5 block text-sm font-medium text-black dark:text-white">
              Role Name
            </label>
            <input
              type="text"
              placeholder="Enter role name"
              className="w-full rounded-md border border-stroke bg-transparent px-4 py-2 text-sm outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
              value={roleName}
              onChange={(e) => setRoleName(e.target.value)}
            />
          </div>

          {/* Role description field */}
          <div className="mb-4">
            <label className="mb-1.5 block text-sm font-medium text-black dark:text-white">
              Role Description
            </label>
            <div className="relative">
              <textarea
                rows={2}
                placeholder="Description will be generated based on role name"
                className="w-full rounded-md border border-stroke bg-transparent px-4 py-2 text-sm outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
                value={roleDescription}
                onChange={(e) => setRoleDescription(e.target.value)}
              ></textarea>
              {isLoading && (
                <div className="absolute right-2 bottom-2">
                  <span className="inline-block animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></span>
                </div>
              )}
            </div>
          </div>

          {/* Permissions section */}
          <div className="mb-3">
            <label className="mb-1.5 block text-sm font-medium text-black dark:text-white">
              Permissions
            </label>
            
            <div className="rounded-md border border-stroke bg-transparent dark:border-form-strokedark dark:bg-form-input overflow-hidden">
              <div className="max-h-40 overflow-y-auto">
                {/* Accordion style permission categories */}
                {permissionCategories.map((category, categoryIndex) => (
                  <div key={category.name} className="border-b border-stroke dark:border-strokedark last:border-b-0">
                    <div
                      className="flex items-center justify-between cursor-pointer py-2 px-3 hover:bg-gray-50 dark:hover:bg-boxdark-2 transition-colors"
                      onClick={() => toggleCategory(categoryIndex)}
                    >
                      <h4 className="text-sm font-medium text-black dark:text-white flex items-center">
                        {category.expanded ? (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5 text-primary" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5 text-primary" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                        {category.name}
                      </h4>
                    </div>
                    
                    {category.expanded && (
                      <div className="px-3 py-2 bg-gray-50 dark:bg-boxdark-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-1 gap-x-3">
                          {getCategoryPermissions(category.name).map((permission) => (
                            <div key={permission.id} className="flex items-center">
                              <input
                                type="checkbox"
                                id={permission.id}
                                checked={selectedPermissions.includes(permission.id)}
                                onChange={() => handlePermissionChange(permission.id)}
                                className="mr-1.5 h-3.5 w-3.5 accent-primary"
                              />
                              <label htmlFor={permission.id} className="text-xs text-black dark:text-white truncate">
                                {permission.label}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex justify-end mt-5 gap-3">
            <button
              onClick={onClose}
              className="flex justify-center rounded-md border border-stroke py-1.5 px-4 text-sm font-medium text-black hover:bg-gray-50 dark:border-strokedark dark:text-white dark:hover:bg-boxdark-2 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="flex justify-center rounded-md bg-primary py-1.5 px-4 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoleModal;