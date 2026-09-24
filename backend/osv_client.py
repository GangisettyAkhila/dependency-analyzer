import httpx
import logging
from typing import List, Dict, Any, Tuple, Optional
from database import get_cached_vulnerabilities, cache_vulnerabilities

logger = logging.getLogger("dep_analyzer.osv")

OSV_BATCH_URL = "https://api.osv.dev/v1/querybatch"

def parse_severity(vuln: Dict[str, Any]) -> Tuple[str, float]:
    """
    Extracts severity level (Critical, High, Medium, Low) and score from OSV record.
    """
    severity_type = "MEDIUM"
    score = 5.0
    
    # Check severity field first
    severities = vuln.get("severity", [])
    for s in severities:
        s_type = s.get("type", "")
        score_str = s.get("score", "")
        if "CVSS_V3" in s_type or "CVSS_V2" in s_type:
            # We can extract rough score if string contains vector or number
            if "/" in score_str: # CVSS Vector string e.g. CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H
                # Estimate based on vector markers
                if "C:H/I:H/A:H" in score_str or "PR:N/UI:N" in score_str:
                    score = 9.8
                    severity_type = "CRITICAL"
                elif "C:H" in score_str or "I:H" in score_str:
                    score = 7.5
                    severity_type = "HIGH"
                else:
                    score = 5.3
                    severity_type = "MEDIUM"
            else:
                try:
                    score = float(score_str)
                except ValueError:
                    score = 5.0
                    
    # Check database_specific severity
    db_spec = vuln.get("database_specific", {})
    if "severity" in db_spec:
        db_sev = str(db_spec["severity"]).upper()
        if db_sev in ["CRITICAL", "HIGH", "MODERATE", "MEDIUM", "LOW"]:
            if db_sev == "CRITICAL":
                severity_type = "CRITICAL"
                score = max(score, 9.5)
            elif db_sev == "HIGH":
                severity_type = "HIGH"
                score = max(score, 7.5)
            elif db_sev in ["MODERATE", "MEDIUM"]:
                severity_type = "MEDIUM"
                score = max(score, 5.0)
            elif db_sev == "LOW":
                severity_type = "LOW"
                score = min(score, 3.0)
                
    if score >= 9.0:
        severity_type = "CRITICAL"
    elif score >= 7.0:
        severity_type = "HIGH"
    elif score >= 4.0:
        severity_type = "MEDIUM"
    else:
        severity_type = "LOW"
        
    return severity_type, score

def extract_fixed_version(vuln: Dict[str, Any]) -> Optional[str]:
    """
    Extracts fixed version from affected ranges in OSV advisory.
    """
    affected_list = vuln.get("affected", [])
    for aff in affected_list:
        ranges = aff.get("ranges", [])
        for r in ranges:
            events = r.get("events", [])
            for ev in events:
                if "fixed" in ev:
                    return ev["fixed"]
    return None

async def query_osv_batch(dependencies: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Queries OSV.dev in batch with local SQLite caching.
    """
    results = []
    to_query_indices = []
    queries = []
    
    # Step 1: Check cache
    for idx, dep in enumerate(dependencies):
        name = dep["name"]
        version = dep["version"]
        ecosystem = dep["ecosystem"]
        
        cached = get_cached_vulnerabilities(name, version, ecosystem)
        if cached is not None:
            dep_result = dict(dep)
            dep_result["vulnerabilities"] = cached
            dep_result["is_vulnerable"] = len(cached) > 0
            results.append(dep_result)
        else:
            # Placeholder to fill after API call
            results.append(dict(dep))
            to_query_indices.append(idx)
            queries.append({
                "package": {
                    "name": name,
                    "ecosystem": ecosystem
                },
                "version": version
            })
            
    if not queries:
        return results

    # Step 2: Query OSV.dev API for uncached items
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(OSV_BATCH_URL, json={"queries": queries})
            if response.status_code == 200:
                data = response.json()
                api_results = data.get("results", [])
                
                for q_idx, api_res in enumerate(api_results):
                    target_idx = to_query_indices[q_idx]
                    orig_dep = dependencies[target_idx]
                    raw_vulns = api_res.get("vulns", [])
                    
                    parsed_vulns = []
                    for v in raw_vulns:
                        sev_level, sev_score = parse_severity(v)
                        fixed_ver = extract_fixed_version(v)
                        
                        parsed_vulns.append({
                            "id": v.get("id"),
                            "summary": v.get("summary") or v.get("details", "")[:120] + "...",
                            "details": v.get("details", ""),
                            "severity": sev_level,
                            "severity_score": sev_score,
                            "fixed_version": fixed_ver,
                            "aliases": v.get("aliases", []),
                            "references": [ref.get("url") for ref in v.get("references", []) if ref.get("url")]
                        })
                        
                    # Save to SQLite cache
                    cache_vulnerabilities(
                        orig_dep["name"],
                        orig_dep["version"],
                        orig_dep["ecosystem"],
                        parsed_vulns
                    )
                    
                    results[target_idx]["vulnerabilities"] = parsed_vulns
                    results[target_idx]["is_vulnerable"] = len(parsed_vulns) > 0
            else:
                logger.error(f"OSV batch query failed with status {response.status_code}")
                for target_idx in to_query_indices:
                    results[target_idx]["vulnerabilities"] = []
                    results[target_idx]["is_vulnerable"] = False
    except Exception as e:
        logger.error(f"Exception querying OSV API: {e}")
        for target_idx in to_query_indices:
            results[target_idx]["vulnerabilities"] = []
            results[target_idx]["is_vulnerable"] = False

    return results
