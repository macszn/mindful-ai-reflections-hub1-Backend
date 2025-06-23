const express = require('express');
const router = express.Router();
const MoodEntry = require('../models/MoodEntry');
const auth = require('../middleware/auth');


// Get all mood entries for a user
router.get('/', auth, async (req, res) => {
  try {
    const entries = await MoodEntry.find({ userId: req.user._id })
      .sort({ date: -1 });
    res.json(entries);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get a single mood entry
router.get('/:id', auth, async (req, res) => {
  try {
    const entry = await MoodEntry.findOne({
      _id: req.params.id,
      userId: req.user._id
    });
    
    if (!entry) {
      return res.status(404).json({ message: 'Entry not found' });
    }
    
    res.json(entry);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create a new mood entry
router.post('/', auth, async (req, res) => {
  try {
    const { date, mood, content, tags } = req.body;
    
    const entry = new MoodEntry({
      userId: req.user._id,
      date,
      mood,
      content,
      tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag !== '')
    });

    const savedEntry = await entry.save();
    res.status(201).json(savedEntry);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update a mood entry
router.put('/:id', auth, async (req, res) => {
  try {
    const { date, mood, content, tags } = req.body;
    
    const entry = await MoodEntry.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      {
        date,
        mood,
        content,
        tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag !== '')
      },
      { new: true }
    );

    if (!entry) {
      return res.status(404).json({ message: 'Entry not found' });
    }

    res.json(entry);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete a mood entry
router.delete('/:id', auth, async (req, res) => {
  try {
    const entry = await MoodEntry.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!entry) {
      return res.status(404).json({ message: 'Entry not found' });
    }

    res.json({ message: 'Entry deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router; 