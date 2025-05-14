import React, { useState } from 'react';
import Sentiment from 'sentiment';

const AIWeeklyReport = ({ userData, tasks }) => {
  const [report, setReport] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [forecastVisible, setForecastVisible] = useState(false);
  const [forecast, setForecast] = useState(null);
  const [forecastLoading, setForecastLoading] = useState(false);

  const generateReport = () => {
    setIsLoading(true);
    setTimeout(() => {
      const completed = tasks.filter(t => ['completed', 'done'].includes(t.status));
      const delayed = tasks.filter(t => new Date(t.end_date) < new Date() && !['completed', 'done'].includes(t.status));
      const averageDuration = completed.length
        ? completed.reduce((sum, t) => sum + (new Date(t.end_date) - new Date(t.start_date)), 0) / completed.length
        : 0;
      const avgDays = averageDuration ? (averageDuration / (1000 * 60 * 60 * 24)).toFixed(1) : 'N/A';

      const projectFreq = {};
      tasks.forEach(t => {
        const name = t.project?.name || 'General';
        projectFreq[name] = (projectFreq[name] || 0) + 1;
      });
      const topProject = Object.entries(projectFreq).reduce((a, b) => b[1] > a[1] ? b : a, ['', 0])[0];

      const days = Array(7).fill(0);
      tasks.forEach(t => days[new Date(t.start_date).getDay()]++);
      const dayMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const topDay = dayMap[days.indexOf(Math.max(...days))];

      const untaggedDelayed = delayed.filter(t => !t.priority);
      const userName = userData?.fullName?.split(' ')[0] || "there";

      // 🧠 Sentiment AI
      const sentiment = new Sentiment();
      const titles = tasks.map(t => t.title || '');
      const sentimentScores = titles.map(t => sentiment.analyze(t).score);
      const avgSentiment = sentimentScores.reduce((a, b) => a + b, 0) / (sentimentScores.length || 1);
      let sentimentInsight = '';
      if (avgSentiment > 1) sentimentInsight = 'Your task tone is generally positive. Keep it up!';
      else if (avgSentiment < -1) sentimentInsight = 'Some negative tone detected — try to reframe tasks with action-oriented wording.';
      else sentimentInsight = 'Your tasks seem neutral — consider using clearer verbs to boost motivation.';

      let message = `Hey ${userName}, this week you completed ${completed.length} task${completed.length === 1 ? '' : 's'}, with most of your work on ${topProject}. Your busiest day seems to be ${topDay}.`;
      if (avgDays !== 'N/A') message += ` On average, tasks take ${avgDays} day${avgDays === '1.0' ? '' : 's'} to complete.`;
      if (delayed.length > 0) message += ` You have ${delayed.length} delayed task${delayed.length === 1 ? '' : 's'}.`;
      if (untaggedDelayed.length > 0) message += ` Consider tagging your tasks — ${untaggedDelayed.length} delayed task${untaggedDelayed.length > 1 ? 's are' : ' is'} untagged.`;
      message += ` ${sentimentInsight}`;

      setReport(message);
      setIsLoading(false);
    }, 1200);
  };

  // (No changes to forecast generation...)
  const generateForecast = () => {
    setForecastLoading(true);
    setForecastVisible(true);
    setTimeout(() => {
      const completed = tasks.filter(t => ['completed', 'done'].includes(t.status));
      const assigned = tasks.filter(t => t.assigns?.some(a => a._id === userData._id));
      const completionRate = completed.length / (tasks.length || 1);
      const estimate = Math.round(assigned.length * completionRate);
      const highPriority = assigned.filter(t => t.priority === 'high');

      const burnoutRisk = assigned.length > 15 || highPriority.length > 5;
      const recs = burnoutRisk ? [
        'Prioritize essential tasks.',
        'Avoid multitasking — cluster similar tasks.',
        'Use time blocks to maintain focus.'
      ] : [];

      const forecastText = `At your current pace, you’re on track to complete ${estimate} task${estimate === 1 ? '' : 's'} next week. ` +
        (burnoutRisk ? '⚠️ Possible overload detected.' : '✅ Your workload seems balanced.');

      setForecast({
        text: forecastText,
        recommendations: recs,
        tasksNextWeek: estimate,
        burnoutRisk
      });
      setForecastLoading(false);
    }, 1500);
  };

  return (
    <div className="mt-6 bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-200 dark:border-gray-700">
      {/* (rest of the JSX remains unchanged) */}
    </div>
  );
};

export default AIWeeklyReport;
