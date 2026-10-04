import os
import json
import logging
import httpx
from typing import Dict, Any, List, Optional

logger = logging.getLogger("dep_analyzer.ai_engine")

def generate_remediation_command(package_name: str, fixed_version: Optional[str], ecosystem: str) -> str:
    target_ver = fixed_version or "latest"
    if ecosystem == "npm":
        return f"npm install {package_name}@{target_ver}"
    elif ecosystem == "PyPI":
        return f"pip install --upgrade {package_name}=={target_ver}" if fixed_version else f"pip install --upgrade {package_name}"
    elif ecosystem == "Maven":
        parts = package_name.split(":")
        g = parts[0] if len(parts) > 0 else "groupId"
        a = parts[1] if len(parts) > 1 else "artifactId"
        return f"<!-- Update pom.xml -->\n<dependency>\n  <groupId>{g}</groupId>\n  <artifactId>{a}</artifactId>\n  <version>{target_ver}</version>\n</dependency>"
    return f"Update {package_name} to version {target_ver}"

def calculate_project_risk_profile(
    total_deps: int,
    direct_deps: int,
    transitive_deps: int,
    dependencies: List[Dict[str, Any]],
    vulns: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Calculates a project-specific prioritization Risk Score (0–100) based on Section 10 formula:
    Risk Score = 0.40 * Severity + 0.20 * Exposure + 0.15 * Dependency Criticality + 0.15 * Version Status + 0.10 * Dependency Reach

    Scale:
    - 0–24: Low (Limited identified dependency risk)
    - 25–49: Moderate (Issues should be reviewed and scheduled)
    - 50–74: High (Significant issues need prompt attention)
    - 75–100: Critical (High-priority review and remediation planning)
    """
    if total_deps == 0:
        return {
            "score": 0,
            "label": "Low",
            "interpretation": "Limited identified dependency risk",
            "factor_contributions": {
                "severity": {"score": 0, "weight": 0.40, "weighted_value": 0.0, "meaning": "How serious the vulnerability can be."},
                "exposure": {"score": 0, "weight": 0.20, "weighted_value": 0.0, "meaning": "Whether vulnerable components are directly accessible."},
                "criticality": {"score": 0, "weight": 0.15, "weighted_value": 0.0, "meaning": "Importance of affected dependencies in project architecture."},
                "version_status": {"score": 0, "weight": 0.15, "weighted_value": 0.0, "meaning": "Staleness, deprecation, and outdated version status."},
                "reach": {"score": 0, "weight": 0.10, "weighted_value": 0.0, "meaning": "Transitive dependency depth and graph fan-out."}
            }
        }

    # 1. Severity Factor (0.40 weight)
    if not vulns:
        severity_score = 0
    else:
        has_critical = any(v.get("severity") == "CRITICAL" for v in vulns)
        has_high = any(v.get("severity") == "HIGH" for v in vulns)
        has_medium = any(v.get("severity") == "MEDIUM" for v in vulns)
        
        if has_critical:
            base_sev = 95
        elif has_high:
            base_sev = 75
        elif has_medium:
            base_sev = 45
        else:
            base_sev = 20
        
        vuln_count_bonus = min(10, (len(vulns) - 1) * 2)
        severity_score = min(100, base_sev + vuln_count_bonus)

    # 2. Exposure Factor (0.20 weight)
    if not vulns:
        exposure_score = 0
    else:
        direct_vuln_count = sum(1 for v in vulns if v.get("depth") == "direct")
        if direct_vuln_count > 0:
            exposure_score = min(100, 75 + min(25, direct_vuln_count * 10))
        else:
            exposure_score = 45

    # 3. Dependency Criticality (0.15 weight)
    if not vulns:
        criticality_score = 0
    else:
        direct_ratio = direct_deps / max(1, total_deps)
        vuln_direct_ratio = sum(1 for v in vulns if v.get("depth") == "direct") / max(1, len(vulns))
        criticality_score = min(100, int(vuln_direct_ratio * 70 + direct_ratio * 30))

    # 4. Version Status (0.15 weight)
    deprecated_count = sum(1 for d in dependencies if d.get("is_deprecated"))
    stale_count = sum(1 for d in dependencies if d.get("staleness") in ["Stale (>2yrs)", "Unmaintained (>4yrs)"])
    if total_deps > 0:
        ver_ratio = (deprecated_count * 1.0 + stale_count * 0.5) / total_deps
        version_status_score = min(100, int(ver_ratio * 100) + (15 if vulns else 0))
    else:
        version_status_score = 0

    # 5. Dependency Reach (0.10 weight)
    transitive_ratio = transitive_deps / max(1, total_deps)
    reach_score = min(100, int(transitive_ratio * 80 + (20 if any(v.get("depth") == "transitive" for v in vulns) else 0)))

    # Compute final weighted Risk Score
    weighted_sev = 0.40 * severity_score
    weighted_exp = 0.20 * exposure_score
    weighted_crit = 0.15 * criticality_score
    weighted_ver = 0.15 * version_status_score
    weighted_reach = 0.10 * reach_score

    raw_score = round(weighted_sev + weighted_exp + weighted_crit + weighted_ver + weighted_reach)
    risk_score = max(0, min(100, raw_score))

    # Determine PDF Section 10 label and interpretation
    if risk_score <= 24:
        label = "Low"
        interpretation = "Limited identified dependency risk"
    elif risk_score <= 49:
        label = "Moderate"
        interpretation = "Issues should be reviewed and scheduled"
    elif risk_score <= 74:
        label = "High"
        interpretation = "Significant issues need prompt attention"
    else:
        label = "Critical"
        interpretation = "High-priority review and remediation planning"

    return {
        "score": risk_score,
        "label": label,
        "interpretation": interpretation,
        "factor_contributions": {
            "severity": {
                "score": severity_score,
                "weight": 0.40,
                "weighted_value": round(weighted_sev, 1),
                "meaning": "How serious the vulnerability can be."
            },
            "exposure": {
                "score": exposure_score,
                "weight": 0.20,
                "weighted_value": round(weighted_exp, 1),
                "meaning": "Whether vulnerable components are directly accessible."
            },
            "criticality": {
                "score": criticality_score,
                "weight": 0.15,
                "weighted_value": round(weighted_crit, 1),
                "meaning": "Importance of affected dependencies in project architecture."
            },
            "version_status": {
                "score": version_status_score,
                "weight": 0.15,
                "weighted_value": round(weighted_ver, 1),
                "meaning": "Staleness, deprecation, and outdated version status."
            },
            "reach": {
                "score": reach_score,
                "weight": 0.10,
                "weighted_value": round(weighted_reach, 1),
                "meaning": "Transitive dependency depth and graph fan-out."
            }
        }
    }

def calculate_overall_risk_score(total_deps: int, vulns: List[Dict[str, Any]]) -> int:
    """Legacy helper returning Section 10 Risk Score (0-100)."""
    profile = calculate_project_risk_profile(total_deps, total_deps // 2, total_deps // 2, [], vulns)
    return profile["score"]

async def analyze_vulnerability_with_llm(
    package_name: str,
    installed_version: str,
    ecosystem: str,
    vuln_id: str,
    summary: str,
    details: str,
    severity: str,
    fixed_version: Optional[str],
    depth: str = "direct"
) -> Dict[str, Any]:
    remediation_cmd = generate_remediation_command(package_name, fixed_version, ecosystem)
    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("OPENAI_API_KEY")
    
    if api_key and os.environ.get("GEMINI_API_KEY"):
        try:
            prompt = f"""You are an expert Cybersecurity & Software Supply Chain Analyst.
Analyze the following vulnerability advisory and return a JSON object with EXACTLY these keys:
- "plain_english_summary": 2-3 sentences explaining the vulnerability in simple, non-jargon terms for a developer or management.
- "why_it_matters": Why this vulnerability poses a risk to the application (data leakage, server crash, unauthorized access).
- "attack_vector": High-level attack vector (e.g. Remote Code Execution, SQL Injection, Cross-Site Scripting, Denial of Service).
- "remediation_command": The exact CLI shell command to fix it.

Package: {package_name}
Installed Version: {installed_version}
Ecosystem: {ecosystem} ({depth} dependency)
Vulnerability ID: {vuln_id}
Severity: {severity}
Fixed Version: {fixed_version or 'Not specified'}
OSV Summary: {summary}
OSV Details: {details[:400]}
Remediation Command: {remediation_cmd}

Respond ONLY with valid JSON."""

            async with httpx.AsyncClient(timeout=8.0) as client:
                res = await client.post(
                    f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}",
                    json={
                        "contents": [{"parts": [{"text": prompt}]}],
                        "generationConfig": {"response_mime_type": "application/json"}
                    }
                )
                if res.status_code == 200:
                    text_content = res.json()["candidates"][0]["content"]["parts"][0]["text"]
                    parsed = json.loads(text_content)
                    return {
                        "vuln_id": vuln_id,
                        "plain_english_summary": parsed.get("plain_english_summary", summary),
                        "why_it_matters": parsed.get("why_it_matters", "Poses a potential threat to system security."),
                        "attack_vector": parsed.get("attack_vector", "Network / Application level"),
                        "remediation_command": parsed.get("remediation_command", remediation_cmd),
                        "is_ai_generated": True
                    }
        except Exception as e:
            logger.warning(f"LLM API call failed, falling back to structured synthesis engine: {e}")

    # Fallback Deterministic Structured AI Synthesis Engine
    details_lower = (summary + " " + details).lower()
    
    if "code execution" in details_lower or "rce" in details_lower or severity == "CRITICAL":
        vector = "Remote Code Execution (RCE)"
        plain_summary = (
            f"A critical security flaw in {package_name} allows unauthenticated remote attackers to execute arbitrary code or commands on your server. "
            f"Version {installed_version} is susceptible to remote takeover if untrusted data is processed."
        )
        why_matters = "An attacker can gain full administrative control over the hosting server, steal secrets, or manipulate database records."
    elif "denial of service" in details_lower or "dos" in details_lower or "crash" in details_lower or "infinite loop" in details_lower:
        vector = "Denial of Service (DoS)"
        plain_summary = (
            f"{package_name} version {installed_version} contains a resource exhaustion flaw. "
            f"Specially crafted inputs can cause high CPU usage or application crashes."
        )
        why_matters = "Attackers can render your web application unavailable to legitimate users, disrupting service availability."
    elif "prototype pollution" in details_lower:
        vector = "Prototype Pollution"
        plain_summary = (
            f"In {package_name} {installed_version}, object property modifications can contaminate global JavaScript object prototypes. "
            f"This can lead to property injection or unexpected logic execution."
        )
        why_matters = "Can be chained with other flaws to bypass authentication controls or execute arbitrary client/server logic."
    elif "sql" in details_lower or "injection" in details_lower:
        vector = "SQL / Query Injection"
        plain_summary = (
            f"Improper input sanitization in {package_name} {installed_version} allows attackers to inject malicious database queries."
        )
        why_matters = "Unsanitized user input could read, modify, or delete sensitive application data from the database."
    elif "xss" in details_lower or "cross-site scripting" in details_lower or "html" in details_lower:
        vector = "Cross-Site Scripting (XSS)"
        plain_summary = (
            f"Sanitization flaw in {package_name} {installed_version} allows injection of malicious scripts into user browser sessions."
        )
        why_matters = "Attackers can hijack user session tokens, redirect users to phishing sites, or deface interface components."
    else:
        vector = "Unauthorized Access / Logic Bypass"
        plain_summary = (
            f"A known vulnerability ({vuln_id}) was identified in {package_name} version {installed_version}. "
            f"{summary or 'Security advisory indicates improper validation of inputs.'}"
        )
        why_matters = f"Using vulnerable version {installed_version} expands the attack surface of your application."

    if depth == "transitive":
        why_matters += " Note: This is an indirect (transitive) dependency pulled in by another parent library."

    return {
        "vuln_id": vuln_id,
        "plain_english_summary": plain_summary,
        "why_it_matters": why_matters,
        "attack_vector": vector,
        "remediation_command": remediation_cmd,
        "is_ai_generated": False
    }

def generate_project_ai_briefing(
    filename: str,
    ecosystem: str,
    total_deps: int,
    vulnerable_deps: int,
    risk_score: int,
    risk_label: str,
    vulnerabilities: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Generates a structured AI Project Briefing & Remediation Checklist conforming to Section 11.
    Includes explicit boundary disclaimers (Section 11.2).
    """
    crit = [v for v in vulnerabilities if v.get("severity") == "CRITICAL"]
    high = [v for v in vulnerabilities if v.get("severity") == "HIGH"]
    trans = [v for v in vulnerabilities if v.get("depth") == "transitive"]

    exec_summary = (
        f"Analysis of '{filename}' ({ecosystem}) identified {total_deps} total dependencies with {vulnerable_deps} vulnerable components. "
        f"The overall Project Risk Score is {risk_score}/100 ({risk_label} Risk). "
    )
    if crit:
        exec_summary += f"Requires immediate action due to {len(crit)} CRITICAL vulnerability advisory findings."
    elif high:
        exec_summary += f"Requires prompt review due to {len(high)} HIGH severity findings."
    elif vulnerable_deps > 0:
        exec_summary += "Minor to moderate vulnerabilities identified. Updates should be scheduled."
    else:
        exec_summary += "No known OSV security vulnerabilities were detected in scanned dependencies."

    checklist = []
    for v in vulnerabilities[:5]:
        fix_ver = v.get("fixed_version")
        pkg = v.get("package_name")
        eco = v.get("ecosystem", ecosystem)
        cmd = generate_remediation_command(pkg, fix_ver, eco)
        checklist.append({
            "package_name": pkg,
            "vuln_id": v.get("vuln_id"),
            "severity": v.get("severity"),
            "fixed_version": fix_ver or "Latest safe release",
            "action_command": cmd,
            "recommendation": f"Upgrade {pkg} from {v.get('installed_version')} to {fix_ver or 'latest'} to remediate {v.get('vuln_id')}."
        })

    graph_path_analysis = (
        f"Of the {vulnerable_deps} vulnerable dependencies, {len(trans)} are indirect (transitive). "
        "Transitive vulnerabilities are introduced via parent dependencies and may require updating the parent package."
    )

    risk_priority_rationale = (
        f"Risk priority score ({risk_score}/100 - {risk_label}) was calculated using weighted parameters: "
        "Severity (40%), Exposure (20%), Dependency Criticality (15%), Version Status (15%), and Dependency Reach (10%)."
    )

    disclaimers = [
        "The AI model is an assistance layer and not the authoritative source for vulnerability discovery.",
        "Known vulnerabilities are established strictly from trusted security advisories (OSV.dev).",
        "AI explanations do not invent advisory IDs or affected version ranges.",
        "Upgrading dependencies does not guarantee backwards compatibility; testing is required before production deployment.",
        "This automated scan does not replace full manual penetration testing or security code audit."
    ]

    return {
        "executive_summary": exec_summary,
        "graph_path_analysis": graph_path_analysis,
        "risk_priority_rationale": risk_priority_rationale,
        "remediation_checklist": checklist,
        "disclaimers": disclaimers
    }
