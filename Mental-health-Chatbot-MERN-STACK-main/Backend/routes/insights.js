const express = require('express');
const router = express.Router();
const MoodEntry = require('../models/MoodEntry');

// Get insights data for a user
router.get('/', async (req, res) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ message: 'userId is required' });
    }

    // Get date ranges
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    // Get all entries for the user
    const allEntries = await MoodEntry.find({ userId })
      .sort({ date: -1 })
      .lean();

    // Get weekly entries
    const weeklyEntries = allEntries.filter(entry => 
      new Date(entry.date) >= oneWeekAgo
    );

    // Get monthly entries
    const monthlyEntries = allEntries.filter(entry => 
      new Date(entry.date) >= oneMonthAgo
    );

    // Get previous week entries for comparison
    const previousWeekEntries = allEntries.filter(entry => {
      const entryDate = new Date(entry.date);
      return entryDate >= twoWeeksAgo && entryDate < oneWeekAgo;
    });

    // Calculate insights
    const insights = {
      stats: calculateStats(weeklyEntries, previousWeekEntries, allEntries),
      weeklyMoodData: generateWeeklyMoodData(weeklyEntries),
      monthlyMoodData: generateMonthlyMoodData(monthlyEntries),
      insights: generateInsights(weeklyEntries, allEntries),
      recommendations: generateRecommendations(weeklyEntries, allEntries)
    };

    res.json(insights);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
});

// Helper functions
function calculateStats(weeklyEntries, previousWeekEntries, allEntries) {
  const moodValues = {
    'happy': 5, 'excited': 5, 'grateful': 4,
    'calm': 4, 'tired': 3, 'sad': 2, 'anxious': 2, 'angry': 1
  };

  // Weekly average mood
  const weeklyAvg = weeklyEntries.length > 0 
    ? weeklyEntries.reduce((sum, entry) => sum + (moodValues[entry.mood] || 3), 0) / weeklyEntries.length
    : 3;

  // Previous week average for comparison
  const previousWeekAvg = previousWeekEntries.length > 0
    ? previousWeekEntries.reduce((sum, entry) => sum + (moodValues[entry.mood] || 3), 0) / previousWeekEntries.length
    : 3;

  const improvement = previousWeekAvg > 0 ? ((weeklyAvg - previousWeekAvg) / previousWeekAvg * 100).toFixed(0) : 0;

  // Most frequent mood
  const moodCounts = {};
  weeklyEntries.forEach(entry => {
    moodCounts[entry.mood] = (moodCounts[entry.mood] || 0) + 1;
  });
  const mostFrequentMood = Object.keys(moodCounts).reduce((a, b) => 
    moodCounts[a] > moodCounts[b] ? a : b, 'happy'
  );

  // Consecutive days
  const sortedEntries = allEntries.sort((a, b) => new Date(b.date) - new Date(a.date));
  let consecutiveDays = 0;
  let currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);

  for (let i = 0; i < 7; i++) {
    const hasEntry = sortedEntries.some(entry => {
      const entryDate = new Date(entry.date);
      entryDate.setHours(0, 0, 0, 0);
      return entryDate.getTime() === currentDate.getTime();
    });
    if (hasEntry) {
      consecutiveDays++;
    } else {
      break;
    }
    currentDate.setDate(currentDate.getDate() - 1);
  }

  return {
    weeklyAverageMood: {
      value: weeklyAvg.toFixed(1),
      label: getMoodLabel(weeklyAvg),
      improvement: improvement + '%'
    },
    mostFrequentMood: {
      value: mostFrequentMood,
      count: moodCounts[mostFrequentMood] || 0
    },
    journalEntries: {
      total: allEntries.length,
      thisWeek: weeklyEntries.length
    },
    consecutiveDays: consecutiveDays
  };
}

function generateWeeklyMoodData(weeklyEntries) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const moodValues = {
    'happy': 5, 'excited': 5, 'grateful': 4,
    'calm': 4, 'tired': 3, 'sad': 2, 'anxious': 2, 'angry': 1
  };

  return days.map(day => {
    const dayEntries = weeklyEntries.filter(entry => {
      const entryDate = new Date(entry.date);
      const dayName = entryDate.toLocaleDateString('en-US', { weekday: 'short' });
      return dayName === day;
    });

    if (dayEntries.length === 0) {
      return { day, value: 3, mood: 'neutral' };
    }

    const avgMood = dayEntries.reduce((sum, entry) => 
      sum + (moodValues[entry.mood] || 3), 0
    ) / dayEntries.length;

    return {
      day,
      value: Math.round(avgMood),
      mood: dayEntries[0].mood
    };
  });
}

function generateMonthlyMoodData(monthlyEntries) {
  const moodCounts = {};
  monthlyEntries.forEach(entry => {
    moodCounts[entry.mood] = (moodCounts[entry.mood] || 0) + 1;
  });

  return Object.entries(moodCounts).map(([mood, count]) => ({
    name: mood.charAt(0).toUpperCase() + mood.slice(1),
    value: count
  }));
}

function generateInsights(weeklyEntries, allEntries) {
  const insights = [];

  // Mood patterns insight
  const moodCounts = {};
  weeklyEntries.forEach(entry => {
    moodCounts[entry.mood] = (moodCounts[entry.mood] || 0) + 1;
  });

  const mostFrequentMood = Object.keys(moodCounts).reduce((a, b) => 
    moodCounts[a] > moodCounts[b] ? a : b, 'happy'
  );

  if (moodCounts['anxious'] > 0) {
    insights.push({
      type: 'mood-patterns',
      title: 'Mood Patterns',
      description: 'Based on your journal entries',
      content: `You've felt anxious ${moodCounts['anxious']} days this week. Consider scheduling short breaks during your workday to practice mindfulness.`
    });
  }

  // Progress insight
  const weeklyAvg = weeklyEntries.reduce((sum, entry) => {
    const moodValues = { 'happy': 5, 'excited': 5, 'grateful': 4, 'calm': 4, 'tired': 3, 'sad': 2, 'anxious': 2, 'angry': 1 };
    return sum + (moodValues[entry.mood] || 3);
  }, 0) / Math.max(weeklyEntries.length, 1);

  if (weeklyAvg >= 4) {
    insights.push({
      type: 'progress',
      title: 'Progress Insight',
      description: 'Your weekly improvement',
      content: 'Your overall mood has been positive this week. Your journaling consistency is making a difference in your emotional awareness.'
    });
  }

  // Goal tracking
  const consecutiveDays = calculateConsecutiveDays(allEntries);
  insights.push({
    type: 'goals',
    title: 'Goal Tracking',
    description: 'Progress toward your mental health goals',
    goals: [
      { name: 'Daily Mindfulness', current: Math.min(consecutiveDays, 7), target: 7 },
      { name: 'Journal Entries', current: weeklyEntries.length, target: 7 },
      { name: 'Positive Reflection', current: weeklyEntries.filter(e => ['happy', 'excited', 'grateful'].includes(e.mood)).length, target: 5 }
    ]
  });

  return insights;
}

function generateRecommendations(weeklyEntries, allEntries) {
  const recommendations = [];

  // Analyze content for patterns
  const content = weeklyEntries.map(entry => entry.content.toLowerCase()).join(' ');
  
  if (content.includes('work') || content.includes('stress') || content.includes('anxious')) {
    recommendations.push({
      title: "Stress Management",
      description: "Based on your anxiety patterns",
      content: "Try the 4-7-8 breathing technique: inhale for 4 seconds, hold for 7, exhale for 8. This can help reduce stress levels quickly."
    });
  }

  if (content.includes('sleep') || content.includes('tired') || content.includes('exhausted')) {
    recommendations.push({
      title: "Sleep Improvement",
      description: "Your sleep quality affects your mood",
      content: "Consider creating a bedtime routine by turning off screens 1 hour before bed and reading or meditating instead."
    });
  }

  if (content.includes('alone') || content.includes('lonely') || content.includes('isolated')) {
    recommendations.push({
      title: "Social Connection",
      description: "Important for emotional wellbeing",
      content: "You've mentioned feeling isolated. Consider scheduling a weekly social activity, even a brief coffee with a friend."
    });
  }

  // Add default recommendations
  recommendations.push(
    {
      title: "Physical Activity",
      description: "Boosts mood and reduces anxiety",
      content: "Even short 10-minute walks can significantly improve your mood. Try to incorporate movement into your daily routine."
    },
    {
      title: "Gratitude Practice",
      description: "Shifts focus to positive aspects",
      content: "Consider writing down 3 things you're grateful for each morning to prime your mind for positive thinking."
    },
    {
      title: "Self-compassion",
      description: "Be kind to yourself",
      content: "Notice your negative self-talk and try to speak to yourself with the kindness you'd offer a good friend."
    }
  );

  return recommendations.slice(0, 6); // Return top 6 recommendations
}

function getMoodLabel(value) {
  if (value >= 4.5) return 'Excellent';
  if (value >= 3.5) return 'Good';
  if (value >= 2.5) return 'Okay';
  if (value >= 1.5) return 'Poor';
  return 'Very Poor';
}

function calculateConsecutiveDays(allEntries) {
  const sortedEntries = allEntries.sort((a, b) => new Date(b.date) - new Date(a.date));
  let consecutiveDays = 0;
  let currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);

  for (let i = 0; i < 7; i++) {
    const hasEntry = sortedEntries.some(entry => {
      const entryDate = new Date(entry.date);
      entryDate.setHours(0, 0, 0, 0);
      return entryDate.getTime() === currentDate.getTime();
    });
    if (hasEntry) {
      consecutiveDays++;
    } else {
      break;
    }
    currentDate.setDate(currentDate.getDate() - 1);
  }

  return consecutiveDays;
}

module.exports = router; 