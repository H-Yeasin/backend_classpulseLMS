import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { Lesson } from '../models/lesson.model';
import { Quiz } from '../models/quiz.model';
import { User } from '../models/user.model';

dotenv.config({ path: path.join(__dirname, '../../../.env') });

async function checkData() {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error('MONGO_URI not found in .env');
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('Connected successfully!');

    // 1. Check for specific lessons
    const lessons = await Lesson.find({ objective: /Complete the assign/i })
      .populate('teacherId', 'username')
      .populate('studentId', 'username');
    
    console.log('\n--- TARGET LESSONS ---');
    if (lessons.length === 0) {
      console.log('No lessons found matching "Complete the assign"');
    } else {
      lessons.forEach((l: any) => {
        console.log(`- ID: ${l._id}`);
        console.log(`  Objective: ${l.objective}`);
        console.log(`  Teacher: ${l.teacherId?.username || 'Unknown'}`);
        console.log(`  Student: ${l.studentId?.username || 'Unknown'}`);
      });
    }

    // 2. Check for quizzes
    const quizzes = await Quiz.find({ title: /Motion and Force/i });
    console.log('\n--- TARGET QUIZZES ---');
    if (quizzes.length === 0) {
      console.log('No quizzes found matching "Motion and Force"');
    } else {
      quizzes.forEach((q: any) => {
        console.log(`- ID: ${q._id}`);
        console.log(`  Title: ${q.title}`);
        console.log(`  Duration: ${q.time} min`);
      });
    }

    // 3. Summarize all content
    const lessonCount = await Lesson.countDocuments();
    const quizCount = await Quiz.countDocuments();
    const userCount = await User.countDocuments();
    
    console.log('\n--- DATABASE SUMMARY ---');
    console.log(`Total Users: ${userCount}`);
    console.log(`Total Lessons: ${lessonCount}`);
    console.log(`Total Quizzes: ${quizCount}`);

  } catch (error) {
    console.error('FAILED:', (error as Error).message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

checkData();
