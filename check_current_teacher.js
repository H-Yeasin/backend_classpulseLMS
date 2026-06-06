require('dotenv').config();
const mongoose = require('mongoose');

async function checkIds() {
  await mongoose.connect(process.env.MONGO_URI);
  
  const teacherId = '69e28b305ef91348080aae1d';
  const teacher = await mongoose.connection.db.collection('users').findOne({ _id: new mongoose.Types.ObjectId(teacherId) });
  
  console.log("Current Teacher:", teacher.username, "SchoolId:", teacher.schoolId);
  
  process.exit(0);
}

checkIds();
