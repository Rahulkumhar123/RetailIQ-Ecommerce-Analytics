-- ============================================================================
-- RetailIQ: E-Commerce Sales Intelligence & Demand Forecasting
-- Advanced SQL Analytics Suite (MySQL 8.0+ Dialect)
-- Demonstrating: CTEs, Window Functions, DENSE_RANK, LAG, NTILE, SUM() OVER(),
-- CASE WHEN, Subqueries, HAVING, and Date-based Analytics.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- SCHEMA DEFINITION (DDL)
-- ----------------------------------------------------------------------------
CREATE DATABASE IF NOT EXISTS olist_project;
USE olist_project;

-- ----------------------------------------------------------------------------
-- 1. EXECUTIVE KPI SUMMARY (CTE Pre-Aggregation to Prevent Join Fan-Out)
-- Computes the high-level health metrics of the e-commerce business.
-- ----------------------------------------------------------------------------
WITH order_payments AS (
    SELECT order_id, SUM(payment_value) AS order_revenue
    FROM payments
    GROUP BY order_id
),
order_reviews AS (
    SELECT order_id, AVG(review_score) AS order_satisfaction
    FROM reviews
    GROUP BY order_id
)
SELECT 
    ROUND(SUM(op.order_revenue), 2) AS total_revenue_brl,
    COUNT(DISTINCT o.order_id) AS total_orders,
    ROUND(SUM(op.order_revenue) / COUNT(DISTINCT o.order_id), 2) AS average_order_value_brl,
    COUNT(DISTINCT c.customer_unique_id) AS total_unique_customers,
    ROUND(AVG(r.order_satisfaction), 2) AS avg_customer_satisfaction,
    ROUND(
        100.0 * SUM(CASE WHEN o.order_delivered_customer_date <= o.order_estimated_delivery_date THEN 1 ELSE 0 END) 
        / NULLIF(COUNT(CASE WHEN o.order_delivered_customer_date IS NOT NULL THEN 1 END), 0), 
        2
    ) AS on_time_delivery_pct
FROM orders o
LEFT JOIN order_payments op ON o.order_id = op.order_id
LEFT JOIN customers c ON o.customer_id = c.customer_id
LEFT JOIN order_reviews r ON o.order_id = r.order_id
WHERE o.order_status = 'delivered';


-- ----------------------------------------------------------------------------
-- 2. MONTHLY REVENUE GROWTH & MOM TREND (CTE + Window LAG)
-- Analyzes month-over-month revenue velocity and order volume changes.
-- ----------------------------------------------------------------------------
WITH monthly_metrics AS (
    SELECT 
        SUBSTR(o.order_purchase_timestamp, 1, 7) AS order_month,
        COUNT(DISTINCT o.order_id) AS order_count,
        ROUND(SUM(p.payment_value), 2) AS monthly_revenue
    FROM orders o
    JOIN payments p ON o.order_id = p.order_id
    WHERE o.order_purchase_timestamp IS NOT NULL
      AND SUBSTR(o.order_purchase_timestamp, 1, 7) <= '2018-08'
    GROUP BY SUBSTR(o.order_purchase_timestamp, 1, 7)
),
mom_growth AS (
    SELECT 
        order_month,
        order_count,
        monthly_revenue,
        LAG(monthly_revenue, 1) OVER (ORDER BY order_month) AS prev_month_revenue,
        LAG(order_count, 1) OVER (ORDER BY order_month) AS prev_month_orders
    FROM monthly_metrics
)
SELECT 
    order_month,
    order_count,
    monthly_revenue,
    prev_month_revenue,
    ROUND(((monthly_revenue - prev_month_revenue) / prev_month_revenue) * 100, 2) AS revenue_mom_pct,
    ROUND(((order_count - prev_month_orders) * 1.0 / prev_month_orders) * 100, 2) AS orders_mom_pct
FROM mom_growth
ORDER BY order_month;


-- ----------------------------------------------------------------------------
-- 3. TOP PRODUCT CATEGORIES BY REVENUE & RANKING (DENSE_RANK & Window SUM)
-- Identifies category market share and revenue concentration.
-- ----------------------------------------------------------------------------
WITH category_sales AS (
    SELECT 
        COALESCE(pr.product_category_name_english, 'other') AS category,
        COUNT(oi.order_item_id) AS units_sold,
        ROUND(SUM(oi.price), 2) AS item_revenue,
        ROUND(AVG(oi.price), 2) AS avg_item_price
    FROM order_items oi
    JOIN products pr ON oi.product_id = pr.product_id
    GROUP BY COALESCE(pr.product_category_name_english, 'other')
)
SELECT 
    category,
    units_sold,
    item_revenue,
    avg_item_price,
    DENSE_RANK() OVER (ORDER BY item_revenue DESC) AS revenue_rank,
    ROUND(item_revenue * 100.0 / SUM(item_revenue) OVER (), 2) AS revenue_share_pct
FROM category_sales
ORDER BY item_revenue DESC
LIMIT 15;


-- ----------------------------------------------------------------------------
-- 4. CUSTOMER REPEAT PURCHASE COHORT (Subquery & Frequency Distribution)
-- Measures customer retention by categorizing buyer order frequency.
-- ----------------------------------------------------------------------------
WITH customer_orders AS (
    SELECT 
        c.customer_unique_id,
        COUNT(DISTINCT o.order_id) AS total_orders,
        ROUND(SUM(p.payment_value), 2) AS lifetime_spend
    FROM customers c
    JOIN orders o ON c.customer_id = o.customer_id
    JOIN payments p ON o.order_id = p.order_id
    GROUP BY c.customer_unique_id
)
SELECT 
    CASE 
        WHEN total_orders = 1 THEN '1 Order (One-Time)'
        WHEN total_orders = 2 THEN '2 Orders (Repeat)'
        WHEN total_orders BETWEEN 3 AND 5 THEN '3-5 Orders (Loyal)'
        ELSE '6+ Orders (Power Buyer)'
    END AS customer_cohort,
    COUNT(customer_unique_id) AS customer_count,
    ROUND(COUNT(customer_unique_id) * 100.0 / (SELECT COUNT(*) FROM customer_orders), 2) AS pct_of_customers,
    ROUND(SUM(lifetime_spend), 2) AS cohort_revenue,
    ROUND(AVG(lifetime_spend), 2) AS avg_lifetime_spend
FROM customer_orders
GROUP BY 
    CASE 
        WHEN total_orders = 1 THEN '1 Order (One-Time)'
        WHEN total_orders = 2 THEN '2 Orders (Repeat)'
        WHEN total_orders BETWEEN 3 AND 5 THEN '3-5 Orders (Loyal)'
        ELSE '6+ Orders (Power Buyer)'
    END
ORDER BY cohort_revenue DESC;


-- ----------------------------------------------------------------------------
-- 5. GEOGRAPHIC SALES & REGIONAL CONTRIBUTION (Window Functions)
-- Highlights regional performance across Brazil states (SP, RJ, MG, etc.).
-- ----------------------------------------------------------------------------
WITH state_performance AS (
    SELECT 
        c.customer_state,
        COUNT(DISTINCT o.order_id) AS total_orders,
        COUNT(DISTINCT c.customer_unique_id) AS unique_customers,
        ROUND(SUM(p.payment_value), 2) AS total_revenue,
        ROUND(AVG(o.delivery_days), 1) AS avg_delivery_days
    FROM customers c
    JOIN orders o ON c.customer_id = o.customer_id
    JOIN payments p ON o.order_id = p.order_id
    WHERE o.order_status = 'delivered'
    GROUP BY c.customer_state
)
SELECT 
    customer_state,
    total_orders,
    unique_customers,
    total_revenue,
    avg_delivery_days,
    ROUND(total_revenue * 100.0 / SUM(total_revenue) OVER (), 2) AS pct_national_revenue,
    DENSE_RANK() OVER (ORDER BY total_revenue DESC) AS state_rank
FROM state_performance
ORDER BY total_revenue DESC
LIMIT 10;


-- ----------------------------------------------------------------------------
-- 6. DELIVERY PERFORMANCE & DELAY IMPACT (CASE WHEN & Conditionals)
-- Compares satisfaction score between orders delivered on time vs late.
-- ----------------------------------------------------------------------------
SELECT 
    CASE 
        WHEN o.is_late = 1 THEN 'Late Delivery'
        WHEN o.is_late = 0 THEN 'On-Time / Early'
        ELSE 'Delivery Status Unknown'
    END AS delivery_classification,
    COUNT(DISTINCT o.order_id) AS order_count,
    ROUND(COUNT(DISTINCT o.order_id) * 100.0 / SUM(COUNT(DISTINCT o.order_id)) OVER (), 2) AS pct_of_delivered,
    ROUND(AVG(o.delivery_days), 1) AS avg_days_to_deliver,
    ROUND(AVG(r.review_score), 2) AS avg_satisfaction_score,
    ROUND(SUM(CASE WHEN r.review_score <= 2 THEN 1 ELSE 0 END) * 100.0 / COUNT(r.review_score), 2) AS pct_negative_reviews
FROM orders o
LEFT JOIN reviews r ON o.order_id = r.order_id
WHERE o.order_status = 'delivered'
GROUP BY 
    CASE 
        WHEN o.is_late = 1 THEN 'Late Delivery'
        WHEN o.is_late = 0 THEN 'On-Time / Early'
        ELSE 'Delivery Status Unknown'
    END;


-- ----------------------------------------------------------------------------
-- 7. RFM ANALYTICAL SCORING (Window NTILE & Customer Segmentation)
-- Quantile-based RFM scoring (1-4) on Recency, Frequency, Monetary.
-- ----------------------------------------------------------------------------
WITH rfm_base AS (
    SELECT 
        c.customer_unique_id,
        CAST((JULIANDAY('2018-09-03') - JULIANDAY(MAX(o.order_purchase_timestamp))) AS INTEGER) AS recency_days,
        COUNT(DISTINCT o.order_id) AS frequency,
        ROUND(SUM(p.payment_value), 2) AS monetary
    FROM customers c
    JOIN orders o ON c.customer_id = o.customer_id
    JOIN payments p ON o.order_id = p.order_id
    WHERE o.order_status = 'delivered'
    GROUP BY c.customer_unique_id
),
rfm_quantiles AS (
    SELECT 
        customer_unique_id,
        recency_days,
        frequency,
        monetary,
        NTILE(4) OVER (ORDER BY recency_days DESC) AS r_quartile,
        NTILE(4) OVER (ORDER BY monetary ASC) AS m_quartile
    FROM rfm_base
)
SELECT 
    CASE 
        WHEN r_quartile = 4 AND m_quartile = 4 THEN 'Champions'
        WHEN r_quartile >= 3 AND m_quartile >= 3 THEN 'Loyal High-Value'
        WHEN r_quartile >= 3 AND m_quartile < 3 THEN 'Recent Low-Spend'
        WHEN r_quartile <= 2 AND m_quartile >= 3 THEN 'At Risk High-Value'
        ELSE 'Lost / Hibernating'
    END AS rfm_segment,
    COUNT(customer_unique_id) AS customer_count,
    ROUND(AVG(recency_days), 1) AS avg_recency_days,
    ROUND(AVG(frequency), 2) AS avg_order_frequency,
    ROUND(AVG(monetary), 2) AS avg_monetary_spend,
    ROUND(SUM(monetary), 2) AS total_segment_spend
FROM rfm_quantiles
GROUP BY 
    CASE 
        WHEN r_quartile = 4 AND m_quartile = 4 THEN 'Champions'
        WHEN r_quartile >= 3 AND m_quartile >= 3 THEN 'Loyal High-Value'
        WHEN r_quartile >= 3 AND m_quartile < 3 THEN 'Recent Low-Spend'
        WHEN r_quartile <= 2 AND m_quartile >= 3 THEN 'At Risk High-Value'
        ELSE 'Lost / Hibernating'
    END
ORDER BY total_segment_spend DESC;


-- ----------------------------------------------------------------------------
-- 8. PAYMENT METHOD & INSTALLMENTS (GROUP BY & HAVING)
-- Analyzes cashflow distribution and financing usage in Brazilian commerce.
-- ----------------------------------------------------------------------------
SELECT 
    payment_type,
    COUNT(order_id) AS transactions,
    ROUND(SUM(payment_value), 2) AS total_payment_value,
    ROUND(AVG(payment_value), 2) AS avg_transaction_value,
    ROUND(AVG(payment_installments), 1) AS avg_installments
FROM payments
GROUP BY payment_type
HAVING COUNT(order_id) > 10
ORDER BY total_payment_value DESC;


-- ----------------------------------------------------------------------------
-- 9. SELLER REVENUE CONCENTRATION & PARETO ANALYSIS (Window Cumulative SUM)
-- Evaluates seller dependency and marketplace health.
-- ----------------------------------------------------------------------------
WITH seller_sales AS (
    SELECT 
        s.seller_id,
        s.seller_state,
        COUNT(oi.order_item_id) AS items_sold,
        ROUND(SUM(oi.price), 2) AS seller_revenue
    FROM sellers s
    JOIN order_items oi ON s.seller_id = oi.seller_id
    GROUP BY s.seller_id, s.seller_state
),
seller_ranked AS (
    SELECT 
        seller_id,
        seller_state,
        items_sold,
        seller_revenue,
        SUM(seller_revenue) OVER (ORDER BY seller_revenue DESC ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS cumulative_revenue,
        SUM(seller_revenue) OVER () AS total_platform_revenue
    FROM seller_sales
)
SELECT 
    seller_id,
    seller_state,
    items_sold,
    seller_revenue,
    ROUND(seller_revenue * 100.0 / total_platform_revenue, 3) AS pct_of_platform,
    ROUND(cumulative_revenue * 100.0 / total_platform_revenue, 2) AS cumulative_revenue_pct
FROM seller_ranked
ORDER BY seller_revenue DESC
LIMIT 10;
