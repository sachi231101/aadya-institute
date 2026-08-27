import { prisma } from './src/config/database';
import * as attemptService from './src/modules/exam-attempts/attempt.service';
import * as attemptRepository from './src/modules/exam-attempts/attempt.repository';

async function runProctoringTestSuite() {
  console.log('===================================================================');
  console.log('🧪 AADYA INSTITUTE PROCTORED EXAMINATION SYSTEM AUTOMATED TEST SUITE');
  console.log('===================================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string) {
    totalTests++;
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passedTests++;
    } else {
      console.error(`  ❌ [FAIL] ${testName}`);
      throw new Error(`Assertion failed: ${testName}`);
    }
  }

  try {
    // 1. Setup / Lookup Seed Data
    console.log('📋 Step 1: Loading Institute, Student, Batch, and Exam Entities...');
    const institute = await prisma.institute.findFirst({ where: { status: 'ACTIVE' } });
    if (!institute) throw new Error('Institute not found in database');

    const studentUser = await prisma.user.findFirst({
      where: { email: 'student@aadya.in', instituteId: institute.id },
    });
    if (!studentUser) throw new Error('Student user not found');

    let student = await prisma.student.findFirst({
      where: { studentCode: 'AAD-2026-1001' },
    });

    if (student) {
      student = await prisma.student.update({
        where: { id: student.id },
        data: { userId: studentUser.id, instituteId: institute.id },
      });
    } else {
      const branch = await prisma.branch.findFirst({ where: { instituteId: institute.id } });
      if (!branch) throw new Error('Branch not found');
      student = await prisma.student.create({
        data: {
          instituteId: institute.id,
          branchId: branch.id,
          studentCode: 'AAD-2026-1001',
          userId: studentUser.id,
          status: 'ACTIVE',
        },
      });
    }

    const adminUser = await prisma.user.findFirst({
      where: { email: 'admin@aadya.in', instituteId: institute.id },
    });
    if (!adminUser) throw new Error('Admin user not found');

    // Find or create active batch enrollment for student
    let studentEnrollment = await prisma.batchEnrollment.findFirst({
      where: { studentId: student.id, status: 'ACTIVE' },
    });
    if (!studentEnrollment) {
      const batch = await prisma.batch.findFirst({ where: { instituteId: institute.id } });
      if (!batch) throw new Error('Batch not found');
      studentEnrollment = await prisma.batchEnrollment.create({
        data: {
          studentId: student.id,
          batchId: batch.id,
          status: 'ACTIVE',
        },
      });
    }

    // Create a dedicated test proctored exam
    console.log('📝 Step 2: Creating Test Proctored Examination with Questions...');
    const testExam = await prisma.exam.create({
      data: {
        instituteId: institute.id,
        createdById: adminUser.id,
        name: `Automated Proctoring Test Exam ${Date.now()}`,
        durationMinutes: 45,
        totalMarks: 20,
        passingMarks: 10,
        attemptsAllowed: 3,
        status: 'PUBLISHED',
        proctoringEnabled: true,
        fullscreenRequired: true,
        maxWarnings: 3,
        tabSwitchDetection: true,
        windowBlurDetection: true,
        fullscreenExitDetection: true,
        keyboardShortcutDetection: true,
        copyPasteDetection: true,
        autoTerminateOnMaxViolations: true,
        batchAssignments: {
          create: { batchId: studentEnrollment.batchId },
        },
        examQuestions: {
          create: [
            {
              displayOrder: 0,
              question: {
                create: {
                  instituteId: institute.id,
                  createdById: adminUser.id,
                  questionText: 'What is the primary architectural instruction file for this project?',
                  questionType: 'MCQ_SINGLE',
                  marks: 10,
                  options: {
                    create: [
                      { optionText: 'README.md', isCorrect: false, displayOrder: 0 },
                      { optionText: 'AGENTS.md', isCorrect: true, displayOrder: 1 },
                      { optionText: 'SYSTEM.md', isCorrect: false, displayOrder: 2 },
                    ],
                  },
                },
              },
            },
            {
              displayOrder: 1,
              question: {
                create: {
                  instituteId: institute.id,
                  createdById: adminUser.id,
                  questionText: 'What is the default max proctoring warnings limit before auto-termination in V1?',
                  questionType: 'NUMERICAL',
                  marks: 10,
                  explanation: '3',
                },
              },
            },
          ],
        },
      },
      include: {
        examQuestions: { include: { question: { include: { options: true } } } },
      },
    });

    assert(!!testExam && testExam.proctoringEnabled, 'Test Exam created with proctoringEnabled = true');

    // Test 1: Student available exams query
    console.log('\n🔍 Step 3: Verifying Student Exam Discovery & Authorization...');
    const availableExams = await attemptService.getStudentAvailableExams(studentUser.id, institute.id);
    const foundExam = availableExams.find((e) => e.id === testExam.id);
    assert(!!foundExam, 'Student can discover exam assigned to their enrolled batch');

    // Test 2: Exam instructions & sanitized policy check
    const instructions = await attemptService.getExamInstructions(testExam.id, studentUser.id, institute.id);
    assert(instructions.exam.durationMinutes === 45, 'Exam duration verified (45 mins)');
    assert(instructions.exam.maxWarnings === 3, 'Proctoring policy specifies maxWarnings = 3');
    assert(instructions.canStartNewAttempt === true, 'Student can start new attempt');

    // Test 3: Start Exam Attempt
    console.log('\n🚀 Step 4: Starting Proctored Exam Attempt...');
    const startResult = await attemptService.startExamAttempt(testExam.id, studentUser.id, institute.id, {
      clientDeviceInfo: { browserName: 'Chrome', screenResolution: '1920x1080' },
    });

    const attemptId = startResult.attempt.id;
    assert(startResult.attempt.status === 'IN_PROGRESS', 'Attempt status is IN_PROGRESS');
    assert(startResult.attempt.attemptNumber === 1, 'Attempt number is 1');
    assert(!!startResult.attempt.expiresAt, 'Server-authoritative expiresAt deadline is set');

    // Verify questions are sanitized (no isCorrect exposed)
    const q1 = startResult.questions[0];
    const hasExposedAnswers = q1.options.some((opt: any) => 'isCorrect' in opt);
    assert(!hasExposedAnswers, 'Question options are sanitized (isCorrect NOT exposed to student)');

    // Test 4: Violation 1 (Tab Switch)
    console.log('\n⚠️ Step 5: Testing Proctoring Violation 1 (Tab Switch)...');
    const v1 = await attemptService.recordProctoringEvent(attemptId, studentUser.id, institute.id, {
      eventType: 'TAB_SWITCH',
      occurredAt: new Date().toISOString(),
      metadata: { reason: 'User switched browser tab' },
    });

    assert(v1.violationCount === 1, 'violationCount incremented to 1');
    assert(v1.warningNumber === 1, 'warningNumber returned is 1');
    assert(v1.warning === true, 'Warning flag is true');
    assert(v1.attemptStatus === 'IN_PROGRESS', 'Attempt status remains IN_PROGRESS');

    // Test 5: Sliding Debounce Protection (< 5 seconds)
    console.log('\n🛡️ Step 6: Testing Sliding Debounce Protection (< 5 seconds)...');
    const debouncedEvent = await attemptService.recordProctoringEvent(attemptId, studentUser.id, institute.id, {
      eventType: 'WINDOW_BLUR',
      occurredAt: new Date().toISOString(), // Immediate simultaneous event
      metadata: { reason: 'Window lost focus simultaneously' },
    });

    assert(debouncedEvent.isDebounced === true, 'Immediate subsequent event is debounced');
    assert(debouncedEvent.violationCount === 1, 'violationCount was NOT incremented on debounced event');

    // Test 6: Violation 2 (Fullscreen Exit after > 5s simulated)
    console.log('\n⚠️ Step 7: Testing Proctoring Violation 2 (Fullscreen Exit)...');
    const futureTime2 = new Date(Date.now() + 6000).toISOString();
    const v2 = await attemptService.recordProctoringEvent(attemptId, studentUser.id, institute.id, {
      eventType: 'FULLSCREEN_EXIT',
      occurredAt: futureTime2,
      metadata: { reason: 'User pressed Esc / exited fullscreen' },
    });

    assert(v2.violationCount === 2, 'violationCount incremented to 2');
    assert(v2.warningNumber === 2, 'warningNumber returned is 2');
    assert(v2.attemptStatus === 'IN_PROGRESS', 'Attempt status remains IN_PROGRESS');

    // Test 7: Violation 3 (Auto-Termination on 3rd Strike)
    console.log('\n🚨 Step 8: Testing Violation 3 & Auto-Termination (3 of 3 Strikes)...');
    const futureTime3 = new Date(Date.now() + 12000).toISOString();
    const v3 = await attemptService.recordProctoringEvent(attemptId, studentUser.id, institute.id, {
      eventType: 'KEYBOARD_SHORTCUT',
      occurredAt: futureTime3,
      metadata: { key: 'F12', reason: 'DevTools shortcut attempt' },
    });

    assert(v3.violationCount === 3, 'violationCount reached 3');
    assert(v3.attemptStatus === 'TERMINATED', 'Attempt automatically set to TERMINATED');
    assert(v3.terminationReason === 'MAX_PROCTORING_VIOLATIONS', 'terminationReason is MAX_PROCTORING_VIOLATIONS');

    // Test 8: Security Check — Terminated Attempt cannot save answers
    console.log('\n🔒 Step 9: Verifying Attempt Locking on Termination...');
    let saveRejected = false;
    try {
      await attemptService.saveAnswers(attemptId, studentUser.id, institute.id, {
        answers: [{ questionId: q1.id, selectedOptionIds: [q1.options[0].id] }],
      });
    } catch (err: any) {
      saveRejected = true;
      assert(err.statusCode === 403, 'Save answer rejected with 403 on terminated attempt');
    }
    assert(saveRejected, 'Terminated attempt cannot save responses');

    // Test 9: Security Check — Terminated Attempt cannot submit normally
    let submitRejected = false;
    try {
      await attemptService.submitExam(attemptId, studentUser.id, institute.id);
    } catch (err: any) {
      submitRejected = true;
      assert(err.statusCode === 403, 'Submit rejected with 403 on terminated attempt');
    }
    assert(submitRejected, 'Terminated attempt cannot be submitted');

    // Test 10: Clean 2nd Attempt & Auto-Evaluation Flow
    console.log('\n🎓 Step 10: Testing Clean Attempt #2 with Autosave & Auto-Evaluation...');
    const startResult2 = await attemptService.startExamAttempt(testExam.id, studentUser.id, institute.id, {});
    const attempt2Id = startResult2.attempt.id;
    assert(startResult2.attempt.attemptNumber === 2, 'New attempt initialized as Attempt #2');

    // Answer Q1 correctly (AGENTS.md)
    const questionsWithOpts = await prisma.question.findMany({
      where: { examQuestions: { some: { examId: testExam.id } } },
      include: { options: true },
    });
    const mcqQ = questionsWithOpts.find((q) => q.questionType === 'MCQ_SINGLE');
    const numQ = questionsWithOpts.find((q) => q.questionType === 'NUMERICAL');
    const q1CorrectOption = mcqQ?.options.find((o) => o.isCorrect);

    await attemptService.saveAnswers(attempt2Id, studentUser.id, institute.id, {
      answers: [
        {
          questionId: mcqQ!.id,
          selectedOptionIds: [q1CorrectOption!.id],
          isFlagged: false,
        },
        {
          questionId: numQ!.id,
          numericalAnswer: 3,
          isFlagged: false,
        },
      ],
    });

    const submitRes = await attemptService.submitExam(attempt2Id, studentUser.id, institute.id);
    assert(submitRes.status === 'COMPLETED', 'Exam submitted and marked COMPLETED');
    assert(submitRes.score === 20, 'Auto-evaluation awarded full 20/20 marks (10 + 10)');
    assert(submitRes.percentage === 100, 'Percentage calculated as 100%');
    assert(submitRes.passed === true, 'Passed status is true (score >= passingMarks 10)');

    // Test 11: Staff Management & Proctoring Audit Timeline
    console.log('\n📊 Step 11: Verifying Staff Proctoring Audit & Timeline APIs...');
    const staffAttempts = await attemptService.getExamAttempts(testExam.id, institute.id, null, {});
    assert(staffAttempts.total === 2, 'Staff view lists all 2 student attempts');

    const timeline = await attemptService.getAttemptProctoringTimeline(attemptId, institute.id, null);
    assert(timeline.proctoringEvents.length === 4, 'Audit timeline contains all 4 recorded proctoring events (3 counted + 1 debounced)');
    assert(timeline.violationCount === 3, 'Attempt has exactly 3 counted violations');
    assert(timeline.status === 'TERMINATED', 'Staff view accurately reflects TERMINATED status');

    console.log('\n===================================================================');
    console.log(`🎉 ALL ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY!`);
    console.log('===================================================================\n');
  } catch (err: any) {
    console.error('\n❌ Test Suite Failed:', err.message || err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runProctoringTestSuite();
