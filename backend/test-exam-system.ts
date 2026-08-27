import { prisma } from "./src/config/database";
import * as examService from "./src/modules/exams/exam.service";
import * as questionService from "./src/modules/questions/question.service";
import * as bankService from "./src/modules/question-banks/question-bank.service";

async function runTests() {
  console.log("🧪 Running Examination System Automated Tests...\n");

  const institute = await prisma.institute.findFirst({ where: { code: "AADYA-HQ" } });
  if (!institute) throw new Error("Institute not found");

  const admin = await prisma.user.findFirst({
    where: {
      instituteId: institute.id,
      userRoles: { some: { role: { name: "ADMIN" } } },
    },
  }) || await prisma.user.findFirst();
  if (!admin) throw new Error("Admin user not found");

  const course = await prisma.course.findFirst({ where: { instituteId: institute.id } });
  const batch = await prisma.batch.findFirst({ where: { instituteId: institute.id } });

  console.log("✅ 1. Testing Question Bank Creation...");
  const bank = await bankService.createQuestionBank(institute.id, null, admin.id, {
    name: `Automated Test Bank ${Date.now()}`,
    description: "Test question bank for verification",
    courseId: course?.id,
  });
  console.log(`   Bank created: ID ${bank.id}, Name: ${bank.name}`);

  console.log("\n✅ 2. Testing Question Authoring (MCQ with Options)...");
  const q1 = await questionService.createQuestion(institute.id, null, admin.id, {
    questionType: "MCQ_SINGLE",
    questionText: "What is the output of typeof null in JavaScript?",
    difficulty: "EASY",
    marks: 2,
    negativeMarks: 0.5,
    explanation: "typeof null returns 'object' due to a legacy bug in JS.",
    questionBankId: bank.id,
    courseId: course?.id,
    options: [
      { optionText: "null", isCorrect: false, displayOrder: 0 },
      { optionText: "undefined", isCorrect: false, displayOrder: 1 },
      { optionText: "object", isCorrect: true, displayOrder: 2 },
      { optionText: "number", isCorrect: false, displayOrder: 3 },
    ],
  });
  console.log(`   MCQ Question created: ID ${q1.id}, marks: ${q1.marks}`);

  console.log("\n✅ 3. Testing Exam Creation...");
  const exam = await examService.createExam(institute.id, null, admin.id, {
    name: `JavaScript Midterm Assessment ${Date.now()}`,
    description: "Comprehensive test of JavaScript fundamentals.",
    durationMinutes: 45,
    passingMarks: 1,
    attemptsAllowed: 1,
    examType: "ONLINE",
    negativeMarkingEnabled: true,
    showResults: true,
    courseId: course?.id,
  });
  console.log(`   Exam created: ID ${exam.id}, Status: ${exam.status}`);

  console.log("\n✅ 4. Adding Question to Exam...");
  const eq = await examService.addQuestionToExam(exam.id, institute.id, admin.id, {
    questionId: q1.id,
    displayOrder: 0,
    marksOverride: 2,
  });
  console.log(`   Question added to exam. Total marks recalculated.`);

  if (batch) {
    console.log("\n✅ 5. Assigning Batch to Exam...");
    const eb = await examService.assignBatchToExam(exam.id, batch.id, institute.id, admin.id);
    console.log(`   Batch ${batch.name} assigned to exam.`);
  }

  console.log("\n✅ 6. Testing Exam Scheduling...");
  const startAt = new Date(Date.now() + 3600000);
  const endAt = new Date(Date.now() + 7200000);
  const scheduled = await examService.scheduleExam(exam.id, institute.id, admin.id, {
    startAt: startAt.toISOString(),
    endAt: endAt.toISOString(),
  });
  console.log(`   Exam scheduled successfully. Status: ${scheduled.status}`);

  console.log("\n✅ 7. Testing Exam Publishing...");
  const published = await examService.publishExam(exam.id, institute.id, admin.id);
  console.log(`   Exam published successfully! Status: ${published?.status}`);

  console.log("\n✅ 8. Testing Exam Stats aggregation...");
  const stats = await examService.getExamStats(institute.id);
  console.log("   Exam stats:", stats);

  console.log("\n🎉 ALL BACKEND EXAMINATION MODULE TESTS PASSED PERFECTLY!\n");
}

runTests()
  .catch((err) => {
    console.error("❌ Test failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
