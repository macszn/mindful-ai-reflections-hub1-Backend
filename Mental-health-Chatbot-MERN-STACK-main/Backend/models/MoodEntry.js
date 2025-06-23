const mongoose = require('mongoose');

const moodEntrySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  mood: {
    type: String,
    required: true,
    enum: ['happy', 'calm', 'anxious', 'sad', 'angry', 'tired', 'excited', 'grateful']
  },
  content: {
    type: String,
    required: true
  },
  tags: [{
    type: String
  }]
}, {
  timestamps: true
});

// Add index for faster queries
moodEntrySchema.index({ userId: 1, date: -1 });

const MoodEntry = mongoose.model('MoodEntry', moodEntrySchema);

module.exports = MoodEntry; 