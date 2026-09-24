import asyncio
import uuid
import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import List, Dict, Any
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from database import init_db, save_scan, get_scan, list_scans, delete_scan
from parsers import detect_and_parse
from osv_client import query_osv_batch
from registry_client import fetch_package_metadata
from ai_risk_engine import analyze_vulnerability_with_llm, calculate_overall_risk_score
from schemas import ScanRequest, ScanSummary, ScanResultResponse

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("dep_analyzer.main")

MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB Limit
ALLOWED_EXTENSIONS = {".json", ".txt", ".xml", ".lock"}
ALLOWED_FILENAMES = {"package.json", "package-lock.json", "yarn.lock", "requirements.txt", "requirements-lock.txt", "pom.xml"}

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    logger.info("SQLite database initialized successfully.")
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


async def process_scan_pipeline(filename: str, content: str) -> Dict[str, Any]:
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

    # 2. Query OSV.dev with SQLite caching
    osv_results = await query_osv_batch(parsed_deps)

    # 3. Fetch registry metadata (staleness & deprecation) concurrently
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

                # Generate AI explanation
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

    # 5. Calculate Metrics
    total_deps = len(enriched_deps)
    direct_deps = sum(1 for d in enriched_deps if d.get("depth") == "direct")
    transitive_deps = total_deps - direct_deps
    vulnerable_deps = sum(1 for d in enriched_deps if d.get("is_vulnerable"))

    risk_score = calculate_overall_risk_score(total_deps, flat_vulnerabilities)

    scan_id = str(uuid.uuid4())
    scanned_at_str = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

    
    result_data = {
        "id": scan_id,
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
        "dependencies": enriched_deps,
        "vulnerabilities_flat": flat_vulnerabilities
    }

    # 6. Save to SQLite DB
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
        raw_results=result_data
    )

    return result_data

@app.post("/api/scan", response_model=ScanResultResponse)
async def scan_file_upload(file: UploadFile = File(...)):
    # File validation
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

@app.get("/api/scans/{scan_id}", response_model=ScanResultResponse)
def get_scan_details(scan_id: str):
    scan_data = get_scan(scan_id)
    if not scan_data:
        raise HTTPException(status_code=404, detail="Scan record not found.")
    raw = scan_data["raw_results"]
    raw["scanned_at"] = scan_data["scanned_at"]
    return raw

@app.delete("/api/scans/{scan_id}")
def remove_scan(scan_id: str):
    deleted = delete_scan(scan_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Scan record not found.")
    return {"message": "Scan deleted successfully.", "id": scan_id}
