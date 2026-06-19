import type { SourceRecord } from "@/lib/site-data";

const interventionLabelOverrides: Record<string, string> = {
  "fasting-mimicking-diet": "Fasting-mimicking diet",
  spermidine: "Spermidine"
};

export function getReadableLabel(value: string) {
  return value.replace(/_/g, " ");
}

export function getTitleFromIdentifier(identifier: string) {
  if (interventionLabelOverrides[identifier]) {
    return interventionLabelOverrides[identifier];
  }

  return identifier
    .split("-")
    .map((word) => (["fmd", "igf", "nad", "osk"].includes(word) ? word.toUpperCase() : word))
    .map((word, index) => (index === 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word))
    .join(" ");
}

export function getSourceHref(source: Pick<SourceRecord, "id" | "urls"> | string) {
  const sourceId = typeof source === "string" ? source : source.id;
  const explicitUrl = typeof source === "string" ? undefined : source.urls?.[0];

  if (explicitUrl) {
    return explicitUrl;
  }

  const pubmedMatch = sourceId.match(/^pmid-([0-9]+)$/i);
  if (pubmedMatch) {
    return `https://pubmed.ncbi.nlm.nih.gov/${pubmedMatch[1]}/`;
  }

  const nctMatch = sourceId.match(/^(nct[0-9]+)$/i);
  if (nctMatch) {
    return `https://clinicaltrials.gov/study/${nctMatch[1].toUpperCase()}`;
  }

  return undefined;
}

export function getSourceAuditHref(source: Pick<SourceRecord, "id"> | string) {
  const sourceId = typeof source === "string" ? source : source.id;
  return `/sources/${encodeURIComponent(sourceId)}`;
}

export function getSourceDisplayName(source: Pick<SourceRecord, "id" | "short_name" | "name" | "year">) {
  return source.short_name ? `${source.short_name}${source.year ? ` (${source.year})` : ""}` : source.name;
}

export function getDirectionTone(direction: string) {
  switch (direction) {
    case "positive":
      return "evidence-chip--mint";
    case "null":
    case "negative":
      return "evidence-chip--red";
    case "mixed":
    case "inconclusive":
      return "evidence-chip--gold";
    default:
      return "evidence-chip--muted";
  }
}
