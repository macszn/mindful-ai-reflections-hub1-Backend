const express = require('express');
const router = express.Router();
const MoodEntry = require('../models/MoodEntry');
// const auth = require('../middleware/auth');
// const Users = require('../models/Users');



// Get all mood entries for a user
router.get('/', async (req, res) => {
  try {
    const entries = await MoodEntry.find({ userId: req.query.userId })
      .sort({ date: -1 });
    res.json(entries);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
});

// Get a single mood entry
router.get('/:id', async (req, res) => {
  try {
    const entry = await MoodEntry.findOne({
      _id: req.params.id,
      userId: req.user.id
    });
    
    if (!entry) {
      return res.status(404).json({ message: 'Entry not found' });
    }
    
    res.json(entry);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
});

// Create a new mood entry
router.post('/', async (req, res) => {
  try {
    const { date, mood, content, tags } = req.body;
    
    const entry = new MoodEntry({
      userId: req.query.userId,
      date,
      mood,
      content,
      tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag !== '')
    });

    const savedEntry = await entry.save();
    res.status(201).json(savedEntry);
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: error.message });
  }
});

// Update a mood entry
router.put('/:id', async (req, res) => {
  try {
    const { date, mood, content, tags } = req.body;
    
    const entry = await MoodEntry.findOneAndUpdate(
      { _id: req.params.id, userId: req.query.userId },
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
    console.error(error);
    res.status(400).json({ message: error.message });
  }
});

// Edit (partially update) a mood entry
router.patch('/:id', async (req, res) => {
  try {
    const updateFields = {};
    const allowedFields = ['date', 'mood', 'content', 'tags'];
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        if (field === 'tags' && typeof req.body.tags === 'string') {
          updateFields.tags = req.body.tags.split(',').map(tag => tag.trim()).filter(tag => tag !== '');
        } else {
          updateFields[field] = req.body[field];
        }
      }
    });

    const entry = await MoodEntry.findOneAndUpdate(
      { _id: req.params.id, userId: req.query.userId },
      updateFields,
      { new: true }
    );

    if (!entry) {
      return res.status(404).json({ message: 'Entry not found' });
    }

    res.json(entry);
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: error.message });
  }
});

// Delete a mood entry
router.delete('/:id', async (req, res) => {
  try {
    const entry = await MoodEntry.findOneAndDelete({
      _id: req.params.id,
      userId: req.query.userId,
    });

    if (!entry) {
      return res.status(404).json({ message: 'Entry not found' });
    }

    res.json({ message: 'Entry deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router; 