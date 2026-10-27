"""
RetailIQ — Data Cleaning & Validation Pipeline
Handles missing values, duplicate detection, date parsing with dayfirst=True,
category translation merging, delivery performance calculation, and exports
cleaned analytical tables.
"""

import os
import glob
import pandas as pd
import numpy as np


def find_data_dir():
    """Find the base dataset directories dynamically."""
    candidates = [
        ("Olist-Ecommerce-Data-Analytics-main/Dataset", "Olist-Ecommerce-Data-Analytics-main/Dataset 2"),
        ("Dataset", "Dataset 2"),
        ("../Olist-Ecommerce-Data-Analytics-main/Dataset", "../Olist-Ecommerce-Data-Analytics-main/Dataset 2")
    ]
    for d1, d2 in candidates:
        if os.path.exists(d1) and os.path.exists(d2):
            return os.path.abspath(d1), os.path.abspath(d2)
    raise FileNotFoundError("Could not locate Dataset and Dataset 2 directories.")


def load_raw_data():
    dir1, dir2 = find_data_dir()
    print(f"[1/3] Loading raw datasets from:\n  Dir1: {dir1}\n  Dir2: {dir2}")
    
    customers = pd.read_csv(os.path.join(dir1, "olist_customers.csv"))
    orders = pd.read_csv(os.path.join(dir1, "olist_orders.csv"))
    order_items = pd.read_csv(os.path.join(dir1, "olist_order_items.csv"))
    reviews = pd.read_csv(os.path.join(dir1, "olist_reviews.csv"))
    sellers = pd.read_csv(os.path.join(dir1, "olist_sellers.csv"))
    
    payments = pd.read_csv(os.path.join(dir2, "olist_payments.csv"))
    products = pd.read_csv(os.path.join(dir2, "olist_products.csv"))
    cat_trans = pd.read_csv(os.path.join(dir2, "product_category_name_translation.csv"))
    
    print(f"  Customers: {len(customers):,} rows")
    print(f"  Orders: {len(orders):,} rows")
    print(f"  Order Items: {len(order_items):,} rows")
    print(f"  Payments: {len(payments):,} rows")
    print(f"  Reviews: {len(reviews):,} rows")
    print(f"  Products: {len(products):,} rows")
    print(f"  Sellers: {len(sellers):,} rows")
    
    return {
        "customers": customers,
        "orders": orders,
        "order_items": order_items,
        "reviews": reviews,
        "sellers": sellers,
        "payments": payments,
        "products": products,
        "cat_trans": cat_trans
    }


def clean_datasets(data):
    print("\n[2/3] Cleaning and transforming datasets...")
    
    # 1. Orders
    orders = data["orders"].copy()
    date_cols = [
        "order_purchase_timestamp",
        "order_approved_at",
        "order_delivered_carrier_date",
        "order_delivered_customer_date",
        "order_estimated_delivery_date"
    ]
    for col in date_cols:
        orders[col] = pd.to_datetime(orders[col], format="mixed", dayfirst=True)
    
    # Delivery metrics
    orders["delivery_days"] = (
        orders["order_delivered_customer_date"] - orders["order_purchase_timestamp"]
    ).dt.total_seconds() / (24 * 3600)
    
    orders["estimated_delivery_days"] = (
        orders["order_estimated_delivery_date"] - orders["order_purchase_timestamp"]
    ).dt.total_seconds() / (24 * 3600)
    
    orders["delivery_delay_days"] = (
        orders["order_delivered_customer_date"] - orders["order_estimated_delivery_date"]
    ).dt.total_seconds() / (24 * 3600)
    
    orders["is_late"] = orders["delivery_delay_days"].apply(
        lambda x: 1 if pd.notnull(x) and x > 0 else (0 if pd.notnull(x) else np.nan)
    )
    
    # 2. Products with English translations
    products = data["products"].copy()
    cat_trans = data["cat_trans"].copy()
    products = products.merge(cat_trans, on="product_category_name", how="left")
    products["product_category_name_english"] = products["product_category_name_english"].fillna("other")
    
    # 3. Reviews deduped per order (use latest review score if multiple)
    reviews = data["reviews"].copy()
    reviews["review_creation_date"] = pd.to_datetime(reviews["review_creation_date"], format="mixed", dayfirst=True)
    reviews = reviews.sort_values("review_creation_date", ascending=False).drop_duplicates(subset=["order_id"])
    
    # 4. Payments aggregated per order
    payments = data["payments"].copy()
    payments_agg = payments.groupby("order_id").agg(
        total_payment_value=("payment_value", "sum"),
        payment_installments_max=("payment_installments", "max"),
        primary_payment_type=("payment_type", lambda x: x.mode()[0] if not x.empty else "unknown"),
        payment_types_count=("payment_type", "nunique")
    ).reset_index()
    
    # 5. Order items aggregated per order
    order_items = data["order_items"].copy()
    order_items["shipping_limit_date"] = pd.to_datetime(order_items["shipping_limit_date"], format="mixed", dayfirst=True)
    items_agg = order_items.groupby("order_id").agg(
        items_count=("order_item_id", "count"),
        total_item_price=("price", "sum"),
        total_freight_value=("freight_value", "sum"),
        sellers_count=("seller_id", "nunique")
    ).reset_index()
    
    # 6. Master order fact table
    customers = data["customers"].copy()
    master = orders.merge(customers, on="customer_id", how="left")
    master = master.merge(payments_agg, on="order_id", how="left")
    master = master.merge(items_agg, on="order_id", how="left")
    master = master.merge(reviews[["order_id", "review_score"]], on="order_id", how="left")
    
    # Fallback payment value if payments_agg is null
    master["total_payment_value"] = master["total_payment_value"].fillna(
        master["total_item_price"] + master["total_freight_value"]
    )
    
    # Calendar month and year for analytics
    master["purchase_year"] = master["order_purchase_timestamp"].dt.year
    master["purchase_year_month"] = master["order_purchase_timestamp"].dt.strftime("%Y-%m")
    master["purchase_date"] = master["order_purchase_timestamp"].dt.date
    master["purchase_day_of_week"] = master["order_purchase_timestamp"].dt.day_name()
    
    print(f"  Cleaned Master Orders: {len(master):,} rows, {len(master.columns)} columns")
    print(f"  Date range: {master['order_purchase_timestamp'].min()} to {master['order_purchase_timestamp'].max()}")
    
    return {
        "master_orders": master,
        "clean_customers": customers,
        "clean_orders": orders,
        "clean_products": products,
        "clean_order_items": order_items,
        "clean_payments": payments,
        "clean_reviews": reviews,
        "clean_sellers": data["sellers"]
    }


def export_clean_data(cleaned_dict, output_dir="data/cleaned"):
    print(f"\n[3/3] Exporting cleaned datasets to '{output_dir}'...")
    os.makedirs(output_dir, exist_ok=True)
    
    for name, df in cleaned_dict.items():
        path = os.path.join(output_dir, f"{name}.csv")
        df.to_csv(path, index=False)
        print(f"  Saved {name}.csv ({len(df):,} rows)")
    print("  Cleaned data export complete.")


if __name__ == "__main__":
    raw = load_raw_data()
    cleaned = clean_datasets(raw)
    export_clean_data(cleaned)
    print("\n[SUCCESS] Data cleaning pipeline completed successfully.")
