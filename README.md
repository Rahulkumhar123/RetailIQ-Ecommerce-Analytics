# 🛒 RetailIQ — E-Commerce Sales Intelligence & Demand Forecasting

[![Python 3.9+](https://img.shields.io/badge/Python-3.9+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React 18](https://img.shields.io/badge/React-18.3-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![MySQL 8.0+](https://img.shields.io/badge/MySQL-8.0+-4479A1?style=for-the-badge&logo=mysql&logoColor=white)](https://www.mysql.com/)
[![Power BI](https://img.shields.io/badge/Power_BI-Desktop-F2C811?style=for-the-badge&logo=powerbi&logoColor=black)](https://powerbi.microsoft.com/)
[![XGBoost](https://img.shields.io/badge/XGBoost-Forecasting-EB4223?style=for-the-badge)](https://xgboost.readthedocs.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

**RetailIQ** is an enterprise-grade, end-to-end Data Science and Business Analytics portfolio platform engineered to simulate the revenue intelligence, demand forecasting, and customer retention systems utilized at leading marketplace companies such as **Amazon, Flipkart, and Meesho**.

Built on the real-world **Brazilian E-Commerce Public Dataset by Olist** (~100,000 transactions across 2016–2018), RetailIQ connects raw transactional records with an automated data cleaning pipeline, **production MySQL 8.0 analytics (CTEs, Window Functions)**, a **leakage-free machine learning time-series forecasting engine**, **RFM and K-Means customer intelligence**, a **high-speed FastAPI REST backend (sub-10ms latency)**, a **React dashboard styled strictly in plain CSS**, and **Power BI reporting assets with 25+ DAX measures**.

---

## 📌 Executive Summary & Key Verified Findings

Every metric in RetailIQ has been mathematically verified against actual historical transactions:

| Metric | Verified Value | Business Context & Strategic Takeaway |
| :--- | :---: | :--- |
| **Gross Merchandise Value (GMV)** | **R$ 15,422,461.77** | Total revenue generated across completed, delivered e-commerce orders. |
| **Total Completed Orders** | **96,478** | Filtered from 99,441 total orders to isolate mature delivered transactions. |
| **Unique Delivered Buyers** | **93,358** | Deduplicated customer entities based on `customer_unique_id`. |
| **Average Order Value (AOV)** | **R$ 159.85** | Stable basket size across the Brazilian territory over 20 months. |
| **Repeat Purchase Rate** | **3.00%** | Extreme acquisition skew (97.0% one-time buyers), revealing a major retention bottleneck. |
| **High-Spender Revenue Share** | **38.07% (R$ 5.87M)** | Driven by 22,473 buyers (24.1% of base), highlighting the critical role of premium cohorts. |
| **Logistics SLA Impact** | **4.29 ★ vs. 2.57 ★** | Orders delivered on time average 4.29 stars; late deliveries drop by 40% to 2.57 stars. |
| **ML Demand Forecast Error** | **22.00% WAPE / 379.2 RMSE** | XGBoost model evaluated on an unseen 16-week holdout test split with zero lookahead bias. |
| **API Response Latency** | **5.03 ms (p95: 8.21 ms)** | 99.9% reduction from 4,955 ms via database B-Tree indexing and in-memory caching. |

---

## 🏗️ System Architecture

```mermaid
flowchart TD
    subgraph Data_Layer ["1. Data Engineering & Storage"]
        Raw["Raw Olist Datasets (9 CSV Tables)"] --> Cleaning["Data Cleaning & Validation Engine\n(src/data_cleaning.py)"]
        Cleaning --> Master["Master Orders Fact Table\n(data/cleaned/master_orders.csv)"]
        Cleaning --> Database[("MySQL 8+ / SQLite Database\n(data/retail_iq.db)")]
    end

    subgraph Analytics_Layer ["2. Analytical & Machine Learning Pipelines"]
        Database --> SQLSuite["Advanced SQL Analytics Suite\n(sql/retail_analytics.sql)"]
        Master --> ML["ML Time-Series Demand Forecasting\n(src/forecasting.py)"]
        Master --> RFM["Customer RFM & K-Means Clustering\n(src/customer_analytics.py)"]
        Master --> ProdEcon["Product & Logistics Economics\n(src/product_analytics.py)"]
    end

    subgraph Serving_Layer ["3. Application Serving & BI"]
        ML & RFM & ProdEcon --> Cache["High-Speed In-Memory Cache\n(Sub-10ms Latency)"]
        Database & Cache --> API["FastAPI REST Backend\n(backend/main.py)"]
        API --> UI["React Single Page Dashboard\n(Vite + Plain CSS + Recharts)"]
        Cleaning --> PBI["Power BI Star Schema & DAX\n(powerbi/)"]
    end
