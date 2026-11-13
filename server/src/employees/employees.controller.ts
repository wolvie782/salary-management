import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
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

  @Get(':id')
  byId(@Param('id', ParseIntPipe) id: number) {
    return this.employees.byId(id);
  }

  @Post()
  create(@Body() dto: CreateEmployeeDto) {
    return this.employees.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateEmployeeDto) {
    return this.employees.update(id, dto);
  }

  @Post(':id/salary-changes')
  addSalaryChange(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateSalaryChangeDto) {
    return this.employees.addSalaryChange(id, dto);
  }
}
