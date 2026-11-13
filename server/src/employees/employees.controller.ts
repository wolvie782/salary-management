import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Request,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import {
  CreateEmployeeDto,
  CreateSalaryChangeDto,
  ListEmployeesQuery,
  UpdateEmployeeDto,
} from './dto/employee.dto';
import { EmployeesService } from './employees.service';

@Controller('employees')
export class EmployeesController {
  constructor(private readonly employees: EmployeesService) {}

  @Get()
  list(@Query() query: ListEmployeesQuery) {
    return this.employees.list(query);
  }

  @Get('export')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="employees.csv"')
  async export(@Query() query: ListEmployeesQuery, @Res() res: Response) {
    const csv = await this.employees.export(query);
    res.send(csv);
  }

  @Get(':id')
  byId(@Param('id', ParseIntPipe) id: number) {
    return this.employees.byId(id);
  }

  @Post()
  create(@Body() dto: CreateEmployeeDto, @Request() req: any) {
    return this.employees.create(dto, req.user?.email ?? 'unknown');
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateEmployeeDto, @Request() req: any) {
    return this.employees.update(id, dto, req.user?.email ?? 'unknown');
  }

  @Post(':id/salary-changes')
  addSalaryChange(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateSalaryChangeDto, @Request() req: any) {
    return this.employees.addSalaryChange(id, dto, req.user?.email ?? 'unknown');
  }
}
