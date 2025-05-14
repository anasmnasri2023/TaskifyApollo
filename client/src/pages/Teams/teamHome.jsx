// Pages/Teams/teamHome.jsx
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { 
  GetTeamStatsAction,
  formatRelativeTime,
  formatDate,
  getStatusColorClass,
  getPriorityColorClass,
  getStatusLabel,
  getPriorityLabel,
  isOverdue,
  calculateProgress
} from '../../redux/actions/teams';

const TeamHome = () => {
  const { teamId } = useParams();
  const dispatch = useDispatch();
  
  const { user } = useSelector(state => state.auth || {});
  const team = useSelector(state => state.teams._ONE);
  
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const fetchTeamStats = async () => {
      if (!teamId || !team?._id) return;

      setIsLoading(true);
      setError(null);
      
      try {
        const teamStats = await dispatch(GetTeamStatsAction(teamId));
        setStats(teamStats);
      } catch (err) {
        console.error('Error fetching team stats:', err);
        setError('Failed to load team statistics');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchTeamStats();
  }, [teamId, team, dispatch]);
  
  if (isLoading) {
    return (
      <div className="flex h-80 w-full items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="mt-4 text-lg font-medium text-gray-600">Loading team data...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex h-80 w-full items-center justify-center">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="mt-4 text-lg font-medium text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Statistics Overview */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* Projects Card */}
        <StatsCard
          title="Total Projects"
          value={stats?.projects.total || 0}
          icon="project"
          details={[
            { label: 'Active', value: stats?.projects.active || 0, color: 'text-meta-3' },
            { label: 'Completed', value: stats?.projects.completed || 0, color: 'text-meta-5' }
          ]}
        />
        
        {/* Tasks Card */}
        <StatsCard
          title="Total Tasks"
          value={stats?.tasks.total || 0}
          icon="tasks"
          details={[
            { label: 'Completed', value: stats?.tasks.completed || 0, color: 'text-meta-3' },
            { label: 'In Progress', value: stats?.tasks.inProgress || 0, color: 'text-meta-5' },
            { label: 'Overdue', value: stats?.tasks.overdue || 0, color: 'text-meta-1' }
          ]}
        />
        
        {/* Team Members Card */}
        <StatsCard
          title="Team Members"
          value={team?.members?.length || 0}
          icon="members"
        />
        
        {/* Activity Card */}
        <StatsCard
          title="Recent Activity"
          value={stats?.recent.tasks.length || 0}
          icon="activity"
          details={[
            { label: 'This week', value: 'Active', color: 'text-meta-3' }
          ]}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Tasks */}
        <RecentTasks tasks={stats?.recent.tasks || []} teamId={teamId} />
        
        {/* Recent Projects */}
        <RecentProjects projects={stats?.recent.projects || []} teamId={teamId} />
      </div>
    </div>
  );
};

// Stats Card Component
const StatsCard = ({ title, value, icon, details = [] }) => {
  const getIcon = () => {
    switch (icon) {
      case 'project':
        return (
          <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        );
      case 'tasks':
        return (
          <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        );
      case 'members':
        return (
          <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        );
      default:
        return (
          <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  return (
    <div className="rounded-sm border border-stroke bg-white py-6 px-6 shadow-default dark:border-strokedark dark:bg-boxdark">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
        {getIcon()}
      </div>
      <div className="mt-4">
        <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</h4>
        <h3 className="mt-1 text-3xl font-bold text-black dark:text-white">{value}</h3>
        {details.length > 0 && (
          <div className="mt-2 flex items-center gap-2">
            {details.map((detail, index) => (
              <React.Fragment key={index}>
                <div className={`flex items-center gap-1 text-xs font-medium ${detail.color}`}>
                  <span>{detail.value}</span>
                  <span>{detail.label}</span>
                </div>
                {index < details.length - 1 && <span className="text-xs text-gray-400">|</span>}
              </React.Fragment>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Recent Tasks Component
const RecentTasks = ({ tasks, teamId }) => {
  return (
    <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
      <div className="border-b border-stroke px-6 py-4 dark:border-strokedark">
        <div className="flex items-center justify-between">
          <h4 className="text-lg font-semibold text-black dark:text-white">Recent Tasks</h4>
          <Link to={`/projects/task-list?teamId=${teamId}`} className="text-sm font-medium text-primary">
            View All
          </Link>
        </div>
      </div>
      
      <div className="p-4">
        {tasks.length > 0 ? (
          <div className="flex flex-col gap-4">
            {tasks.map((task) => (
              <TaskCard key={task._id} task={task} />
            ))}
          </div>
        ) : (
          <EmptyState 
            icon="tasks" 
            message="No tasks yet" 
            actionText="Create Task" 
            actionLink={`/projects/create-task?teamId=${teamId}`} 
          />
        )}
      </div>
    </div>
  );
};

// Recent Projects Component
const RecentProjects = ({ projects, teamId }) => {
  return (
    <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
      <div className="border-b border-stroke px-6 py-4 dark:border-strokedark">
        <div className="flex items-center justify-between">
          <h4 className="text-lg font-semibold text-black dark:text-white">Recent Projects</h4>
          <Link to={`/projects?teamId=${teamId}`} className="text-sm font-medium text-primary">
            View All
          </Link>
        </div>
      </div>
      
      <div className="p-4">
        {projects.length > 0 ? (
          <div className="flex flex-col gap-4">
            {projects.map((project) => (
              <ProjectCard key={project._id} project={project} />
            ))}
          </div>
        ) : (
          <EmptyState 
            icon="projects" 
            message="No projects yet" 
            actionText="Create Project" 
            actionLink={`/projects/create?teamId=${teamId}`} 
          />
        )}
      </div>
    </div>
  );
};

// Task Card Component
const TaskCard = ({ task }) => {
  return (
    <div className="rounded-sm border border-stroke p-4 dark:border-strokedark">
      <div className="mb-3 flex items-center justify-between">
        <h5 className="font-medium text-black dark:text-white">{task.title}</h5>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColorClass(getStatusLabel(task.status))}`}>
          {getStatusLabel(task.status)}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {task.assigns?.[0] && (
            <>
              <UserAvatar user={task.assigns[0]} />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {task.assigns[0].fullName}
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${getPriorityColorClass(getPriorityLabel(task.priority))}`}>
            {getPriorityLabel(task.priority)}
          </span>
          {task.end_date && (
            <>
              <span className="text-xs text-gray-500 dark:text-gray-400">|</span>
              <span className={`text-xs ${isOverdue(task.end_date) ? 'text-danger' : 'text-gray-500 dark:text-gray-400'}`}>
                Due {formatDate(task.end_date)}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// Project Card Component
const ProjectCard = ({ project }) => {
  const progress = calculateProgress(project);
  
  return (
    <div className="rounded-sm border border-stroke p-4 dark:border-strokedark">
      <div className="mb-2 flex items-center justify-between">
        <h5 className="font-medium text-black dark:text-white">{project.project_name}</h5>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColorClass(project.status)}`}>
          {project.status}
        </span>
      </div>
      
      <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
        {project.project_description?.substring(0, 100)}
        {project.project_description?.length > 100 ? '...' : ''}
      </p>
      
      <div className="mb-3">
        <div className="flex justify-between mb-1">
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Progress</span>
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{progress}%</span>
        </div>
        <div className="h-2 w-full bg-gray-200 rounded-full dark:bg-gray-700">
          <div className="h-2 rounded-full bg-primary" style={{ width: `${progress}%` }}></div>
        </div>
      </div>
      
      <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
        <span>Manager: {project.project_manager}</span>
        <span>Due {formatDate(project.end_date)}</span>
      </div>
    </div>
  );
};

// User Avatar Component
const UserAvatar = ({ user }) => {
  return (
    <div className="relative h-8 w-8 rounded-full border-2 border-white dark:border-boxdark">
      {user?.picture ? (
        <img
          src={user.picture.includes('https') ? user.picture : `http://localhost:5500/${user.picture}`}
          alt={user.fullName}
          className="h-full w-full rounded-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
          {user?.fullName?.charAt(0) || '?'}
        </div>
      )}
    </div>
  );
};

// Empty State Component
const EmptyState = ({ icon, message, actionText, actionLink }) => {
  return (
    <div className="flex flex-col items-center justify-center py-8">
      <svg className="mb-2 h-12 w-12 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        {icon === 'tasks' ? (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        )}
      </svg>
      <p className="text-gray-500 dark:text-gray-400">{message}</p>
      <Link
        to={actionLink}
        className="mt-4 rounded-md bg-primary px-3 py-2 text-sm font-medium text-white transition hover:bg-opacity-90"
      >
        {actionText}
      </Link>
    </div>
  );
};

export default TeamHome;