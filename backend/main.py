import asyncio
import uuid
import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, status, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response

from database import (
    init_db, save_scan, get_scan, list_scans, delete_scan,
    create_project, list_projects, get_project
)
from parsers import detect_and_parse
from osv_client import query_osv_batch
from registry_client import fetch_package_metadata
from ai_risk_engine import (
    analyze_vulnerability_with_llm,
    calculate_project_risk_profile,
    generate_project_ai_briefing
)
from schemas import (
    ScanRequest, ScanSummary, ScanResultResponse,
    ProjectCreateRequest, ProjectResponse
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("dep_analyzer.main")

MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB Limit
ALLOWED_EXTENSIONS = {".json", ".txt", ".xml", ".lock"}
ALLOWED_FILENAMES = {"package.json", "package-lock.json", "yarn.lock", "requirements.txt", "requirements-lock.txt", "pom.xml"}

init_db()

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    logger.info("Database initialized successfully with 11-table Relational Schema.")
    yield

app = FastAPI(
    title="AI Software Dependency Risk Analyzer API",
    description="IEEE Final-Year Project API for analyzing software dependencies, OSV vulnerabilities, and AI risk insights.",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "AI Software Dependency Risk Analyzer",
        "version": "1.0.0"
    }

async def process_scan_pipeline(filename: str, content: str, project_id: Optional[str] = "default-project") -> Dict[str, Any]:
    # 1. Parse dependencies
    try:
        ecosystem, parsed_deps = detect_and_parse(filename, content)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to parse dependency file '{filename}': {str(e)}"
        )

    if not parsed_deps:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No valid software dependencies found in '{filename}'. Ensure it is a valid package.json, requirements.txt, or pom.xml."
        )

    # Limit max dependencies for performance in demo
    parsed_deps = parsed_deps[:150]

    # 2. Query OSV.dev with caching
    osv_results = await query_osv_batch(parsed_deps)

    # 3. Fetch registry metadata concurrently
    async def enrich_dep(dep: Dict[str, Any]) -> Dict[str, Any]:
        meta = await fetch_package_metadata(dep["name"], dep["version"], dep["ecosystem"])
        dep.update(meta)
        return dep

    enriched_deps = await asyncio.gather(*[enrich_dep(d) for d in osv_results])

    # 4. Synthesize AI risk explanations for vulnerable packages
    flat_vulnerabilities = []
    critical_count = 0
    high_count = 0
    medium_count = 0
    low_count = 0

    for dep in enriched_deps:
        if dep.get("is_vulnerable"):
            for v in dep.get("vulnerabilities", []):
                sev = v.get("severity", "MEDIUM").upper()
                if sev == "CRITICAL":
                    critical_count += 1
                elif sev == "HIGH":
                    high_count += 1
                elif sev == "MEDIUM":
                    medium_count += 1
                else:
                    low_count += 1

                ai_exp = await analyze_vulnerability_with_llm(
                    package_name=dep["name"],
                    installed_version=dep["version"],
                    ecosystem=dep["ecosystem"],
                    vuln_id=v.get("id", "UNKNOWN"),
                    summary=v.get("summary", ""),
                    details=v.get("details", ""),
                    severity=sev,
                    fixed_version=v.get("fixed_version"),
                    depth=dep.get("depth", "direct")
                )

                flat_vuln_item = {
                    "package_name": dep["name"],
                    "installed_version": dep["version"],
                    "ecosystem": dep["ecosystem"],
                    "depth": dep.get("depth", "direct"),
                    "staleness": dep.get("staleness", "Maintained"),
                    "is_deprecated": dep.get("is_deprecated", False),
                    "vuln_id": v.get("id"),
                    "severity": sev,
                    "severity_score": v.get("severity_score", 5.0),
                    "summary": v.get("summary"),
                    "details": v.get("details"),
                    "fixed_version": v.get("fixed_version"),
                    "ai_explanation": ai_exp,
                    "references": v.get("references", [])
                }
                flat_vulnerabilities.append(flat_vuln_item)

    # 5. Metrics & PDF Section 10 Risk Scoring Profile
    total_deps = len(enriched_deps)
    direct_deps = sum(1 for d in enriched_deps if d.get("depth") == "direct")
    transitive_deps = total_deps - direct_deps
    vulnerable_deps = sum(1 for d in enriched_deps if d.get("is_vulnerable"))

    risk_profile = calculate_project_risk_profile(
        total_deps=total_deps,
        direct_deps=direct_deps,
        transitive_deps=transitive_deps,
        dependencies=enriched_deps,
        vulns=flat_vulnerabilities
    )

    risk_score = risk_profile["score"]
    risk_label = risk_profile["label"]
    risk_interpretation = risk_profile["interpretation"]
    factor_contributions = risk_profile["factor_contributions"]

    # 6. Section 11 AI Project Briefing
    ai_briefing = generate_project_ai_briefing(
        filename=filename,
        ecosystem=ecosystem,
        total_deps=total_deps,
        vulnerable_deps=vulnerable_deps,
        risk_score=risk_score,
        risk_label=risk_label,
        vulnerabilities=flat_vulnerabilities
    )

    scan_id = str(uuid.uuid4())
    scanned_at_str = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

    result_data = {
        "id": scan_id,
        "project_id": project_id,
        "filename": filename,
        "ecosystem": ecosystem,
        "scanned_at": scanned_at_str,
        "total_deps": total_deps,
        "direct_deps": direct_deps,
        "transitive_deps": transitive_deps,
        "vulnerable_deps": vulnerable_deps,
        "critical_count": critical_count,
        "high_count": high_count,
        "medium_count": medium_count,
        "low_count": low_count,
        "risk_score": risk_score,
        "risk_label": risk_label,
        "risk_interpretation": risk_interpretation,
        "factor_contributions": factor_contributions,
        "dependencies": enriched_deps,
        "vulnerabilities_flat": flat_vulnerabilities,
        "ai_briefing": ai_briefing
    }

    # 7. Save to SQLite / Relational DB
    save_scan(
        scan_id=scan_id,
        filename=filename,
        ecosystem=ecosystem,
        total_deps=total_deps,
        direct_deps=direct_deps,
        transitive_deps=transitive_deps,
        vulnerable_deps=vulnerable_deps,
        critical_count=critical_count,
        high_count=high_count,
        medium_count=medium_count,
        low_count=low_count,
        risk_score=risk_score,
        raw_results=result_data,
        project_id=project_id
    )

    return result_data

# ==================== Section 14 Endpoints ====================

@app.post("/api/projects", response_model=ProjectResponse)
def api_create_project(payload: ProjectCreateRequest):
    return create_project(
        name=payload.name,
        ecosystem=payload.ecosystem,
        repository_url=payload.repository_url,
        user_id=payload.user_id
    )

@app.get("/api/projects", response_model=List[ProjectResponse])
def api_list_projects():
    return list_projects()

@app.get("/api/projects/{project_id}", response_model=ProjectResponse)
def api_get_project(project_id: str):
    proj = get_project(project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found.")
    return proj

@app.post("/api/projects/{project_id}/scan", response_model=ScanResultResponse)
async def api_project_start_scan(
    project_id: str,
    file: Optional[UploadFile] = File(None),
    filename: Optional[str] = Form(None),
    content: Optional[str] = Form(None)
):
    proj = get_project(project_id)
    if not proj:
        raise HTTPException(status_code=404, detail=f"Project '{project_id}' not found.")

    if file:
        if not file.filename:
            raise HTTPException(status_code=400, detail="Filename missing in upload request.")
        content_bytes = await file.read()
        content_str = content_bytes.decode("utf-8")
        fn = file.filename
    elif content:
        fn = filename or "package.json"
        content_str = content
    else:
        raise HTTPException(status_code=400, detail="Either file upload or content string must be provided.")

    return await process_scan_pipeline(fn, content_str, project_id=project_id)

@app.get("/api/projects/{project_id}/scans", response_model=List[ScanSummary])
def api_get_project_scans(project_id: str):
    return list_scans(project_id=project_id)

@app.get("/api/scans/{scan_id}", response_model=ScanResultResponse)
def get_scan_details(scan_id: str):
    scan_data = get_scan(scan_id)
    if not scan_data:
        raise HTTPException(status_code=404, detail="Scan record not found.")
    raw = scan_data["raw_results"]
    raw["scanned_at"] = scan_data["scanned_at"]
    return raw

@app.get("/api/scans/{scan_id}/dependencies")
def api_get_scan_dependencies(scan_id: str):
    scan_data = get_scan(scan_id)
    if not scan_data:
        raise HTTPException(status_code=404, detail="Scan record not found.")
    return {
        "scan_id": scan_id,
        "total_deps": scan_data["total_deps"],
        "dependencies": scan_data["raw_results"].get("dependencies", [])
    }

@app.get("/api/scans/{scan_id}/findings")
def api_get_scan_findings(scan_id: str):
    scan_data = get_scan(scan_id)
    if not scan_data:
        raise HTTPException(status_code=404, detail="Scan record not found.")
    return {
        "scan_id": scan_id,
        "vulnerable_deps": scan_data["vulnerable_deps"],
        "findings": scan_data["raw_results"].get("vulnerabilities_flat", [])
    }

@app.get("/api/scans/{scan_id}/graph")
def api_get_scan_graph(scan_id: str):
    scan_data = get_scan(scan_id)
    if not scan_data:
        raise HTTPException(status_code=404, detail="Scan record not found.")
    deps = scan_data["raw_results"].get("dependencies", [])
    
    nodes = []
    edges = []
    
    # Root app node
    nodes.append({
        "id": "root",
        "label": scan_data["filename"],
        "type": "root",
        "is_vulnerable": False
    })

    for d in deps:
        nodes.append({
            "id": d["name"],
            "label": f"{d['name']}@{d['version']}",
            "type": d.get("depth", "direct"),
            "is_vulnerable": d.get("is_vulnerable", False)
        })
        parent_id = d.get("parent") or "root"
        edges.append({
            "source": parent_id,
            "target": d["name"]
        })

    return {
        "scan_id": scan_id,
        "nodes": nodes,
        "edges": edges
    }

@app.post("/api/findings/{finding_id}/ai-analysis")
async def api_finding_ai_analysis(finding_id: str, payload: Dict[str, Any]):
    return await analyze_vulnerability_with_llm(
        package_name=payload.get("package_name", "Unknown"),
        installed_version=payload.get("installed_version", "1.0.0"),
        ecosystem=payload.get("ecosystem", "npm"),
        vuln_id=payload.get("vuln_id", finding_id),
        summary=payload.get("summary", ""),
        details=payload.get("details", ""),
        severity=payload.get("severity", "MEDIUM"),
        fixed_version=payload.get("fixed_version"),
        depth=payload.get("depth", "direct")
    )

@app.get("/api/scans/{scan_id}/report")
def api_generate_scan_report(scan_id: str, format: str = Query("json")):
    scan_data = get_scan(scan_id)
    if not scan_data:
        raise HTTPException(status_code=404, detail="Scan record not found.")
    raw = scan_data["raw_results"]

    if format.lower() == "json":
        return raw

    # Generate Markdown / HTML report
    md_content = f"""# AI Software Dependency Security & Risk Analysis Report

**Project / File:** {raw.get('filename')} ({raw.get('ecosystem')})
**Scanned At:** {raw.get('scanned_at')}
**Scan ID:** {scan_id}

---

## 1. Executive Risk Summary
- **Project Risk Score:** {raw.get('risk_score')}/100 ({raw.get('risk_label')} Risk)
- **Interpretation:** {raw.get('risk_interpretation')}
- **Total Dependencies:** {raw.get('total_deps')} ({raw.get('direct_deps')} Direct / {raw.get('transitive_deps')} Transitive)
- **Vulnerable Packages:** {raw.get('vulnerable_deps')}
- **Severity Counts:** Critical: {raw.get('critical_count')}, High: {raw.get('high_count')}, Medium: {raw.get('medium_count')}, Low: {raw.get('low_count')}

---

## 2. Risk Scoring Engine Breakdown (PDF Section 10)
- **Severity Factor (40%):** {raw.get('factor_contributions', {}).get('severity', {}).get('score', 0)}/100
- **Exposure Factor (20%):** {raw.get('factor_contributions', {}).get('exposure', {}).get('score', 0)}/100
- **Criticality Factor (15%):** {raw.get('factor_contributions', {}).get('criticality', {}).get('score', 0)}/100
- **Version Status Factor (15%):** {raw.get('factor_contributions', {}).get('version_status', {}).get('score', 0)}/100
- **Dependency Reach Factor (10%):** {raw.get('factor_contributions', {}).get('reach', {}).get('score', 0)}/100

---

## 3. Top Security Findings & AI Remediation Checklist
"""
    for v in raw.get("vulnerabilities_flat", []):
        md_content += f"""
### Package: {v.get('package_name')}@{v.get('installed_version')} [{v.get('severity')}]
- **Vulnerability ID:** {v.get('vuln_id')}
- **Fixed Version:** {v.get('fixed_version') or 'N/A'}
- **Plain English Summary:** {v.get('ai_explanation', {}).get('plain_english_summary')}
- **Remediation Command:** `{v.get('ai_explanation', {}).get('remediation_command')}`
"""

    return Response(content=md_content, media_type="text/markdown")

# ==================== Legacy Scanner Endpoints ====================

@app.post("/api/scan", response_model=ScanResultResponse)
async def scan_file_upload(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename missing in upload request.")
    
    ext = "." + file.filename.split(".")[-1] if "." in file.filename else ""
    fn_lower = file.filename.lower()
    
    if ext.lower() not in ALLOWED_EXTENSIONS and fn_lower not in ALLOWED_FILENAMES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{file.filename}'. Supported files: package.json, package-lock.json, requirements.txt, pom.xml."
        )

    content_bytes = await file.read()
    if len(content_bytes) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File size exceeds maximum allowed limit (5MB).")

    try:
        content_str = content_bytes.decode("utf-8")
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="File encoding error. Please upload valid UTF-8 text files.")

    return await process_scan_pipeline(file.filename, content_str)

@app.post("/api/scan/text", response_model=ScanResultResponse)
async def scan_raw_text(payload: ScanRequest):
    if not payload.content or len(payload.content.strip()) == 0:
        raise HTTPException(status_code=400, detail="Dependency content cannot be empty.")
    return await process_scan_pipeline(payload.filename or "package.json", payload.content)

@app.get("/api/scans", response_model=List[ScanSummary])
def get_past_scans():
    return list_scans()

@app.delete("/api/scans/{scan_id}")
def remove_scan(scan_id: str):
    deleted = delete_scan(scan_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Scan record not found.")
    return {"message": "Scan deleted successfully.", "id": scan_id}
