import sqlite3
import json
import uuid
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
    
    # 1. Users table (Section 13)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'developer',
            created_at TEXT NOT NULL
        )
    """)

    # 2. Projects table (Section 13)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS projects (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            name TEXT NOT NULL,
            ecosystem TEXT NOT NULL,
            repository_url TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)
    
    # 3. Scans table (Section 13)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS scans (
            id TEXT PRIMARY KEY,
            project_id TEXT,
            filename TEXT NOT NULL,
            ecosystem TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'completed',
            started_at TEXT NOT NULL,
            completed_at TEXT,
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
            raw_results_json TEXT NOT NULL,
            FOREIGN KEY (project_id) REFERENCES projects(id)
        )
    """)
    
    # Migration checks for scans table
    cursor.execute("PRAGMA table_info(scans)")
    scan_cols = [row[1] for row in cursor.fetchall()]
    if "project_id" not in scan_cols:
        cursor.execute("ALTER TABLE scans ADD COLUMN project_id TEXT DEFAULT 'default-project'")
    if "status" not in scan_cols:
        cursor.execute("ALTER TABLE scans ADD COLUMN status TEXT DEFAULT 'completed'")
    if "started_at" not in scan_cols:
        cursor.execute("ALTER TABLE scans ADD COLUMN started_at TEXT DEFAULT ''")
    if "completed_at" not in scan_cols:
        cursor.execute("ALTER TABLE scans ADD COLUMN completed_at TEXT DEFAULT ''")

    # 4. Dependencies table (Section 13)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS dependencies (
            id TEXT PRIMARY KEY,
            scan_id TEXT NOT NULL,
            package_name TEXT NOT NULL,
            version TEXT NOT NULL,
            ecosystem TEXT NOT NULL,
            dependency_type TEXT NOT NULL,
            FOREIGN KEY (scan_id) REFERENCES scans(id)
        )
    """)

    # 5. Dependency Edges table (Section 13)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS dependency_edges (
            id TEXT PRIMARY KEY,
            scan_id TEXT NOT NULL,
            parent_dependency_id TEXT,
            child_dependency_id TEXT NOT NULL,
            FOREIGN KEY (scan_id) REFERENCES scans(id)
        )
    """)

    # 6. Vulnerabilities table (Section 13)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS vulnerabilities (
            id TEXT PRIMARY KEY,
            advisory_id TEXT NOT NULL,
            package_name TEXT NOT NULL,
            severity TEXT NOT NULL,
            affected_range TEXT,
            fixed_version TEXT
        )
    """)

    # 7. Findings table (Section 13)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS findings (
            id TEXT PRIMARY KEY,
            scan_id TEXT NOT NULL,
            dependency_id TEXT,
            vulnerability_id TEXT,
            risk_score INTEGER NOT NULL,
            status TEXT NOT NULL DEFAULT 'open',
            FOREIGN KEY (scan_id) REFERENCES scans(id),
            FOREIGN KEY (vulnerability_id) REFERENCES vulnerabilities(id)
        )
    """)

    # 8. AI Insights table (Section 13)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS ai_insights (
            id TEXT PRIMARY KEY,
            finding_id TEXT NOT NULL,
            explanation TEXT NOT NULL,
            recommendation TEXT NOT NULL,
            generated_at TEXT NOT NULL,
            FOREIGN KEY (finding_id) REFERENCES findings(id)
        )
    """)

    # 9. Reports table (Section 13)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS reports (
            id TEXT PRIMARY KEY,
            scan_id TEXT NOT NULL,
            file_path TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (scan_id) REFERENCES scans(id)
        )
    """)
    
    # 10. Cache tables
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

    # Default Project if none exists
    cursor.execute("SELECT COUNT(*) as count FROM projects")
    if cursor.fetchone()['count'] == 0:
        default_proj_id = "default-project"
        now_str = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        cursor.execute("""
            INSERT INTO projects (id, name, ecosystem, repository_url, created_at)
            VALUES (?, ?, ?, ?, ?)
        """, (default_proj_id, "Default Project", "npm/Python", "https://github.com/example/project", now_str))
    
    conn.commit()
    conn.close()

def create_project(name: str, ecosystem: str, repository_url: Optional[str] = None, user_id: Optional[str] = None) -> Dict[str, Any]:
    conn = get_db_connection()
    cursor = conn.cursor()
    proj_id = str(uuid.uuid4())
    created_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    cursor.execute("""
        INSERT INTO projects (id, user_id, name, ecosystem, repository_url, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (proj_id, user_id, name, ecosystem, repository_url or "", created_at))
    conn.commit()
    conn.close()
    return {
        "id": proj_id,
        "user_id": user_id,
        "name": name,
        "ecosystem": ecosystem,
        "repository_url": repository_url,
        "created_at": created_at
    }

def list_projects() -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM projects ORDER BY created_at DESC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def get_project(project_id: str) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM projects WHERE id = ?", (project_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

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
    raw_results: Dict[str, Any],
    project_id: Optional[str] = "default-project"
):
    conn = get_db_connection()
    cursor = conn.cursor()
    now_str = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    
    # Insert or update scan
    cursor.execute("""
        INSERT OR REPLACE INTO scans (
            id, project_id, filename, ecosystem, status, started_at, completed_at, scanned_at,
            total_deps, direct_deps, transitive_deps, vulnerable_deps,
            critical_count, high_count, medium_count, low_count,
            risk_score, raw_results_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        scan_id, project_id, filename, ecosystem, "completed", now_str, now_str, now_str,
        total_deps, direct_deps, transitive_deps, vulnerable_deps,
        critical_count, high_count, medium_count, low_count,
        risk_score, json.dumps(raw_results)
    ))

    # Populate dependencies table (Section 13)
    dep_id_map = {}
    deps = raw_results.get("dependencies", [])
    for d in deps:
        dep_uuid = str(uuid.uuid4())
        dep_id_map[d["name"]] = dep_uuid
        cursor.execute("""
            INSERT INTO dependencies (id, scan_id, package_name, version, ecosystem, dependency_type)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (dep_uuid, scan_id, d["name"], d["version"], d.get("ecosystem", ecosystem), d.get("depth", "direct")))

    # Populate dependency edges
    for d in deps:
        if d.get("parent") and d.get("parent") in dep_id_map:
            edge_uuid = str(uuid.uuid4())
            cursor.execute("""
                INSERT INTO dependency_edges (id, scan_id, parent_dependency_id, child_dependency_id)
                VALUES (?, ?, ?, ?)
            """, (edge_uuid, scan_id, dep_id_map[d["parent"]], dep_id_map[d["name"]]))

    # Populate vulnerabilities, findings, and ai_insights
    vulns_flat = raw_results.get("vulnerabilities_flat", [])
    for v in vulns_flat:
        vuln_uuid = str(uuid.uuid4())
        adv_id = v.get("vuln_id") or "UNKNOWN"
        cursor.execute("""
            INSERT OR REPLACE INTO vulnerabilities (id, advisory_id, package_name, severity, affected_range, fixed_version)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (vuln_uuid, adv_id, v["package_name"], v["severity"], v.get("installed_version"), v.get("fixed_version")))

        finding_uuid = str(uuid.uuid4())
        dep_uuid = dep_id_map.get(v["package_name"])
        cursor.execute("""
            INSERT INTO findings (id, scan_id, dependency_id, vulnerability_id, risk_score, status)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (finding_uuid, scan_id, dep_uuid, vuln_uuid, risk_score, "open"))

        ai_exp = v.get("ai_explanation", {})
        if ai_exp:
            insight_uuid = str(uuid.uuid4())
            cursor.execute("""
                INSERT INTO ai_insights (id, finding_id, explanation, recommendation, generated_at)
                VALUES (?, ?, ?, ?, ?)
            """, (insight_uuid, finding_uuid, ai_exp.get("plain_english_summary", ""), ai_exp.get("remediation_command", ""), now_str))

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

def list_scans(limit: int = 50, project_id: Optional[str] = None) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    if project_id:
        cursor.execute("""
            SELECT id, project_id, filename, ecosystem, scanned_at, total_deps, direct_deps, transitive_deps,
                   vulnerable_deps, critical_count, high_count, medium_count, low_count, risk_score
            FROM scans
            WHERE project_id = ?
            ORDER BY scanned_at DESC
            LIMIT ?
        """, (project_id, limit))
    else:
        cursor.execute("""
            SELECT id, project_id, filename, ecosystem, scanned_at, total_deps, direct_deps, transitive_deps,
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
    # Delete child ai_insights before deleting findings to prevent orphan records
    cursor.execute("DELETE FROM ai_insights WHERE finding_id IN (SELECT id FROM findings WHERE scan_id = ?)", (scan_id,))
    cursor.execute("DELETE FROM findings WHERE scan_id = ?", (scan_id,))
    cursor.execute("DELETE FROM dependencies WHERE scan_id = ?", (scan_id,))
    cursor.execute("DELETE FROM dependency_edges WHERE scan_id = ?", (scan_id,))
    cursor.execute("DELETE FROM reports WHERE scan_id = ?", (scan_id,))
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
