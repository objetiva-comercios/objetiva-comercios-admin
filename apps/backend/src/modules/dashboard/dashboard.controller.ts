import { Controller, Get } from '@nestjs/common'
import { DashboardService } from './dashboard.service'
import { Public } from '../../common/decorators/public.decorator'

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Public()
  @Get()
  getKpis() {
    return this.dashboardService.getKpis()
  }
}
