const mongoose = require('mongoose');
require('dotenv').config();

async function checkAttendance() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const Attendance = mongoose.model('Attendance', new mongoose.Schema({}, { strict: false }));
    
    // Check all attendances
    const all = await Attendance.find().limit(10).lean();
    console.log('Total Attendance Records:', await Attendance.countDocuments());
    console.log('Sample Records:', JSON.stringify(all, null, 2));

    // Check for specific student if known
    const studentId = "69e67c2ceccb9562c18815ee";
    const studentRecords = await Attendance.find({ userId: studentId }).lean();
    console.log(`\nRecords for student ${studentId}:`, studentRecords.length);
    if (studentRecords.length > 0) {
        console.log('First Record ClassId:', studentRecords[0].classId);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkAttendance();
