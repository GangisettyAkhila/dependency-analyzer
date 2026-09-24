import sqlite3
import json
from pathlib import Path
from typing import Optional, Dict, Any, List, Tuple
from datetime import datetime, timezone

DB_PATH = Path(__file__).parent / "dep_analyzer.db"

def get_db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Scans table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS scans (
            id TEXT PRIMARY KEY,
            filename TEXT NOT NULL,
            ecosystem TEXT NOT NULL,
            scanned_at TEXT NOT NULL,
            total_deps INTEGER NOT NULL,
            direct_deps INTEGER NOT NULL,
            transitive_deps INTEGER NOT NULL,
            vulnerable_deps INTEGER NOT NULL,
            critical_count INTEGER NOT NULL,
            high_count INTEGER NOT NULL,
            medium_count INTEGER NOT NULL,
            low_count INTEGER NOT NULL,
            risk_score INTEGER NOT NULL,
            raw_results_json TEXT NOT NULL
        )
    """)
    
    # Vulnerability cache table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS vulnerability_cache (
            cache_key TEXT PRIMARY KEY,
            package_name TEXT NOT NULL,
            version TEXT NOT NULL,
            ecosystem TEXT NOT NULL,
            vulnerabilities_json TEXT NOT NULL,
            cached_at TEXT NOT NULL
        )
    """)
    
    # Registry metadata cache table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS registry_cache (
            cache_key TEXT PRIMARY KEY,
            package_name TEXT NOT NULL,
            version TEXT NOT NULL,
            ecosystem TEXT NOT NULL,
            metadata_json TEXT NOT NULL,
            cached_at TEXT NOT NULL
        )
    """)
    
    conn.commit()
    conn.close()

def save_scan(
    scan_id: str,
    filename: str,
    ecosystem: str,
    total_deps: int,
    direct_deps: int,
    transitive_deps: int,
    vulnerable_deps: int,
    critical_count: int,
    high_count: int,
    medium_count: int,
    low_count: int,
    risk_score: int,
    raw_results: Dict[str, Any]
):
    conn = get_db_connection()
    cursor = conn.cursor()
    scanned_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    
    cursor.execute("""
        INSERT OR REPLACE INTO scans (
            id, filename, ecosystem, scanned_at,
            total_deps, direct_deps, transitive_deps, vulnerable_deps,
            critical_count, high_count, medium_count, low_count,
            risk_score, raw_results_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        scan_id, filename, ecosystem, scanned_at,
        total_deps, direct_deps, transitive_deps, vulnerable_deps,
        critical_count, high_count, medium_count, low_count,
        risk_score, json.dumps(raw_results)
    ))
    conn.commit()
    conn.close()

def get_scan(scan_id: str) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM scans WHERE id = ?", (scan_id,))
    row = cursor.fetchone()
    conn.close()
    if row:
        data = dict(row)
        data['raw_results'] = json.loads(data.pop('raw_results_json'))
        return data
    return None

def list_scans(limit: int = 50) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, filename, ecosystem, scanned_at, total_deps, direct_deps, transitive_deps,
               vulnerable_deps, critical_count, high_count, medium_count, low_count, risk_score
        FROM scans
        ORDER BY scanned_at DESC
        LIMIT ?
    """, (limit,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def delete_scan(scan_id: str) -> bool:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM scans WHERE id = ?", (scan_id,))
    conn.commit()
    deleted = cursor.rowcount > 0
    conn.close()
    return deleted

def get_cached_vulnerabilities(package_name: str, version: str, ecosystem: str) -> Optional[List[Dict[str, Any]]]:
    cache_key = f"{ecosystem}:{package_name}:{version}".lower()
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT vulnerabilities_json FROM vulnerability_cache WHERE cache_key = ?", (cache_key,))
    row = cursor.fetchone()
    conn.close()
    if row:
        return json.loads(row['vulnerabilities_json'])
    return None

def cache_vulnerabilities(package_name: str, version: str, ecosystem: str, vulns: List[Dict[str, Any]]):
    cache_key = f"{ecosystem}:{package_name}:{version}".lower()
    conn = get_db_connection()
    cursor = conn.cursor()
    cached_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    cursor.execute("""
        INSERT OR REPLACE INTO vulnerability_cache (
            cache_key, package_name, version, ecosystem, vulnerabilities_json, cached_at
        ) VALUES (?, ?, ?, ?, ?, ?)
    """, (cache_key, package_name, version, ecosystem, json.dumps(vulns), cached_at))
    conn.commit()
    conn.close()

def get_cached_registry_metadata(package_name: str, version: str, ecosystem: str) -> Optional[Dict[str, Any]]:
    cache_key = f"reg:{ecosystem}:{package_name}:{version}".lower()
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT metadata_json FROM registry_cache WHERE cache_key = ?", (cache_key,))
    row = cursor.fetchone()
    conn.close()
    if row:
        return json.loads(row['metadata_json'])
    return None

def cache_registry_metadata(package_name: str, version: str, ecosystem: str, metadata: Dict[str, Any]):
    cache_key = f"reg:{ecosystem}:{package_name}:{version}".lower()
    conn = get_db_connection()
    cursor = conn.cursor()
    cached_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    cursor.execute("""
        INSERT OR REPLACE INTO registry_cache (
            cache_key, package_name, version, ecosystem, metadata_json, cached_at
        ) VALUES (?, ?, ?, ?, ?, ?)
    """, (cache_key, package_name, version, ecosystem, json.dumps(metadata), cached_at))
    conn.commit()
    conn.close()


