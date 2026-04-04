from scipy.stats import ks_2samp
import pandas as pd

def detect_drift(train_df, prod_df, num_cols):
    
    results = []
    
    for col in num_cols:
        
        # IMPORTANT: use NEW variables
        train_col = train_df[col].dropna()
        prod_col = prod_df[col].dropna()
        
        ks_stat, p_value = ks_2samp(train_col, prod_col)
        
        drift = p_value < 0.05
        
        results.append((col, ks_stat, p_value, drift))
    
    drift_df = pd.DataFrame(results, columns=["feature", "ks_stat", "p_value", "drift"])
    
    return drift_df