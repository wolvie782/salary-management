import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  CreateEmployeeDto,
  CreateSalaryChangeDto,
  ListEmployeesQuery,
  UpdateEmployeeDto,
} from './dto/employee.dto';

const currentSalary = {
  salaries: {
    where: { effectiveTo: null },
    select: { amount: true, currency: true, effectiveFrom: true, reason: true },
  },
} as const;

@Injectable()
export class EmployeesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(query: ListEmployeesQuery) {
    const { page = 1, pageSize = 25, search, department, country, status, employmentType, sortBy = 'employeeCode', sortDir = 'asc' } = query;

    const where: Prisma.EmployeeWhereInput = {};
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { employeeCode: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (department) where.department = { name: department };
    if (country) where.country = country;
    if (status) where.status = status;
    if (employmentType) where.employmentType = employmentType;

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.employee.count({ where }),
      this.prisma.employee.findMany({
        where,
        include: { department: { select: { name: true } }, ...currentSalary },
        orderBy: { [sortBy]: sortDir },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      data: rows.map((e) => this.toListItem(e)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async export(query: ListEmployeesQuery): Promise<string> {
    const { search, department, country, status, employmentType } = query;
    const where: Prisma.EmployeeWhereInput = {};
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { employeeCode: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (department) where.department = { name: department };
    if (country) where.country = country;
    if (status) where.status = status;
    if (employmentType) where.employmentType = employmentType;

    const rows = await this.prisma.employee.findMany({
      where,
      include: { department: { select: { name: true } }, ...currentSalary },
      orderBy: { employeeCode: 'asc' },
    });

    const esc = (v: string | null | undefined) => {
      const s = v == null ? '' : String(v);
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"`
        : s;
    };

    const header = 'Employee Code,First Name,Last Name,Email,Job Title,Department,Country,Employment Type,Status,Hire Date,Current Salary,Currency';
    const lines = rows.map((e) => {
      const salary = e.salaries[0];
      return [
        esc(e.employeeCode),
        esc(e.firstName),
        esc(e.lastName),
        esc(e.email),
        esc(e.jobTitle),
        esc(e.department.name),
        esc(e.country),
        esc(e.employmentType),
        esc(e.status),
        esc(e.hireDate.toISOString().slice(0, 10)),
        salary ? String(Number(salary.amount)) : '',
        salary ? esc(salary.currency) : '',
      ].join(',');
    });
    return [header, ...lines].join('\n');
  }

  async byId(id: number) {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      include: {
        department: { select: { id: true, name: true } },
        salaries: { orderBy: { effectiveFrom: 'desc' } },
      },
    });
    if (!employee) throw new NotFoundException(`Employee ${id} not found`);
    return this.toDetail(employee);
  }

  async create(dto: CreateEmployeeDto, performedBy = 'system') {
    const existing = await this.prisma.employee.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException(`Email ${dto.email} is already in use`);

    const department = await this.prisma.department.findUnique({ where: { id: dto.departmentId } });
    if (!department) throw new BadRequestException(`Unknown department ${dto.departmentId}`);

    const code = await this.nextEmployeeCode();
    const hireDate = new Date(dto.hireDate);

    const employee = await this.prisma.employee.create({
      data: {
        employeeCode: code,
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        jobTitle: dto.jobTitle,
        employmentType: dto.employmentType,
        status: 'ACTIVE',
        country: dto.country,
        currency: dto.currency,
        hireDate,
        departmentId: dto.departmentId,
        salaries: {
          create: {
            amount: dto.salaryAmount,
            currency: dto.currency,
            effectiveFrom: hireDate,
            reason: 'HIRE',
            note: dto.salaryNote,
          },
        },
      },
      include: {
        department: { select: { id: true, name: true } },
        salaries: { orderBy: { effectiveFrom: 'desc' } },
      },
    });
    // fire-and-forget: audit failure must not fail the create
    this.audit.log({ action: 'EMPLOYEE_CREATED', entityType: 'EMPLOYEE', entityId: employee.id, details: { firstName: dto.firstName, lastName: dto.lastName, email: dto.email, jobTitle: dto.jobTitle }, performedBy }).catch(() => undefined);
    return this.toDetail(employee);
  }

  async update(id: number, dto: UpdateEmployeeDto, performedBy = 'system') {
    await this.ensureExists(id);
    if (dto.email) {
      const clash = await this.prisma.employee.findFirst({
        where: { email: dto.email, NOT: { id } },
      });
      if (clash) throw new ConflictException(`Email ${dto.email} is already in use`);
    }
    if (dto.departmentId !== undefined) {
      const department = await this.prisma.department.findUnique({ where: { id: dto.departmentId } });
      if (!department) throw new BadRequestException(`Unknown department ${dto.departmentId}`);
    }
    const employee = await this.prisma.employee.update({
      where: { id },
      data: dto,
      include: {
        department: { select: { id: true, name: true } },
        salaries: { orderBy: { effectiveFrom: 'desc' } },
      },
    });
    this.audit.log({ action: 'PROFILE_UPDATED', entityType: 'EMPLOYEE', entityId: id, details: dto as object, performedBy }).catch(() => undefined);
    return this.toDetail(employee);
  }

  // Records a salary change without losing history: the current open record
  // closes the day before the new one takes effect, and the new record is
  // open ended. Runs in a transaction so the timeline can never be left
  // half updated.
  async addSalaryChange(id: number, dto: CreateSalaryChangeDto, performedBy = 'system') {
    const employee = await this.prisma.employee.findUnique({ where: { id } });
    if (!employee) throw new NotFoundException(`Employee ${id} not found`);

    const effectiveFrom = new Date(dto.effectiveFrom);
    if (Number.isNaN(effectiveFrom.getTime())) {
      throw new BadRequestException('effectiveFrom must be a valid date');
    }

    const closesOn = new Date(effectiveFrom.getTime() - 24 * 3600 * 1000);

    // One interactive transaction with a conditional close: the update only
    // matches while the record is still open, so if two changes race, exactly
    // one wins and the other rolls back with a 409 instead of leaving two
    // open records behind.
    try {
      await this.prisma.$transaction(async (tx) => {
        const current = await tx.salaryRecord.findFirst({
          where: { employeeId: id, effectiveTo: null },
        });
        if (!current) {
          throw new ConflictException('Employee has no open salary record to change');
        }
        if (effectiveFrom <= current.effectiveFrom) {
          throw new BadRequestException(
            'effectiveFrom must be after the current salary start date; use a correction workflow instead',
          );
        }
        const closed = await tx.salaryRecord.updateMany({
          where: { id: current.id, effectiveTo: null },
          data: { effectiveTo: closesOn },
        });
        if (closed.count !== 1) {
          throw new ConflictException(
            'Another salary change was recorded at the same time; refresh and retry',
          );
        }
        await tx.salaryRecord.create({
          data: {
            employeeId: id,
            amount: dto.amount,
            currency: employee.currency,
            effectiveFrom,
            effectiveTo: null,
            reason: dto.reason,
            note: dto.note,
          },
        });
      });
    } catch (err) {
      if (err instanceof BadRequestException || err instanceof ConflictException) {
        throw err;
      }
      // Postgres reports a losing concurrent writer as a serialization
      // failure; surface it as a retryable conflict rather than a 500.
      const message = err instanceof Error ? err.message : '';
      if (message.includes('P2034')) {
        throw new ConflictException(
          'Another salary change was recorded at the same time; refresh and retry',
        );
      }
      throw err;
    }

    this.audit.log({ action: 'SALARY_CHANGED', entityType: 'SALARY_RECORD', entityId: id, details: { amount: dto.amount, reason: dto.reason, effectiveFrom: dto.effectiveFrom }, performedBy }).catch(() => undefined);
    return this.byId(id);
  }

  private async ensureExists(id: number) {
    const exists = await this.prisma.employee.findUnique({ where: { id }, select: { id: true } });
    if (!exists) throw new NotFoundException(`Employee ${id} not found`);
  }

  private async nextEmployeeCode(): Promise<string> {
    const last = await this.prisma.employee.findFirst({
      orderBy: { id: 'desc' },
      select: { employeeCode: true },
    });
    const next = last ? Number(last.employeeCode.split('-')[1]) + 1 : 1;
    return `ACME-${String(next).padStart(6, '0')}`;
  }

  private toListItem(e: any) {
    const salary = e.salaries[0] ?? null;
    return {
      id: e.id,
      employeeCode: e.employeeCode,
      firstName: e.firstName,
      lastName: e.lastName,
      email: e.email,
      jobTitle: e.jobTitle,
      employmentType: e.employmentType,
      status: e.status,
      country: e.country,
      currency: e.currency,
      hireDate: e.hireDate,
      department: e.department.name,
      currentSalary: salary
        ? { amount: Number(salary.amount), currency: salary.currency, effectiveFrom: salary.effectiveFrom }
        : null,
    };
  }

  private toDetail(e: any) {
    return {
      id: e.id,
      employeeCode: e.employeeCode,
      firstName: e.firstName,
      lastName: e.lastName,
      email: e.email,
      jobTitle: e.jobTitle,
      employmentType: e.employmentType,
      status: e.status,
      country: e.country,
      currency: e.currency,
      hireDate: e.hireDate,
      department: e.department,
      salaryHistory: e.salaries.map((s: any) => ({
        id: s.id,
        amount: Number(s.amount),
        currency: s.currency,
        effectiveFrom: s.effectiveFrom,
        effectiveTo: s.effectiveTo,
        reason: s.reason,
        note: s.note,
      })),
    };
  }
}
