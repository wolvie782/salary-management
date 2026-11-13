-- CreateTable
CREATE TABLE "Department" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" SERIAL NOT NULL,
    "employeeCode" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "jobTitle" TEXT NOT NULL,
    "employmentType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "hireDate" TIMESTAMP(3) NOT NULL,
    "departmentId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalaryRecord" (
    "id" SERIAL NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "reason" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalaryRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FxRate" (
    "currency" TEXT NOT NULL,
    "usdPerUnit" DECIMAL(65,30) NOT NULL,
    "asOf" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FxRate_pkey" PRIMARY KEY ("currency")
);

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'HR_MANAGER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThrottleRecord" (
    "key" TEXT NOT NULL,
    "totalHits" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "blockedUntil" TIMESTAMP(3),

    CONSTRAINT "ThrottleRecord_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "Department_name_key" ON "Department"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_employeeCode_key" ON "Employee"("employeeCode");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_email_key" ON "Employee"("email");

-- CreateIndex
CREATE INDEX "Employee_departmentId_idx" ON "Employee"("departmentId");

-- CreateIndex
CREATE INDEX "Employee_country_idx" ON "Employee"("country");

-- CreateIndex
CREATE INDEX "Employee_status_idx" ON "Employee"("status");

-- CreateIndex
CREATE INDEX "Employee_lastName_firstName_idx" ON "Employee"("lastName", "firstName");

-- CreateIndex
CREATE INDEX "SalaryRecord_employeeId_effectiveFrom_idx" ON "SalaryRecord"("employeeId", "effectiveFrom");

-- CreateIndex
CREATE INDEX "SalaryRecord_effectiveTo_idx" ON "SalaryRecord"("effectiveTo");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "ThrottleRecord_expiresAt_idx" ON "ThrottleRecord"("expiresAt");

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalaryRecord" ADD CONSTRAINT "SalaryRecord_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
