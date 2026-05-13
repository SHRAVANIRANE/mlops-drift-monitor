from src.monitoring.drift_detection import detect_drift
import pandas as pd
from src.llm.llm_explainer import generate_explanation
import os

#this function simulates getting a new batch of data in production, 
# which has a different age distribution than the training data, 
# causing drift in the "age" feature.
def get_incoming_batch(df):
    return df[df["age"]<35]
    

if __name__ == "__main__":
    df=pd.read_csv("src/data/raw/bank-additional-full.csv",sep=";")

    X=df.drop(columns=["y"])
    y=df["y"].apply(lambda x: 1 if x=="yes" else 0)

    num_cols=X.select_dtypes(include=["int64","float64"]).columns
    cat_cols=X.select_dtypes(include=["object"]).columns

    prod_df=df.copy()
    
    prod_df=get_incoming_batch(prod_df)

    train_age=df["age"] 
    prod_age=prod_df["age"] 
    
    drift_df=detect_drift(df,prod_df,num_cols)
    print("Drift Detection Results:",drift_df)

    drifted_features=drift_df[drift_df["drift"]==True]["feature"].tolist()
    
    if len(drifted_features)>0:
        print("\nDrift detected in features:", drifted_features)
    else:
        print("\nNo drift detected in numerical features.")

    prompt = f"""
    You are an ML monitoring expert.

    Drift detected in features: {drifted_features}

    Key stats:
    - Age mean changed from {train_age.mean():.2f} to {prod_age.mean():.2f}

    CONTEXT:
    This drift was artificially created by filtering dataset to only include users with age < 35.

    INSTRUCTIONS:
    - Identify the EXACT cause of drift based on this context
    - DO NOT give generic reasons like economy, population, etc.
    - Keep answer short (max 4-5 lines)
    - Suggest 2 practical ML actions

    Answer:
    """

    output = generate_explanation(prompt)
    print("\nLLM Explanation:\n", output)
    
    
    os.makedirs("reports", exist_ok=True)
    drift_df.to_csv("reports/drift_report.csv", index=False)
    print("\nDrift report saved to reports/drift_report.csv")