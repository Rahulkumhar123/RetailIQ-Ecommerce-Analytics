"""
RetailIQ — Power BI Data Export Pipeline
Generates standardized, optimized CSV datasets specifically formatted for Power BI
Desktop import without reliance on hardcoded local drive paths.
"""

import os
import shutil
import pandas as pd


def export_powerbi_tables(output_dir="powerbi/clean_exports"):
    print("\n[POWER BI EXPORT] Generating optimized datasets for Power BI...")
    os.makedirs(output_dir, exist_ok=True)
    
    # 1. Sales Analytics Dataset (Monthly Level)
    orders = pd.read_csv("data/cleaned/master_orders.csv")
    orders["order_purchase_timestamp"] = pd.to_datetime(
        orders["order_purchase_timestamp"], format="mixed", dayfirst=True
    )
    
    monthly = orders[
        (orders["order_purchase_timestamp"] >= "2017-01-01") &
        (orders["order_purchase_timestamp"] <= "2018-08-31")
    ].groupby(orders["order_purchase_timestamp"].dt.strftime("%Y-%m")).agg(
        total_orders=("order_id", "nunique"),
        total_revenue=("total_payment_value", "sum"),
        avg_order_value=("total_payment_value", "mean"),
        unique_customers=("customer_unique_id", "nunique"),
        delivered_orders=("order_status", lambda x: (x == "delivered").sum()),
        late_orders=("is_late", lambda x: (x == 1).sum()),
        avg_review_score=("review_score", "mean")
    ).reset_index()
    monthly.rename(columns={"order_purchase_timestamp": "year_month"}, inplace=True)
    monthly["revenue_mom_growth"] = monthly["total_revenue"].pct_change() * 100
    monthly["orders_mom_growth"] = monthly["total_orders"].pct_change() * 100
    monthly = monthly.round(2)
    monthly.to_csv(os.path.join(output_dir, "sales_analytics.csv"), index=False)
    print(f"  Exported sales_analytics.csv ({len(monthly)} rows)")
    
    # 2. Customer Segmentation Dataset
    cust_rfm = pd.read_csv("data/customer_analytics/customer_rfm_segments_sample.csv")
    cust_rfm.to_csv(os.path.join(output_dir, "customer_segmentation.csv"), index=False)
    print(f"  Exported customer_segmentation.csv ({len(cust_rfm)} rows)")
    
    # 3. Demand Forecasting Dataset
    forecast_df = pd.read_csv("data/forecast/future_forecast_12_weeks.csv")
    test_eval_df = pd.read_csv("data/forecast/test_eval_actual_vs_predicted.csv")
    
    # Combine for seamless Power BI timeline visualization
    test_eval_df["series_type"] = "Holdout Test (Actual vs Pred)"
    forecast_df["series_type"] = "Future Horizon ML Forecast"
    forecast_df["actual_orders"] = None
    
    comb_forecast = pd.concat([
        test_eval_df[["week_start", "series_type", "actual_orders", "predicted_orders"]],
        forecast_df[["week_start", "series_type", "actual_orders", "predicted_orders", "lower_bound_orders", "upper_bound_orders", "predicted_revenue_brl"]]
    ], axis=0, ignore_index=True)
    comb_forecast.to_csv(os.path.join(output_dir, "demand_forecasting.csv"), index=False)
    print(f"  Exported demand_forecasting.csv ({len(comb_forecast)} rows)")
    
    # 4. Product Performance Dataset
    prod_perf = pd.read_csv("data/product_analytics/category_performance_full.csv")
    prod_perf.to_csv(os.path.join(output_dir, "product_performance.csv"), index=False)
    print(f"  Exported product_performance.csv ({len(prod_perf)} rows)")
    
    print("\n[SUCCESS] Power BI exports successfully generated.")


if __name__ == "__main__":
    export_powerbi_tables()
