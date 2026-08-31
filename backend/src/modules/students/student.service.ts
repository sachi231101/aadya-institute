/**
 * Send Student Login Credentials (Student ID & default password)
 * to the student's registered WhatsApp mobile number.
 *
 * Student ID / Username:
 * Uses the generated Student Code / Admission Number.
 *
 * Default Password:
 * Aadya@123
 *
 * The student can change the password later from the Student Portal.
 */
export const sendStudentCredentialsWhatsAppService = async (
  studentId: string,
  currentUser: AuthUser
) => {
  const student = await repo.findStudentById(studentId);

  if (!student) {
    throw new AppError("Student not found", 404);
  }

  if (student.instituteId !== currentUser.instituteId) {
    throw new AppError("Student not found", 404);
  }

  const studentName = student.user?.name || "Student";

  const admission = student.admissions?.[0];

  /**
   * Student ID / Username
   *
   * Primary source: generated studentCode
   * Fallback: admission number
   */
  const studentCode =
    student.studentCode ||
    admission?.admissionNo ||
    "Not Assigned";

  /**
   * Registered student WhatsApp / mobile number.
   *
   * Primary source: User phone
   * Fallback: Admission phone
   */
  const rawPhone =
    student.user?.phone ||
    admission?.phone ||
    "";

  if (!rawPhone || rawPhone.trim() === "") {
    throw new AppError(
      "Student has no registered mobile number on record.",
      400
    );
  }

  /**
   * Remove spaces, +, -, brackets and other formatting characters.
   */
  const cleanPhone = rawPhone.replace(/\D/g, "");

  /**
   * Add India country code when only a 10-digit mobile number is stored.
   */
  const formattedPhone =
    cleanPhone.length === 10
      ? `91${cleanPhone}`
      : cleanPhone;

  /**
   * Default password for every newly admitted student.
   *
   * The actual password stored in the database must already be hashed.
   * This value is only used to communicate the initial credential.
   */
  const initialPassword = "Aadya@123";

  /**
   * Student Portal login URL.
   */
  const portalHost =
    process.env.CLIENT_URL || "http://localhost:5173";

  const loginUrl =
    `${portalHost.replace(/\/+$/, "")}/login`;

  /**
   * WhatsApp credential message.
   */
  const messageText = `🎓 *Welcome to Aadya Institute!*

Dear *${studentName}*,

Your admission has been confirmed successfully. 🎉

Below are your Student Portal login credentials:

🆔 *Student ID / Username:*
${studentCode}

🔑 *Initial Password:*
${initialPassword}

🌐 *Student Portal:*
${loginUrl}

📌 *Important Instructions:*

1. Login using your Student ID and Initial Password.
2. After logging in, change your password from your Profile / Security settings.
3. Keep your password private and do not share it with anyone.
4. You can access your timetable, attendance, assignments, course information and other student services through the Student Portal.

For any assistance, please contact your Aadya Institute counsellor or management team.

Best regards,
*Aadya Institute Management*`;

  /**
   * WhatsApp Web / Mobile deep link.
   */
  const whatsappWebUrl =
    `https://wa.me/${formattedPhone}?text=${encodeURIComponent(
      messageText
    )}`;

  return {
    success: true,

    recipient: {
      name: studentName,
      phone: rawPhone,
      formattedPhone: `+${formattedPhone}`,
      studentCode,
    },

    credentials: {
      studentId: studentCode,
      initialPassword,
      loginUrl,
    },

    message: messageText,

    whatsappWebUrl,
  };
};


/**
 * Get Student Dashboard.
 */
export const getMyDashboard = async (
  currentUser: AuthUser
) => {
  const student = await prisma.student.findFirst({
    where: {
      userId: currentUser.id,
      instituteId: currentUser.instituteId,
    },

    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },

      batchEnrollments: {
        where: {
          status: "ACTIVE",
        },

        include: {
          batch: {
            include: {
              course: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                },
              },

              faculty: {
                include: {
                  user: {
                    select: {
                      name: true,
                      email: true,
                      phone: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!student) {
    throw new AppError(
      "Student profile not found",
      403
    );
  }

  /**
   * Active batches assigned to the student.
   */
  const batchIds = student.batchEnrollments.map(
    (enrollment) => enrollment.batchId
  );

  const now = new Date();

  /**
   * Today's date range.
   */
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  /**
   * Upcoming class range:
   * Next 7 days.
   */
  const upcomingEnd = new Date(todayEnd);
  upcomingEnd.setDate(
    upcomingEnd.getDate() + 7
  );

  const sessionWhere = {
    status: "ACTIVE" as const,

    batchId:
      batchIds.length > 0
        ? {
            in: batchIds,
          }
        : undefined,
  };

  const [
    todaySessions,
    upcomingSessions,
    activeLiveSessions,
    attendanceRecords,
    pendingAssignments,
    availableRecordings,
  ] = await Promise.all([
    /**
     * Today's classes.
     */
    batchIds.length
      ? prisma.classSession.findMany({
          where: {
            ...sessionWhere,

            scheduledDate: {
              gte: todayStart,
              lte: todayEnd,
            },
          },

          include: {
            batch: {
              include: {
                course: true,
              },
            },

            faculty: {
              include: {
                user: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },

          orderBy: [
            {
              startTime: "asc",
            },
          ],
        })
      : Promise.resolve([]),

    /**
     * Upcoming classes for the next 7 days.
     */
    batchIds.length
      ? prisma.classSession.findMany({
          where: {
            ...sessionWhere,

            scheduledDate: {
              gt: todayEnd,
              lte: upcomingEnd,
            },

            sessionStatus: {
              in: [
                "UPCOMING",
                "LIVE",
              ],
            },
          },

          include: {
            batch: {
              include: {
                course: true,
              },
            },

            faculty: {
              include: {
                user: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },

          orderBy: [
            {
              scheduledDate: "asc",
            },
            {
              startTime: "asc",
            },
          ],

          take: 10,
        })
      : Promise.resolve([]),

    /**
     * Currently live classes.
     */
    batchIds.length
      ? prisma.classSession.findMany({
          where: {
            ...sessionWhere,

            sessionStatus: "LIVE",
          },

          include: {
            batch: {
              include: {
                course: true,
              },
            },

            faculty: {
              include: {
                user: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        })
      : Promise.resolve([]),

    /**
     * Student attendance.
     */
    prisma.studentAttendance.findMany({
      where: {
        studentId: student.id,
      },

      include: {
        classSession: {
          select: {
            scheduledDate: true,
          },
        },
      },
    }),

    /**
     * Pending assignments.
     */
    batchIds.length
      ? prisma.assignment.count({
          where: {
            batchId: {
              in: batchIds,
            },

            status: "ACTIVE",

            submissions: {
              none: {
                studentId: student.id,

                submittedAt: {
                  not: null,
                },
              },
            },
          },
        })
      : Promise.resolve(0),

    /**
     * Available recordings.
     */
    batchIds.length
      ? prisma.recording.count({
          where: {
            status: "ACTIVE",

            expiresAt: {
              gt: now,
            },

            classSession: {
              batchId: {
                in: batchIds,
              },
            },
          },
        })
      : Promise.resolve(0),
  ]);

  /**
   * Calculate attendance summary.
   */
  const attendanceSummary =
    computeAttendanceSummary(
      attendanceRecords
    );

  /**
   * Primary active enrollment.
   */
  const primaryEnrollment =
    student.batchEnrollments[0];

  return {
    profile: {
      id: student.id,

      studentCode:
        student.studentCode,

      name:
        student.user?.name ??
        null,

      email:
        student.user?.email ??
        null,
    },

    course: primaryEnrollment
      ? {
          id:
            primaryEnrollment.batch.course.id,

          name:
            primaryEnrollment.batch.course.name,

          code:
            primaryEnrollment.batch.course.code,

          batchName:
            primaryEnrollment.batch.name,
        }
      : null,

    instructor:
      primaryEnrollment?.batch.faculty
        ? {
            id:
              primaryEnrollment.batch.faculty.id,

            name:
              primaryEnrollment.batch.faculty.user?.name ??
              null,

            email:
              primaryEnrollment.batch.faculty.user?.email ??
              null,

            phone:
              primaryEnrollment.batch.faculty.user?.phone ??
              null,
          }
        : null,

    counts: {
      todayClasses:
        todaySessions.length,

      upcomingClasses:
        upcomingSessions.length,

      pendingAssignments,

      availableRecordings,
    },

    attendanceSummary: {
      attendancePercentage:
        attendanceSummary.overallPercentage,

      totalClasses:
        attendanceSummary.totalClasses,

      presentCount:
        attendanceSummary.presentCount,
    },

    todaySessions:
      todaySessions.map((session) => ({
        id: session.id,

        title:
          session.title,

        scheduledDate:
          session.scheduledDate,

        startTime:
          session.startTime,

        endTime:
          session.endTime,

        sessionStatus:
          session.sessionStatus,

        mode:
          session.mode,

        meetingUrl:
          session.meetingUrl,

        courseName:
          session.batch?.course?.name ??
          null,

        facultyName:
          session.faculty?.user?.name ??
          null,
      })),

    upcomingSessions:
      upcomingSessions.map((session) => ({
        id: session.id,

        title:
          session.title,

        scheduledDate:
          session.scheduledDate,

        startTime:
          session.startTime,

        endTime:
          session.endTime,

        sessionStatus:
          session.sessionStatus,

        mode:
          session.mode,

        courseName:
          session.batch?.course?.name ??
          null,

        facultyName:
          session.faculty?.user?.name ??
          null,
      })),

    activeLiveSessions:
      activeLiveSessions.map((session) => ({
        id: session.id,

        title:
          session.title,

        meetingUrl:
          session.meetingUrl,

        courseName:
          session.batch?.course?.name ??
          null,

        facultyName:
          session.faculty?.user?.name ??
          null,
      })),
  };
};