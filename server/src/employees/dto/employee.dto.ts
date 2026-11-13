import {
  IsDateString,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { COUNTRIES } from '../../seeding/generator';

export const EMPLOYMENT_TYPES = ['FULL_TIME', 'PART_TIME', 'CONTRACT'] as const;
export const EMPLOYEE_STATUSES = ['ACTIVE', 'ON_LEAVE', 'INACTIVE'] as const;
export const SALARY_REASONS = ['HIRE', 'PROMOTION', 'ANNUAL_REVIEW', 'MARKET_ADJUSTMENT', 'CORRECTION'] as const;

export const COUNTRY_CODES = COUNTRIES.map((c) => c.code);
export const CURRENCIES = COUNTRIES.map((c) => c.currency);

export class ListEmployeesQuery {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 25;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  department?: string;

  @IsOptional()
  @IsIn(COUNTRY_CODES)
  country?: string;

  @IsOptional()
  @IsIn(EMPLOYEE_STATUSES)
  status?: string;

  @IsOptional()
  @IsIn(EMPLOYMENT_TYPES)
  employmentType?: string;

  @IsOptional()
  @IsIn(['employeeCode', 'firstName', 'lastName', 'hireDate', 'jobTitle', 'country'])
  sortBy?: string = 'employeeCode';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortDir?: 'asc' | 'desc' = 'asc';
}

export class CreateEmployeeDto {
  @IsString()
  @Length(1, 60)
  firstName: string;

  @IsString()
  @Length(1, 60)
  lastName: string;

  @IsEmail()
  @MaxLength(160)
  email: string;

  @IsString()
  @Length(1, 120)
  jobTitle: string;

  @IsIn(EMPLOYMENT_TYPES)
  employmentType: string;

  @IsIn(COUNTRY_CODES)
  country: string;

  @IsIn(CURRENCIES)
  currency: string;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  departmentId: number;

  @IsDateString()
  hireDate: string;

  @Type(() => Number)
  @IsPositive()
  @Max(1_000_000_000)
  salaryAmount: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  salaryNote?: string;
}

export class UpdateEmployeeDto {
  @IsOptional()
  @IsString()
  @Length(1, 60)
  firstName?: string;

  @IsOptional()
  @IsString()
  @Length(1, 60)
  lastName?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(160)
  email?: string;

  @IsOptional()
  @IsString()
  @Length(1, 120)
  jobTitle?: string;

  @IsOptional()
  @IsIn(EMPLOYMENT_TYPES)
  employmentType?: string;

  @IsOptional()
  @IsIn(EMPLOYEE_STATUSES)
  status?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  departmentId?: number;
}

export class CreateSalaryChangeDto {
  @Type(() => Number)
  @IsPositive()
  @Max(1_000_000_000)
  amount: number;

  @IsDateString()
  effectiveFrom: string;

  @IsIn(SALARY_REASONS)
  reason: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

// Employee codes look like ACME-000123. Used by the id route guard.
export const EMPLOYEE_CODE_PATTERN = /^ACME-\d{6}$/;
export const codePattern = Matches(EMPLOYEE_CODE_PATTERN);
