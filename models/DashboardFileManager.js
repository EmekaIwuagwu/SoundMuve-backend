const mongoose = require("mongoose");

const fileManagerSchema = new mongoose.Schema({
  email: {
    type: String,
    required:true,
    max: 255,
  },
  fileName: {
    type: String,
    required:true,
    max: 255,
  },
  fileUrl: {
    type: String,
    required:true,
    max: 255,
  },
  created_at: {
    type: Date,
    default: Date.now(),
  },
});


module.exports = mongoose.model('FileManager',fileManagerSchema);