export const MOCK_PRIORITY = [
  {
    label: "low",
    value: "1",
    color: "bg-success",
    complexity: "minimal",
    impact: "negligible",
    requiredSkillLevel: "entry-level"
  },
  {
    label: "medium",
    value: "2",
    color: "bg-primary",
    complexity: "moderate",
    impact: "notable",
    requiredSkillLevel: "intermediate"
  },
  {
    label: "high",
    value: "3",
    color: "bg-secondary",
    complexity: "complex",
    impact: "significant",
    requiredSkillLevel: "senior"
  },
  {
    label: "critical",
    value: "4",
    color: "bg-red",
    complexity: "highly intricate",
    impact: "transformative",
    requiredSkillLevel: "expert"
  }
];

export const MOCK_STATUS = [
  {
    label: "on hold",
    value: "1",
    color: "bg-red",
    reason: "awaiting resources",
    actionRequired: "review and reassign"
  },
  {
    label: "in progress",
    value: "2",
    color: "bg-secondary",
    progress: "active development",
    estimatedCompletion: "in progress"
  },
  {
    label: "completed",
    value: "3",
    color: "bg-meta-3",
    verification: "passed",
    deploymentStatus: "ready"
  },
  {
    label: "blocked",
    value: "4",
    color: "bg-warning",
    blockers: "external dependencies",
    escalationNeeded: true
  }
];

export const MOCK_TYPE = [
  {
    label: "",
    value: "1",
    category: "unspecified",
    defaultHandling: "review required"
  },
  {
    label: "Authorization",
    value: "2",
    category: "security",
    accessLevel: "role-based",
    complianceRequirements: "strict"
  },
  {
    label: "leave",
    value: "3",
    category: "hr process",
    approvalWorkflow: "manager review",
    documentationNeeded: true
  },
  {
    label: "Infrastructure Maintenance",
    value: "4",
    category: "technical",
    scalabilityImpact: "high",
    cloudCompatibility: true
  },
  {
    label: "System Design",
    value: "5",
    category: "architecture",
    complexityLevel: "strategic",
    stakeholderEngagement: "high"
  },
  {
    label: "Network Configuration",
    value: "6",
    category: "networking",
    securityProtocol: "advanced",
    performanceOptimization: true
  },
  {
    label: "Cybersecurity Assessment",
    value: "7",
    category: "security",
    threatLevel: "comprehensive",
    complianceFramework: "multi-layered"
  },
  {
    label: "Cloud Migration",
    value: "8",
    category: "infrastructure",
    migrationComplexity: "enterprise-level",
    vendorIntegration: "multi-cloud"
  },
  {
    label: "DevOps Pipeline Setup",
    value: "9",
    category: "development",
    automationLevel: "advanced",
    continuousIntegration: true
  },
  {
    label: "Data Center Optimization",
    value: "10",
    category: "infrastructure",
    efficiencyImprovement: "scalable",
    energyManagement: true
  }
];


export const MOCK_DATA = [
  {
    project_id: 1,
    project_name: "Taskify by Apollo default structured Project floq",
    project_description: "lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    project_manager: "Sarah Henia",
    start_date: "8/4/2025",
    end_date: "10/4/2025",
    budget: "$100000 USD",
    status: "in progress",
    priority: "high",
    client_name: "PIWEB",
  }
  ];