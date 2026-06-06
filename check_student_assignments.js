const mongoose = require('mongoose');
require('dotenv').config();

async function checkStudent() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const studentId = "69e67c2ceccb9562c18815ee";
    
    // Check assignments
    const Assignment = mongoose.model('StudentAssignToClass', new mongoose.Schema({}, { strict: false }), 'student-assign-to-classes');
    const assignments = await Assignment.find({ studentId }).lean();
    console.log(`Assignments for student ${studentId}:`, JSON.stringify(assignments, null, 2));

    // Check Classes
    const Class = mongoose.model('Class', new mongoose.Schema({}, { strict: false }), 'classes');
    if (assignments.length > 0) {
        for (const assign of assignments) {
            const cls = await Class.findById(assign.classId).lean();
            console.log(`Class ${assign.classId} name:`, cls ? cls.subject : 'Not found');
        }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkStudent();
