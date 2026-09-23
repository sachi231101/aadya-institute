import { test, describe } from "node:test";
import assert from "node:assert";
import {
  getPermissionCatalog,
  getAllCatalogItemKeys,
  resolveItemAccessToPermissions,
  permissionsToItemAccess,
  itemShowPermission,
  itemWritePermission,
  ALWAYS_ON_PERMISSIONS,
  staffUserAllowsPermission,
  filterAssignablePermissions,
} from "../utils/permission-catalog";

const CENTER_NAV_ITEM_KEYS = [
  "leads.all",
  "leads.ai_calling",
  "leads.followups",
  "leads.call_history",
  "admissions.applications",
  "admissions.all",
  "counsellor.all",
  "counsellor.lead_allocation",
  "counsellor.performance",
  "students.all",
  "students.documents",
  "students.student_allocation",
  "students.attendance",
  "students.performance",
  "students.discontinuation",
  "faculty.all",
  "faculty.attendance",
  "faculty.performance",
  "courses.all",
  "courses.curriculum",
  "courses.course_assignment",
  "batches.all",
  "schedule.timetable",
  "schedule.classes",
  "schedule.live",
  "schedule.recordings",
  "assignments.all",
  "assignments.create",
  "assignments.submissions",
  "assignments.reviews",
  "exams.all",
  "exams.create",
  "exams.question_bank",
  "exams.results",
  "fees.students",
  "fees.invoices",
  "fees.receipts",
  "fees.reports",
  "targets.all",
  "targets.leaderboard",
  "targets.incentives",
  "reports.students",
  "reports.admissions",
  "reports.attendance",
  "reports.faculty",
  "reports.courses",
  "reports.examinations",
  "reports.financial",
  "communication.notifications",
  "communication.announcements",
  "communication.whatsapp",
  "communication.email",
  "placement.eligible",
  "placement.companies",
  "placement.jobs",
  "placement.applications",
  "placement.interviews",
  "placement.placements",
  "admin.organization",
  "admin.branches",
  "admin.masters",
  "admin.integrations",
  "admin.settings",
] as const;

const REMOVED_FROM_CM_CATALOG = [
  "leads.new",
  "admissions.documents",
  "admissions.direct",
  "courses.modules",
  "targets.assignments",
  "fees.pending",
  "fees.payments",
  "fees.other_invoices",
  "communication.automation",
  "admin.users",
  "admin.roles",
  "admin.security",
  "admin.billing",
  "admin.data_management",
  "admin.audit_logs",
];

describe("CENTER_MANAGER permission catalog", () => {
  test("item keys match Admin operational sidebar with no extras or Admin-only items", () => {
    const keys = getAllCatalogItemKeys("CENTER_MANAGER");
    assert.deepStrictEqual([...keys].sort(), [...CENTER_NAV_ITEM_KEYS].sort());
    assert.strictEqual(new Set(keys).size, keys.length);

    for (const removed of REMOVED_FROM_CM_CATALOG) {
      assert.ok(!keys.includes(removed), `catalog still contains ${removed}`);
    }
  });

  test("module labels match Center ERP module titles", () => {
    const labels = getPermissionCatalog("CENTER_MANAGER").map((m) => m.label);
    assert.deepStrictEqual(labels, [
      "Lead Management",
      "Admission Management",
      "Counsellor Management",
      "Student Management",
      "Faculty Management",
      "Course Management",
      "Batch Management",
      "Class & Schedule",
      "Assignment Management",
      "Examination Management",
      "Fee Management",
      "Target & Incentive",
      "Report Management",
      "Communication",
      "Placement Management",
      "Administration",
    ]);
  });

  test("Administration includes operational items only", () => {
    const adminModule = getPermissionCatalog("CENTER_MANAGER").find((m) => m.key === "administration");
    assert.ok(adminModule);
    assert.deepStrictEqual(
      adminModule.items.map((i) => i.key),
      [
        "admin.organization",
        "admin.branches",
        "admin.masters",
        "admin.integrations",
        "admin.settings",
      ]
    );
  });

  test("critical catalog items grant route-aligned coarse permissions", () => {
    const items = new Map(
      getPermissionCatalog("CENTER_MANAGER")
        .flatMap((module) => module.items)
        .map((item) => [item.key, item])
    );

    assert.deepStrictEqual(items.get("admissions.applications")?.readPermissions, [
      "admission.read",
    ]);
    assert.deepStrictEqual(items.get("admissions.applications")?.writePermissions, [
      "admission.create",
      "admission.update",
    ]);
    assert.deepStrictEqual(items.get("targets.incentives")?.writePermissions, [
      "incentive.approve",
    ]);
    assert.deepStrictEqual(items.get("fees.reports")?.readPermissions, [
      "fee.read",
      "report.read",
    ]);
    assert.deepStrictEqual(items.get("fees.reports")?.writePermissions, []);
    assert.ok(
      items.get("fees.students")?.writePermissions.includes("fee.update")
    );
    assert.ok(
      items.get("fees.invoices")?.writePermissions.includes("fee.create")
    );
    assert.ok(
      items.get("fees.receipts")?.writePermissions.includes("fee.create")
    );
    assert.ok(
      items.get("exams.question_bank")?.writePermissions.includes("exam.manage_questions")
    );
    assert.ok(
      items.get("exams.question_bank")?.writePermissions.includes("question.delete")
    );
    assert.ok(
      items.get("communication.whatsapp")?.writePermissions.includes(
        "whatsapp.automation.manage"
      )
    );
    assert.ok(
      items.get("communication.whatsapp")?.readPermissions.includes(
        "whatsapp.history.read"
      )
    );
    assert.ok(
      !items.get("communication.whatsapp")?.readPermissions.includes(
        "notification.read"
      )
    );
    assert.ok(!ALWAYS_ON_PERMISSIONS.includes("notification.resend"));
  });
});

describe("item-level grant round-trip", () => {
  test("enabling only students.attendance Show does not enable students.all", () => {
    const permissions = resolveItemAccessToPermissions(
      {
        "students.attendance": { show: true, editable: false },
      },
      "CENTER_MANAGER"
    );

    assert.ok(permissions.includes(itemShowPermission("students.attendance")));
    assert.ok(permissions.includes("attendance.read"));
    assert.ok(permissions.includes("schedule.read"));
    assert.ok(!permissions.includes(itemShowPermission("students.all")));
    assert.ok(!permissions.includes("student.read"));

    const access = permissionsToItemAccess(permissions, "CENTER_MANAGER");
    assert.strictEqual(access["students.attendance"]?.show, true);
    assert.strictEqual(access["students.attendance"]?.editable, false);
    assert.strictEqual(access["students.all"]?.show, false);
    assert.strictEqual(access["leads.all"]?.show, false);
  });

  test("Editable writes item.*.write and coarse write permissions", () => {
    const permissions = resolveItemAccessToPermissions(
      {
        "leads.all": { show: true, editable: true },
      },
      "CENTER_MANAGER"
    );

    assert.ok(permissions.includes(itemShowPermission("leads.all")));
    assert.ok(permissions.includes(itemWritePermission("leads.all")));
    assert.ok(permissions.includes("lead.read"));
    assert.ok(permissions.includes("lead.create"));

    const access = permissionsToItemAccess(permissions, "CENTER_MANAGER");
    assert.strictEqual(access["leads.all"]?.show, true);
    assert.strictEqual(access["leads.all"]?.editable, true);
    assert.strictEqual(access["leads.followups"]?.show, false);
    assert.ok(!permissions.includes(itemShowPermission("leads.new")));
  });

  test("Read-only Batch Management excludes batch.create/update and curriculum mark", () => {
    const readOnly = resolveItemAccessToPermissions(
      { "batches.all": { show: true, editable: false } },
      "CENTER_MANAGER"
    );
    assert.ok(readOnly.includes(itemShowPermission("batches.all")));
    assert.ok(readOnly.includes("batch.read"));
    assert.ok(!readOnly.includes(itemWritePermission("batches.all")));
    assert.ok(!readOnly.includes("batch.create"));
    assert.ok(!readOnly.includes("batch.update"));
    assert.ok(!readOnly.includes("batch_curriculum.mark"));

    const access = permissionsToItemAccess(readOnly, "CENTER_MANAGER");
    assert.strictEqual(access["batches.all"]?.show, true);
    assert.strictEqual(access["batches.all"]?.editable, false);
  });

  test("Editable batches.all includes batch_curriculum.mark for Center Manager", () => {
    const perms = resolveItemAccessToPermissions(
      { "batches.all": { show: true, editable: true } },
      "CENTER_MANAGER"
    );
    assert.ok(perms.includes("batch.create"));
    assert.ok(perms.includes("batch.update"));
    assert.ok(perms.includes("batch_curriculum.mark"));
    assert.ok(perms.includes(itemWritePermission("batches.all")));
  });
});

const COUNSELLOR_NAV_ITEM_KEYS = [
  "leads.all",
  "leads.ai_calling",
  "leads.followups",
  "leads.call_history",
  "admissions.applications",
  "admissions.all",
  "students.all",
  "students.documents",
  "students.student_allocation",
  "students.attendance",
  "students.performance",
  "students.discontinuation",
  "faculty.all",
  "faculty.attendance",
  "faculty.performance",
  "batches.all",
  "exams.all",
  "exams.create",
  "exams.question_bank",
  "exams.results",
  "fees.students",
  "fees.invoices",
  "fees.receipts",
  "fees.reports",
  "reports.students",
  "reports.admissions",
  "reports.attendance",
  "reports.faculty",
  "reports.courses",
  "reports.examinations",
  "reports.financial",
  "targets.all",
  "targets.leaderboard",
  "targets.incentives",
  "communication.announcements",
] as const;

const EXCLUDED_FROM_COUNSELLOR_CATALOG = [
  "counsellor.all",
  "courses.all",
  "courses.course_assignment",
  "schedule.timetable",
  "assignments.all",
  "admin.organization",
  "placement.eligible",
  "communication.notifications",
  "leads.new",
  "admissions.direct",
  "targets.performance",
] as const;

describe("COUNSELLOR permission catalog", () => {
  test("item keys match Admin Dashboard sub-items for Counsellor modules", () => {
    const keys = getAllCatalogItemKeys("COUNSELLOR");
    assert.deepStrictEqual([...keys].sort(), [...COUNSELLOR_NAV_ITEM_KEYS].sort());
    assert.strictEqual(new Set(keys).size, keys.length);
  });

  test("module labels match Counsellor ERP module titles", () => {
    const labels = getPermissionCatalog("COUNSELLOR").map((m) => m.label);
    assert.deepStrictEqual(labels, [
      "Lead Management",
      "Admission Management",
      "Student Management",
      "Faculty Management",
      "Batch Management",
      "Examination Management",
      "Fee Management",
      "Report Management",
      "Target & Incentive",
      "Communication",
    ]);
  });

  test("each module’s sub-items match Center Manager / Admin catalog exactly", () => {
    const cmByKey = new Map(
      getPermissionCatalog("CENTER_MANAGER").map((m) => [m.key, m])
    );
    for (const mod of getPermissionCatalog("COUNSELLOR")) {
      const cm = cmByKey.get(mod.key);
      assert.ok(cm, `missing CM module ${mod.key}`);
      const cmItems =
        mod.key === "communication"
          ? cm.items.filter((item) => item.key === "communication.announcements")
          : cm.items;
      assert.deepStrictEqual(
        mod.items.map((i) => ({
          key: i.key,
          label: i.label,
          readPermissions: i.readPermissions,
          writePermissions: i.writePermissions,
        })),
        cmItems.map((i) => ({
          key: i.key,
          label: i.label,
          readPermissions: i.readPermissions,
          writePermissions: i.writePermissions,
        }))
      );
    }
  });

  test("excludes modules/items outside the Counsellor module set", () => {
    const keys = getAllCatalogItemKeys("COUNSELLOR");
    for (const excluded of EXCLUDED_FROM_COUNSELLOR_CATALOG) {
      assert.ok(!keys.includes(excluded), `catalog still contains ${excluded}`);
    }
  });

  test("Read-only leads.all excludes write flags and coarse writes", () => {
    const readOnly = resolveItemAccessToPermissions(
      { "leads.all": { show: true, editable: false } },
      "COUNSELLOR"
    );
    assert.ok(readOnly.includes(itemShowPermission("leads.all")));
    assert.ok(readOnly.includes("lead.read"));
    assert.ok(!readOnly.includes(itemWritePermission("leads.all")));
    assert.ok(!readOnly.includes("lead.create"));

    const access = permissionsToItemAccess(readOnly, "COUNSELLOR");
    assert.strictEqual(access["leads.all"]?.show, true);
    assert.strictEqual(access["leads.all"]?.editable, false);
  });

  test("Editable batches.all includes batch.create/update, curriculum mark, and item write", () => {
    const perms = resolveItemAccessToPermissions(
      { "batches.all": { show: true, editable: true } },
      "COUNSELLOR"
    );
    assert.ok(perms.includes(itemShowPermission("batches.all")));
    assert.ok(perms.includes("batch.read"));
    assert.ok(perms.includes("batch.create"));
    assert.ok(perms.includes("batch.update"));
    assert.ok(perms.includes("batch_curriculum.mark"));
    assert.ok(perms.includes(itemWritePermission("batches.all")));
  });
});

describe("staffUserAllowsPermission for Center Manager", () => {
  test("denies lead.read when the user only has attendance grants, even if role defaults exist in the DB conceptually", () => {
    const granted = [
      ...ALWAYS_ON_PERMISSIONS,
      itemShowPermission("students.attendance"),
      "attendance.read",
    ];

    assert.strictEqual(
      staffUserAllowsPermission(["CENTER_MANAGER"], granted, "attendance.read"),
      true
    );
    assert.strictEqual(
      staffUserAllowsPermission(["CENTER_MANAGER"], granted, "lead.read"),
      false
    );
    assert.strictEqual(
      staffUserAllowsPermission(["CENTER_MANAGER"], granted, "student.read"),
      false
    );
    assert.strictEqual(
      staffUserAllowsPermission(["CENTER_MANAGER"], granted, "dashboard.read"),
      true
    );
  });

  test("ADMIN bypasses all permission checks", () => {
    assert.strictEqual(
      staffUserAllowsPermission(["ADMIN"], [], "lead.delete"),
      true
    );
  });
});

describe("filterAssignablePermissions grantor cap", () => {
  test("non-admin grantor cannot assign permissions they do not hold", () => {
    const { allowed, omitted } = filterAssignablePermissions(
      ["fee.update", "lead.read", "dashboard.read"],
      {
        roleScope: "COUNSELLOR",
        isAdmin: false,
        grantorPermissions: ["lead.read", "item.leads.all"],
      }
    );
    assert.ok(allowed.includes("lead.read"));
    assert.ok(allowed.includes("dashboard.read"));
    assert.ok(!allowed.includes("fee.update"));
    assert.ok(omitted.includes("fee.update"));
  });

  test("drops CM-only permissions when assigning Counsellor catalog", () => {
    const { allowed, omitted } = filterAssignablePermissions(
      ["whatsapp.history.read", "lead.read"],
      {
        roleScope: "COUNSELLOR",
        isAdmin: true,
        grantorPermissions: [],
      }
    );
    assert.ok(allowed.includes("lead.read"));
    assert.ok(!allowed.includes("whatsapp.history.read"));
    assert.ok(omitted.includes("whatsapp.history.read"));
  });
});
