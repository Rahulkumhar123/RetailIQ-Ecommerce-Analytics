"""
RetailIQ — Customer Intelligence & Segmentation Pipeline
Implements:
1. Customer purchase frequency & repeat buyer analysis
2. Recency, Frequency, Monetary (RFM) feature engineering
3. Rule-based business segmentation
4. Unsupervised K-Means clustering with log-transformation & standardization
5. Customer Lifetime Value (CLV) estimation
"""

import os
import json
import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans


def run_customer_analytics(data_path="data/cleaned/master_orders.csv", output_dir="data/customer_analytics"):
    print("\n[CUSTOMER ANALYTICS] Running RFM, K-Means Clustering & CLV Analysis...")
    os.makedirs(output_dir, exist_ok=True)
    
    df = pd.read_csv(data_path)
    df["order_purchase_timestamp"] = pd.to_datetime(
        df["order_purchase_timestamp"], format="mixed", dayfirst=True
    )
    
    # Filter to delivered orders with valid customer IDs
    valid_orders = df[
        (df["order_status"] == "delivered") &
        df["customer_unique_id"].notnull() &
        df["order_purchase_timestamp"].notnull()
    ].copy()
    
    # Reference date for recency calculation (day after latest order in active window)
    ref_date = pd.Timestamp("2018-09-03")
    
    # Aggregate by unique customer
    cust_rfm = valid_orders.groupby("customer_unique_id").agg(
        last_purchase=("order_purchase_timestamp", "max"),
        first_purchase=("order_purchase_timestamp", "min"),
        frequency=("order_id", "nunique"),
        monetary=("total_payment_value", "sum"),
        avg_review_score=("review_score", "mean"),
        state=("customer_state", "first"),
        city=("customer_city", "first")
    ).reset_index()
    
    cust_rfm["recency_days"] = (ref_date - cust_rfm["last_purchase"]).dt.days
    cust_rfm["recency_days"] = cust_rfm["recency_days"].clip(lower=0)
    cust_rfm["tenure_days"] = (ref_date - cust_rfm["first_purchase"]).dt.days
    cust_rfm["avg_order_value"] = cust_rfm["monetary"] / cust_rfm["frequency"]
    
    # ----------------------------------------------------
    # 1. Repeat Purchase Summary
    # ----------------------------------------------------
    total_customers = len(cust_rfm)
    single_order_count = (cust_rfm["frequency"] == 1).sum()
    repeat_order_count = (cust_rfm["frequency"] > 1).sum()
    repeat_rate_pct = round((repeat_order_count / total_customers) * 100, 2)
    
    repeat_summary = {
        "total_unique_customers": total_customers,
        "single_order_customers": int(single_order_count),
        "repeat_customers": int(repeat_order_count),
        "repeat_purchase_rate_pct": repeat_rate_pct,
        "max_orders_single_customer": int(cust_rfm["frequency"].max())
    }
    print(f"  Total Customers: {total_customers:,}")
    print(f"  Repeat Customers: {repeat_order_count:,} ({repeat_rate_pct}%)")
    
    # ----------------------------------------------------
    # 2. RFM Business Segmentation
    # ----------------------------------------------------
    # Recency score (4 = most recent, 1 = least recent)
    cust_rfm["r_quartile"] = pd.qcut(cust_rfm["recency_days"], q=4, labels=[4, 3, 2, 1]).astype(int)
    
    # Monetary score (4 = highest spend, 1 = lowest spend)
    cust_rfm["m_quartile"] = pd.qcut(cust_rfm["monetary"], q=4, labels=[1, 2, 3, 4]).astype(int)
    
    def assign_segment(row):
        f = row["frequency"]
        r = row["r_quartile"]
        m = row["m_quartile"]
        
        if f > 1 and r >= 3 and m >= 3:
            return "Champions"
        elif f > 1:
            return "Loyal Repeat Buyers"
        elif r >= 3 and m >= 3:
            return "Recent High-Spenders"
        elif r >= 3 and m <= 2:
            return "Recent Low-Spenders"
        elif r <= 2 and m >= 3:
            return "At Risk High-Value"
        else:
            return "Hibernating / Lost"
            
    cust_rfm["segment"] = cust_rfm.apply(assign_segment, axis=1)
    
    # Segment profile
    segment_profile = cust_rfm.groupby("segment").agg(
        customer_count=("customer_unique_id", "count"),
        avg_recency=("recency_days", "mean"),
        avg_frequency=("frequency", "mean"),
        avg_monetary=("monetary", "mean"),
        total_revenue=("monetary", "sum")
    ).reset_index()
    
    segment_profile["pct_customers"] = round(segment_profile["customer_count"] * 100.0 / total_customers, 2)
    segment_profile["pct_revenue"] = round(segment_profile["total_revenue"] * 100.0 / cust_rfm["monetary"].sum(), 2)
    segment_profile = segment_profile.sort_values("total_revenue", ascending=False).reset_index(drop=True)
    
    # Round numerical metrics
    segment_profile["avg_recency"] = segment_profile["avg_recency"].round(1)
    segment_profile["avg_frequency"] = segment_profile["avg_frequency"].round(2)
    segment_profile["avg_monetary"] = segment_profile["avg_monetary"].round(2)
    segment_profile["total_revenue"] = segment_profile["total_revenue"].round(2)
    
    print("\n=== RFM Business Segments ===")
    print(segment_profile.to_string(index=False))
    
    # ----------------------------------------------------
    # 3. K-Means Clustering
    # ----------------------------------------------------
    # Apply log transformation to heavily skewed RFM variables
    rfm_log = pd.DataFrame()
    rfm_log["log_r"] = np.log1p(cust_rfm["recency_days"])
    rfm_log["log_f"] = np.log1p(cust_rfm["frequency"])
    rfm_log["log_m"] = np.log1p(cust_rfm["monetary"])
    
    scaler = StandardScaler()
    rfm_scaled = scaler.fit_transform(rfm_log)
    
    # Fit K-Means with k=4
    kmeans = KMeans(n_clusters=4, random_state=42, n_init=10)
    cust_rfm["cluster"] = kmeans.fit_predict(rfm_scaled)
    
    cluster_profile = cust_rfm.groupby("cluster").agg(
        customer_count=("customer_unique_id", "count"),
        avg_recency=("recency_days", "mean"),
        avg_frequency=("frequency", "mean"),
        avg_monetary=("monetary", "mean"),
        total_revenue=("monetary", "sum")
    ).reset_index()
    
    # Assign human-readable cluster labels based on spend & recency
    cluster_labels = {}
    for idx, row in cluster_profile.sort_values("avg_monetary", ascending=False).reset_index().iterrows():
        if idx == 0:
            cluster_labels[row["cluster"]] = "Cluster 1: High-Spend Core"
        elif idx == 1:
            cluster_labels[row["cluster"]] = "Cluster 2: Moderate-Spend Active"
        elif idx == 2:
            cluster_labels[row["cluster"]] = "Cluster 3: Low-Spend Recent"
        else:
            cluster_labels[row["cluster"]] = "Cluster 4: Lapsed One-Offs"
            
    cust_rfm["cluster_name"] = cust_rfm["cluster"].map(cluster_labels)
    cluster_profile["cluster_name"] = cluster_profile["cluster"].map(cluster_labels)
    cluster_profile["pct_customers"] = round(cluster_profile["customer_count"] * 100.0 / total_customers, 2)
    cluster_profile["pct_revenue"] = round(cluster_profile["total_revenue"] * 100.0 / cust_rfm["monetary"].sum(), 2)
    cluster_profile = cluster_profile.sort_values("total_revenue", ascending=False).reset_index(drop=True)
    
    # ----------------------------------------------------
    # 4. Customer Lifetime Value (CLV) Analysis
    # ----------------------------------------------------
    # Baseline margin assumption: 15% net commission/margin
    # Annual churn probability proxy based on recency quartiles
    churn_rate_map = {4: 0.25, 3: 0.40, 2: 0.65, 1: 0.85}
    cust_rfm["est_churn_prob"] = cust_rfm["r_quartile"].map(churn_rate_map)
    cust_rfm["projected_clv_1yr"] = (
        cust_rfm["avg_order_value"] * cust_rfm["frequency"] * (1 - cust_rfm["est_churn_prob"]) * 0.15
    ).round(2)
    
    clv_summary = {
        "avg_historical_spend": round(float(cust_rfm["monetary"].mean()), 2),
        "median_historical_spend": round(float(cust_rfm["monetary"].median()), 2),
        "avg_projected_1yr_clv": round(float(cust_rfm["projected_clv_1yr"].mean()), 2),
        "top_10pct_spend_threshold": round(float(cust_rfm["monetary"].quantile(0.90)), 2),
        "top_1pct_spend_threshold": round(float(cust_rfm["monetary"].quantile(0.99)), 2)
    }
    
    # ----------------------------------------------------
    # 5. Geographic Distribution
    # ----------------------------------------------------
    state_dist = cust_rfm.groupby("state").agg(
        customer_count=("customer_unique_id", "count"),
        total_spend=("monetary", "sum"),
        repeat_customers=("frequency", lambda x: (x > 1).sum())
    ).reset_index()
    state_dist["repeat_rate_pct"] = round(state_dist["repeat_customers"] * 100.0 / state_dist["customer_count"], 2)
    state_dist["pct_national_customers"] = round(state_dist["customer_count"] * 100.0 / total_customers, 2)
    state_dist = state_dist.sort_values("customer_count", ascending=False).head(10).reset_index(drop=True)
    
    # ----------------------------------------------------
    # Export Artifacts
    # ----------------------------------------------------
    # Export customer segmentation table (sample top 5,000 for quick table viewing + summary)
    cust_rfm_sample = cust_rfm[[
        "customer_unique_id", "recency_days", "frequency", "monetary",
        "avg_order_value", "segment", "cluster_name", "state", "projected_clv_1yr"
    ]].head(5000)
    
    cust_rfm_sample.to_csv(os.path.join(output_dir, "customer_rfm_segments_sample.csv"), index=False)
    segment_profile.to_csv(os.path.join(output_dir, "rfm_segment_summary.csv"), index=False)
    cluster_profile.to_csv(os.path.join(output_dir, "kmeans_cluster_summary.csv"), index=False)
    state_dist.to_csv(os.path.join(output_dir, "state_customer_distribution.csv"), index=False)
    
    output_json = {
        "repeat_summary": repeat_summary,
        "clv_summary": clv_summary,
        "segment_distribution": segment_profile.to_dict(orient="records"),
        "cluster_distribution": cluster_profile.to_dict(orient="records"),
        "top_states": state_dist.to_dict(orient="records"),
        "sample_customers": cust_rfm_sample.head(20).to_dict(orient="records")
    }
    
    with open(os.path.join(output_dir, "customer_analytics_summary.json"), "w") as f:
        json.dump(output_json, f, indent=2, default=lambda x: float(x) if isinstance(x, (np.floating, np.integer)) else str(x))
        
    print("\n[SUCCESS] Customer analytics completed and exported.")
    return output_json


if __name__ == "__main__":
    run_customer_analytics()
