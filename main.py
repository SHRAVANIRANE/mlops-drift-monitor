from pathlib import Path

from src.llm.llm_explainer import UNAVAILABLE_MESSAGE, generate_explanation_result
from src.monitoring.service import (
    DEFAULT_REFERENCE_DATA_PATH,
    build_monitoring_result,
    build_rca_prompt,
    load_reference_data,
    simulate_incoming_batch,
)


def main() -> None:
    age_threshold = 35
    p_threshold = 0.05

    reference_df = load_reference_data(DEFAULT_REFERENCE_DATA_PATH)
    incoming_df = simulate_incoming_batch(reference_df, age_threshold)
    monitoring_result = build_monitoring_result(reference_df, incoming_df, p_threshold)

    print("Drift Detection Results:")
    print(monitoring_result.display_df.to_string(index=False))

    if monitoring_result.drifted_features:
        print("\nDrift detected in features:", monitoring_result.drifted_features)
    else:
        print("\nNo drift detected in monitored features.")

    focus_feature = (
        monitoring_result.drifted_features[0]
        if monitoring_result.drifted_features
        else monitoring_result.monitored_columns[0]
    )
    incoming_source_description = (
        f"Simulated batch created by filtering the dataset to rows where age < {age_threshold}."
    )
    prompt = build_rca_prompt(
        monitoring_result.drift_df,
        focus_feature,
        incoming_source_description,
    )
    explanation = generate_explanation_result(prompt)

    if explanation.available:
        print(f"\nLLM Explanation for {focus_feature}:\n{explanation.content}")
    else:
        print(f"\n{UNAVAILABLE_MESSAGE}")
        if explanation.error:
            print(f"Details: {explanation.error}")

    reports_dir = Path("reports")
    reports_dir.mkdir(exist_ok=True)
    output_path = reports_dir / "drift_report.csv"
    monitoring_result.drift_df.to_csv(output_path, index=False)
    print(f"\nDrift report saved to {output_path}")


if __name__ == "__main__":
    main()
