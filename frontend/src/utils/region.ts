export function extractBusanDistrict(address: string): string {
  const match = address.match(/부산광역시\s+([가-힣]+구|기장군)/);
  return match ? match[1] : "기타";
}
