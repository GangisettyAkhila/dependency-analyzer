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
    """
    Constructs a structured LLM prompt using OSV advisory data (CVSS, summary, details)
    and calls LLM API (or fallback deterministic AI synthesis engine) to return
    plain-English risk explanation, technical impact, attack vector, and exact fix command.
    """
    
    remediation_cmd = generate_remediation_command(package_name, fixed_version, ecosystem)
    
    # Check if Gemini API key or OpenAI key is configured
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
    # Analyzes details and summary to produce high-quality plain English explanations
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

def calculate_overall_risk_score(total_deps: int, vulns: List[Dict[str, Any]]) -> int:
    """
    Calculates an overall Security Risk Score (0 - 100, where 100 is perfectly secure).
    Sinks score based on severity counts and transitive depth.
    """
    if total_deps == 0:
        return 100
    
    penalty = 0
    for v in vulns:
        sev = v.get("severity", "MEDIUM")
        depth = v.get("depth", "direct")
        weight = 1.0 if depth == "direct" else 0.7
        
        if sev == "CRITICAL":
            penalty += 25 * weight
        elif sev == "HIGH":
            penalty += 15 * weight
        elif sev == "MEDIUM":
            penalty += 8 * weight
        else:
            penalty += 3 * weight

    score = max(0, min(100, int(100 - penalty)))
    return score
