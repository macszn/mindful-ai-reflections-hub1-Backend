const MoodEntry = require('../models/MoodEntry');
const moment = require('moment');
const express = require('express');
const router = express.Router();

router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const now = moment().endOf('day');
    const sevenDaysAgo = moment().subtract(6, 'days').startOf('day');
    const thirtyDaysAgo = moment().subtract(29, 'days').startOf('day');

    // Fetch all relevant entries
    const [allEntries, weeklyEntries, monthlyEntries] = await Promise.all([
      MoodEntry.find({ userId }),
      MoodEntry.find({ userId, date: { $gte: sevenDaysAgo.toDate(), $lte: now.toDate() } }),
      MoodEntry.find({ userId, date: { $gte: thirtyDaysAgo.toDate(), $lte: now.toDate() } }),
    ]);

    // 1. Weekly Average Mood
    const moodScale = {
      angry: 1,
      sad: 2,
      anxious: 3,
      tired: 3,
      calm: 4,
      grateful: 4,
      happy: 5,
      excited: 5
    };

    const weeklyMoodValues = weeklyEntries.map(e => moodScale[e.mood.toLowerCase()] || 0);
    const weeklyAverage = weeklyMoodValues.length
      ? (weeklyMoodValues.reduce((sum, val) => sum + val, 0) / weeklyMoodValues.length)
      : 0;

    const averageMoodLabel = getMoodLabelFromValue(weeklyAverage);

    // 2. Most Frequent Mood (Monthly)
    const moodFreq = {};
    monthlyEntries.forEach(entry => {
      const mood = entry.mood.toLowerCase();
      moodFreq[mood] = (moodFreq[mood] || 0) + 1;
    });

    const mostFrequentMood = Object.entries(moodFreq).reduce(
      (acc, [mood, count]) => count > acc.count ? { mood, count } : acc,
      { mood: null, count: 0 }
    );

    // 3. Journal Entry Stats
    const totalEntries = allEntries.length;
    const weeklyEntriesCount = weeklyEntries.length;

    // 4. Longest Streak Calculation
    const sortedDates = allEntries
      .map(e => moment(e.date).startOf('day').format('YYYY-MM-DD'))
      .filter((v, i, a) => a.indexOf(v) === i) // Remove duplicates
      .sort();

    let maxStreak = 0;
    let currentStreak = 0;
    let previousDate = null;

    sortedDates.forEach(dateStr => {
      const date = moment(dateStr);
      if (!previousDate || date.diff(previousDate, 'days') === 1) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        currentStreak = 1;
      }
      previousDate = date;
    });

    // Fetch previous week's entries (8–14 days ago)
    const previousWeekStart = moment().subtract(13, 'days').startOf('day');
    const previousWeekEnd = moment().subtract(7, 'days').endOf('day');

    const previousWeekEntries = await MoodEntry.find({
    userId,
    date: { $gte: previousWeekStart.toDate(), $lte: previousWeekEnd.toDate() }
    });

    // Calculate average values
    const getAverageMoodValue = entries => {
    const values = entries.map(e => moodScale[e.mood.toLowerCase()] || 0);
    return values.length ? (values.reduce((sum, v) => sum + v, 0) / values.length) : 0;
    };

    const currentAvg = getAverageMoodValue(weeklyEntries);
    const previousAvg = getAverageMoodValue(previousWeekEntries);

    let improvement = null;
    if (previousAvg > 0) {
        improvement = (((currentAvg - previousAvg) / previousAvg) * 100).toFixed(1) + '%';
    } else if (currentAvg > 0) {
        improvement = '100%'; // First week with data
    } else {
        improvement = '0%';
    }

    // console.log("WEekly average mood:", averageMoodLabel);

    // Response
    return res.status(200).json({
      weeklyAverageMood: {
        label: averageMoodLabel,
        value: weeklyAverage.toFixed(2), // optional: for display
        improvement
      },
      mostFrequentMood: {
        mood: capitalize(mostFrequentMood.mood),
        count: mostFrequentMood.count,
        emoji: moodToEmoji(mostFrequentMood.mood)
      },
      journalEntries: {
        total: totalEntries,
        thisWeek: weeklyEntriesCount,
        change: "-25%" // placeholder
      },
      streak: {
        consecutiveDays: maxStreak
      }
    });

  } catch (err) {
    console.error('Error fetching dashboard data:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});


// Helpers
function getMoodLabelFromValue(value) {
  if (value >= 4.5) return "Excellent";
  if (value >= 4) return "Good";
  if (value >= 3) return "Okay";
  if (value >= 2) return "Low";
  if (value > 0) return "Poor";
  return "No Data";
}

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function moodToEmoji(mood) {
  const emojiMap = {
    happy: '😊',
    sad: '😢',
    angry: '😡',
    anxious: '😰',
    tired: '😴',
    calm: '😌',
    grateful: '🙏',
    excited: '😄'
  };
  return emojiMap[mood?.toLowerCase()] || '🙂';
}

module.exports = router;
