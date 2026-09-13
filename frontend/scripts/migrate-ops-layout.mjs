import fs from "fs";
import path from "path";

const root = path.resolve("src/pages/admin");

const pageFiles = [
  "exams/EditQuestion.tsx",
  "exams/ExamDetails.tsx",
  "exams/ExamAttempts.tsx",
  "exams/ExamResults.tsx",
  "exams/ExamManualGrading.tsx",
  "exams/AttemptProctoringDetails.tsx",
  "fees/StudentFees.tsx",
  "fees/StudentFeeProfile.tsx",
  "fees/Receipts.tsx",
  "fees/ReceiptDetail.tsx",
  "fees/Invoices.tsx",
  "fees/InvoiceDetail.tsx",
  "fees/OtherInvoices.tsx",
  "fees/OtherInvoiceForm.tsx",
  "fees/OtherInvoiceDetail.tsx",
  "fees/PendingFees.tsx",
  "fees/Payments.tsx",
  "fees/FeeReports.tsx",
  "targets/TargetManagement.tsx",
  "targets/TargetPerformance.tsx",
  "targets/IncentiveManagement.tsx",
  "counsellors/LeadAllocation.tsx",
  "counsellors/CounsellorPerformance.tsx",
  "counselor/AllCounsellors.tsx",
  "counselor/CounsellorOverview.tsx",
  "counselor/CounsellorBatches.tsx",
  "leads/AllLeadsList.tsx",
  "leads/LeadDetails.tsx",
  "leads/AddLead.tsx",
  "leads/CallHistory.tsx",
  "leads/FollowUps.tsx",
  "leads/components/LeadSummaryCards.tsx",
  "admissions/AllAdmissions.tsx",
  "admissions/Applications.tsx",
  "admissions/Enquiries.tsx",
  "admissions/DirectAdmissionEntry.tsx",
  "admissions/ViewAdmissionInfo.tsx",
  "admissions/ViewEnquiryInfo.tsx",
  "admissions/AdmissionDocuments.tsx",
];

const layoutImport = `import { PageContainer } from "@/components/layout";\n`;

function ensureLayoutImport(content) {
  if (content.includes('from "@/components/layout"')) return content;
  const cardImport = content.match(/^import .+ from "@\/components\/ui\/card";?\n/m);
  if (cardImport) {
    return content.replace(cardImport[0], layoutImport + cardImport[0]);
  }
  const firstImportEnd = content.indexOf("\n\n");
  if (firstImportEnd === -1) return content;
  return content.slice(0, firstImportEnd + 1) + layoutImport + content.slice(firstImportEnd + 1);
}

function migrate(content, file) {
  let c = ensureLayoutImport(content);
  if (c.includes("<PageContainer")) return { c, changed: false };

  const narrow = /max-w-(3xl|4xl|5xl|6xl)/.test(c) || file.includes("AddLead") || file.includes("Form");
  const open = narrow
    ? '<PageContainer maxWidth="narrow">'
    : file.includes("CounsellorOverview") || file.includes("Dashboard")
      ? '<PageContainer density="compact">'
      : "<PageContainer>";

  const replacements = [
    [/return \(\s*\n\s*<div className="p-6 space-y-6 max-w-\[[^\]]+\] mx-auto">/g, `return (\n    ${open}`],
    [/return \(\s*\n\s*<div className="p-6 space-y-6 max-w-5xl mx-auto pb-24">/g, `return (\n    <PageContainer maxWidth="narrow" className="pb-24">`],
    [/return \(\s*\n\s*<div className="p-6 space-y-6 max-w-5xl mx-auto">/g, `return (\n    <PageContainer maxWidth="narrow">`],
    [/return \(\s*\n\s*<div className="p-6 space-y-6 max-w-4xl mx-auto">/g, `return (\n    <PageContainer maxWidth="narrow">`],
    [/return \(\s*\n\s*<div className="p-6 space-y-6 max-w-6xl mx-auto">/g, `return (\n    <PageContainer maxWidth="narrow">`],
    [/return \(\s*\n\s*<div className="p-6 max-w-3xl mx-auto space-y-6[^"]*">/g, `return (\n    <PageContainer maxWidth="narrow">`],
    [/return \(\s*\n\s*<div className="p-6 space-y-6 max-w-\[1200px\] mx-auto">/g, `return (\n    <PageContainer maxWidth="narrow">`],
    [/return \(\s*\n\s*<div className="w-full p-4 sm:p-6 lg:p-8 space-y-6 pb-16">/g, `return (\n    ${open}`],
    [/return \(\s*\n\s*<div className="p-4 lg:p-6 max-w-\[1400px\] w-full mx-auto space-y-4 bg-background min-h-screen text-foreground font-sans">/g, `return (\n    ${open}`],
    [/return \(\s*\n\s*<div className="p-4 md:p-6 max-w-\[1750px\] w-full mx-auto space-y-5 bg-\[#f8fafc\] min-h-screen">/g, `return (\n    ${open}`],
    [/return \(\s*\n\s*<div className="p-6 md:p-8 max-w-\[1600px\] mx-auto space-y-6 bg-\[#f8fafc\] min-h-screen">/g, `return (\n    <PageContainer density="compact">`],
    [/return \(\s*\n\s*<div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-\[1560px\] mx-auto[^"]*">/g, `return (\n    ${open}`],
    [/return \(\s*\n\s*<div className="p-6 max-w-7xl mx-auto space-y-6">/g, `return (\n    ${open}`],
    [/return \(\s*\n\s*<div className="space-y-6 pb-16">/g, `return (\n    ${open}`],
    [/return \(\s*\n\s*<div className="space-y-6">/g, `return (\n    ${open}`],
    [/return \(\s*\n\s*<div className="max-w-5xl mx-auto space-y-6">/g, `return (\n    <PageContainer maxWidth="narrow">`],
    [/return \(\s*\n\s*<div className="mx-auto max-w-6xl space-y-6 pb-10">/g, `return (\n    <PageContainer maxWidth="narrow" className="pb-10">`],
    [/return \(\s*\n\s*<div className="min-h-screen bg-background text-foreground pb-16">/g, `return (\n    <PageContainer>`],
  ];

  let before = c;
  for (const [from, to] of replacements) {
    c = c.replace(from, to);
  }

  // Close main return wrapper - last </div> before component end is risky; only replace paired outer
  if (c !== before) {
    // naive: replace final `    </div>\n  );\n};` before export with PageContainer
    c = c.replace(/(\n    )<\/div>(\n  \);\n};(\n\nexport|\n$))/g, (m, a, b) => {
      if (m.includes("PageContainer")) return m;
      return `${a}</PageContainer>${b}`;
    });
  }

  return { c, changed: c !== content };
}

let changedFiles = [];
for (const rel of pageFiles) {
  const fp = path.join(root, rel);
  if (!fs.existsSync(fp)) {
    console.log("MISSING", rel);
    continue;
  }
  const original = fs.readFileSync(fp, "utf8");
  const { c, changed } = migrate(original, rel);
  if (changed) {
    fs.writeFileSync(fp, c);
    changedFiles.push(rel);
    console.log("MIGRATED", rel);
  } else {
    console.log("SKIP", rel);
  }
}
console.log("Done:", changedFiles.length, "files");
