import os
import sqlite3
from pathlib import Path
from datetime import datetime
import pytest

import src.llm_monitoring.api as api

@pytest.fixture(autouse=True)
def setup_test_db(tmp_path):
    # Override DB_FILE to use a temporary one
    test_db = tmp_path / "test_drift_history.db"
    original_db = api.DB_FILE
    api.DB_FILE = test_db
    api.db_available = True
    api.fallback_drift_history.clear()
    
    # Initialize DB
    api.init_db()
    
    yield test_db
    
    # Restore DB_FILE
    api.DB_FILE = original_db

def test_init_db_creates_table(setup_test_db):
    test_db = setup_test_db
    assert test_db.exists()
    
    # Query sqlite_master to verify table exists
    conn = sqlite3.connect(test_db)
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='drift_history'")
    table = cursor.fetchone()
    conn.close()
    assert table is not None
    assert table[0] == "drift_history"

def test_save_and_load_drift_records(setup_test_db):
    api.save_drift_record(0.1234, 0.5678, "LOW")
    api.save_drift_record(0.5555, 1.2222, "HIGH")
    
    history = api.load_drift_history()
    assert len(history) == 2
    
    assert isinstance(history[0]["timestamp"], datetime)
    assert history[0]["centroid_score"] == pytest.approx(0.1234)
    assert history[0]["mmd_score"] == pytest.approx(0.5678)
    assert history[0]["severity"] == "LOW"
    
    assert isinstance(history[1]["timestamp"], datetime)
    assert history[1]["centroid_score"] == pytest.approx(0.5555)
    assert history[1]["mmd_score"] == pytest.approx(1.2222)
    assert history[1]["severity"] == "HIGH"

def test_history_capping_limit(setup_test_db):
    # Save 1005 records, should prune to 1000
    for i in range(1005):
        api.save_drift_record(float(i), float(i * 2), "LOW")
        
    history = api.load_drift_history()
    assert len(history) == 1000
    # The first loaded should be the 6th record we saved (index 5)
    assert history[0]["centroid_score"] == pytest.approx(5.0)
    # The last loaded should be the 1005th record we saved (index 1004)
    assert history[-1]["centroid_score"] == pytest.approx(1004.0)

def test_graceful_recovery_and_fallback(setup_test_db):
    # Make DB unavailable by setting invalid path or failing connections
    api.db_available = False
    
    api.save_drift_record(0.9999, 1.9999, "CRITICAL")
    
    history = api.load_drift_history()
    assert len(history) == 1
    assert history[0]["centroid_score"] == pytest.approx(0.9999)
    assert history[0]["mmd_score"] == pytest.approx(1.9999)
    assert history[0]["severity"] == "CRITICAL"
