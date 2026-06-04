import { getStageLabel, type Stage } from "@/lib/site-data";

const stageBadgeClasses: Record<Stage, string> = {
  mechanistic_plausibility: "stage-badge--mechanistic",
  animal_signal: "stage-badge--animal",
  human_biomarker_signal: "stage-badge--biomarker",
  human_functional_benefit: "stage-badge--functional",
  durable_disease_or_mortality_relevance: "stage-badge--durable"
};

type StageBadgeProps = {
  stage: Stage;
  className?: string;
};

export function StageBadge({ stage, className }: StageBadgeProps) {
  const classes = ["stage-badge", stageBadgeClasses[stage], className].filter(Boolean).join(" ");

  return <span className={classes}>{getStageLabel(stage)}</span>;
}
