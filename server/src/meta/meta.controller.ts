import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { COUNTRIES } from '../seeding/generator';
import { EMPLOYEE_STATUSES, EMPLOYMENT_TYPES } from '../employees/dto/employee.dto';

@Controller('meta')
export class MetaController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('filters')
  async filters() {
    const departments = await this.prisma.department.findMany({ orderBy: { name: 'asc' } });
    return {
      departments,
      countries: COUNTRIES.map((c) => ({ code: c.code, currency: c.currency })),
      statuses: EMPLOYEE_STATUSES,
      employmentTypes: EMPLOYMENT_TYPES,
    };
  }
}
