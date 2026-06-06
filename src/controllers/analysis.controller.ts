import { Request, Response } from "express";
import { Attendance } from "../models/attendance.model";
import { Class } from "../models/class.model";
import { StuAssignToClass } from "../models/stuAssignToClass.model";
import { User } from "../models/user.model";
import catchAsync from "../utils/catchAsync";

export const getSingleStudentAnalysisController = catchAsync(
  async (req: Request, res: Response) => {
    const { classId, studentId } = req.params;
    const { filter = "weekly" } = req.query;

    // ✅ Check student in class (Explicit or Grade-based)
    const studentExistInClass = await StuAssignToClass.findOne({
      classId,
      studentId,
    });

    if (!studentExistInClass) {
      const [student, classData] = await Promise.all([
        User.findById(studentId),
        Class.findById(classId),
      ]);

      if (
        !student ||
        !classData ||
        Number(student.gradeLevel) !== Number(classData.grade)
      ) {
        return res.status(404).json({
          success: false,
          message: "Student not found in this class",
        });
      }
    }

    // ✅ Date range
    let startDate = new Date();

    if (filter === "monthly") {
      startDate.setMonth(startDate.getMonth() - 11);
    } else {
      startDate.setDate(startDate.getDate() - 6);
    }

    // ✅ Only THIS student's attendance
    const attendance = await Attendance.find({
      classId,
      userId: studentId,
      date: { $gte: startDate },
    });

    // -------------------------
    // 📊 STRUCTURE INIT
    // -------------------------

    const daysOrder = [
      "Saturday",
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
    ];

    const monthsOrder = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    const grouped: any = {};

    // ✅ Pre-fill (IMPORTANT)
    if (filter === "weekly") {
      daysOrder.forEach((day) => {
        grouped[day] = { present: 0, absent: 0 };
      });
    } else {
      monthsOrder.forEach((month) => {
        grouped[month] = { present: 0, absent: 0 };
      });
    }

    // -------------------------
    // 📊 FILL DATA
    // -------------------------

    attendance.forEach((item) => {
      const date = new Date(item.date);

      const key =
        filter === "monthly"
          ? date.toLocaleString("en-US", { month: "long" })
          : date.toLocaleString("en-US", { weekday: "long" });

      if (item.status === "present") grouped[key].present++;
      else if (item.status === "absent") grouped[key].absent++;
    });

    // -------------------------
    // 📊 FORMAT RESULT
    // -------------------------

    const order = filter === "weekly" ? daysOrder : monthsOrder;

    const chartData = order.map((label) => ({
      label,
      present: grouped[label].present,
      absent: grouped[label].absent,
    }));

    // -------------------------
    // 📊 SUMMARY
    // -------------------------

    let present = 0;
    let absent = 0;

    Object.values(grouped).forEach((d: any) => {
      present += d.present;
      absent += d.absent;
    });

    const total = present + absent;
    const percentage = total ? (present / total) * 100 : 0;

    return res.status(200).json({
      success: true,
      data: {
        studentId,
        classId,
        filter,

        summary: {
          totalDays: total,
          present,
          absent,
          percentage: percentage.toFixed(2),
        },

        chartData,
      },
    });
  },
);


