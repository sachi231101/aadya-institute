-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- CreateIndex
CREATE INDEX "RefreshToken_tokenHash_idx" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "Admission_instituteId_branchId_idx" ON "Admission"("instituteId", "branchId");

-- CreateIndex
CREATE INDEX "Batch_instituteId_branchId_idx" ON "Batch"("instituteId", "branchId");

-- CreateIndex
CREATE INDEX "Faculty_instituteId_branchId_idx" ON "Faculty"("instituteId", "branchId");

-- CreateIndex
CREATE INDEX "Student_instituteId_branchId_idx" ON "Student"("instituteId", "branchId");

-- CreateIndex
CREATE INDEX "User_instituteId_branchId_idx" ON "User"("instituteId", "branchId");

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
