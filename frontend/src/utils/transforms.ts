import type { RawWorkplaceRow, WorkplaceRow } from "../types/employment";

function getTextContent(parent: Element, tagName: string): string {
  const element = parent.getElementsByTagName(tagName)[0];
  return element?.textContent?.trim() ?? "";
}

function parseWorkerCount(value: string): number {
  const parsed = Number(value.replace(/,/g, "").trim());
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function parseWorkplaceXml(xmlText: string): RawWorkplaceRow[] {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, "application/xml");

  const errorNode = xmlDoc.querySelector("parsererror");
  if (errorNode) {
    throw new Error("XML 파싱 실패");
  }

  const items = Array.from(xmlDoc.getElementsByTagName("item"));

  return items.map((item) => ({
    saeopjangNm: getTextContent(item, "saeopjangNm"),
    addr: getTextContent(item, "addr"),
    sangsiInwonCnt: getTextContent(item, "sangsiInwonCnt"),
    seongripDt: getTextContent(item, "seongripDt"),
    gyEopjongNm: getTextContent(item, "gyEopjongNm"),
    sjEopjongNm: getTextContent(item, "sjEopjongNm"),
  }));
}

export function normalizeWorkplaceRows(
  rows: RawWorkplaceRow[]
): WorkplaceRow[] {
  return rows.map((row) => ({
    name: row.saeopjangNm?.trim() ?? "",
    address: row.addr?.trim() ?? "",
    workerCount: parseWorkerCount(row.sangsiInwonCnt ?? "0"),
    startDate: row.seongripDt?.trim() || undefined,
    industryName:
      row.gyEopjongNm?.trim() || row.sjEopjongNm?.trim() || undefined,
  }));
}
