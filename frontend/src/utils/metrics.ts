import type { DistrictSummary, WorkplaceRow } from "../types/employment";
import { extractBusanDistrict } from "./region";

export function summarizeByDistrict(rows: WorkplaceRow[]): DistrictSummary[] {
  const grouped: Record<
    string,
    { businessCount: number; workerCount: number }
  > = {};

  for (const row of rows) {
    const district = extractBusanDistrict(row.address);

    if (!grouped[district]) {
      grouped[district] = {
        businessCount: 0,
        workerCount: 0,
      };
    }

    grouped[district].businessCount += 1;
    grouped[district].workerCount += row.workerCount;
  }

  const totalWorkers = rows.reduce((sum, row) => sum + row.workerCount, 0);

  return Object.entries(grouped)
    .map(([district, value]) => ({
      district,
      businessCount: value.businessCount,
      workerCount: value.workerCount,
      avgWorkersPerBusiness:
        value.businessCount === 0
          ? 0
          : Math.round(value.workerCount / value.businessCount),
      employmentShare:
        totalWorkers === 0
          ? 0
          : Number(((value.workerCount / totalWorkers) * 100).toFixed(1)),
    }))
    .sort((a, b) => b.workerCount - a.workerCount);
}
