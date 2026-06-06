require('dotenv').config();
const mongoose = require('mongoose');

async function fixTeacher() {
  await mongoose.connect(process.env.MONGO_URI);
  
  const teacherId = '69e28b305ef91348080aae1d';
  const schoolId = '68ae3f367fc898d62416539a'; // Default test school
  
  await mongoose.connection.db.collection('users').updateOne(
    { _id: new mongoose.Types.ObjectId(teacherId) },
    { $set: { schoolId: new mongoose.Types.ObjectId(schoolId) } }
  );
  
  console.log("Teacher updated with schoolId:", schoolId);
  process.exit(0);
}

fixTeacher();
