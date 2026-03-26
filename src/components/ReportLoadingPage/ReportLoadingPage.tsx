import { Grid } from "ldrs/react";
import "ldrs/react/Grid.css";
import styles from "./ReportLoadingPage.module.css";

type ReportLoadingPageProps = {
  text?: string;
};

export default function ReportLoadingPage({
  text = "Evaluating your soft skills",
}: ReportLoadingPageProps) {
  return (
    <div className={styles.page}>
      <h2 className={styles.title}>{text}</h2>
      <Grid size="60" speed="1.5" color="white" />
    </div>
  );
}
