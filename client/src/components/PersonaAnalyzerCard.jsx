import React, { useState, useEffect, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchUserPersona } from '../redux/actions/activityActions';
import { MOCK_TYPE } from '../data/mock';

const PersonaAnalyzerCard = () => {
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.auth);
  const { persona, loading } = useSelector(state => state.activity);
  
  // Get tasks from Redux
  const tasks = useSelector(state => state.tasks._ALL) || [];
  const activities = useSelector(state => state.activity.activities) || [];
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Debug logging to see task structure
  useEffect(() => {
    if (tasks.length > 0) {
      console.log('Sample task type:', tasks[0].type);
      console.log('Sample task:', tasks[0]);
    }
  }, [tasks]);
  
  // Helper function to map numeric values to labels
  const getTypeLabel = (typeValue) => {
    // If it's already an object with a label, return the label
    if (typeValue && typeof typeValue === 'object' && typeValue.label) {
      return typeValue.label;
    }
    
    // If it's a numeric value, find the corresponding label
    const typeItem = MOCK_TYPE.find(item => item.value === String(typeValue));
    return typeItem ? typeItem.label : typeValue;
  };
  
  // Define getRecommendedSkills before using it
  const getRecommendedSkills = (personaType, categories) => {
    const skillMap = {
      security: [
        { name: 'Zero Trust Architecture', reason: 'Modern security framework' },
        { name: 'Cloud Security', reason: 'Essential for cloud systems' },
        { name: 'Security Automation', reason: 'Scale security operations' }
      ],
      infrastructure: [
        { name: 'Kubernetes', reason: 'Container orchestration standard' },
        { name: 'Infrastructure as Code', reason: 'Automate infrastructure' },
        { name: 'Cloud Architecture', reason: 'Multi-cloud expertise' }
      ],
      devops: [
        { name: 'GitOps', reason: 'Modern deployment practices' },
        { name: 'Observability', reason: 'Beyond traditional monitoring' },
        { name: 'Chaos Engineering', reason: 'Build resilient systems' }
      ],
      architecture: [
        { name: 'Domain-Driven Design', reason: 'Model complex domains' },
        { name: 'Event-Driven Architecture', reason: 'Scalable system design' },
        { name: 'API Design', reason: 'Create maintainable interfaces' }
      ],
      versatile: [
        { name: 'System Design', reason: 'Foundation for scalability' },
        { name: 'Cloud Technologies', reason: 'Essential modern skill' },
        { name: 'DevOps Practices', reason: 'Bridge dev and ops' }
      ]
    };
    
    return skillMap[personaType] || skillMap.versatile;
  };
  
  // Memoize the persona generation
  const displayPersona = useMemo(() => {
    console.log('Generating persona with', tasks.length, 'tasks');
    
    // Count task types with proper label mapping
    const taskCounts = {};
    let completedCount = 0;
    
    tasks.forEach(task => {
      // Get the type value first
      let typeValue = task.type;
      
      // If the task has a type as an object, extract the value
      if (typeof task.type === 'object' && task.type !== null) {
        typeValue = task.type.value || task.type.label;
      }
      
      // Convert the value to its label
      const typeLabel = getTypeLabel(typeValue);
      
      // Skip empty labels
      if (typeLabel) {
        taskCounts[typeLabel] = (taskCounts[typeLabel] || 0) + 1;
      }
      
      // Check for completed status
      const status = task.status?.value || task.status;
      if (status === '3' || status === 'completed' || status === 'done') {
        completedCount++;
      }
    });
    
    // Get top categories with proper names
    const categories = Object.entries(taskCounts)
      .sort(([,a], [,b]) => b - a)
      .map(([category, count]) => ({
        category,
        count,
        percentage: tasks.length > 0 ? Math.round((count / tasks.length) * 100) : 0
      }));
    
    // Determine persona type based on actual task type names
    let personaType = 'versatile';
    let title = 'Tech Professional';
    let emoji = '💻';
    
    if (tasks.length > 0 && categories.length > 0) {
      const topCategory = (categories[0]?.category || '').toLowerCase();
      
      if (topCategory.includes('infrastructure') || topCategory.includes('data center')) {
        personaType = 'infrastructure';
        title = 'Infrastructure Engineer';
        emoji = '☁️';
      } else if (topCategory.includes('devops')) {
        personaType = 'devops';
        title = 'DevOps Engineer';
        emoji = '⚙️';
      } else if (topCategory.includes('security') || topCategory.includes('authorization') || topCategory.includes('cybersecurity')) {
        personaType = 'security';
        title = 'Security Specialist';
        emoji = '🛡️';
      } else if (topCategory.includes('system design') || topCategory.includes('architecture')) {
        personaType = 'architecture';
        title = 'System Architect';
        emoji = '🏗️';
      } else if (topCategory.includes('network')) {
        personaType = 'networking';
        title = 'Network Engineer';
        emoji = '🌐';
      } else if (topCategory.includes('cloud')) {
        personaType = 'cloud';
        title = 'Cloud Engineer';
        emoji = '☁️';
      }
    }
    
    // Generate strengths
    const strengths = [];
    const completionRate = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;
    
    if (completionRate > 80) strengths.push('High Completion Rate');
    if (categories[0]) strengths.push(`${categories[0].category} Expert`);
    if (categories[1] && categories[1].percentage > 20) strengths.push(`${categories[1].category} Skills`);
    if (activities.length > 20) strengths.push('Highly Active');
    if (completedCount > 10) strengths.push('Experienced Professional');
    
    // Get recommended skills
    const recommendedSkills = getRecommendedSkills(personaType, categories);
    
    return {
      type: personaType,
      title,
      emoji,
      description: `You're a ${title} with expertise in ${categories[0]?.category || 'various technologies'}. Your activity shows strong focus on ${categories[0]?.category || 'technical'} tasks.`,
      distribution: categories.slice(0, 4),
      strengths: strengths.slice(0, 4),
      recommendedSkills: recommendedSkills.slice(0, 3),
      tasksAnalyzed: tasks.length,
      completedTasks: completedCount,
      completionRate,
      confidenceLevel: tasks.length >= 10 ? 'high' : tasks.length >= 5 ? 'moderate' : 'low'
    };
  }, [tasks, activities]);
  
  // Function to trigger refresh
  const refreshAnalysis = () => {
    setIsAnalyzing(true);
    
    setTimeout(() => {
      setIsAnalyzing(false);
      
      if (user?._id || user?.id) {
        dispatch(fetchUserPersona(user._id || user.id));
      }
    }, 1500);
  };
  
  // Get badge styles
  const getBadgeStyles = (type) => {
    const styles = {
      security: "bg-danger/10 text-danger",
      infrastructure: "bg-primary/10 text-primary",
      architecture: "bg-meta-5/10 text-meta-5",
      devops: "bg-success/10 text-success",
      networking: "bg-meta-6/10 text-meta-6",
      cloud: "bg-meta-7/10 text-meta-7",
      versatile: "bg-meta-8/10 text-meta-8"
    };
    
    return styles[type] || styles.versatile;
  };
  
  return (
    <div id="persona-analyzer-card" className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
      <div className="flex flex-wrap items-center justify-between border-b border-stroke px-6 py-4 dark:border-strokedark">
        <h3 className="text-xl font-semibold text-black dark:text-white">
          Technical Persona Analysis
        </h3>
        
        <button
          onClick={refreshAnalysis}
          disabled={isAnalyzing}
          className="inline-flex items-center justify-center rounded-full bg-primary py-2 px-4 text-sm font-medium text-white hover:bg-opacity-90 disabled:bg-opacity-50"
        >
          {isAnalyzing ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Analyzing
            </>
          ) : (
            <>
              <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh Analysis
            </>
          )}
        </button>
      </div>
      
      <div className="p-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Persona Icon/Visual */}
          <div className="flex flex-col items-center">
            <div className="flex items-center justify-center h-24 w-24 rounded-xl bg-primary/10 text-4xl mb-2">
              {displayPersona.emoji}
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getBadgeStyles(displayPersona.type)}`}>
              {displayPersona.type.toUpperCase()}
            </span>
          </div>
          
          {/* Persona Details */}
          <div className="flex-1">
            <h4 className="text-2xl font-bold text-black dark:text-white mb-2">
              {displayPersona.title}
            </h4>
            
            <div className="h-0.5 w-20 bg-primary mb-4"></div>
            
            <p className="text-base text-black dark:text-white opacity-90 mb-4">
              {displayPersona.description}
            </p>
            
            {/* Skill Distribution */}
            {displayPersona.distribution.length > 0 && (
              <div className="mb-6">
                <h5 className="text-sm font-medium text-black dark:text-white mb-3">Technical Focus Distribution</h5>
                <div className="space-y-3">
                  {displayPersona.distribution.map((item, index) => (
                    <div key={index} className="flex flex-col">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="capitalize">{item.category}</span>
                        <span className="font-medium">{item.percentage}%</span>
                      </div>
                      <div className="h-2 w-full bg-bodydark2/30 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary rounded-full transition-all duration-500" 
                          style={{ width: `${item.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Technical Strengths */}
            {displayPersona.strengths.length > 0 && (
              <div className="mb-6">
                <h5 className="text-sm font-medium text-black dark:text-white mb-3">Core Strengths</h5>
                <div className="flex flex-wrap gap-2">
                  {displayPersona.strengths.map((strength, index) => (
                    <span key={index} className="px-3 py-1 bg-success/10 text-success rounded-full text-xs font-medium">
                      {strength}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {/* Recommended Skills */}
            {displayPersona.recommendedSkills && displayPersona.recommendedSkills.length > 0 && (
              <div className="mb-6">
                <h5 className="text-sm font-medium text-black dark:text-white mb-3">Recommended Skills</h5>
                <div className="space-y-2">
                  {displayPersona.recommendedSkills.map((skill, index) => (
                    <div key={index} className="bg-primary/5 rounded-lg p-3">
                      <h6 className="font-medium text-sm text-black dark:text-white">
                        {skill.name}
                      </h6>
                      <p className="text-xs text-gray-600 dark:text-gray-400">{skill.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Statistics */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <p className="text-xl font-bold text-primary">{displayPersona.tasksAnalyzed}</p>
                <p className="text-xs text-bodydark">Tasks Analyzed</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-success">{displayPersona.completedTasks}</p>
                <p className="text-xs text-bodydark">Completed</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-warning">
                  {displayPersona.completionRate}%
                </p>
                <p className="text-xs text-bodydark">Success Rate</p>
              </div>
            </div>
            
            {/* Confidence Level */}
            <div className="flex items-center justify-between text-xs text-bodydark pt-4 border-t border-stroke dark:border-strokedark">
              <span>Analysis Confidence</span>
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  {[1, 2, 3].map((level) => (
                    <div 
                      key={level}
                      className={`w-2 h-2 rounded-full ${
                        level <= (displayPersona.confidenceLevel === 'high' ? 3 : displayPersona.confidenceLevel === 'moderate' ? 2 : 1)
                          ? 'bg-primary' : 'bg-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <span className="capitalize text-primary">{displayPersona.confidenceLevel}</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Info Footer */}
        <div className="mt-6 bg-gray-2 dark:bg-meta-4 rounded-lg p-4">
          <div className="flex items-start">
            <svg className="w-8 h-8 text-primary mr-3 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <div>
              <h6 className="font-semibold text-black dark:text-white mb-1">AI-Powered Analysis</h6>
              <p className="text-sm text-bodydark">
                This analysis examines your task history to identify your technical strengths and recommend skills.
                {displayPersona.tasksAnalyzed === 0 && " Complete some tasks to see your personalized analysis!"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PersonaAnalyzerCard;