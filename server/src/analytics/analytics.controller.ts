import { Controller, DefaultValuePipe, Get, ParseIntPipe, Query } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('overview')
  overview() {
    return this.analytics.overview();
  }

  @Get('by-department')
  byDepartment() {
    return this.analytics.byDepartment();
  }

  @Get('by-country')
  byCountry() {
    return this.analytics.byCountry();
  }

  @Get('distribution')
  distribution() {
    return this.analytics.distribution();
  }

  @Get('top-earners')
  topEarners(@Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number) {
    return this.analytics.topEarners(limit);
  }
}
