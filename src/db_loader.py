"""
RetailIQ — Database Engine & Table Ingestion
Supports MySQL 8+ via SQLAlchemy / mysql-connector-python with environment
configuration (.env) and an automatic SQLite fallback for zero-setup execution.
"""

import os
import sqlite3
import pandas as pd
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "3306")
DB_NAME = os.getenv("DB_NAME", "olist_project")


def get_mysql_engine():
    """Attempt connecting to MySQL 8+ database."""
    try:
        url = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
        engine = create_engine(url, pool_pre_ping=True)
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print(f"[DB] Connected successfully to MySQL ({DB_HOST}:{DB_PORT}/{DB_NAME})")
        return engine
    except Exception as e:
        print(f"[DB] MySQL connection note: {e}")
        return None


def get_sqlite_conn(db_path="data/retail_iq.db"):
    """Get raw sqlite3 connection."""
    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    return sqlite3.connect(os.path.abspath(db_path))


def get_sqlite_engine(db_path="data/retail_iq.db"):
    """Get local SQLite engine as guaranteed reliable backend."""
    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    url = f"sqlite:///{os.path.abspath(db_path)}"
    return create_engine(url, echo=False)


def get_db_connection():
    """Returns an active DB connection: MySQL if available, otherwise SQLite."""
    mysql_engine = get_mysql_engine()
    if mysql_engine is not None:
        return mysql_engine.connect(), "mysql"
    return get_sqlite_conn(), "sqlite"


def load_cleaned_to_db(data_dir="data/cleaned"):
    """Ingests all cleaned CSVs into database tables."""
    mysql_engine = get_mysql_engine()
    is_mysql = (mysql_engine is not None)
    
    tables = [
        ("clean_customers", "customers"),
        ("clean_orders", "orders"),
        ("clean_order_items", "order_items"),
        ("clean_payments", "payments"),
        ("clean_reviews", "reviews"),
        ("clean_products", "products"),
        ("clean_sellers", "sellers"),
        ("master_orders", "master_orders")
    ]
    
    print("\n[DB LOADER] Loading tables into database...")
    if is_mysql:
        print(f"  Target: MySQL 8+ ({DB_HOST}:{DB_PORT}/{DB_NAME})")
        with mysql_engine.begin() as conn:
            for file_prefix, table_name in tables:
                csv_path = os.path.join(data_dir, f"{file_prefix}.csv")
                if not os.path.exists(csv_path):
                    continue
                print(f"  Loading {file_prefix}.csv -> table '{table_name}'...")
                df = pd.read_csv(csv_path)
                df.to_sql(table_name, con=conn, if_exists="replace", index=False, chunksize=5000)
    else:
        print("  Target: Local SQLite database (data/retail_iq.db)")
        conn = get_sqlite_conn()
        for file_prefix, table_name in tables:
            csv_path = os.path.join(data_dir, f"{file_prefix}.csv")
            if not os.path.exists(csv_path):
                continue
            print(f"  Loading {file_prefix}.csv -> table '{table_name}'...")
            df = pd.read_csv(csv_path)
            df.to_sql(table_name, con=conn, if_exists="replace", index=False, chunksize=5000)
        conn.close()
    
    print("\n[SUCCESS] All tables successfully ingested into database.")


if __name__ == "__main__":
    load_cleaned_to_db()
