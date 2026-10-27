# RetailIQ — Power BI Desktop Setup & Dashboard Guide

This guide walks you through connecting Power BI Desktop to the clean RetailIQ datasets and configuring the 5 analytical report pages.

---

## 1. Clean Data Source Files
The pre-processed, high-speed datasets are located in:
`powerbi/clean_exports/`
- `sales_analytics.csv` — Monthly executive KPI trends and MoM growth.
- `customer_segmentation.csv` — RFM scores, K-Means clusters, and projected CLV.
- `demand_forecasting.csv` — Holdout test actuals vs predictions, plus 12-week future ML demand projections.
- `product_performance.csv` — Category rankings, review ratings, freight-to-price ratios, and delay rates.

---

## 2. Importing Data into Power BI Desktop
1. Open **Power BI Desktop**.
2. Click **Get Data** -> **Text/CSV**.
3. Select each file from `powerbi/clean_exports/`:
   - `sales_analytics.csv`
   - `customer_segmentation.csv`
   - `demand_forecasting.csv`
   - `product_performance.csv`
4. In the Power Query preview dialog, click **Load**.

---

## 3. Data Model Relationships (Star Schema)
1. Navigate to the **Model View** (left sidebar).
2. The core fact/dimension relationships:
   - `customer_segmentation` [customer_unique_id] (Dimension)
   - `sales_analytics` [year_month] (Summary Fact)
   - `demand_forecasting` [week_start] (Predictive Fact)
   - `product_performance` [product_category_name_english] (Dimension)

---

## 4. Report Pages Configuration

### Page 1: Executive Overview
- **KPI Cards:** Total Revenue (BRL), Total Orders, Average Order Value (AOV), Total Customers.
- **Line & Clustered Column Chart:** Monthly Revenue (Bar) + Monthly Order Volume (Line).
- **Donut Chart:** Top 5 Product Categories by Revenue Contribution.
- **Key Slicer:** `year_month` date range.

### Page 2: Sales Analytics
- **Area Chart:** Weekly & Monthly Revenue Trends.
- **Bar Chart:** Revenue by Category (Horizontal sorted descending).
- **Map / Treemap:** Geographic Sales Distribution by Brazilian State (`customer_state`).
- **Matrix Table:** Month-over-Month Growth % table with conditional formatting.

### Page 3: ML Demand Forecasting
- **Line Chart with Ribbon/Bands:**
  - X-Axis: `week_start`
  - Values: `actual_orders` (Solid Blue), `predicted_orders` (Dashed Orange), `lower_bound_orders` & `upper_bound_orders` (Shaded Confidence Area).
- **Cards:** Champion Model Name (XGBoost Regressor), Test Set WAPE % (22.0%), RMSE (379.23).
- **Bar Chart:** Projected Category-Level Demand (Top 5 Categories).

### Page 4: Customer Intelligence & RFM
- **Treemap / Clustered Bar:** Customer Segments (Recent High-Spenders, At Risk High-Value, Champions, etc.) by Customer Count vs Total Spend.
- **Scatter Plot:** Recency Days (X-Axis) vs Monetary Spend (Y-Axis) colored by Segment.
- **Cards:** Repeat Customer Retention Rate (3.0%), Projected Average 1-Year CLV.

### Page 5: Product Performance & Logistics
- **Scatter Plot:** Average Item Price vs Units Sold with bubble size = Total Revenue.
- **Bar Chart:** Late Delivery Rate % by Category.
- **KPI Gauge:** On-Time Delivery Rate (Target: 92%, Actual: ~92.4%).
- **Table Card:** Actionable Business Recommendations and Win-Back priorities.

---

## 5. Existing Power BI Template
The original project included:
`Olist-Ecommerce-Data-Analytics-main/Power BI/Business Intelligence & Predictive Analytics for E-Commerce using Olist Data.pbix`
To update the existing `.pbix` to point to the new clean datasets:
1. Open the `.pbix` in Power BI Desktop.
2. Click **Transform Data** -> **Data source settings**.
3. Click **Change Source** and browse to `powerbi/clean_exports/`.
4. Click **Close & Apply**.
